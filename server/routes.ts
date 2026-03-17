import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import passport from "passport";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { hashPassword } from "./auth";
import { insertUserSchema, insertDocumentSchema, insertProgressSchema, insertCallFeedbackSchema, insertTaskSchema, insertNotificationSchema, insertContentPostSchema, insertIncomeGoalSchema } from "@shared/schema";
import { seedDatabase } from "./seed";
import { GoogleGenerativeAI } from "@google/generative-ai";

const uploadsDir = path.resolve("uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  if ((req.user as any).role !== "admin") return res.status(403).json({ message: "Forbidden" });
  next();
}

const clients = new Map<string, WebSocket>();

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await seedDatabase();

  app.use("/uploads", (await import("express")).default.static(uploadsDir));

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url!, `http://localhost`);
    const userId = url.searchParams.get("userId");
    if (userId) clients.set(userId, ws);

    ws.on("close", () => {
      if (userId) clients.delete(userId);
    });
  });

  function sendToUser(userId: string, data: object) {
    const ws = clients.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  // Auth
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
      req.logIn(user, (err) => {
        if (err) return next(err);
        const { password, ...safeUser } = user;
        return res.json(safeUser);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => res.json({ message: "Logged out" }));
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    const { password, ...safeUser } = req.user as any;
    res.json(safeUser);
  });

  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const { comparePassword } = await import("./auth");
    const user = await storage.getUser((req.user as any).id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) return res.status(400).json({ message: "Current password is incorrect" });
    const hashed = await hashPassword(newPassword);
    await storage.updateUser(user.id, { password: hashed });
    res.json({ message: "Password updated" });
  });

  // File upload endpoint (authenticated users)
  app.post("/api/upload", requireAuth, upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file provided" });
    const fileUrl = `/uploads/${req.file.filename}`;
    const fileSize = req.file.size > 1024 * 1024
      ? `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(req.file.size / 1024)} KB`;
    res.json({ fileUrl, fileName: req.file.originalname, fileSize });
  });

  // Get admin user (for client chat to address the admin)
  app.get("/api/admin-user", requireAuth, async (req, res) => {
    const admin = await storage.getUserByEmail("admin@brandverse.com");
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    const { password, ...safe } = admin;
    res.json(safe);
  });

  // Users / Clients
  app.get("/api/clients", requireAdmin, async (req, res) => {
    const allClients = await storage.getAllClients();
    const safe = allClients.map(({ password, ...u }) => u);
    res.json(safe);
  });

  app.get("/api/clients/:id", requireAdmin, async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ message: "Not found" });
    const { password, ...safe } = user;
    res.json(safe);
  });

  app.post("/api/clients", requireAdmin, async (req, res) => {
    const parsed = insertUserSchema.safeParse({ ...req.body, role: "client" });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const hashed = await hashPassword(parsed.data.password);
    const user = await storage.createUser({ ...parsed.data, password: hashed, role: "client" });
    await storage.upsertProgress({ clientId: user.id, offerCreation: 0, funnelProgress: 0, contentProgress: 0, monetizationProgress: 0 });
    const { password, ...safe } = user;
    res.json(safe);
  });

  app.patch("/api/clients/:id", requireAdmin, async (req, res) => {
    const { password, ...data } = req.body;
    const updated = await storage.updateUser(req.params.id, data);
    const { password: _p, ...safe } = updated;
    res.json(safe);
  });

  app.delete("/api/clients/:id", requireAdmin, async (req, res) => {
    await storage.deleteUser(req.params.id);
    res.json({ message: "Deleted" });
  });

  app.patch("/api/clients/:id/reset-password", requireAdmin, async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ message: "newPassword required" });
    const hashed = await hashPassword(newPassword);
    await storage.updateUser(req.params.id, { password: hashed });
    res.json({ message: "Password reset" });
  });

  // Profile update for self (name, phone, program, email)
  app.patch("/api/profile", requireAuth, async (req, res) => {
    const userId = (req.user as any).id;
    const { name, phone, program, email } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (program !== undefined) updateData.program = program;
    if (email !== undefined) updateData.email = email;
    const updated = await storage.updateUser(userId, updateData);
    const { password, ...safe } = updated;
    res.json(safe);
  });

  // Documents
  app.get("/api/documents", requireAuth, async (req, res) => {
    const user = req.user as any;
    let docs;
    if (user.role === "admin") {
      const { clientId } = req.query;
      docs = clientId ? await storage.getDocumentsByClient(clientId as string) : await storage.getAllDocuments();
    } else {
      docs = await storage.getDocumentsByClient(user.id);
    }
    res.json(docs);
  });

  app.get("/api/documents/:id", requireAuth, async (req, res) => {
    const doc = await storage.getDocument(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  });

  app.post("/api/documents", requireAuth, async (req, res) => {
    const user = req.user as any;
    const clientId = user.role === "client" ? user.id : req.body.clientId;
    const derivedFileName = req.body.fileName || (req.body.fileUrl ? req.body.fileUrl.split("/").pop()?.split("?")[0] || req.body.title : req.body.title) || req.body.title;
    const parsed = insertDocumentSchema.safeParse({ ...req.body, fileName: derivedFileName, clientId, uploadedBy: user.id });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const doc = await storage.createDocument(parsed.data);
    if (user.role === "client") {
      const admin = await storage.getUserByEmail("admin@brandverse.com");
      if (admin) sendToUser(admin.id, { type: "notification", message: `Client uploaded a document: ${doc.title}` });
    } else {
      const notifMsg = `New document shared: ${doc.title}`;
      await storage.createNotification({ clientId: doc.clientId, message: notifMsg, type: "document" });
      sendToUser(doc.clientId, { type: "notification", message: notifMsg });
    }
    res.json(doc);
  });

  app.delete("/api/documents/:id", requireAuth, async (req, res) => {
    const user = req.user as any;
    const doc = await storage.getDocument(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    if (user.role === "client" && doc.uploadedBy !== user.id) return res.status(403).json({ message: "Forbidden" });
    if (doc.fileUrl.startsWith("/uploads/")) {
      const filePath = path.join(uploadsDir, path.basename(doc.fileUrl));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await storage.deleteDocument(req.params.id);
    res.json({ message: "Deleted" });
  });

  // Materials Library
  app.get("/api/materials", requireAuth, async (req, res) => {
    const materials = await storage.getMaterials();
    res.json(materials);
  });

  app.post("/api/materials", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (user.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const derivedFileName = req.body.fileName || (req.body.fileUrl ? req.body.fileUrl.split("/").pop()?.split("?")[0] || req.body.title : req.body.title) || req.body.title;
    const parsed = insertDocumentSchema.safeParse({
      ...req.body,
      fileName: derivedFileName,
      clientId: user.id,
      uploadedBy: user.id,
      fileType: "material",
    });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const doc = await storage.createDocument(parsed.data);
    res.json(doc);
  });

  app.delete("/api/materials/:id", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (user.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const doc = await storage.getDocument(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    if (doc.fileUrl.startsWith("/uploads/")) {
      const filePath = path.join(uploadsDir, path.basename(doc.fileUrl));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await storage.deleteDocument(req.params.id);
    res.json({ message: "Deleted" });
  });

  // Messages / Chat
  app.get("/api/messages/:otherUserId", requireAuth, async (req, res) => {
    const userId = (req.user as any).id;
    const msgs = await storage.getMessagesBetween(userId, req.params.otherUserId);
    await storage.markMessagesRead(req.params.otherUserId, userId);
    res.json(msgs);
  });

  app.get("/api/conversations", requireAdmin, async (req, res) => {
    const adminId = (req.user as any).id;
    const convs = await storage.getConversations(adminId);
    const result = await Promise.all(
      convs.map(async ({ clientId, lastMessage }) => {
        const client = await storage.getUser(clientId);
        const { password: _, ...safeClient } = client || ({ name: "Unknown", email: "" } as any);
        return { client: safeClient, lastMessage };
      })
    );
    res.json(result);
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    const senderId = (req.user as any).id;
    const { receiverId, content, fileUrl, fileName } = req.body;
    const msg = await storage.createMessage({ senderId, receiverId, content, fileUrl, fileName });
    sendToUser(receiverId, { type: "message", message: msg });
    res.json(msg);
  });

  app.patch("/api/messages/:id", requireAuth, async (req, res) => {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: "Content required" });
    const msg = await storage.getMessage(req.params.id);
    if (!msg) return res.status(404).json({ message: "Not found" });
    if (msg.senderId !== (req.user as any).id) return res.status(403).json({ message: "Forbidden" });
    const updated = await storage.updateMessage(req.params.id, content.trim());
    const otherId = msg.senderId === (req.user as any).id ? msg.receiverId : msg.senderId;
    sendToUser(otherId, { type: "message_updated", message: updated });
    res.json(updated);
  });

  app.delete("/api/messages/:id", requireAuth, async (req, res) => {
    const msg = await storage.getMessage(req.params.id);
    if (!msg) return res.status(404).json({ message: "Not found" });
    if (msg.senderId !== (req.user as any).id) return res.status(403).json({ message: "Forbidden" });
    await storage.deleteMessage(req.params.id);
    const otherId = msg.senderId === (req.user as any).id ? msg.receiverId : msg.senderId;
    sendToUser(otherId, { type: "message_deleted", messageId: req.params.id });
    res.json({ message: "Deleted" });
  });

  app.get("/api/messages/unread/count", requireAuth, async (req, res) => {
    const count = await storage.getUnreadCount((req.user as any).id);
    res.json({ count });
  });

  // Progress
  app.get("/api/progress/:clientId", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (user.role === "client" && user.id !== req.params.clientId) return res.status(403).json({ message: "Forbidden" });
    const prog = await storage.getProgress(req.params.clientId);
    res.json(prog || { offerCreation: 0, funnelProgress: 0, contentProgress: 0, monetizationProgress: 0 });
  });

  app.put("/api/progress/:clientId", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (user.role === "client" && user.id !== req.params.clientId) return res.status(403).json({ message: "Forbidden" });
    const data = { ...req.body, clientId: req.params.clientId };
    const parsed = insertProgressSchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const prog = await storage.upsertProgress(parsed.data);
    sendToUser(req.params.clientId, { type: "progress_update" });
    if (user.role === "client") {
      const admin = await storage.getUserByEmail("admin@brandverse.com");
      if (admin) sendToUser(admin.id, { type: "progress_update", clientId: req.params.clientId });
    }
    res.json(prog);
  });

  // Call Feedback
  app.get("/api/calls/:clientId", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (user.role === "client" && user.id !== req.params.clientId) return res.status(403).json({ message: "Forbidden" });
    const calls = await storage.getCallFeedbackByClient(req.params.clientId);
    res.json(calls);
  });

  app.post("/api/calls", requireAdmin, async (req, res) => {
    const parsed = insertCallFeedbackSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const cf = await storage.createCallFeedback(parsed.data);
    await storage.createNotification({ clientId: cf.clientId, message: `New call feedback uploaded: ${cf.title}`, type: "call" });
    sendToUser(cf.clientId, { type: "notification", message: `New call feedback uploaded` });
    res.json(cf);
  });

  app.patch("/api/calls/:id", requireAdmin, async (req, res) => {
    const cf = await storage.updateCallFeedback(req.params.id, req.body);
    res.json(cf);
  });

  app.delete("/api/calls/:id", requireAdmin, async (req, res) => {
    await storage.deleteCallFeedback(req.params.id);
    res.json({ message: "Deleted" });
  });

  // Tasks
  app.get("/api/tasks/:clientId", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (user.role === "client" && user.id !== req.params.clientId) return res.status(403).json({ message: "Forbidden" });
    const list = await storage.getTasksByClient(req.params.clientId);
    res.json(list);
  });

  app.post("/api/tasks", requireAdmin, async (req, res) => {
    const parsed = insertTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const task = await storage.createTask(parsed.data);
    await storage.createNotification({ clientId: task.clientId, message: `New task assigned: ${task.title}`, type: "task" });
    sendToUser(task.clientId, { type: "notification", message: `New task: ${task.title}` });
    res.json(task);
  });

  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    const task = await storage.updateTask(req.params.id, req.body);
    res.json(task);
  });

  app.delete("/api/tasks/:id", requireAdmin, async (req, res) => {
    await storage.deleteTask(req.params.id);
    res.json({ message: "Deleted" });
  });

  // Notifications
  app.get("/api/notifications", requireAuth, async (req, res) => {
    const notifs = await storage.getNotificationsByClient((req.user as any).id);
    res.json(notifs);
  });

  app.post("/api/notifications", requireAdmin, async (req, res) => {
    const parsed = insertNotificationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const notif = await storage.createNotification(parsed.data);
    sendToUser(notif.clientId, { type: "notification", message: notif.message });
    res.json(notif);
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    await storage.markNotificationRead(req.params.id);
    res.json({ message: "Marked read" });
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    await storage.markAllNotificationsRead((req.user as any).id);
    res.json({ message: "All marked read" });
  });

  app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
    await storage.deleteNotification(req.params.id);
    res.json({ message: "Notification deleted" });
  });

  // Client submits their own call feedback
  app.patch("/api/calls/:id/client-feedback", requireAuth, async (req, res) => {
    const user = req.user as any;
    const cf = await storage.getCallFeedback(req.params.id);
    if (!cf) return res.status(404).json({ message: "Not found" });
    if (user.role === "client" && user.id !== cf.clientId) return res.status(403).json({ message: "Forbidden" });
    const { clientFeedback, clientLearnings } = req.body;
    const updated = await storage.updateCallFeedback(req.params.id, { clientFeedback, clientLearnings });
    res.json(updated);
  });

  // Content Posts
  app.get("/api/content/:clientId", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (user.role === "client" && user.id !== req.params.clientId) return res.status(403).json({ message: "Forbidden" });
    const posts = await storage.getContentPostsByClient(req.params.clientId);
    res.json(posts);
  });

  app.post("/api/content", requireAuth, async (req, res) => {
    const user = req.user as any;
    const data = {
      ...req.body,
      clientId: user.role === "admin" ? req.body.clientId : user.id,
      postDate: req.body.postDate ? new Date(req.body.postDate) : undefined,
    };
    const parsed = insertContentPostSchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const post = await storage.createContentPost(parsed.data);

    res.json(post);
  });

  app.patch("/api/content/:id", requireAuth, async (req, res) => {
    const user = req.user as any;
    const post = await storage.getContentPost(req.params.id);
    if (!post) return res.status(404).json({ message: "Not found" });
    if (user.role === "client" && user.id !== post.clientId) return res.status(403).json({ message: "Forbidden" });
    const body = { ...req.body };
    if (body.postDate && typeof body.postDate === "string") {
      body.postDate = new Date(body.postDate);
    }
    const updated = await storage.updateContentPost(req.params.id, body);
    res.json(updated);
  });

  app.delete("/api/content/:id", requireAuth, async (req, res) => {
    const user = req.user as any;
    const post = await storage.getContentPost(req.params.id);
    if (!post) return res.status(404).json({ message: "Not found" });
    if (user.role === "client" && user.id !== post.clientId) return res.status(403).json({ message: "Forbidden" });
    await storage.deleteContentPost(req.params.id);
    res.json({ message: "Deleted" });
  });

  // ── Instagram / Apify Sync ────────────────────────────────────────────────
  async function apifyInstagram(payload: object): Promise<any[]> {
    const token = process.env.APIFY_TOKEN;
    if (!token) throw new Error("APIFY_TOKEN not configured");
    const url = `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${token}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Apify error ${resp.status}: ${text.slice(0, 200)}`);
    }
    return resp.json() as Promise<any[]>;
  }

  // Sync a single post's stats from its Instagram URL
  app.post("/api/instagram/sync-post", requireAuth, async (req: Request, res: Response) => {
    try {
      const { postUrl } = req.body;
      if (!postUrl) return res.status(400).json({ message: "postUrl required" });
      const items = await apifyInstagram({ directUrls: [postUrl], resultsType: "posts", resultsLimit: 1 });
      const item = items?.[0];
      if (!item) return res.status(404).json({ message: "No data returned for this URL" });
      return res.json({
        views: item.videoPlayCount ?? item.videoViewCount ?? item.playsCount ?? 0,
        likes: item.likesCount ?? 0,
        comments: item.commentsCount ?? 0,
        title: item.caption ? item.caption.slice(0, 120) : undefined,
        postDate: item.timestamp ? new Date(item.timestamp).toISOString() : undefined,
        contentType: item.type === "Video" || item.type === "Reel" ? "reel"
          : item.type === "Sidecar" ? "carousel" : "post",
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Sync a single post's metrics for a specific checkpoint (initial / 2w / 4w)
  app.post("/api/instagram/sync-checkpoint", requireAuth, async (req: Request, res: Response) => {
    try {
      const { postId, postUrl, checkpoint } = req.body;
      if (!postUrl || !postId || !checkpoint) return res.status(400).json({ message: "postId, postUrl, and checkpoint required" });
      const items = await apifyInstagram({ directUrls: [postUrl], resultsType: "posts", resultsLimit: 1 });
      const item = items?.[0];
      if (!item) return res.status(404).json({ message: "No data returned for this Instagram URL" });

      const v = item.videoPlayCount ?? item.videoViewCount ?? item.playsCount ?? 0;
      const l = item.likesCount ?? 0;
      const c = item.commentsCount ?? 0;
      const s = item.savesCount ?? 0;
      const now = new Date();

      let updateData: any = {};
      if (checkpoint === "initial") {
        updateData = { views: v, likes: l, comments: c, saves: s, initialSyncedAt: now };
      } else if (checkpoint === "2w") {
        updateData = { views2w: v, likes2w: l, comments2w: c, saves2w: s, twoWeekSyncedAt: now };
      } else if (checkpoint === "4w") {
        updateData = { views4w: v, likes4w: l, comments4w: c, saves4w: s, fourWeekSyncedAt: now };
      } else {
        return res.status(400).json({ message: "Invalid checkpoint" });
      }
      const updated = await storage.updateContentPost(postId, updateData);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Bulk import a profile's recent posts
  app.post("/api/instagram/sync-profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const { profileUrl, clientId, platform } = req.body;
      if (!profileUrl || !clientId) return res.status(400).json({ message: "profileUrl and clientId required" });
      const resultsType = platform === "youtube" ? "posts" : "posts";
      const items = await apifyInstagram({ directUrls: [profileUrl], resultsType, resultsLimit: 20 });
      if (!items?.length) return res.status(404).json({ message: "No posts found for this profile" });
      const created: any[] = [];
      for (const item of items) {
        try {
          const post = await storage.createContentPost({
            clientId,
            platform: platform ?? "instagram",
            title: item.caption ? item.caption.slice(0, 120) : "Untitled",
            postUrl: item.url ?? item.shortCode ? `https://instagram.com/p/${item.shortCode}` : null,
            postDate: item.timestamp ? new Date(item.timestamp) : new Date(),
            contentType: item.type === "Video" || item.type === "Reel" ? "reel"
              : item.type === "Sidecar" ? "carousel" : "post",
            funnelStage: "top",
            views: item.videoPlayCount ?? item.videoViewCount ?? item.playsCount ?? 0,
            likes: item.likesCount ?? 0,
            comments: item.commentsCount ?? 0,
            saves: 0,
            followersGained: 0,
            subscribersGained: 0,
          });
          created.push(post);
        } catch (_) { /* skip duplicates/errors */ }
      }
      return res.json({ imported: created.length, posts: created });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Income Goals
  app.get("/api/income-goal/:clientId", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (user.role === "client" && user.id !== req.params.clientId) return res.status(403).json({ message: "Forbidden" });
    const goal = await storage.getIncomeGoal(req.params.clientId);
    res.json(goal || null);
  });

  app.post("/api/income-goal", requireAuth, async (req, res) => {
    const user = req.user as any;
    const data = { ...req.body, clientId: user.role === "admin" ? req.body.clientId : user.id };
    const parsed = insertIncomeGoalSchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const goal = await storage.upsertIncomeGoal(parsed.data);
    res.json(goal);
  });

  // Chat file upload
  app.post("/api/messages/upload", requireAuth, upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file" });
    const { receiverId } = req.body;
    if (!receiverId) return res.status(400).json({ message: "receiverId required" });
    const fileUrl = `/uploads/${req.file.filename}`;
    const msg = await storage.createMessage({
      senderId: (req.user as any).id,
      receiverId,
      content: req.file.originalname,
      fileUrl,
      fileName: req.file.originalname,
      fileMime: req.file.mimetype,
    });
    sendToUser(receiverId, { type: "message", message: msg });
    res.json(msg);
  });

  // AI Content Ideas
  // ── Groq helper (fast – used for content ideas) ──────────────────────────
  async function callGroq(systemPrompt: string, userPrompt: string, maxTokens = 3000): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY not configured");

    const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];
    let lastError = "";
    for (const model of models) {
      try {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
            temperature: 0.9,
            max_tokens: maxTokens,
          }),
        });
        const data: any = await r.json();
        if (data?.error) { lastError = data.error.message; console.warn(`Groq ${model} error: ${lastError}`); continue; }
        const text = data?.choices?.[0]?.message?.content;
        if (text) return text;
      } catch (e: any) { lastError = e.message; }
    }
    throw new Error(`Groq generation failed: ${lastError}`);
  }

  // ── OpenRouter helper (smart – used for reports) ──────────────────────────
  async function callOpenRouter(systemPrompt: string, userPrompt: string, maxTokens = 4000): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

    const models = ["deepseek/deepseek-chat", "anthropic/claude-3-haiku", "openai/gpt-4o-mini"];
    let lastError = "";
    for (const model of models) {
      try {
        const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://brandverse.app",
            "X-Title": "Brandverse Portal",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
            temperature: 0.7,
            max_tokens: maxTokens,
          }),
        });
        const data: any = await r.json();
        if (data?.error) { lastError = data.error.message || JSON.stringify(data.error); console.warn(`OpenRouter ${model} error: ${lastError}`); continue; }
        const text = data?.choices?.[0]?.message?.content;
        if (text) return text;
      } catch (e: any) { lastError = e.message; }
    }
    throw new Error(`OpenRouter generation failed: ${lastError}`);
  }

  // ── Scrape Instagram profile without saving (for AI context) ─────────────
  app.post("/api/instagram/scrape-profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const { profileUrl } = req.body;
      if (!profileUrl) return res.status(400).json({ message: "profileUrl required" });
      const items = await apifyInstagram({ directUrls: [profileUrl], resultsType: "posts", resultsLimit: 20 });
      if (!items?.length) return res.json({ posts: [] });
      const posts = items.map((item: any) => ({
        title: item.caption ? item.caption.slice(0, 120) : "Untitled",
        contentType: item.type === "Video" || item.type === "Reel" ? "reel" : item.type === "Sidecar" ? "carousel" : "post",
        views: item.videoPlayCount ?? item.videoViewCount ?? item.playsCount ?? 0,
        likes: item.likesCount ?? 0,
        comments: item.commentsCount ?? 0,
        postDate: item.timestamp,
        url: item.url ?? (item.shortCode ? `https://instagram.com/p/${item.shortCode}` : null),
      }));
      return res.json({ posts });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Instagram Profile Setup: get saved report ─────────────────────────────
  app.get("/api/instagram/profile-report", requireAuth, async (req: Request, res: Response) => {
    try {
      const clientId = (req as any).user.id;
      const report = await storage.getInstagramProfileReport(clientId);
      res.json(report ?? null);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Instagram Profile Setup: scrape + sync + AI analyze ──────────────────
  app.post("/api/instagram/analyze-profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const clientId = (req as any).user.id;
      const { profileUrl } = req.body;
      if (!profileUrl) return res.status(400).json({ message: "profileUrl required" });

      // extract handle from URL
      const handleMatch = profileUrl.match(/instagram\.com\/([^/?#]+)/);
      const handle = handleMatch ? handleMatch[1].replace(/^@/, "") : null;

      // 1. Scrape last 30 posts via Apify
      const items = await apifyInstagram({ directUrls: [profileUrl], resultsType: "posts", resultsLimit: 30 });
      if (!items?.length) return res.status(404).json({ message: "No posts found — make sure the account is public." });

      // 2. Sync posts to content tracking (upsert by url; skip duplicates)
      const existingPosts = await storage.getContentPostsByClient(clientId);
      const existingUrls = new Set(existingPosts.map((p: any) => p.postUrl).filter(Boolean));
      let imported = 0;
      for (const item of items) {
        const postUrl = item.url ?? (item.shortCode ? `https://instagram.com/p/${item.shortCode}` : null);
        if (!postUrl || existingUrls.has(postUrl)) continue;
        try {
          await storage.createContentPost({
            clientId,
            platform: "instagram",
            title: item.caption ? item.caption.slice(0, 120) : "Untitled",
            postUrl,
            postDate: item.timestamp ? new Date(item.timestamp) : new Date(),
            contentType: item.type === "Video" || item.type === "Reel" ? "reel"
              : item.type === "Sidecar" ? "carousel" : "post",
            funnelStage: "top",
            views: item.videoPlayCount ?? item.videoViewCount ?? item.playsCount ?? 0,
            likes: item.likesCount ?? 0,
            comments: item.commentsCount ?? 0,
            saves: 0,
            followersGained: 0,
            subscribersGained: 0,
          });
          imported++;
        } catch (_) { /* skip */ }
      }

      // 3. Build data summary for AI
      const totalLikes = items.reduce((s: number, p: any) => s + (p.likesCount ?? 0), 0);
      const totalComments = items.reduce((s: number, p: any) => s + (p.commentsCount ?? 0), 0);
      const totalViews = items.reduce((s: number, p: any) => s + (p.videoPlayCount ?? p.videoViewCount ?? p.playsCount ?? 0), 0);
      const reels = items.filter((p: any) => p.type === "Video" || p.type === "Reel").length;
      const carousels = items.filter((p: any) => p.type === "Sidecar").length;
      const posts = items.filter((p: any) => p.type !== "Video" && p.type !== "Reel" && p.type !== "Sidecar").length;
      const captions = items.slice(0, 10).map((p: any) => p.caption?.slice(0, 200)).filter(Boolean);
      const topByLikes = [...items].sort((a: any, b: any) => (b.likesCount ?? 0) - (a.likesCount ?? 0)).slice(0, 3);

      const systemPrompt = `You are an elite Instagram growth strategist. Analyze Instagram profile data and return ONLY valid JSON — no markdown, no extra text.`;
      const userPrompt = `Analyze this Instagram account and return a detailed profile report as JSON.

Handle: @${handle ?? "unknown"}
Posts analyzed: ${items.length}
Total likes: ${totalLikes}, Total comments: ${totalComments}, Total views: ${totalViews}
Content breakdown: ${reels} Reels, ${carousels} Carousels, ${posts} Static posts
Sample captions: ${JSON.stringify(captions)}
Top 3 posts by likes: ${JSON.stringify(topByLikes.map((p: any) => ({ likes: p.likesCount, comments: p.commentsCount, type: p.type, caption: p.caption?.slice(0, 100) })))}

Return this exact JSON structure:
{
  "niche": "primary niche category (e.g. Business & Entrepreneurship, Fitness, Fashion, etc.)",
  "subniche": "specific sub-niche (e.g. Online Coaching, Weight Loss for Moms, Streetwear, etc.)",
  "audienceType": "description of likely audience (age range, interests, demographics)",
  "contentStyle": "overall content style and tone",
  "topContentType": "best performing content format based on data",
  "avgEngagementRate": "estimated engagement rate as string (e.g. 3.2%)",
  "postFrequency": "estimated posting frequency based on sample (e.g. ~4 posts/week)",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "gaps": ["gap 1", "gap 2", "gap 3"],
  "recommendations": ["specific actionable tip 1", "specific actionable tip 2", "specific actionable tip 3", "tip 4"],
  "summary": "2-3 sentence overview of the account's positioning, audience, and growth potential"
}`;

      const raw = await callOpenRouter(systemPrompt, userPrompt, 1500);
      let report: any;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        report = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      } catch {
        return res.status(500).json({ message: "AI returned invalid JSON. Please try again." });
      }

      // 4. Save to DB
      const saved = await storage.upsertInstagramProfileReport({
        clientId,
        instagramUrl: profileUrl,
        handle,
        postCount: items.length,
        report,
      });

      return res.json({ ...saved, newPostsImported: imported });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Admin: get all AI idea generation logs
  app.get("/api/ai/idea-logs", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const logs = await storage.getAiIdeaLogs();
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── AI Content Ideas (Groq — fast) ───────────────────────────────────────
  app.post("/api/ai/content-ideas", requireAuth, async (req: Request, res: Response) => {
    try {
      const { platform, niche, contentType, goal, audience, additionalContext, profileHandle, existingPosts, scrapedPosts } = req.body;
      if (!platform || !niche) return res.status(400).json({ message: "Platform and niche are required" });

      const platformLabel = platform === "instagram" ? "Instagram" : "YouTube";
      const goalLabel = goal || "growth and engagement";
      const audienceLabel = audience || "general audience";

      let profileSection = "";
      if (profileHandle) profileSection = `Creator handle: ${profileHandle}\n`;

      // Merge logged posts + real scraped posts for richer context
      const allContextPosts: any[] = [
        ...(Array.isArray(existingPosts) ? existingPosts : []),
        ...(Array.isArray(scrapedPosts) ? scrapedPosts : []),
      ];

      let existingContentSection = "";
      if (allContextPosts.length > 0) {
        const posts = allContextPosts;
        const typeCounts: Record<string, number> = {};
        posts.forEach((p: any) => { typeCounts[p.contentType] = (typeCounts[p.contentType] || 0) + 1; });
        const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
        const avgViews = Math.round(posts.reduce((s: number, p: any) => s + (p.views || 0), 0) / posts.length);
        const avgLikes = Math.round(posts.reduce((s: number, p: any) => s + (p.likes || 0), 0) / posts.length);
        const topPost = [...posts].sort((a: any, b: any) => (b.views || 0) - (a.views || 0))[0];
        const recentTitles = posts.slice(0, 10).map((p: any) => p.title).filter(Boolean);
        const isRealData = scrapedPosts && Array.isArray(scrapedPosts) && scrapedPosts.length > 0;
        existingContentSection = `\n${isRealData ? "REAL Instagram profile analysis" : "Existing content analysis"} (use this to craft ideas that fill gaps and beat their best performers):
- Total posts analysed: ${posts.length}${isRealData ? " (real scraped data)" : ""}
- Avg views: ${avgViews.toLocaleString()} | Avg likes: ${avgLikes.toLocaleString()}
- Most-used format: ${topType ? `${topType[0]} (${topType[1]} posts)` : "mixed"}
- Best performing post: "${topPost?.title}" — ${(topPost?.views || 0).toLocaleString()} views / ${(topPost?.likes || 0).toLocaleString()} likes
- Recent post titles (DO NOT repeat these topics verbatim): ${recentTitles.map((t: string) => `"${t}"`).join(", ")}
Generate ideas that are FRESH, fill clear content gaps, and strategically build on what's already working.\n`;
      }

      const ytFormatSection = platform === "youtube" ? `
YouTube format options (match the selected content type):
- Short Form: YouTube Shorts, quick tips, viral hooks, micro lessons
- Long Form: Deep educational videos, tutorials, case studies, step-by-step guides
- Value Based: Educational breakdowns, framework explanations, strategy videos
- VSL Style: Problem–solution videos, authority videos, offer explanation, story-based persuasion
` : "";

      const isYouTube = platform === "youtube";

      const systemPrompt = `You are an elite social media content strategist and YouTube/Instagram expert. You generate scroll-stopping, viral-worthy content ideas that are deeply specific, strategic, and actionable. You NEVER give generic ideas. Every idea is tailored to the exact niche, audience, and platform algorithm. For YouTube content, when you create list-style videos (e.g. "5 Ways to...", "7 Mistakes...", "3 Secrets..."), you MUST provide the actual numbered points in full detail — not placeholders.`;

      const userPrompt = `${profileSection}Generate 6 powerful content ideas for a ${platformLabel} creator.

Niche: ${niche}
Content type: ${contentType || (platform === "instagram" ? "Mix of Reels, Carousels, Posts" : "Mix of Long Form, Value-Based, and Short Form videos")}
Goal: ${goalLabel}
Target audience: ${audienceLabel}
${additionalContext ? `Extra context: ${additionalContext}` : ""}
${existingContentSection}${ytFormatSection}
For each idea provide ALL of these fields:
1. title — A specific, scroll-stopping hook (max 12 words). NOT generic. ${isYouTube ? 'Use formats like "5 Ways to...", "Why Most [audience] Fail At...", "The Truth About...", "How I [result] in [timeframe]"' : 'Example: "3 Instagram mistakes keeping coaches stuck under 10k followers"'}
2. concept — 2-3 sentences explaining exactly what the content covers and why it will perform
3. formatType — The exact format${isYouTube ? ' (e.g. "Long-form Tutorial", "YouTube Short", "VSL", "Educational Breakdown", "Value Video", "Story-based Video")' : ' (e.g. "Instagram Reel", "Carousel", "Static Post")'}
4. whyItWorks — 1-2 sentences on the viral potential, algorithm advantage, and conversion power of this idea
5. cta — A specific, compelling call-to-action tailored to this piece of content
6. captionStarter — An attention-grabbing opening line for the caption or script hook they can copy directly${isYouTube ? `
7. keyPoints — REQUIRED for YouTube: If the title includes a number (e.g. "5 Ways to..."), list every single numbered point in detail as an array of strings. Each point must be a complete, actionable sentence (not a vague placeholder). Example: ["1. Optimise your thumbnail with high-contrast text and a clear emotion — viewers decide in 0.4 seconds", "2. ..."]` : ""}

Also add a contentMix suggestion at the end as a separate JSON object (not inside ideas array).

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "ideas": [
    {
      "title": "...",
      "concept": "...",
      "formatType": "...",
      "whyItWorks": "...",
      "cta": "...",
      "captionStarter": "..."${isYouTube ? `,
      "keyPoints": ["1. detailed point...", "2. detailed point...", "3. ..."]` : ""}
    }
  ],
  "contentMix": {
    "growth": 40,
    "value": 40,
    "conversion": 20,
    "suggestion": "One sentence on ideal posting mix for this niche and goal"
  }
}`;

      const text = await callGroq(systemPrompt, userPrompt, 3500);

      const jsonMatch = text.trim().match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ message: "Failed to parse AI response" });

      const parsed = JSON.parse(jsonMatch[0]);

      // Log this generation for admin visibility
      try {
        const user = req.user as any;
        await storage.createAiIdeaLog({
          clientId: user.id,
          platform,
          niche,
          contentType: contentType || undefined,
          goal: goal || undefined,
          ideasCount: parsed.ideas?.length ?? 6,
        });
      } catch (_) { /* non-critical, don't fail the request */ }

      res.json(parsed);
    } catch (err: any) {
      console.error("AI ideas error:", err);
      res.status(500).json({ message: err.message || "AI generation failed" });
    }
  });

  // ── AI Full Script Generator ───────────────────────────────────────────────
  app.post("/api/ai/full-script", requireAuth, async (req: Request, res: Response) => {
    try {
      const { title, concept, captionStarter, keyPoints, cta, platform, niche, goal } = req.body;
      if (!title) return res.status(400).json({ message: "Title is required" });

      const isYt = platform === "youtube";
      const prompt = isYt
        ? `You are a world-class YouTube scriptwriter. Generate a complete, production-ready YouTube video script for the following idea.

VIDEO IDEA: ${title}
CONCEPT: ${concept || ""}
NICHE: ${niche || "not specified"}
GOAL: ${goal || "grow audience"}
OPENING HOOK DIRECTION: ${captionStarter || ""}
KEY POINTS TO COVER: ${(keyPoints || []).join(", ")}
CTA: ${cta || ""}

Write a FULL YouTube script in this exact format:

## HOOK (0:00 - 0:20)
[Write 3-4 attention-grabbing opening sentences. Pattern interrupt. Make them STOP scrolling.]

## INTRO (0:20 - 0:45)
[Quick intro, establish credibility, promise of the video, what they will learn]

## BODY - MAIN CONTENT
[Write each section with a heading. Include exact words to say, not just bullet points. Be conversational. 800-1200 words for the body. Use storytelling. Include B-roll suggestions in [brackets].]

### Section 1: [Topic]
[Script...]

### Section 2: [Topic]
[Script...]

### Section 3: [Topic]
[Script...]

## ENGAGEMENT PROMPT (mid-video)
[Ask viewers to comment with something specific]

## CONCLUSION & CTA
[Wrap up with key takeaway. Strong CTA. What to watch next.]

## END SCREEN
[What to say while end screen plays]

Make the script feel natural and conversational. Include exact dialogue, transitions, and energy cues. Total script should be 800-1500 words.`
        : `You are a world-class Instagram Reels / short-form video scriptwriter. Generate a complete, production-ready script for the following idea.

REEL IDEA: ${title}
CONCEPT: ${concept || ""}
NICHE: ${niche || "not specified"}
GOAL: ${goal || "grow followers"}
OPENING HOOK: ${captionStarter || ""}
KEY POINTS: ${(keyPoints || []).join(", ")}
CTA: ${cta || ""}

Write a FULL Instagram Reel script in this exact format:

## HOOK (First 1-3 seconds)
[Write the EXACT opening line — the words they say or text on screen. Must stop the scroll instantly.]

## PROBLEM / RELATABILITY (3-10 seconds)
[Establish the pain point or situation. Viewers must nod and say "that's me"]

## CONTENT BODY (10-40 seconds)
[The main value delivery. Write it as exact spoken words. Short punchy sentences. Include visual direction in [brackets]. Use pattern interrupts every 5-7 seconds.]

Spoken words:
[Exact script...]

Visual notes:
[Camera angles, text overlays, cuts, transitions]

## HOOK CALLBACK / PAYOFF (40-50 seconds)
[Reference back to the hook. Deliver the promised value or reveal.]

## CTA (Last 3-5 seconds)
[Exact CTA line. One clear action — comment, follow, save, share, or DM.]

## CAPTION
[Write a complete caption with hook, body (3-5 lines), hashtags (15-20 relevant tags), and CTA]

## AUDIO SUGGESTION
[Type of music or trending sound that fits]

Keep the entire reel script to 45-60 seconds when read aloud. Every single word must earn its place.`;

      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      if (!GROQ_API_KEY) return res.status(500).json({ message: "AI service not configured" });

      const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];
      let script = "";

      for (const model of models) {
        try {
          const gr = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: prompt }],
              max_tokens: 2500,
              temperature: 0.8,
            }),
          });
          if (!gr.ok) continue;
          const gd = await gr.json();
          script = gd.choices?.[0]?.message?.content || "";
          if (script.length > 200) break;
        } catch { continue; }
      }

      if (!script) return res.status(500).json({ message: "Script generation failed" });
      res.json({ script });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Script generation failed" });
    }
  });

  // ── AI Content Report (OpenRouter — smart reasoning) ─────────────────────
  app.post("/api/ai/content-report", requireAuth, async (req: Request, res: Response) => {
    try {
      const { posts, platform } = req.body;
      if (!posts || posts.length === 0) return res.status(400).json({ message: "No posts to analyze" });

      const isYt = platform === "youtube";
      const totalViews = posts.reduce((s: number, p: any) => s + (p.views || 0), 0);
      const avgViews = Math.round(totalViews / posts.length);
      const erValues = posts.map((p: any) => p.views > 0 ? ((p.likes + p.comments + p.saves) / p.views * 100) : 0).filter((v: number) => v > 0);
      const avgEr = erValues.length > 0 ? (erValues.reduce((s: number, v: number) => s + v, 0) / erValues.length).toFixed(2) : "0.00";
      const bestPost = [...posts].sort((a: any, b: any) => (b.views || 0) - (a.views || 0))[0];
      const worstPost = [...posts].sort((a: any, b: any) => (a.views || 0) - (b.views || 0))[0];
      const typeCounts: Record<string, number> = {};
      posts.forEach((p: any) => { typeCounts[p.contentType] = (typeCounts[p.contentType] || 0) + 1; });
      const allTypes = Object.entries(typeCounts).map(([type, count]) => `${type}: ${count}`).join(", ");

      const systemPrompt = `You are a world-class social media analyst and growth strategist. You provide deep, actionable insights based on real data. Your analysis is specific, not generic. You understand platform algorithms, content strategy, and audience psychology deeply.`;

      const userPrompt = `Analyze this ${isYt ? "YouTube" : "Instagram"} content performance data and generate a comprehensive strategic report.

PERFORMANCE DATA:
- Total posts analyzed: ${posts.length}
- Total views: ${totalViews.toLocaleString()}
- Average views per post: ${avgViews.toLocaleString()}
${!isYt ? `- Average engagement rate: ${avgEr}%` : ""}
- Best post: "${bestPost?.title || "Untitled"}" — ${(bestPost?.views || 0).toLocaleString()} views
- Worst post: "${worstPost?.title || "Untitled"}" — ${(worstPost?.views || 0).toLocaleString()} views
- Content type breakdown: ${allTypes}
- Date range: ${posts.length > 0 ? `${new Date(posts[posts.length - 1].postDate).toLocaleDateString()} to ${new Date(posts[0].postDate).toLocaleDateString()}` : "N/A"}

Individual post data:
${posts.slice(0, 15).map((p: any) => `- "${p.title || 'Untitled'}" | ${p.contentType} | ${(p.views || 0).toLocaleString()} views${!isYt ? ` | ${(p.likes || 0)} likes | ${(p.comments || 0)} comments | ${(p.saves || 0)} saves` : ""}`).join("\n")}

Return ONLY a JSON object (no markdown, no text outside JSON):
{
  "summary": "2-3 sentence executive summary with specific numbers and honest assessment",
  "insights": ["specific data-driven insight 1", "insight 2", "insight 3", "insight 4"],
  "topPost": { "title": "exact post title", "reason": "specific reason why it outperformed" },
  "recommendations": ["specific actionable recommendation 1", "recommendation 2", "recommendation 3", "recommendation 4"],
  "avgEngagement": "${avgEr}",
  "avgViews": ${avgViews},
  "growthTrend": "↑ Growing | → Stable | ↓ Declining",
  "contentMixAnalysis": "One sentence on their current content mix and whether it's balanced"
}`;

      const text = await callOpenRouter(systemPrompt, userPrompt, 2500);

      const jsonMatch = text.trim().match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ message: "Failed to parse AI response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (err: any) {
      console.error("AI report error:", err);
      res.status(500).json({ message: err.message || "AI report failed" });
    }
  });

  // Call Bookings (Calendly integration)
  app.get("/api/call-bookings", requireAdmin, async (_req, res) => {
    const bookings = await storage.getAllCallBookings();
    res.json(bookings);
  });

  app.get("/api/call-bookings/my", requireAuth, async (req, res) => {
    const user = req.user as any;
    const bookings = await storage.getCallBookingsByClient(user.id);
    res.json(bookings);
  });

  app.post("/api/webhooks/calendly", async (req: Request, res: Response) => {
    try {
      const event = req.body;
      const eventType = event?.event;
      const payload = event?.payload;

      if (!payload) return res.status(400).json({ message: "Invalid payload" });

      const inviteeName = payload?.invitee?.name || "Unknown";
      const inviteeEmail = payload?.invitee?.email || "";
      const startTime = payload?.event?.start_time || payload?.scheduled_event?.start_time;
      const endTime = payload?.event?.end_time || payload?.scheduled_event?.end_time;
      const eventName = payload?.event_type?.name || "30 Min Call";
      const calendlyEventUri = payload?.event?.uri || payload?.uri || "";
      const status = eventType === "invitee.canceled" ? "canceled" : "scheduled";

      if (!startTime || !endTime) return res.status(400).json({ message: "Missing time data" });

      const client = inviteeEmail ? await storage.getUserByEmail(inviteeEmail) : null;

      const existing = calendlyEventUri ? await storage.getCallBookingByCalendlyUri(calendlyEventUri) : null;

      if (existing) {
        await storage.updateCallBooking(existing.id, { status });
      } else {
        const booking = await storage.createCallBooking({
          clientId: client?.id || null,
          inviteeName,
          inviteeEmail,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          eventName,
          status,
          calendlyEventUri,
        });

        if (client) {
          await storage.createNotification({
            clientId: client.id,
            message: `Your call has been booked for ${new Date(startTime).toLocaleDateString()} at ${new Date(startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
            type: "booking",
          });
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Calendly webhook error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // All call feedback (admin)
  app.get("/api/call-feedback/all", requireAdmin, async (_req, res) => {
    const allClients = await storage.getAllClients();
    const allFeedback: any[] = [];
    for (const client of allClients) {
      const fb = await storage.getCallFeedbackByClient(client.id);
      allFeedback.push(...fb);
    }
    allFeedback.sort((a, b) => new Date(b.callDate).getTime() - new Date(a.callDate).getTime());
    res.json(allFeedback);
  });

  // ── DM Tracker ────────────────────────────────────────────────────────────
  app.get("/api/dm/leads", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const clientId = req.query.clientId as string;
      let leads;
      if (user.role === "admin" && clientId) leads = await storage.getDmLeads(clientId);
      else if (user.role === "admin") leads = await storage.getAllDmLeads();
      else leads = await storage.getDmLeads(user.id);
      return res.json(leads);
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  app.post("/api/dm/leads", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const clientId = user.role === "admin" ? (req.body.clientId || user.id) : user.id;
      const lead = await storage.createDmLead({ ...req.body, clientId });
      return res.json(lead);
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/dm/leads/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const lead = await storage.updateDmLead(req.params.id, req.body);
      return res.json(lead);
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/dm/leads/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteDmLead(req.params.id);
      return res.json({ success: true });
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  app.get("/api/dm/quick-replies", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const clientId = (req.query.clientId as string) || user.id;
      const replies = await storage.getDmQuickReplies(clientId);
      return res.json(replies);
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  app.post("/api/dm/quick-replies", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const clientId = user.role === "admin" ? (req.body.clientId || user.id) : user.id;
      const reply = await storage.createDmQuickReply({ ...req.body, clientId });
      return res.json(reply);
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/dm/quick-replies/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteDmQuickReply(req.params.id);
      return res.json({ success: true });
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // ── Competitor Analysis ────────────────────────────────────────────────────
  function extractHandle(url: string): string {
    const m = url.match(/instagram\.com\/([^/?#]+)/);
    return m ? `@${m[1]}` : url;
  }

  function processProfileMetrics(items: any[], handle: string) {
    if (!items?.length) return null;
    const posts = items.slice(0, 20);
    const totalViews = posts.reduce((s: number, p: any) => s + (p.videoPlayCount ?? p.videoViewCount ?? p.playsCount ?? 0), 0);
    const totalLikes = posts.reduce((s: number, p: any) => s + (p.likesCount ?? 0), 0);
    const totalComments = posts.reduce((s: number, p: any) => s + (p.commentsCount ?? 0), 0);
    const totalSaves = posts.reduce((s: number, p: any) => s + (p.savesCount ?? 0), 0);
    const avgViews = Math.round(totalViews / posts.length);
    const avgLikes = Math.round(totalLikes / posts.length);
    const avgComments = Math.round(totalComments / posts.length);
    const avgER = avgViews > 0 ? +(((avgLikes + totalComments + totalSaves) / totalViews) * 100).toFixed(2) : 0;

    const typeCount: Record<string, number> = {};
    for (const p of posts) {
      const t = p.type === "Video" || p.type === "Reel" ? "Reel" : p.type === "Sidecar" ? "Carousel" : "Post";
      typeCount[t] = (typeCount[t] || 0) + 1;
    }

    const dates = posts.map((p: any) => new Date(p.timestamp)).filter((d: Date) => !isNaN(d.getTime())).sort((a: Date, b: Date) => a.getTime() - b.getTime());
    let postsPerWeek = 0;
    if (dates.length > 1) {
      const weeks = (dates[dates.length - 1].getTime() - dates[0].getTime()) / (7 * 24 * 60 * 60 * 1000);
      postsPerWeek = weeks > 0 ? +(posts.length / weeks).toFixed(1) : posts.length;
    }

    const topPost = posts.reduce((best: any, p: any) => {
      const v = p.videoPlayCount ?? p.videoViewCount ?? p.playsCount ?? 0;
      return v > (best.videoPlayCount ?? best.videoViewCount ?? best.playsCount ?? 0) ? p : best;
    }, posts[0]);

    return {
      handle,
      totalPosts: posts.length,
      avgViews,
      avgLikes,
      avgComments,
      avgEngagementRate: avgER,
      postsPerWeek,
      contentTypes: typeCount,
      topPost: {
        caption: topPost?.caption ? topPost.caption.slice(0, 150) : "No caption",
        views: topPost?.videoPlayCount ?? topPost?.videoViewCount ?? topPost?.playsCount ?? 0,
      },
    };
  }

  app.post("/api/competitor/analyze", requireAuth, async (req: Request, res: Response) => {
    try {
      const { clientUrl, competitorUrl, clientId } = req.body;
      if (!clientUrl || !competitorUrl || !clientId) return res.status(400).json({ message: "clientUrl, competitorUrl, and clientId are required" });

      const [clientItems, competitorItems] = await Promise.all([
        apifyInstagram({ directUrls: [clientUrl], resultsType: "posts", resultsLimit: 30 }),
        apifyInstagram({ directUrls: [competitorUrl], resultsType: "posts", resultsLimit: 30 }),
      ]);

      const clientHandle = extractHandle(clientUrl);
      const competitorHandle = extractHandle(competitorUrl);

      const clientData = processProfileMetrics(clientItems, clientHandle);
      const competitorData = processProfileMetrics(competitorItems, competitorHandle);

      if (!clientData && !competitorData) return res.status(404).json({ message: "Could not scrape either profile. Make sure they are public Instagram accounts." });

      // Build per-post arrays for deep AI analysis
      function buildPostList(items: any[]) {
        return (items || []).slice(0, 20).map((p: any, i: number) => ({
          rank: i + 1,
          type: p.type === "Video" || p.type === "Reel" ? "Reel" : p.type === "Sidecar" ? "Carousel" : "Post",
          views: p.videoPlayCount ?? p.videoViewCount ?? p.playsCount ?? 0,
          likes: p.likesCount ?? 0,
          comments: p.commentsCount ?? 0,
          saves: p.savesCount ?? 0,
          caption: p.caption ? p.caption.slice(0, 300) : "",
          hashtags: Array.isArray(p.hashtags) ? p.hashtags.slice(0, 10).join(" ") : "",
          timestamp: p.timestamp ?? null,
          url: p.url ?? (p.shortCode ? `https://instagram.com/p/${p.shortCode}` : null),
        }));
      }

      const clientPosts = buildPostList(clientItems);
      const competitorPosts = buildPostList(competitorItems);

      const systemPrompt = `You are an elite Instagram growth strategist, content analyst, and competitive intelligence expert. Analyze Instagram profiles in extreme depth. Always respond with valid JSON only — no markdown, no explanation outside the JSON.`;

      const userPrompt = `Perform a DEEP competitor analysis between two Instagram accounts. Return ONLY a valid JSON object.

YOUR CLIENT: ${clientHandle}
Aggregate metrics: ${JSON.stringify(clientData)}
Posts (newest first): ${JSON.stringify(clientPosts)}

COMPETITOR: ${competitorHandle}
Aggregate metrics: ${JSON.stringify(competitorData)}
Posts (newest first): ${JSON.stringify(competitorPosts)}

Return this EXACT JSON structure (all fields required):
{
  "overview": {
    "assessment": "winning|competitive|losing",
    "outperformingIn": ["area1", "area2"],
    "summary": "2-3 sentence analysis of where client stands vs competitor"
  },
  "reelComparison": [
    {
      "userReel": { "rank": 1, "views": 0, "likes": 0, "comments": 0, "caption": "first 100 chars", "hook": "exact first line or sentence", "hookType": "curiosity|storytelling|authority|controversy|pain-point|education", "structure": "opening → middle → CTA breakdown", "retentionPotential": "Low|Medium|High|Very High", "emotion": "fear|curiosity|authority|relatability|aspiration|entertainment" },
      "competitorReel": { "rank": 1, "views": 0, "likes": 0, "comments": 0, "caption": "first 100 chars", "hook": "exact first line or sentence", "hookType": "curiosity|storytelling|authority|controversy|pain-point|education", "structure": "opening → middle → CTA breakdown", "retentionPotential": "Low|Medium|High|Very High", "emotion": "fear|curiosity|authority|relatability|aspiration|entertainment" },
      "verdict": "Detailed 2-3 sentence explanation of why competitor's performed better or worse and what content element drove that"
    }
  ],
  "contentPerformance": {
    "competitorWinsIn": ["metric1", "metric2"],
    "clientWinsIn": ["metric1"],
    "insights": "2-3 sentence insight about content performance patterns"
  },
  "contentPatterns": [
    { "pattern": "Pattern name", "description": "How they use it", "frequency": "e.g. 70% of posts", "howToReplicate": "Specific actionable step to copy this" }
  ],
  "viralDNA": [
    { "rank": 1, "views": 0, "hook": "exact hook text", "structure": "Opening hook → Core value → Pattern interrupt → CTA", "cta": "exact or paraphrased CTA used", "emotion": "primary emotion triggered", "winningFormula": "1-sentence repeatable formula the user can copy" }
  ],
  "gapAnalysis": {
    "gaps": [
      { "metric": "Gap name", "competitor": "what they do", "you": "what you do", "impact": "High|Medium|Low", "fix": "Specific action to close this gap" }
    ],
    "summary": "1-2 sentence summary of the biggest gap and its impact"
  },
  "hookLibrary": [
    { "hook": "exact hook text extracted from their content", "type": "curiosity|storytelling|authority|controversy|pain-point|education", "whyItWorks": "1 sentence psychological explanation" }
  ],
  "postingStrategy": {
    "competitorFrequency": "e.g. ~2 posts/day",
    "clientFrequency": "e.g. ~3 posts/week",
    "bestDays": ["Day1", "Day2"],
    "bestTimes": ["Time1", "Time2"],
    "formatMix": "description of their content format distribution",
    "recommendation": "Specific schedule recommendation to copy their strategy"
  },
  "audienceInsights": {
    "audienceLoves": ["thing1", "thing2", "thing3"],
    "audienceHates": ["thing1"],
    "painPoints": ["pain1", "pain2"],
    "desires": ["desire1", "desire2"],
    "insight": "1-2 sentence actionable insight about the audience"
  },
  "scorecard": {
    "metrics": [
      { "metric": "Engagement Rate", "yourScore": 0, "competitorScore": 0, "winner": "you|competitor|tie", "note": "brief explanation" },
      { "metric": "Posting Consistency", "yourScore": 0, "competitorScore": 0, "winner": "you|competitor|tie", "note": "brief explanation" },
      { "metric": "Hook Quality", "yourScore": 0, "competitorScore": 0, "winner": "you|competitor|tie", "note": "brief explanation" },
      { "metric": "Content Variety", "yourScore": 0, "competitorScore": 0, "winner": "you|competitor|tie", "note": "brief explanation" },
      { "metric": "CTA Usage", "yourScore": 0, "competitorScore": 0, "winner": "you|competitor|tie", "note": "brief explanation" },
      { "metric": "Viral Potential", "yourScore": 0, "competitorScore": 0, "winner": "you|competitor|tie", "note": "brief explanation" }
    ],
    "youWin": 0,
    "competitorWins": 0,
    "ties": 0,
    "summary": "You are [winning/losing] in X out of 6 categories"
  }
}

Make reelComparison have 5-8 pairs. Make viralDNA have top 5 competitor posts. Make hookLibrary have 10-15 hooks. Make contentPatterns have 4-6 patterns. Make gapAnalysis.gaps have 5-8 gaps.`;

      const raw = await callOpenRouter(systemPrompt, userPrompt, 6000);
      let report: any = {};
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        report = JSON.parse(jsonMatch ? jsonMatch[0] : raw.replace(/```json|```/g, "").trim());
      } catch {
        report = { overview: { assessment: "competitive", summary: raw, outperformingIn: [] } };
      }

      report.clientMetrics = clientData;
      report.competitorMetrics = competitorData;
      report.clientPosts = clientPosts;
      report.competitorPosts = competitorPosts;

      const saved = await storage.createCompetitorAnalysis({
        clientId,
        clientUrl,
        competitorUrl,
        clientHandle,
        competitorHandle,
        report,
      });

      return res.json(saved);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Steal Strategy: 30-day content plan ───────────────────────────────────
  app.post("/api/competitor/steal-strategy", requireAuth, async (req: Request, res: Response) => {
    try {
      const { analysisId } = req.body;
      if (!analysisId) return res.status(400).json({ message: "analysisId required" });

      const analyses = await storage.getCompetitorAnalyses((req as any).user.id);
      const analysis = analyses.find((a: any) => a.id === analysisId);
      if (!analysis) return res.status(404).json({ message: "Analysis not found" });

      const report = analysis.report as any;
      const hooks = (report?.hookLibrary || []).slice(0, 10).map((h: any) => h.hook).join(", ");
      const patterns = (report?.contentPatterns || []).map((p: any) => p.pattern).join(", ");
      const gaps = (report?.gapAnalysis?.gaps || []).map((g: any) => `${g.metric}: ${g.fix}`).join("; ");
      const strategy = report?.postingStrategy?.recommendation || "";

      const systemPrompt = `You are an elite Instagram growth strategist. Generate a detailed, hyper-specific 30-day content action plan. Return ONLY valid JSON, no markdown.`;
      const userPrompt = `Create a complete 30-day content strategy to help @${analysis.clientHandle} outperform @${analysis.competitorHandle} on Instagram.

Context:
- Competitor's top hooks: ${hooks}
- Content patterns that work: ${patterns}
- Key gaps to fix: ${gaps}
- Posting strategy: ${strategy}
- Competitor avg views: ${report?.competitorMetrics?.avgViews?.toLocaleString() ?? "N/A"}
- Client avg views: ${report?.clientMetrics?.avgViews?.toLocaleString() ?? "N/A"}
- Assessment: ${report?.overview?.assessment ?? "competitive"}

Return this EXACT JSON:
{
  "contentPlan": [
    { "day": 1, "format": "Reel|Carousel|Post", "topic": "Specific topic", "hook": "Exact hook to use", "structure": "Opening → Middle → CTA", "goal": "Views|Followers|Leads" }
  ],
  "hookSystem": [
    { "hook": "exact hook text", "type": "curiosity|authority|pain-point|storytelling|controversy", "useFor": "which type of content" }
  ],
  "postingSchedule": {
    "frequency": "X posts per day/week",
    "days": ["Mon", "Wed", "Fri"],
    "times": ["8 AM", "6 PM"],
    "rationale": "Why this schedule works"
  },
  "reelIdeas": ["Specific reel idea 1", "idea 2", "idea 3", "idea 4", "idea 5", "idea 6", "idea 7", "idea 8", "idea 9", "idea 10"],
  "carouselIdeas": ["Specific carousel idea 1", "idea 2", "idea 3", "idea 4", "idea 5"],
  "ctaStrategy": {
    "topCTAs": ["CTA 1", "CTA 2", "CTA 3"],
    "whenToUse": "description of when and how to deploy CTAs",
    "conversionFlow": "Viewer → Follower → Lead → Customer pathway"
  },
  "contentStyle": {
    "tone": "description of tone to adopt",
    "structure": "how to structure each post",
    "storytellingFormat": "specific storytelling approach",
    "visualStyle": "what visual/editing style to use"
  },
  "growthPlaybook": [
    { "week": 1, "focus": "What to focus on this week", "tasks": ["Task 1", "Task 2", "Task 3"], "goal": "measurable goal for the week" },
    { "week": 2, "focus": "...", "tasks": ["..."], "goal": "..." },
    { "week": 3, "focus": "...", "tasks": ["..."], "goal": "..." },
    { "week": 4, "focus": "...", "tasks": ["..."], "goal": "..." }
  ],
  "finalMessage": "Follow this plan for 30 days to outperform ${analysis.competitorHandle}"
}

Make contentPlan have all 30 days. Make hookSystem have 20 hooks. Make reelIdeas and carouselIdeas specific and actionable.`;

      const raw = await callOpenRouter(systemPrompt, userPrompt, 6000);
      let stealStrategy: any = {};
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        stealStrategy = JSON.parse(jsonMatch ? jsonMatch[0] : raw.replace(/```json|```/g, "").trim());
      } catch {
        return res.status(500).json({ message: "AI returned invalid response. Please try again." });
      }

      // Save steal strategy into the analysis report
      const updatedReport = { ...report, stealStrategy };
      // We don't have an update method so we'll return it directly — frontend caches it
      return res.json({ stealStrategy });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/competitor/analyses", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const analyses = await storage.getCompetitorAnalyses(user.id);
      return res.json(analyses);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/competitor/analyses/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteCompetitorAnalysis(req.params.id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Niche Intelligence Engine ──────────────────────────────────────────────

  app.post("/api/niche/analyze", requireAuth, async (req: Request, res: Response) => {
    try {
      const { niche, competitorUrls, clientId } = req.body;
      if (!niche || !competitorUrls || !Array.isArray(competitorUrls) || competitorUrls.length === 0) {
        return res.status(400).json({ message: "niche and at least one competitorUrl are required" });
      }
      const urls = competitorUrls.slice(0, 5).filter(Boolean);

      // Scrape all competitor profiles in parallel
      const scrapedArrays = await Promise.all(
        urls.map(url => apifyInstagram({ directUrls: [url], resultsType: "posts", resultsLimit: 25 }).catch(() => []))
      );

      const competitors = urls.map((url, i) => {
        const handle = extractHandle(url);
        const items = scrapedArrays[i] || [];
        const metrics = processProfileMetrics(items, handle);
        const posts = buildPostList(items);
        return { handle, metrics, posts };
      }).filter(c => c.metrics || c.posts.length > 0);

      const competitorHandles = competitors.map(c => c.handle);

      const systemPrompt = `You are a world-class social media niche intelligence expert and data analyst. You analyze multiple competitor accounts within a niche and produce extremely detailed, actionable intelligence reports. You ONLY return valid JSON.`;

      const userPrompt = `Analyze these ${competitors.length} Instagram competitor accounts in the "${niche}" niche and produce a comprehensive niche intelligence report. Return ONLY a valid JSON object.

NICHE: ${niche}

${competitors.map((c, i) => `
--- COMPETITOR ${i + 1}: @${c.handle} ---
Metrics: ${JSON.stringify(c.metrics)}
Recent Posts (sample): ${JSON.stringify(c.posts.slice(0, 10))}
`).join("\n")}

Return this EXACT JSON structure:
{
  "nicheTrends": {
    "dominantFormats": ["format1", "format2"],
    "trendingTopics": ["topic1", "topic2", "topic3"],
    "viralPatterns": ["pattern1", "pattern2"],
    "summary": "2-3 sentence overview of what is actually working in this niche right now"
  },
  "topicClusters": [
    { "theme": "mindset|tutorials|case studies|storytelling|controversy|education|entertainment", "avgViews": 0, "avgEngagement": 0, "topPerformers": ["competitor"], "description": "Why this topic cluster performs", "frequency": "how often used across all competitors" }
  ],
  "saturationAnalysis": {
    "oversaturated": [{ "topic": "topic name", "whySaturated": "explanation", "howManyUseIt": "X/Y competitors" }],
    "underserved": [{ "topic": "opportunity topic", "whyOpportunity": "explanation", "estimatedGrowthPotential": "High|Medium|Low" }],
    "summary": "Overall saturation landscape of this niche"
  },
  "hookTrends": {
    "mostUsedHooks": [{ "hookType": "curiosity|authority|storytelling|etc", "frequency": "% of posts", "avgPerformance": "how it performs" }],
    "mostEffectiveHooks": [{ "hookType": "type", "avgViews": 0, "whyItWorks": "explanation", "example": "exact example hook line" }],
    "hookInsight": "Key insight about hooks in this niche e.g. curiosity hooks outperform authority hooks by 40%"
  },
  "contentGaps": [
    { "gap": "specific untapped opportunity", "description": "what NO competitor is doing", "howToCapitalize": "exact action to take", "estimatedImpact": "High|Medium|Low" }
  ],
  "audienceDesires": {
    "wants": ["specific thing 1", "specific thing 2", "specific thing 3"],
    "complaints": ["what they hate 1", "what they hate 2"],
    "engagementTriggers": ["what drives comments and shares 1", "thing 2"],
    "buyingTriggers": ["what makes them buy or follow 1", "thing 2"],
    "summary": "Deep profile of what this niche audience actually cares about"
  },
  "formatBreakdown": {
    "reels": { "avgViews": 0, "avgEngagement": 0, "percentOfContent": 0, "verdict": "how reels perform in this niche" },
    "carousels": { "avgViews": 0, "avgEngagement": 0, "percentOfContent": 0, "verdict": "how carousels perform" },
    "static": { "avgViews": 0, "avgEngagement": 0, "percentOfContent": 0, "verdict": "how static posts perform" },
    "winner": "reels|carousels|static",
    "insight": "Key insight about format strategy in this niche"
  },
  "growthPlaybook": {
    "phase1": { "name": "Foundation (Days 1-10)", "focus": "what to focus on", "actions": ["action1", "action2", "action3"], "contentMix": "what to post" },
    "phase2": { "name": "Growth (Days 11-20)", "focus": "what to focus on", "actions": ["action1", "action2", "action3"], "contentMix": "what to post" },
    "phase3": { "name": "Scale (Days 21-30)", "focus": "what to focus on", "actions": ["action1", "action2", "action3"], "contentMix": "what to post" },
    "keyPrinciples": ["principle 1", "principle 2", "principle 3"],
    "summary": "How to grow in this niche in 30 days"
  },
  "contentLifecycle": {
    "viralFirst": { "contentType": "what goes viral first", "whyItVirals": "explanation", "examples": ["example1", "example2"] },
    "convertsLater": { "contentType": "what converts later", "whyItConverts": "explanation", "examples": ["example1", "example2"] },
    "insight": "How content evolves from awareness to conversion in this niche"
  },
  "competitorPositioning": {
    "map": [
      { "handle": "@handle", "primaryPosition": "authority|entertainment|education|inspiration|motivation", "secondaryPosition": "string", "gapToTarget": "where you could position to stand out" }
    ],
    "recommendedPosition": "Where YOU should position yourself",
    "positioningRationale": "Why this positioning wins in this niche",
    "uniqueAngle": "The specific angle that would differentiate you"
  },
  "viralityScores": [
    { "contentType": "type of content", "hookScore": 8, "retentionScore": 7, "engagementScore": 9, "overallScore": 8, "verdict": "why this scores high" }
  ],
  "contentAngles": [
    { "angle": "specific unique angle", "whyUnique": "why no competitor is using it", "hookExample": "exact hook using this angle", "format": "reel|carousel|static" }
  ],
  "nicheInsight": {
    "answer": "Comprehensive answer to: what should I post in this niche to grow fast?",
    "topRecommendations": ["recommendation 1", "recommendation 2", "recommendation 3", "recommendation 4", "recommendation 5"],
    "avoidThese": ["mistake 1", "mistake 2", "mistake 3"],
    "secretWeapon": "The one thing that would immediately differentiate this account"
  }
}

Make contentAngles have exactly 20 items. Make everything extremely specific to the ${niche} niche. No generic advice.`;

      const raw = await callOpenRouter(systemPrompt, userPrompt, 8000);
      let report: any = {};
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        report = JSON.parse(jsonMatch ? jsonMatch[0] : raw.replace(/```json|```/g, "").trim());
      } catch {
        return res.status(500).json({ message: "AI returned invalid response. Please try again." });
      }

      const analysis = await storage.createNicheAnalysis({
        clientId: clientId || (req.user as any).id,
        niche,
        competitorUrls: urls,
        competitorHandles,
        report,
      });

      return res.json(analysis);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/niche/analyses", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const clientId = (req.query.clientId as string) || user.id;
      const analyses = await storage.getNicheAnalyses(clientId);
      return res.json(analyses);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/niche/analyses/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteNicheAnalysis(req.params.id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Manual trigger for auto-sync (admin only) ──────────────────────────────
  app.post("/api/admin/auto-sync", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const { runAutoSync } = await import("./cron");
      runAutoSync();
      return res.json({ message: "Auto-sync started in background" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
