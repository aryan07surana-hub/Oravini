import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import passport from "passport";
import nodemailer from "nodemailer";
import multer from "multer";
import path from "path";
import fs from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { storage } from "./storage";
import { hashPassword } from "./auth";
import { getTokenInfo, getConnectedIGAccount, getIGProfile, getIGMedia, getMediaInsights, syncPostByPermalink, exchangeForLongLivedToken, saveTokenToDB } from "./meta";
import { insertUserSchema, insertDocumentSchema, insertProgressSchema, insertCallFeedbackSchema, insertTaskSchema, insertNotificationSchema, insertContentPostSchema, insertIncomeGoalSchema } from "@shared/schema";
import { seedDatabase } from "./seed";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractYouTubeVideoId, extractYouTubeChannelId, getYouTubeVideoStats, getYouTubeChannelStats, getYouTubeChannelRecentVideos } from "./youtube";

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

// Express 5 types req.params values as string | string[]; this helper always returns a string
const p = (param: string | string[]): string => Array.isArray(param) ? param[0] : param;

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
  // ── Public self-registration ─────────────────────────────────────────────
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password are required" });
      if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(400).json({ message: "An account with this email already exists" });
      const hashed = await hashPassword(password);
      const user = await storage.createUser({ name, email, password: hashed, role: "client", planConfirmed: false });
      syncToOraviniCRM({ email: user.email, name: user.name, source: "self_register", plan: user.plan, tierLabel: "Tier 1 (Free)", event: "new_signup" });
      req.logIn(user, (err) => {
        if (err) return res.status(500).json({ message: "Login after register failed" });
        const { password: _, ...safe } = user;
        return res.json(safe);
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Registration failed" });
    }
  });

  // ── Confirm plan (mark user as onboarded after choosing a plan) ──────────
  app.post("/api/auth/confirm-plan", requireAuth, async (req, res) => {
    const userId = (req.user as any).id;
    const { plan } = req.body;
    const update: any = { planConfirmed: true };
    if (plan && ["free", "starter", "growth", "pro", "elite"].includes(plan)) update.plan = plan;
    await storage.updateUser(userId, update);
    const updated = await storage.getUser(userId);
    const { password: _, ...safe } = updated!;
    res.json(safe);
  });

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

  // ── Google OAuth ────────────────────────────────────────────────────────────
  app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

  app.get("/api/auth/google/callback",
    (req, res, next) => {
      passport.authenticate("google", (err: any, user: any, info: any) => {
        if (err) {
          console.error("[google-oauth] callback error:", err);
          return res.redirect(`/login?error=google_failed&msg=${encodeURIComponent(err.message || "unknown")}`);
        }
        if (!user) {
          console.error("[google-oauth] no user returned, info:", info);
          return res.redirect(`/login?error=google_failed&msg=${encodeURIComponent(info?.message || "auth_failed")}`);
        }
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            console.error("[google-oauth] login error:", loginErr);
            return res.redirect("/login?error=google_failed");
          }
          const dest = user.role === "admin" ? "/admin" : user.planConfirmed ? "/dashboard" : "/select-plan";
          return res.redirect(dest);
        });
      })(req, res, next);
    }
  );

  // ── OTP ─────────────────────────────────────────────────────────────────────
  const otpTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  app.post("/api/auth/otp/send", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });
    const user = await storage.getUserByEmail(email);
    if (!user) return res.status(404).json({ message: "No account found with this email" });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await storage.createOtpCode(email, code, expiresAt);
    try {
      await otpTransporter.sendMail({
        from: `"Brandverse" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Brandverse login code",
        html: `
          <div style="background:#111;color:#fff;font-family:sans-serif;padding:40px;border-radius:12px;max-width:480px;margin:auto">
            <h2 style="color:#d4b461;margin-bottom:8px">Brandverse</h2>
            <p style="color:#aaa;margin-bottom:24px">Your one-time login code:</p>
            <div style="background:#222;border:1px solid #d4b46133;border-radius:8px;padding:24px;text-align:center;letter-spacing:12px;font-size:32px;font-weight:700;color:#d4b461">${code}</div>
            <p style="color:#666;font-size:13px;margin-top:20px">This code expires in 10 minutes. Do not share it with anyone.</p>
          </div>`,
      });
      res.json({ message: "OTP sent" });
    } catch (err: any) {
      console.error("OTP email error:", err);
      res.status(500).json({ message: "Failed to send email. Check email config." });
    }
  });

  app.post("/api/auth/otp/verify", async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: "Email and code required" });
    const otp = await storage.getValidOtpCode(email, code);
    if (!otp) return res.status(400).json({ message: "Invalid or expired code" });
    await storage.markOtpUsed(otp.id);
    const user = await storage.getUserByEmail(email);
    if (!user) return res.status(404).json({ message: "User not found" });
    req.logIn(user, (err) => {
      if (err) return res.status(500).json({ message: "Login failed" });
      const { password, ...safeUser } = user as any;
      res.json(safeUser);
    });
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
    const user = await storage.getUser(p(req.params.id));
    if (!user) return res.status(404).json({ message: "Not found" });
    const { password, ...safe } = user;
    res.json(safe);
  });

  app.post("/api/clients", requireAdmin, async (req, res) => {
    const parsed = insertUserSchema.safeParse({ ...req.body, role: "client" });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const hashed = await hashPassword(parsed.data.password);
    const user = await storage.createUser({ ...parsed.data, password: hashed, role: "client", planConfirmed: true });
    await storage.upsertProgress({ clientId: user.id, offerCreation: 0, funnelProgress: 0, contentProgress: 0, monetizationProgress: 0 });
    const tierNames: Record<string, string> = { free: "Tier 1 (Free)", starter: "Tier 2 ($29)", growth: "Tier 3 ($59)", pro: "Tier 4 ($79)", elite: "Tier 5 (Elite)" };
    syncToOraviniCRM({ email: user.email, name: user.name, source: "client_signup", plan: user.plan, tierLabel: tierNames[user.plan || "free"] || user.plan, event: "new_signup" });
    const { password, ...safe } = user;
    res.json(safe);
  });

  app.patch("/api/clients/:id", requireAdmin, async (req, res) => {
    const { password, ...data } = req.body;
    const updated = await storage.updateUser(p(req.params.id), data);
    const { password: _p, ...safe } = updated;
    res.json(safe);
  });

  app.delete("/api/clients/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteUser(p(req.params.id) as string);
      res.json({ message: "Deleted" });
    } catch (err: any) {
      console.log("[deleteUser] error:", err?.message);
      res.status(500).json({ message: err?.message || "Failed to delete client" });
    }
  });

  app.patch("/api/clients/:id/reset-password", requireAdmin, async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ message: "newPassword required" });
    const hashed = await hashPassword(newPassword);
    await storage.updateUser(p(req.params.id), { password: hashed });
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
    const doc = await storage.getDocument(p(req.params.id));
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
    const doc = await storage.getDocument(p(req.params.id));
    if (!doc) return res.status(404).json({ message: "Not found" });
    if (user.role === "client" && doc.uploadedBy !== user.id) return res.status(403).json({ message: "Forbidden" });
    if (doc.fileUrl.startsWith("/uploads/")) {
      const filePath = path.join(uploadsDir, path.basename(doc.fileUrl));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await storage.deleteDocument(p(req.params.id));
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
    const doc = await storage.getDocument(p(req.params.id));
    if (!doc) return res.status(404).json({ message: "Not found" });
    if (doc.fileUrl.startsWith("/uploads/")) {
      const filePath = path.join(uploadsDir, path.basename(doc.fileUrl));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await storage.deleteDocument(p(req.params.id));
    res.json({ message: "Deleted" });
  });

  // Messages / Chat
  app.get("/api/messages/:otherUserId", requireAuth, async (req, res) => {
    const userId = (req.user as any).id;
    const msgs = await storage.getMessagesBetween(userId, p(req.params.otherUserId));
    await storage.markMessagesRead(p(req.params.otherUserId), userId);
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
    const msg = await storage.getMessage(p(req.params.id));
    if (!msg) return res.status(404).json({ message: "Not found" });
    if (msg.senderId !== (req.user as any).id) return res.status(403).json({ message: "Forbidden" });
    const updated = await storage.updateMessage(p(req.params.id), content.trim());
    const otherId = msg.senderId === (req.user as any).id ? msg.receiverId : msg.senderId;
    sendToUser(otherId, { type: "message_updated", message: updated });
    res.json(updated);
  });

  app.delete("/api/messages/:id", requireAuth, async (req, res) => {
    const msg = await storage.getMessage(p(req.params.id));
    if (!msg) return res.status(404).json({ message: "Not found" });
    if (msg.senderId !== (req.user as any).id) return res.status(403).json({ message: "Forbidden" });
    await storage.deleteMessage(p(req.params.id));
    const otherId = msg.senderId === (req.user as any).id ? msg.receiverId : msg.senderId;
    sendToUser(otherId, { type: "message_deleted", messageId: p(req.params.id) });
    res.json({ message: "Deleted" });
  });

  app.get("/api/messages/unread/count", requireAuth, async (req, res) => {
    const count = await storage.getUnreadCount((req.user as any).id);
    res.json({ count });
  });

  // Progress
  app.get("/api/progress/:clientId", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (user.role === "client" && user.id !== p(req.params.clientId)) return res.status(403).json({ message: "Forbidden" });
    const prog = await storage.getProgress(p(req.params.clientId));
    res.json(prog || { offerCreation: 0, funnelProgress: 0, contentProgress: 0, monetizationProgress: 0 });
  });

  app.put("/api/progress/:clientId", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (user.role === "client" && user.id !== p(req.params.clientId)) return res.status(403).json({ message: "Forbidden" });
    const data = { ...req.body, clientId: p(req.params.clientId) };
    const parsed = insertProgressSchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const prog = await storage.upsertProgress(parsed.data);
    sendToUser(p(req.params.clientId), { type: "progress_update" });
    if (user.role === "client") {
      const admin = await storage.getUserByEmail("admin@brandverse.com");
      if (admin) sendToUser(admin.id, { type: "progress_update", clientId: p(req.params.clientId) });
    }
    res.json(prog);
  });

  // Call Feedback
  app.get("/api/calls/:clientId", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (user.role === "client" && user.id !== p(req.params.clientId)) return res.status(403).json({ message: "Forbidden" });
    const calls = await storage.getCallFeedbackByClient(p(req.params.clientId));
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
    const cf = await storage.updateCallFeedback(p(req.params.id), req.body);
    res.json(cf);
  });

  app.delete("/api/calls/:id", requireAdmin, async (req, res) => {
    await storage.deleteCallFeedback(p(req.params.id));
    res.json({ message: "Deleted" });
  });

  // Tasks
  app.get("/api/tasks/:clientId", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (user.role === "client" && user.id !== p(req.params.clientId)) return res.status(403).json({ message: "Forbidden" });
    const list = await storage.getTasksByClient(p(req.params.clientId));
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
    const task = await storage.updateTask(p(req.params.id), req.body);
    res.json(task);
  });

  app.delete("/api/tasks/:id", requireAdmin, async (req, res) => {
    await storage.deleteTask(p(req.params.id));
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
    await storage.markNotificationRead(p(req.params.id));
    res.json({ message: "Marked read" });
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    await storage.markAllNotificationsRead((req.user as any).id);
    res.json({ message: "All marked read" });
  });

  app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
    await storage.deleteNotification(p(req.params.id));
    res.json({ message: "Notification deleted" });
  });

  // Client submits their own call feedback
  app.patch("/api/calls/:id/client-feedback", requireAuth, async (req, res) => {
    const user = req.user as any;
    const cf = await storage.getCallFeedback(p(req.params.id));
    if (!cf) return res.status(404).json({ message: "Not found" });
    if (user.role === "client" && user.id !== cf.clientId) return res.status(403).json({ message: "Forbidden" });
    const { clientFeedback, clientLearnings } = req.body;
    const updated = await storage.updateCallFeedback(p(req.params.id), { clientFeedback, clientLearnings });
    res.json(updated);
  });

  // Content Posts
  app.get("/api/content/:clientId", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (user.role === "client" && user.id !== p(req.params.clientId)) return res.status(403).json({ message: "Forbidden" });
    const posts = await storage.getContentPostsByClient(p(req.params.clientId));
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
    const post = await storage.getContentPost(p(req.params.id));
    if (!post) return res.status(404).json({ message: "Not found" });
    if (user.role === "client" && user.id !== post.clientId) return res.status(403).json({ message: "Forbidden" });
    const body = { ...req.body };
    if (body.postDate && typeof body.postDate === "string") {
      body.postDate = new Date(body.postDate);
    }
    const updated = await storage.updateContentPost(p(req.params.id), body);
    res.json(updated);
  });

  app.delete("/api/content/:id", requireAuth, async (req, res) => {
    const user = req.user as any;
    const post = await storage.getContentPost(p(req.params.id));
    if (!post) return res.status(404).json({ message: "Not found" });
    if (user.role === "client" && user.id !== post.clientId) return res.status(403).json({ message: "Forbidden" });
    await storage.deleteContentPost(p(req.params.id));
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

  // ── Meta API account status ──────────────────────────────────────────────
  let _cachedIgAccountId: string | null = null;
  let _igAccountCacheTime = 0;

  async function getIgAccountIdCached(): Promise<string | null> {
    const now = Date.now();
    if (_cachedIgAccountId && now - _igAccountCacheTime < 60 * 60 * 1000) return _cachedIgAccountId;
    try {
      const acct = await getConnectedIGAccount();
      if (acct?.igAccountId) {
        _cachedIgAccountId = acct.igAccountId;
        _igAccountCacheTime = now;
      }
    } catch { _cachedIgAccountId = null; }
    return _cachedIgAccountId;
  }

  app.get("/api/meta/account", requireAuth, async (_req: Request, res: Response) => {
    try {
      const tokenInfo = await getTokenInfo();
      if (!tokenInfo.valid) {
        return res.json({ connected: false, tokenExpired: true, message: "Access token is expired or invalid. Please refresh it." });
      }
      const account = await getConnectedIGAccount();
      if (!account) {
        return res.json({ connected: false, tokenValid: true, message: "No Instagram Business Account linked to this token." });
      }
      const profile = await getIGProfile(account.igAccountId);
      return res.json({
        connected: true, tokenValid: true,
        expiresAt: tokenInfo.expiresAt,
        scopes: tokenInfo.scopes,
        igAccountId: account.igAccountId,
        igUsername: account.igUsername,
        pageName: account.pageName,
        followersCount: profile?.followers_count,
        mediaCount: profile?.media_count,
      });
    } catch (err: any) {
      return res.json({ connected: false, error: err.message });
    }
  });

  app.post("/api/meta/refresh-token", requireAuth, async (req: Request, res: Response) => {
    try {
      const { shortToken } = req.body;
      if (!shortToken) return res.status(400).json({ message: "shortToken required" });
      const result = await exchangeForLongLivedToken(shortToken);
      if (!result) return res.status(400).json({ message: "Could not exchange token — check your app credentials." });
      // Auto-save the long-lived token to the database so it's available immediately
      await saveTokenToDB(result.access_token);
      return res.json({ access_token: result.access_token, expires_in: result.expires_in, message: "Token saved and active. Valid for ~60 days." });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Sync a single post's stats from its Instagram URL — Meta API first, Apify fallback
  app.post("/api/instagram/sync-post", requireAuth, async (req: Request, res: Response) => {
    try {
      const { postUrl } = req.body;
      if (!postUrl) return res.status(400).json({ message: "postUrl required" });

      // Try Meta API first
      try {
        const igAccountId = await getIgAccountIdCached();
        if (igAccountId) {
          const metaResult = await syncPostByPermalink(igAccountId, postUrl);
          if (metaResult) {
            console.log("[sync-post] Meta API ✓");
            return res.json({ ...metaResult, source: "meta" });
          }
        }
      } catch (e: any) { console.warn("[sync-post] Meta API failed, falling back to Apify:", e.message); }

      // Apify fallback
      const items = await apifyInstagram({ directUrls: [postUrl], resultsType: "posts", resultsLimit: 1 });
      const item = items?.[0];
      if (!item) return res.status(404).json({ message: "No data returned for this URL" });
      return res.json({
        views: item.videoPlayCount ?? item.videoViewCount ?? item.playsCount ?? 0,
        likes: item.likesCount ?? 0,
        comments: item.commentsCount ?? 0,
        saves: item.savesCount ?? 0,
        title: item.caption ? item.caption.slice(0, 120) : undefined,
        postDate: item.timestamp ? new Date(item.timestamp).toISOString() : undefined,
        contentType: item.type === "Video" || item.type === "Reel" ? "reel"
          : item.type === "Sidecar" ? "carousel" : "post",
        source: "apify",
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Sync checkpoint — Meta API first, Apify fallback
  app.post("/api/instagram/sync-checkpoint", requireAuth, async (req: Request, res: Response) => {
    try {
      const { postId, postUrl, checkpoint } = req.body;
      if (!postUrl || !postId || !checkpoint) return res.status(400).json({ message: "postId, postUrl, and checkpoint required" });

      let v = 0, l = 0, c = 0, s = 0, source = "apify";

      // Try Meta API first
      try {
        const igAccountId = await getIgAccountIdCached();
        if (igAccountId) {
          const metaResult = await syncPostByPermalink(igAccountId, postUrl);
          if (metaResult) {
            v = metaResult.views; l = metaResult.likes; c = metaResult.comments; s = metaResult.saves;
            source = "meta";
            console.log("[sync-checkpoint] Meta API ✓");
          }
        }
      } catch (e: any) { console.warn("[sync-checkpoint] Meta fallback:", e.message); }

      // Apify fallback
      if (source === "apify") {
        const items = await apifyInstagram({ directUrls: [postUrl], resultsType: "posts", resultsLimit: 1 });
        const item = items?.[0];
        if (!item) return res.status(404).json({ message: "No data returned for this Instagram URL" });
        v = item.videoPlayCount ?? item.videoViewCount ?? item.playsCount ?? 0;
        l = item.likesCount ?? 0;
        c = item.commentsCount ?? 0;
        s = item.savesCount ?? 0;
      }

      const now = new Date();
      let updateData: any = {};
      if (checkpoint === "initial") updateData = { views: v, likes: l, comments: c, saves: s, initialSyncedAt: now };
      else if (checkpoint === "2w") updateData = { views2w: v, likes2w: l, comments2w: c, saves2w: s, twoWeekSyncedAt: now };
      else if (checkpoint === "4w") updateData = { views4w: v, likes4w: l, comments4w: c, saves4w: s, fourWeekSyncedAt: now };
      else return res.status(400).json({ message: "Invalid checkpoint" });

      const updated = await storage.updateContentPost(postId, updateData);
      return res.json({ ...updated, source });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Bulk import a profile's recent posts
  app.post("/api/instagram/sync-profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const { profileUrl, clientId, platform } = req.body;
      if (!profileUrl || !clientId) return res.status(400).json({ message: "profileUrl and clientId required" });

      type SyncItem = { postUrl: string; caption: string; postDate: Date; contentType: "reel"|"carousel"|"post"; views: number; likes: number; comments: number; saves: number; };
      let syncItems: SyncItem[] = [];

      // Try Meta API first (only for Instagram profiles matching connected account)
      if (platform !== "youtube") {
        try {
          const igAccountId = await getIgAccountIdCached();
          if (igAccountId) {
            const connAcct = await getConnectedIGAccount();
            const reqHandle = (profileUrl.match(/instagram\.com\/([^/?#]+)/)?.[1] || "").toLowerCase().replace(/^@/, "");
            const connHandle = (connAcct?.igUsername || "").toLowerCase();
            if (reqHandle && connHandle && reqHandle === connHandle) {
              const media = await getIGMedia(igAccountId, 30);
              if (media.length > 0) {
                syncItems = media.map((m: any) => ({
                  postUrl: m.permalink,
                  caption: m.caption || "",
                  postDate: new Date(m.timestamp),
                  contentType: (m.media_type === "VIDEO" || m.media_type === "REELS" ? "reel" : m.media_type === "CAROUSEL_ALBUM" ? "carousel" : "post") as "reel"|"carousel"|"post",
                  views: 0, likes: m.like_count || 0, comments: m.comments_count || 0, saves: 0,
                }));
                console.log(`[sync-profile] Meta API ✓ — ${syncItems.length} posts`);
              }
            }
          }
        } catch (e: any) { console.warn("[sync-profile] Meta fallback:", e.message); }
      }

      // Apify fallback
      if (!syncItems.length) {
        const items = await apifyInstagram({ directUrls: [profileUrl], resultsType: "posts", resultsLimit: 20 });
        if (!items?.length) return res.status(404).json({ message: "No posts found for this profile" });
        syncItems = items.map((item: any) => ({
          postUrl: item.url ?? (item.shortCode ? `https://instagram.com/p/${item.shortCode}` : ""),
          caption: item.caption || "",
          postDate: item.timestamp ? new Date(item.timestamp) : new Date(),
          contentType: (item.type === "Video" || item.type === "Reel" ? "reel" : item.type === "Sidecar" ? "carousel" : "post") as "reel"|"carousel"|"post",
          views: item.videoPlayCount ?? item.videoViewCount ?? item.playsCount ?? 0,
          likes: item.likesCount ?? 0,
          comments: item.commentsCount ?? 0,
          saves: item.savesCount ?? 0,
        })).filter((p: SyncItem) => p.postUrl);
      }

      const created: any[] = [];
      for (const p of syncItems) {
        if (!p.postUrl) continue;
        try {
          const post = await storage.createContentPost({
            clientId, platform: platform ?? "instagram",
            title: p.caption ? p.caption.slice(0, 120) : "Untitled",
            postUrl: p.postUrl, postDate: p.postDate,
            contentType: p.contentType as any, funnelStage: "top",
            views: p.views, likes: p.likes, comments: p.comments, saves: p.saves,
            followersGained: 0, subscribersGained: 0,
          });
          created.push(post);
        } catch (_) { /* skip duplicates/errors */ }
      }
      return res.json({ imported: created.length, posts: created });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ─── YouTube Data API v3 ────────────────────────────────────────────────────

  // Fetch live stats for a YouTube video by URL
  app.post("/api/youtube/sync-post", requireAuth, async (req: Request, res: Response) => {
    try {
      const { postUrl } = req.body;
      if (!postUrl) return res.status(400).json({ message: "postUrl required" });
      const videoId = extractYouTubeVideoId(postUrl);
      if (!videoId) return res.status(400).json({ message: "Could not extract YouTube video ID from this URL" });
      const stats = await getYouTubeVideoStats(videoId);
      if (!stats) return res.status(404).json({ message: "Video not found on YouTube" });
      return res.json({ ...stats, source: "youtube-api" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Sync a checkpoint (initial / 2w / 4w) for a YouTube post
  app.post("/api/youtube/sync-checkpoint", requireAuth, async (req: Request, res: Response) => {
    try {
      const { postId, postUrl, checkpoint } = req.body;
      if (!postUrl || !postId || !checkpoint) return res.status(400).json({ message: "postId, postUrl, and checkpoint required" });
      const videoId = extractYouTubeVideoId(postUrl);
      if (!videoId) return res.status(400).json({ message: "Could not extract YouTube video ID from this URL" });
      const stats = await getYouTubeVideoStats(videoId);
      if (!stats) return res.status(404).json({ message: "Video not found on YouTube" });

      const now = new Date();
      let updateData: any = {};
      if (checkpoint === "initial") updateData = { views: stats.views, likes: stats.likes, comments: stats.comments, initialSyncedAt: now };
      else if (checkpoint === "2w") updateData = { views2w: stats.views, likes2w: stats.likes, comments2w: stats.comments, twoWeekSyncedAt: now };
      else if (checkpoint === "4w") updateData = { views4w: stats.views, likes4w: stats.likes, comments4w: stats.comments, fourWeekSyncedAt: now };
      else return res.status(400).json({ message: "Invalid checkpoint" });

      const updated = await storage.updateContentPost(postId, updateData);
      return res.json({ ...updated, source: "youtube-api" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Fetch YouTube channel stats by channel URL/handle
  app.post("/api/youtube/channel-stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const { channelUrl } = req.body;
      if (!channelUrl) return res.status(400).json({ message: "channelUrl required" });
      const channelRef = extractYouTubeChannelId(channelUrl);
      if (!channelRef) return res.status(400).json({ message: "Could not extract channel from URL. Use a youtube.com/@handle, /channel/, or /user/ URL." });
      const stats = await getYouTubeChannelStats(channelRef);
      if (!stats) return res.status(404).json({ message: "Channel not found on YouTube" });
      return res.json(stats);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Import recent videos from a YouTube channel into content tracking
  app.post("/api/youtube/import-channel", requireAuth, async (req: Request, res: Response) => {
    try {
      const { channelUrl, clientId } = req.body;
      if (!channelUrl || !clientId) return res.status(400).json({ message: "channelUrl and clientId required" });
      const channelRef = extractYouTubeChannelId(channelUrl);
      if (!channelRef) return res.status(400).json({ message: "Could not extract channel from URL. Use a youtube.com/@handle, /channel/, or /user/ URL." });

      const channelStats = await getYouTubeChannelStats(channelRef);
      if (!channelStats) return res.status(404).json({ message: "Channel not found on YouTube" });

      const videos = await getYouTubeChannelRecentVideos(channelStats.channelId, 20);
      if (!videos.length) return res.status(404).json({ message: "No videos found for this channel" });

      const created: any[] = [];
      for (const vid of videos as any[]) {
        if (!vid.videoUrl) continue;
        try {
          const post = await storage.createContentPost({
            clientId,
            platform: "youtube",
            title: vid.title ? vid.title.slice(0, 120) : "Untitled",
            postUrl: vid.videoUrl,
            postDate: vid.publishedAt ? new Date(vid.publishedAt) : new Date(),
            contentType: vid.contentType === "short" ? "reel" : "video",
            views: vid.views,
            likes: vid.likes,
            comments: vid.comments,
            saves: 0,
          });
          created.push(post);
        } catch (_) { /* skip duplicates */ }
      }
      return res.json({ imported: created.length, posts: created, channel: channelStats });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Income Goals
  app.get("/api/income-goal/:clientId", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (user.role === "client" && user.id !== p(req.params.clientId)) return res.status(403).json({ message: "Forbidden" });
    const goal = await storage.getIncomeGoal(p(req.params.clientId));
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

  // ── Groq JSON-mode helper (structured output, virality analysis) ──────────
  async function callGroqJson(systemPrompt: string, userPrompt: string, maxTokens = 3000): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY not configured");
    const models = ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "llama-3.1-8b-instant"];
    let lastError = "";
    for (const model of models) {
      try {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
            temperature: 0.6,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
          }),
        });
        const data: any = await r.json();
        if (data?.error) { lastError = data.error.message; console.warn(`GroqJSON ${model} error: ${lastError}`); continue; }
        const text = data?.choices?.[0]?.message?.content;
        if (text) return text;
      } catch (e: any) { lastError = e.message; }
    }
    throw new Error(`Groq JSON generation failed: ${lastError}`);
  }

  // ── Oravini CRM sync helper ───────────────────────────────────────────────
  async function syncToOraviniCRM(payload: Record<string, any>): Promise<void> {
    const key = process.env.ORAVINI_CRM_KEY;
    if (!key || !payload.email) return;
    try {
      await fetch("https://oravinicrm.replit.app/api/integration/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key },
        body: JSON.stringify({ source: "brandverse", ...payload }),
      });
    } catch (_) { /* fire-and-forget — never block main response */ }
  }

  // ── Anthropic helper (deep analysis — Claude 4 models) ───────────────────
  async function callAnthropic(systemPrompt: string, userPrompt: string, maxTokens = 4000): Promise<string> {
    const apiKey = process.env.ANTHROPIC2_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("No Anthropic API key configured");
    const client = new Anthropic({ apiKey });
    const models = [
      "claude-sonnet-4-6",
      "claude-sonnet-4-20250514",
      "claude-haiku-4-5-20251001",
      "claude-opus-4-20250514",
    ];
    let lastError = "";
    for (const model of models) {
      try {
        const message = await client.messages.create({
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });
        return message.content[0].type === "text" ? message.content[0].text : "";
      } catch (e: any) {
        lastError = e.message || String(e);
        console.warn(`[Anthropic] ${model} failed: ${lastError}`);
      }
    }
    throw new Error(`Anthropic generation failed: ${lastError}`);
  }

  // ── OpenRouter / Anthropic / Groq cascade (deep analysis) ──────────────────
  async function callOpenRouter(systemPrompt: string, userPrompt: string, maxTokens = 4000): Promise<string> {
    // 1. Try Anthropic first (if key present) — catch auth/model errors and fall through
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const result = await callAnthropic(systemPrompt, userPrompt, maxTokens);
        if (result) return result;
      } catch (e: any) {
        console.warn("[OpenRouter cascade] Anthropic failed, falling back to Groq:", e.message?.slice(0, 120));
      }
    }

    // 2. Try Groq as a reliable fallback for deep analysis
    if (process.env.GROQ_API_KEY) {
      try {
        const result = await callGroq(systemPrompt, userPrompt, Math.min(maxTokens, 8000));
        if (result) return result;
      } catch (e: any) {
        console.warn("[OpenRouter cascade] Groq failed:", e.message?.slice(0, 120));
      }
    }

    // 3. Try OpenRouter as last resort
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (apiKey) {
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
    }

    throw new Error("All AI providers failed — check your API keys");
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

      // 1. Try Meta API first, fall back to Apify
      type NormalisedPost = { postUrl: string; caption: string; postDate: Date; contentType: "reel"|"carousel"|"post"; views: number; likes: number; comments: number; saves: number; type: string; };
      let normalisedPosts: NormalisedPost[] = [];
      let dataSource = "apify";

      try {
        const igAccountId = await getIgAccountIdCached();
        if (igAccountId) {
          const connAcct = await getConnectedIGAccount();
          // Check if the profile handle matches connected account
          const handleMatch = profileUrl.match(/instagram\.com\/([^/?#]+)/);
          const reqHandle = (handleMatch?.[1] || "").toLowerCase().replace(/^@/, "");
          const connHandle = (connAcct?.igUsername || "").toLowerCase();
          if (reqHandle && connHandle && (reqHandle === connHandle || profileUrl.includes(connHandle))) {
            const media = await getIGMedia(igAccountId, 50);
            if (media.length > 0) {
              for (const m of media) {
                const insights = await getMediaInsights(m.id, m.media_type);
                normalisedPosts.push({
                  postUrl: m.permalink,
                  caption: m.caption || "",
                  postDate: new Date(m.timestamp),
                  contentType: m.media_type === "VIDEO" || m.media_type === "REELS" ? "reel" : m.media_type === "CAROUSEL_ALBUM" ? "carousel" : "post",
                  views: insights.plays ?? insights.video_views ?? 0,
                  likes: m.like_count || insights.likes || 0,
                  comments: m.comments_count || insights.comments || 0,
                  saves: insights.saved || 0,
                  type: m.media_type,
                });
              }
              dataSource = "meta";
              console.log(`[analyze-profile] Meta API ✓ — ${normalisedPosts.length} posts`);
            }
          }
        }
      } catch (e: any) { console.warn("[analyze-profile] Meta API failed, using Apify:", e.message); }

      // Apify fallback
      if (!normalisedPosts.length) {
        const items = await apifyInstagram({ directUrls: [profileUrl], resultsType: "posts", resultsLimit: 30 });
        if (!items?.length) return res.status(404).json({ message: "No posts found — make sure the account is public." });
        normalisedPosts = items.map((item: any) => ({
          postUrl: item.url ?? (item.shortCode ? `https://instagram.com/p/${item.shortCode}` : ""),
          caption: item.caption || "",
          postDate: item.timestamp ? new Date(item.timestamp) : new Date(),
          contentType: (item.type === "Video" || item.type === "Reel" ? "reel" : item.type === "Sidecar" ? "carousel" : "post") as "reel"|"carousel"|"post",
          views: item.videoPlayCount ?? item.videoViewCount ?? item.playsCount ?? 0,
          likes: item.likesCount ?? 0,
          comments: item.commentsCount ?? 0,
          saves: item.savesCount ?? 0,
          type: item.type || "",
        })).filter((p: NormalisedPost) => p.postUrl);
      }

      if (!normalisedPosts.length) return res.status(404).json({ message: "No posts found — make sure the account is public." });

      // 2. Sync posts to content tracking (upsert by url; skip duplicates)
      const existingPosts = await storage.getContentPostsByClient(clientId);
      const existingUrls = new Set(existingPosts.map((p: any) => p.postUrl).filter(Boolean));
      let imported = 0;
      for (const p of normalisedPosts) {
        if (!p.postUrl || existingUrls.has(p.postUrl)) continue;
        try {
          await storage.createContentPost({
            clientId, platform: "instagram",
            title: p.caption ? p.caption.slice(0, 120) : "Untitled",
            postUrl: p.postUrl, postDate: p.postDate,
            contentType: p.contentType as any, funnelStage: "top",
            views: p.views, likes: p.likes, comments: p.comments, saves: p.saves,
            followersGained: 0, subscribersGained: 0,
          });
          imported++;
        } catch (_) { /* skip */ }
      }

      // 3. Build data summary for AI
      const items = normalisedPosts; // alias for AI prompt below
      const totalLikes = items.reduce((s, p) => s + p.likes, 0);
      const totalComments = items.reduce((s, p) => s + p.comments, 0);
      const totalViews = items.reduce((s, p) => s + p.views, 0);
      const reels = items.filter((p) => p.contentType === "reel").length;
      const carousels = items.filter((p) => p.contentType === "carousel").length;
      const posts = items.filter((p) => p.contentType === "post").length;
      const captions = items.slice(0, 10).map((p) => p.caption?.slice(0, 200)).filter(Boolean);
      const topByLikes = [...items].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0)).slice(0, 3);

      const systemPrompt = `You are an elite Instagram growth strategist. Analyze Instagram profile data and return ONLY valid JSON — no markdown, no extra text.`;
      const userPrompt = `Analyze this Instagram account and return a detailed profile report as JSON.

Handle: @${handle ?? "unknown"}
Posts analyzed: ${items.length}
Total likes: ${totalLikes}, Total comments: ${totalComments}, Total views: ${totalViews}
Content breakdown: ${reels} Reels, ${carousels} Carousels, ${posts} Static posts
Sample captions: ${JSON.stringify(captions)}
Top 3 posts by likes: ${JSON.stringify(topByLikes.map((p) => ({ likes: p.likes, comments: p.comments, views: p.views, saves: p.saves, type: p.contentType, caption: p.caption?.slice(0, 100) })))}

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

      const _u = req.user as any;
      if (_u.role !== "admin") {
        const creditResult = await storage.deductCredits(_u.id, 2, "ai_ideas", "AI Content Ideas generation", _u.plan || "free");
        if (!creditResult.success) return res.status(402).json({ message: creditResult.message, insufficientCredits: true, balance: creditResult.balance });
      }

      const platformMap: Record<string, string> = { instagram: "Instagram", youtube: "YouTube", linkedin: "LinkedIn", twitter: "X/Twitter" };
      const platformLabel = platformMap[platform] || platform;
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
        existingContentSection = `\n${isRealData ? "REAL profile analysis" : "Existing content analysis"} (craft ideas that fill gaps and beat best performers):
- Total posts analysed: ${posts.length}${isRealData ? " (real data)" : ""}
- Avg views: ${avgViews.toLocaleString()} | Avg likes: ${avgLikes.toLocaleString()}
- Most-used format: ${topType ? `${topType[0]} (${topType[1]} posts)` : "mixed"}
- Best performing post: "${topPost?.title}" — ${(topPost?.views || 0).toLocaleString()} views
- Recent post titles (DO NOT repeat verbatim): ${recentTitles.map((t: string) => `"${t}"`).join(", ")}
Generate ideas that are FRESH, fill clear content gaps, and strategically build on what's already working.\n`;
      }

      const isYouTube = platform === "youtube";
      const isLinkedIn = platform === "linkedin";
      const isTwitter = platform === "twitter";

      const platformFormatSection = isYouTube ? `
YouTube format options (match the selected content type):
- Short Form: YouTube Shorts, quick tips, viral hooks, micro lessons
- Long Form: Deep educational videos, tutorials, case studies, step-by-step guides
- Value Based: Educational breakdowns, framework explanations, strategy videos
- VSL Style: Problem–solution videos, authority videos, offer explanation, story-based persuasion
` : isLinkedIn ? `
LinkedIn content formats:
- Thought Leadership: Personal insights, industry opinions, lessons learned, controversial takes
- List Posts: "5 things I wish I knew...", "3 mistakes most [role] make", numbered insight posts
- Story Posts: Personal career stories, failures, wins, transformation arcs — 1st person storytelling
- How-To Carousel: Step-by-step professional advice, frameworks, systems in carousel format
- Newsletter Snippets: Long-form insights styled for LinkedIn's algorithm — 1300 char sweet spot
LinkedIn algorithm rules: hook line (first 1-2 lines before "...see more"), no links in post, high personal = high reach, end with strong engagement question.
` : isTwitter ? `
X/Twitter content formats:
- Thread: Multi-tweet educational breakdown (opener hook + 8-15 numbered tweets + CTA)
- Single Tweet: Punchy hot take, controversial opinion, or insight under 280 chars
- Quote Thread: Series of powerful one-liners or facts
- Poll Thread: Engagement-first tweet + poll question
X/Twitter algorithm rules: hooks must hook in first 10 words, threads outperform singles for reach, reply baiting = algorithm boost, avoid external links in main tweet.
` : "";

      const defaultContentType = isYouTube ? "Mix of Long Form, Value-Based, and Short Form videos" : isLinkedIn ? "Mix of thought leadership, list posts, and story posts" : isTwitter ? "Mix of threads, hot takes, and single tweets" : "Mix of Reels, Carousels, Posts";

      const systemPrompt = `You are an elite social media content strategist specialized in ${platformLabel}. You generate scroll-stopping, high-performing content ideas that are deeply specific, actionable, and hyper-relevant to the exact niche provided. CRITICAL RULES: (1) ZERO generic ideas — every title must name a SPECIFIC pain point, result, or insight tied to the niche. (2) Never use vague openers like "How to grow", "Tips for success", "Why you should". Instead use specific numbers, outcomes, or contrarian angles. (3) Every idea must feel like it was written ONLY for this exact creator, not copy-pasteable to any other niche.${isLinkedIn ? " For LinkedIn: write in a punchy, first-person professional tone. Use specific industry language, name real problems professionals in this niche face, and create ideas that spark genuine debate or sharing among peers. Thought leadership means SPECIFIC insights, not motivational fluff." : ""}${isTwitter ? " For X/Twitter: every thread must have a jaw-dropping opening tweet with a specific claim or stat. Hot takes must be genuinely controversial or counterintuitive for this niche — not obvious advice. Threads must deliver real value in each tweet, not vague teases. Single tweets must pack a complete insight in under 200 chars." : ""}${isYouTube ? " For YouTube, when you create list-style videos (e.g. '5 Ways to...'), you MUST provide all numbered points in full detail." : ""}`;

      const { hashtags } = req.body;
      const hashtagSection = (Array.isArray(hashtags) && hashtags.length > 0)
        ? `\nPopular hashtags/topics in this niche: ${hashtags.join(" ")}\n`
        : "";

      const captionLabel = "captionStarter";
      const captionDesc = isLinkedIn ? "First 1-2 lines of the LinkedIn post (before 'see more' cutoff) — must stop the scroll and spark curiosity" : isTwitter ? "The opening tweet or hook that makes people click 'show thread' or engage immediately — punchy, under 200 chars" : "An attention-grabbing opening line for the caption or script hook they can copy directly";
      const formatDesc = isYouTube ? ' (e.g. "Long-form Tutorial", "YouTube Short", "VSL", "Educational Breakdown")' : isLinkedIn ? ' (e.g. "Thought Leadership Post", "List Post", "Story Post", "Carousel", "Newsletter")' : isTwitter ? ' (e.g. "Twitter Thread", "Single Tweet Hot Take", "Quote Thread", "Poll Thread")' : ' (e.g. "Instagram Reel", "Carousel", "Static Post", "Story")';

      const userPrompt = `${profileSection}Generate 6 powerful content ideas for a ${platformLabel} creator.

Niche: ${niche}
Content type: ${contentType || defaultContentType}
Goal: ${goalLabel}
Target audience: ${audienceLabel}
${additionalContext ? `Extra context: ${additionalContext}` : ""}
${hashtagSection}${existingContentSection}${platformFormatSection}
For each idea provide ALL of these fields:
1. title — A specific, scroll-stopping hook (max 12 words). NOT generic.
2. concept — 2-3 sentences explaining exactly what the content covers and why it will perform on ${platformLabel}
3. formatType — The exact format${formatDesc}
4. whyItWorks — 1-2 sentences on the ${platformLabel} algorithm advantage and engagement potential of this idea
5. cta — A specific, compelling call-to-action tailored to ${platformLabel} (${isTwitter ? "e.g. 'Retweet if you agree', 'Reply with your #1 lesson'" : isLinkedIn ? "e.g. 'What do you think? Drop your take below', 'Tag a colleague who needs to see this'" : "e.g. 'Follow for more', 'Save this for later', 'DM me [word]'"})
6. ${captionLabel} — ${captionDesc}${isYouTube ? `
7. keyPoints — REQUIRED for YouTube: If the title includes a number, list every single numbered point in full detail as an array of strings.` : isTwitter ? `
7. threadOutline — For thread ideas: provide the first 3 tweet texts in full as an array of strings (opener + tweet 2 + tweet 3). For single tweets: leave as [].` : isLinkedIn ? `
7. linkedinStructure — The post structure in 3-4 bullet points (e.g. ["Hook: ...", "Problem: ...", "Solution: ...", "CTA: ..."])` : ""}

Also add a contentMix suggestion at the end as a separate JSON object.

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "ideas": [
    {
      "title": "...",
      "concept": "...",
      "formatType": "...",
      "whyItWorks": "...",
      "cta": "...",
      "${captionLabel}": "..."${isYouTube ? `,
      "keyPoints": ["1. detailed point...", "2. detailed point..."]` : isTwitter ? `,
      "threadOutline": ["tweet 1 text...", "tweet 2 text...", "tweet 3 text..."]` : isLinkedIn ? `,
      "linkedinStructure": ["Hook: ...", "Problem: ...", "Solution/insight: ...", "CTA: ..."]` : ""}
    }
  ],
  "contentMix": {
    "growth": 40,
    "value": 40,
    "conversion": 20,
    "suggestion": "One sentence on ideal posting mix for this niche and goal on ${platformLabel}"
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

  // ── AI Hashtag Suggestions ────────────────────────────────────────────────
  app.post("/api/ai/hashtag-suggestions", requireAuth, async (req: Request, res: Response) => {
    try {
      const { niche } = req.body;
      if (!niche || niche.trim().length < 2) return res.json({ hashtags: [] });

      const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];
      let lastErr: any;
      for (const model of GROQ_MODELS) {
        try {
          const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
            body: JSON.stringify({
              model,
              max_tokens: 300,
              temperature: 0.5,
              messages: [
                {
                  role: "system",
                  content: "You are an Instagram growth expert who knows exactly which hashtags drive real reach and engagement. Return ONLY valid JSON — no markdown, no explanation.",
                },
                {
                  role: "user",
                  content: `Give me 12 highly relevant Instagram hashtags for a creator in the "${niche}" niche. Mix of sizes: 4 large (1M+ posts), 4 medium (100k-1M posts), 4 small/niche (<100k posts). These must be actually used hashtags that perform well for this niche. Return JSON: { "hashtags": ["#tag1", "#tag2", ...] }`,
                },
              ],
            }),
          });
          const json = await resp.json() as any;
          const raw = json.choices?.[0]?.message?.content?.trim() || "";
          const cleaned = raw.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed.hashtags)) return res.json({ hashtags: parsed.hashtags.slice(0, 12) });
          break;
        } catch (e) { lastErr = e; }
      }
      res.json({ hashtags: [] });
    } catch (err: any) {
      res.json({ hashtags: [] });
    }
  });

  // ── AI Full Script Generator ───────────────────────────────────────────────
  app.post("/api/ai/full-script", requireAuth, async (req: Request, res: Response) => {
    try {
      const { title, concept, captionStarter, keyPoints, cta, platform, niche, goal, duration, formatType } = req.body;
      if (!title) return res.status(400).json({ message: "Title is required" });

      const _u2 = req.user as any;
      if (_u2.role !== "admin") {
        const creditResult = await storage.deductCredits(_u2.id, 2, "ai_coach", "AI Script / Coach generation", _u2.plan || "free");
        if (!creditResult.success) return res.status(402).json({ message: creditResult.message, insufficientCredits: true, balance: creditResult.balance });
      }

      const isYt = platform === "youtube";
      const fmt = (formatType || "").toLowerCase();
      const isCarousel = fmt.includes("carousel");
      const isStory = fmt.includes("stor");

      // YouTube duration config
      const ytDuration = parseInt(duration) || 5;
      const ytWordRange = ytDuration <= 5 ? "700–900 words" : ytDuration <= 10 ? "1,500–2,000 words" : "2,500–3,000 words";
      const ytSections = ytDuration <= 5 ? "3" : ytDuration <= 10 ? "5–6" : "7–8";
      const ytTimeHint = ytDuration <= 5
        ? "(0:00-0:15 hook, 0:15-0:40 intro, then 3 main sections, ending with CTA)"
        : ytDuration <= 10
        ? "(0:00-0:20 hook, 0:20-0:50 intro, then 5-6 detailed sections, mid-video engagement prompt, ending with CTA)"
        : "(0:00-0:20 hook, 0:20-1:00 intro, then 7-8 deep sections with sub-points, multiple engagement prompts, storytelling segments, ending with CTA)";

      let prompt: string;

      if (isYt) {
        prompt = `You are a world-class YouTube scriptwriter. Generate a complete, production-ready ${ytDuration}-minute YouTube video script.

VIDEO IDEA: ${title}
CONCEPT: ${concept || ""}
NICHE: ${niche || "not specified"}
GOAL: ${goal || "grow audience"}
OPENING HOOK DIRECTION: ${captionStarter || ""}
KEY POINTS TO COVER: ${(keyPoints || []).join(", ")}
CTA: ${cta || ""}
TARGET LENGTH: ${ytDuration} minutes ${ytTimeHint}

Write a FULL YouTube script with EXACTLY ${ytSections} body sections. Total word count: ${ytWordRange}. Structure:

## HOOK (0:00 - 0:${ytDuration <= 5 ? "15" : "20"})
[Write 3-5 attention-grabbing opening sentences. Pattern interrupt. Make them stop scrolling. Quote the exact words to say.]

## INTRO (0:${ytDuration <= 5 ? "15" : "20"} - 0:${ytDuration <= 5 ? "40" : "50"})
[Quick credibility, promise of the video, what they will learn, why it matters NOW]

## BODY — MAIN CONTENT
${ytDuration >= 10 ? "[Each section must have detailed sub-points, specific examples, data, stories, and exact dialogue. No vague placeholders.]" : "[Write exact words to say. Conversational. Punchy. Include B-roll suggestions in [brackets].]"}

${Array.from({ length: parseInt(ytSections[0]) }, (_, i) => `### Section ${i + 1}: [Topic]
[Full script with exact words, transitions, energy cues, and visual direction in brackets...]`).join("\n\n")}

${ytDuration >= 10 ? `## ENGAGEMENT PROMPT (mid-video)
[Ask viewers to comment with something specific — makes the algorithm push the video]

` : ""}## CONCLUSION & CTA
[Key takeaway recap. Strong CTA. What to watch next or do right now.]

## END SCREEN (Final 20 seconds)
[Exact words while end screen plays. Plug another video. Ask to subscribe.]

Every word must sound natural when spoken aloud. Include delivery cues like (pause), (lean in), (slow down). Total: ${ytWordRange}.`;

      } else if (isCarousel) {
        prompt = `You are an expert Instagram carousel copywriter. Generate a complete, slide-by-slide carousel script.

CAROUSEL IDEA: ${title}
CONCEPT: ${concept || ""}
NICHE: ${niche || "not specified"}
GOAL: ${goal || "grow followers"}
HOOK LINE: ${captionStarter || ""}
KEY POINTS: ${(keyPoints || []).join(", ")}
CTA: ${cta || ""}

Write the EXACT TEXT for every slide. This is a carousel — each slide has limited space so text must be punchy and visual. Write 8-10 slides.

## SLIDE 1 — HOOK / COVER
Headline text (large, bold): [The hook line that makes them swipe]
Subheading (small text, optional): [Supporting line]

## SLIDE 2 — [Topic]
Main text: [Exactly what goes on this slide — short, punchy]
Supporting line: [Optional second line]

## SLIDE 3 — [Topic]
Main text: [...]
Supporting line: [...]

[Continue for slides 4-9 following the same format]

## LAST SLIDE — CTA
Main text: [Strong call-to-action — save, follow, DM, share]
Sub text: [Handle or offer or next step]

## CAPTION (for the post)
[Full Instagram caption: hook line + 3-4 lines of value + CTA + 15-20 hashtags]

Keep each slide text to maximum 15-20 words. The carousel should tell a complete story from hook to payoff.`;

      } else if (isStory) {
        prompt = `You are an Instagram Stories copywriter. Generate a complete story sequence with exact text for each frame.

STORY IDEA: ${title}
CONCEPT: ${concept || ""}
NICHE: ${niche || "not specified"}
GOAL: ${goal || "drive engagement"}
HOOK: ${captionStarter || ""}
KEY POINTS: ${(keyPoints || []).join(", ")}
CTA: ${cta || ""}

Write the EXACT TEXT for 6-8 story frames. Each frame is a single slide in Stories.

## STORY FRAME 1 — HOOK
Text on screen: [Bold hook text — max 10 words]
Visual suggestion: [Background, color, style suggestion]
Interactive element: [Poll / Question sticker / Swipe-up if relevant]

## STORY FRAME 2 — [Topic/Problem]
Text on screen: [Exact text]
Visual suggestion: [...]
Interactive element: [...]

[Continue for frames 3-7]

## STORY FRAME FINAL — CTA
Text on screen: [Clear action — reply, DM, link, swipe]
Visual suggestion: [...]
Interactive element: [Link sticker / DM button / Poll]

Each frame text must be short (max 10-15 words) and punchy. Stories disappear in seconds — every frame must earn the next tap.`;

      } else {
        // Default: Instagram Reel
        prompt = `You are a world-class Instagram Reels / short-form video scriptwriter. Generate a complete, production-ready script.

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
Spoken words:
[Exact script — short punchy sentences. Include visual direction in [brackets]. Use pattern interrupts every 5-7 seconds.]

Visual notes:
[Camera angles, text overlays, cuts, transitions]

## HOOK CALLBACK / PAYOFF (40-50 seconds)
[Reference back to the hook. Deliver the promised value or reveal.]

## CTA (Last 3-5 seconds)
[Exact CTA line. One clear action — comment, follow, save, share, or DM.]

## CAPTION
[Complete caption: hook + 3-5 lines of value + CTA + 15-20 relevant hashtags]

## AUDIO SUGGESTION
[Type of music or trending sound that fits this reel]

Keep the entire reel script to 45-60 seconds when read aloud. Every single word must earn its place.`;
      }

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
              max_tokens: isYt ? (ytDuration >= 15 ? 6000 : ytDuration >= 10 ? 4000 : 2500) : 2500,
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

  // ── AI Carousel Text Generator ────────────────────────────────────────────
  app.post("/api/carousel/generate-text", requireAuth, async (req: Request, res: Response) => {
    try {
      const u = req.user as any;
      const { topic, tone, slideCount } = req.body;
      if (!topic) return res.status(400).json({ message: "Topic is required" });
      const count = Math.min(Math.max(Number(slideCount) || 6, 2), 10);
      const toneStr = tone || "engaging and educational";

      const creditResult = await storage.deductCredits(u.id, 3, "carousel", "AI Carousel text generation", u.plan || "free");
      if (!creditResult.success) return res.status(402).json({ message: creditResult.message, insufficientCredits: true, balance: creditResult.balance });

      const systemPrompt = `You are an expert Instagram carousel copywriter. Generate structured, high-converting carousel content. Return ONLY valid JSON — no markdown, no code fences.`;
      const userPrompt = `Create a ${count}-slide Instagram carousel about: "${topic}"
Tone: ${toneStr}

Return a JSON object with this EXACT structure:
{
  "slides": [
    { "role": "Hook", "headline": "short bold headline max 8 words", "body": "2-3 punchy supporting lines max 30 words" },
    { "role": "Problem", "headline": "...", "body": "..." },
    ...more slides...
    { "role": "CTA", "headline": "call to action headline", "body": "clear single action for audience to take" }
  ]
}

Rules:
- Slide 1 is always the HOOK — make it impossible to scroll past, use a bold claim or question
- Middle slides = value/insight/steps — each self-contained
- Last slide is always the CTA — one clear action (Follow, DM [word], Save this, etc.)
- Headlines: max 8 words, punchy, no punctuation at end
- Body: max 30 words, concrete not vague
- Vary the roles: Hook → Problem → Insight → Solution/Steps → Benefit → CTA
- Write for viral reach, not corporate speak`;

      const raw = await callGroqJson(systemPrompt, userPrompt, 2000);
      const parsed = JSON.parse(raw);
      if (!parsed.slides || !Array.isArray(parsed.slides)) throw new Error("Invalid AI response format");
      res.json({ slides: parsed.slides, creditsUsed: 3, balance: creditResult.balance });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Generation failed" });
    }
  });

  // ── AI Carousel Image Generator (Google Imagen + Runware fallback) ────────
  app.post("/api/carousel/generate-image", requireAuth, async (req: Request, res: Response) => {
    try {
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ message: "Prompt required" });
      const _uImg = req.user as any;
      if (_uImg?.role !== "admin") {
        const imgCredit = await storage.deductCredits(_uImg.id, 2, "carousel_image", "Carousel AI image generation", _uImg.plan || "free");
        if (!imgCredit.success) return res.status(402).json({ message: imgCredit.message, insufficientCredits: true, balance: imgCredit.balance });
      }

      const gKey = process.env.GOOGLE__API_KEYIMAGE;
      let imageBase64: string | null = null;

      if (gKey) {
        try {
          const gResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${gKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                instances: [{ prompt }],
                parameters: { sampleCount: 1, aspectRatio: "1:1", safetySetting: "block_some", negativePrompt: "text overlay, watermarks, faces, people, logos, blurry" }
              })
            }
          );
          if (gResp.ok) {
            const gData = await gResp.json();
            const b64 = gData.predictions?.[0]?.bytesBase64Encoded;
            if (b64) imageBase64 = `data:image/png;base64,${b64}`;
          }
        } catch { /* fall through to Runware */ }
      }

      if (!imageBase64) {
        const runwareKey = process.env.RUNWARE_API_KEY;
        if (!runwareKey) return res.status(500).json({ message: "No image generation service configured" });
        const images = await runwareGenerate(runwareKey, [{
          taskType: "imageInference", taskUUID: `carousel-${Date.now()}`,
          positivePrompt: prompt, negativePrompt: "text overlay, watermarks, faces, blurry, low quality",
          model: "runware:100@1", width: 1024, height: 1024, numberResults: 1, outputType: "URL", outputFormat: "WEBP"
        }]);
        if (images[0]?.url) return res.json({ url: images[0].url, provider: "runware" });
        return res.status(500).json({ message: "Image generation failed" });
      }

      res.json({ imageBase64, provider: "google" });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Image generation failed" });
    }
  });

  // ── AI Text Refine (Groq — improve message quality) ───────────────────────
  app.post("/api/ai/refine-text", requireAuth, async (req: Request, res: Response) => {
    try {
      const { text, context } = req.body;
      if (!text || text.trim().length < 3) return res.status(400).json({ message: "Text too short" });
      const systemPrompt = `You are an expert copywriter and communication coach. Rewrite the given message to be clearer, more professional, and more compelling — keeping the exact same meaning and intent. Do not add new information. Return ONLY the improved text, nothing else.`;
      const userPrompt = `Improve this${context ? ` (context: ${context})` : ""}: "${text.trim()}"`;
      const refined = await callGroq(systemPrompt, userPrompt, 500);
      res.json({ refined: refined.trim().replace(/^["']|["']$/g, "") });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Refinement failed" });
    }
  });

  // ── Regenerate single carousel slide ─────────────────────────────────────
  app.post("/api/carousel/regenerate-slide", requireAuth, async (req: Request, res: Response) => {
    try {
      const u = req.user as any;
      const { topic, tone, role, slideNum, totalSlides } = req.body;
      if (!topic || !role) return res.status(400).json({ message: "Topic and role required" });

      const systemPrompt = `You are an expert Instagram carousel copywriter. Return ONLY valid JSON.`;
      const userPrompt = `Regenerate slide ${slideNum} of ${totalSlides} for a carousel about: "${topic}"
Tone: ${tone || "engaging"}
This slide's role: "${role}"

Return JSON:
{ "headline": "short bold headline max 8 words", "body": "2-3 punchy lines max 30 words" }`;

      const raw = await callGroqJson(systemPrompt, userPrompt, 400);
      const parsed = JSON.parse(raw);
      res.json({ headline: parsed.headline || "", body: parsed.body || "" });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Regeneration failed" });
    }
  });

  // ── Add more slides to an existing carousel ──────────────────────────────
  app.post("/api/carousel/add-slides", requireAuth, async (req: Request, res: Response) => {
    try {
      const u = req.user as any;
      const { topic, tone, addCount, existingRoles } = req.body;
      if (!topic) return res.status(400).json({ message: "Topic is required" });
      const count = Math.min(Math.max(Number(addCount) || 3, 1), 5);
      const creditResult = await storage.deductCredits(u.id, 2, "carousel", "Carousel add-slides", u.plan || "free");
      if (!creditResult.success) return res.status(402).json({ message: creditResult.message, insufficientCredits: true, balance: creditResult.balance });
      const systemPrompt = `You are an expert Instagram carousel copywriter. Generate additional slides as valid JSON only. No markdown, no code fences.`;
      const userPrompt = `Generate ${count} NEW slides for an existing carousel about: "${topic}"
Tone: ${tone || "engaging and educational"}
Existing slide roles already used: ${(existingRoles || []).join(", ")}
These new slides should ADD more value — deeper insights, extra steps, or a stronger CTA.
Available roles: Insight, Solution, Step, Benefit, Proof, Story, Tip, Deep Dive, Bonus, Recap

Return JSON:
{
  "slides": [
    { "role": "Insight", "headline": "short bold headline max 8 words", "body": "2-3 punchy supporting lines max 30 words" }
  ]
}`;
      const raw = await callGroqJson(systemPrompt, userPrompt, 1200);
      const parsed = JSON.parse(raw);
      if (!parsed.slides || !Array.isArray(parsed.slides)) throw new Error("Invalid AI response format");
      res.json({ slides: parsed.slides, creditsUsed: 2, balance: creditResult.balance });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to add slides" });
    }
  });

  // ── AI Refine: rewrite all slides from a prompt ───────────────────────────
  app.post("/api/carousel/refine", requireAuth, async (req: Request, res: Response) => {
    try {
      const u = req.user as any;
      const { topic, tone, slides, prompt } = req.body;
      if (!slides || !Array.isArray(slides)) return res.status(400).json({ message: "Slides array required" });
      const creditResult = await storage.deductCredits(u.id, 2, "carousel", "Carousel AI refine", u.plan || "free");
      if (!creditResult.success) return res.status(402).json({ message: creditResult.message, insufficientCredits: true, balance: creditResult.balance });
      const systemPrompt = `You are an expert Instagram carousel copywriter. Refine carousel slides as valid JSON only. No markdown, no code fences.`;
      const userPrompt = `Refine the following ${slides.length} carousel slides about "${topic}".
Tone: ${tone || "engaging and educational"}
User instruction: "${prompt}"

Current slides:
${slides.map((s: any, i: number) => `Slide ${i+1} (${s.role}): "${s.headline}" — ${s.body}`).join("\n")}

Apply the user's instruction to improve, strengthen, or transform the slides. Keep the same roles and count.
Return JSON:
{
  "slides": [
    { "role": "same role as input", "headline": "improved headline", "body": "improved body" }
  ]
}`;
      const raw = await callGroqJson(systemPrompt, userPrompt, 2000);
      const parsed = JSON.parse(raw);
      if (!parsed.slides || !Array.isArray(parsed.slides)) throw new Error("Invalid AI response format");
      res.json({ slides: parsed.slides, creditsUsed: 2, balance: creditResult.balance });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Refinement failed" });
    }
  });

  // ── AI Content Report (OpenRouter — smart reasoning) ─────────────────────
  app.post("/api/ai/content-report", requireAuth, async (req: Request, res: Response) => {
    try {
      const { posts, platform } = req.body;
      if (!posts || posts.length === 0) return res.status(400).json({ message: "No posts to analyze" });

      const _u3 = req.user as any;
      if (_u3.role !== "admin") {
        const creditResult = await storage.deductCredits(_u3.id, 8, "ai_report", "AI Content Report analysis", _u3.plan || "free");
        if (!creditResult.success) return res.status(402).json({ message: creditResult.message, insufficientCredits: true, balance: creditResult.balance });
      }

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
      const lead = await storage.updateDmLead(p(req.params.id), req.body);
      return res.json(lead);
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/dm/leads/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteDmLead(p(req.params.id));
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
      await storage.deleteDmQuickReply(p(req.params.id));
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

  app.post("/api/competitor/analyze", requireAuth, async (req: Request, res: Response) => {
    try {
      const { clientUrl, competitorUrl, clientId } = req.body;
      if (!clientUrl || !competitorUrl || !clientId) return res.status(400).json({ message: "clientUrl, competitorUrl, and clientId are required" });

      const _u4 = req.user as any;
      if (_u4.role !== "admin") {
        const creditResult = await storage.deductCredits(_u4.id, 10, "competitor", "Competitor Intelligence analysis", _u4.plan || "free");
        if (!creditResult.success) return res.status(402).json({ message: creditResult.message, insufficientCredits: true, balance: creditResult.balance });
      }

      const [clientItems, competitorItems] = await Promise.all([
        apifyInstagram({ directUrls: [clientUrl], resultsType: "posts", resultsLimit: 30 }),
        apifyInstagram({ directUrls: [competitorUrl], resultsType: "posts", resultsLimit: 30 }),
      ]);

      const clientHandle = extractHandle(clientUrl);
      const competitorHandle = extractHandle(competitorUrl);

      const clientData = processProfileMetrics(clientItems, clientHandle);
      const competitorData = processProfileMetrics(competitorItems, competitorHandle);

      if (!clientData && !competitorData) return res.status(404).json({ message: "Could not scrape either profile. Make sure they are public Instagram accounts." });

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

  // ── Direct Reel vs Reel Comparison ────────────────────────────────────────
  app.post("/api/competitor/compare-reels", requireAuth, async (req: Request, res: Response) => {
    try {
      const { myReelUrl, competitorReelUrl } = req.body;
      if (!myReelUrl || !competitorReelUrl) return res.status(400).json({ message: "myReelUrl and competitorReelUrl are required" });

      // Scrape both reels in parallel using the shared instagram-scraper actor
      const [myItems, compItems] = await Promise.all([
        apifyInstagram({ directUrls: [myReelUrl], resultsType: "posts", resultsLimit: 1 }),
        apifyInstagram({ directUrls: [competitorReelUrl], resultsType: "posts", resultsLimit: 1 }),
      ]);

      const myPost = myItems?.[0] ?? null;
      const compPost = compItems?.[0] ?? null;

      if (!myPost && !compPost) return res.status(404).json({ message: "Could not scrape either reel. Make sure the posts are public." });

      const formatPost = (p: any) => ({
        url: p?.url ?? p?.shortCode ? `https://instagram.com/p/${p.shortCode}` : "N/A",
        caption: p?.caption ?? p?.alt ?? "",
        views: p?.videoPlayCount ?? p?.videoViewCount ?? 0,
        likes: p?.likesCount ?? p?.likes ?? 0,
        comments: p?.commentsCount ?? p?.comments ?? 0,
        saves: p?.savesCount ?? 0,
        shares: p?.sharesCount ?? 0,
        duration: p?.videoDuration ?? null,
        timestamp: p?.timestamp ?? p?.takenAt ?? null,
        ownerUsername: p?.ownerUsername ?? p?.owner?.username ?? "unknown",
        hashtags: p?.hashtags ?? [],
        type: p?.type ?? "Video",
      });

      const my = formatPost(myPost);
      const comp = formatPost(compPost);

      const myEr = my.views > 0 ? (((my.likes + my.comments) / my.views) * 100).toFixed(2) : "0";
      const compEr = comp.views > 0 ? (((comp.likes + comp.comments) / comp.views) * 100).toFixed(2) : "0";

      const rawAi = await callAnthropic(
        "You are an elite Instagram content strategist. Analyse two Instagram reels and produce a deep comparison. Respond ONLY with valid JSON.",
        `Compare these two Instagram reels in depth.

MY REEL:
Owner: @${my.ownerUsername}
Caption: "${my.caption.slice(0, 600)}"
Views: ${my.views.toLocaleString()} | Likes: ${my.likes.toLocaleString()} | Comments: ${my.comments.toLocaleString()} | ER: ${myEr}%
Duration: ${my.duration ? my.duration + "s" : "unknown"} | Hashtags: ${my.hashtags.length}

COMPETITOR REEL:
Owner: @${comp.ownerUsername}
Caption: "${comp.caption.slice(0, 600)}"
Views: ${comp.views.toLocaleString()} | Likes: ${comp.likes.toLocaleString()} | Comments: ${comp.comments.toLocaleString()} | ER: ${compEr}%
Duration: ${comp.duration ? comp.duration + "s" : "unknown"} | Hashtags: ${comp.hashtags.length}

Return this EXACT JSON:
{
  "winner": "mine"|"competitor"|"tie",
  "winnerReason": "2-3 sentence explanation of who wins and exactly why",
  "scores": {
    "mine": { "hook": 0-10, "caption": 0-10, "engagement": 0-10, "retention": 0-10, "hashtags": 0-10, "overall": 0-100 },
    "competitor": { "hook": 0-10, "caption": 0-10, "engagement": 0-10, "retention": 0-10, "hashtags": 0-10, "overall": 0-100 }
  },
  "hookAnalysis": {
    "mine": { "hook": "First line / hook of the caption", "type": "curiosity|storytelling|authority|pain-point|controversy|education", "strength": "what makes it strong or weak" },
    "competitor": { "hook": "First line / hook of the caption", "type": "curiosity|storytelling|authority|pain-point|controversy|education", "strength": "what makes it strong or weak" }
  },
  "captionBreakdown": {
    "mine": { "structure": "e.g. Hook → Story → Value → CTA", "cta": "the CTA used or none", "tone": "tone of voice", "readability": "simple|moderate|complex" },
    "competitor": { "structure": "e.g. Hook → Value → CTA", "cta": "the CTA used or none", "tone": "tone of voice", "readability": "simple|moderate|complex" }
  },
  "whatCompetitorDoesBetter": ["specific point 1", "specific point 2", "specific point 3"],
  "whatYouDoBetter": ["specific point 1", "specific point 2"],
  "stealThese": ["Actionable thing to steal from competitor reel 1", "Actionable thing 2", "Actionable thing 3"],
  "improvementPlan": "3-5 sentence concrete plan: exactly what to change in YOUR reel to beat competitor's performance",
  "rewrittenHook": "A rewritten, stronger hook for MY reel based on what competitor does better",
  "verdictTags": ["tag1", "tag2", "tag3"]
}`
      );
      let ai: any = {};
      try {
        const jsonMatch = rawAi.match(/\{[\s\S]*\}/);
        ai = JSON.parse(jsonMatch ? jsonMatch[0] : rawAi);
      } catch { ai = {}; }

      return res.json({
        myReel: { ...my, er: myEr },
        competitorReel: { ...comp, er: compEr },
        ai,
      });
    } catch (err: any) {
      console.error("compare-reels error:", err.message);
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
      await storage.deleteCompetitorAnalysis(p(req.params.id));
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
      await storage.deleteNicheAnalysis(p(req.params.id));
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Methodology Engine ────────────────────────────────────────────────────
  app.post("/api/methodology/analyze", requireAuth, async (req: Request, res: Response) => {
    try {
      const { profileUrl } = req.body;
      if (!profileUrl) return res.status(400).json({ message: "profileUrl is required" });

      const items = await apifyInstagram({ directUrls: [profileUrl], resultsType: "posts", resultsLimit: 30 });
      if (!items || items.length === 0) return res.status(404).json({ message: "Could not scrape this profile. Make sure it's a public Instagram account." });

      const handle = extractHandle(profileUrl);
      const metrics = processProfileMetrics(items, handle);
      const posts = buildPostList(items);

      const systemPrompt = `You are an elite Instagram content strategist who specialises in reverse-engineering a creator's unique content methodology. Analyse their post data and build a precise "Content DNA Profile". Always respond with valid JSON only — no markdown, no explanation outside the JSON.`;

      const userPrompt = `Analyse this Instagram creator's last ${posts.length} posts and extract their exact content methodology.

Handle: ${handle}
Aggregate metrics: ${JSON.stringify(metrics)}
Posts: ${JSON.stringify(posts)}

Build a detailed "Content DNA Profile". Return ONLY this exact JSON:
{
  "handle": "${handle}",
  "contentDNA": {
    "hookStyle": "e.g. Authority-based — they open with stats, credentials, or bold claims",
    "hookExamples": ["exact hook from post 1", "exact hook from post 2", "exact hook from post 3"],
    "ctaStyle": "e.g. Soft CTA — they end with questions or 'save this', never hard sells",
    "ctaExamples": ["exact CTA from post 1", "exact CTA from post 2"],
    "contentStructure": "e.g. Problem → Solution → Proof → CTA",
    "dominantFormat": "Reels|Carousels|Posts|Mixed",
    "postingFrequency": "e.g. 4-5x per week",
    "toneOfVoice": "e.g. Authoritative + relatable — speaks like a mentor, not a guru",
    "topThemes": ["theme1", "theme2", "theme3"],
    "engagementTriggers": ["trigger1", "trigger2"],
    "weaknesses": ["weakness1", "weakness2"],
    "fingerprint": "One-sentence summary like: 'You use authority-based hooks + educational structure + soft CTAs — a trust-building methodology designed for long-term audience growth'"
  },
  "topPosts": [
    { "caption": "first 120 chars", "views": 0, "likes": 0, "hookType": "curiosity|storytelling|authority|controversy|pain-point|education", "whyItWorked": "1 sentence" }
  ],
  "scorecard": {
    "hookStrength": 75,
    "ctaEffectiveness": 60,
    "contentConsistency": 80,
    "engagementRate": 70,
    "viralPotential": 55,
    "overall": 68
  },
  "improvements": [
    { "area": "Hooks", "issue": "specific issue", "fix": "specific actionable fix" },
    { "area": "CTA", "issue": "specific issue", "fix": "specific actionable fix" },
    { "area": "Structure", "issue": "specific issue", "fix": "specific actionable fix" }
  ]
}`;

      const rawText = await callAnthropic(systemPrompt, userPrompt, 3000);
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      const profile = JSON.parse(cleaned);
      return res.json(profile);
    } catch (err: any) {
      console.error("Methodology analyze error:", err);
      return res.status(500).json({ message: err.message || "Analysis failed" });
    }
  });

  app.post("/api/methodology/scrape-reel", requireAuth, async (req: Request, res: Response) => {
    try {
      const { reelUrl } = req.body;
      if (!reelUrl) return res.status(400).json({ message: "reelUrl is required" });

      const shortcode = reelUrl.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
      if (!shortcode) return res.status(400).json({ message: "Invalid Instagram reel URL" });

      const items = await apifyInstagram({ directUrls: [reelUrl], resultsType: "posts", resultsLimit: 1 });
      const post = items?.[0] ?? null;
      if (!post) return res.json({ caption: null });

      const caption = post.caption ?? post.alt ?? post.description ?? post.accessibility_caption ?? null;
      return res.json({ caption, shortcode, timestamp: post.timestamp });
    } catch (err: any) {
      console.error("scrape-reel error:", err.message);
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/methodology/improve", requireAuth, async (req: Request, res: Response) => {
    try {
      const { content, dna, tool } = req.body;
      if (!content || !tool) return res.status(400).json({ message: "content and tool are required" });

      const dnaContext = dna?.fingerprint
        ? `\n\nCreator's Content DNA: ${dna.fingerprint}\nHook style: ${dna.hookStyle}\nCTA style: ${dna.ctaStyle}\nContent structure: ${dna.contentStructure}`
        : "";

      const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
      let prompt = "";

      if (tool === "improve") {
        prompt = `You are an elite Instagram content strategist. Improve the following content (caption or script).${dnaContext}

Original content:
"${content}"

Return ONLY this exact JSON:
{
  "improved": "The full improved version of the content",
  "changes": [
    { "element": "Hook", "original": "...", "improved": "...", "reason": "why this is better" },
    { "element": "Structure", "original": "...", "improved": "...", "reason": "why this is better" },
    { "element": "CTA", "original": "...", "improved": "...", "reason": "why this is better" }
  ],
  "whyItWillPerform": "2-3 sentences on why the improved version will get more reach and engagement",
  "expectedLift": "e.g. 40-60% more engagement based on improved hook and CTA"
}`;
      } else if (tool === "hooks") {
        prompt = `You are a viral hook specialist. Rewrite this hook into 4 different styles.${dnaContext}

Original hook: "${content}"

Return ONLY this exact JSON:
{
  "hooks": [
    { "style": "Curiosity", "text": "rewritten hook", "explanation": "why this drives curiosity" },
    { "style": "Controversy", "text": "rewritten hook", "explanation": "why this sparks debate" },
    { "style": "Storytelling", "text": "rewritten hook", "explanation": "why this pulls people in" },
    { "style": "Authority", "text": "rewritten hook", "explanation": "why this builds instant credibility" }
  ],
  "bestPick": "Curiosity|Controversy|Storytelling|Authority",
  "bestPickReason": "1 sentence on why this style will work best for this content"
}`;
      } else if (tool === "score") {
        prompt = `You are an Instagram content quality analyst. Score this content.${dnaContext}

Content: "${content}"

Return ONLY this exact JSON:
{
  "scores": {
    "hook": { "score": 75, "feedback": "specific feedback" },
    "engagement": { "score": 60, "feedback": "specific feedback" },
    "clarity": { "score": 80, "feedback": "specific feedback" },
    "retention": { "score": 55, "feedback": "specific feedback" },
    "cta": { "score": 70, "feedback": "specific feedback" }
  },
  "overall": 68,
  "verdict": "Strong|Needs Work|Weak",
  "topIssue": "The single biggest problem with this content",
  "quickFix": "The single most impactful change to make right now"
}`;
      } else if (tool === "abtest") {
        prompt = `You are a conversion-focused content strategist. Generate A/B test variants.${dnaContext}

Content idea or post concept: "${content}"

Return ONLY this exact JSON:
{
  "hooks": [
    { "variant": "A", "text": "hook variant A", "angle": "curiosity/authority/pain-point" },
    { "variant": "B", "text": "hook variant B", "angle": "curiosity/authority/pain-point" },
    { "variant": "C", "text": "hook variant C", "angle": "curiosity/authority/pain-point" }
  ],
  "captions": [
    { "variant": "A", "text": "full caption variant A" },
    { "variant": "B", "text": "full caption variant B" },
    { "variant": "C", "text": "full caption variant C" }
  ],
  "ctas": [
    { "variant": "A", "text": "CTA text", "type": "soft|hard|question" },
    { "variant": "B", "text": "CTA text", "type": "soft|hard|question" }
  ],
  "recommendation": "Which combination to test first and why"
}`;
      } else {
        return res.status(400).json({ message: "Invalid tool type" });
      }

      for (const model of GROQ_MODELS) {
        try {
          const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
            body: JSON.stringify({
              model,
              max_tokens: 2000,
              temperature: 0.6,
              messages: [
                { role: "system", content: "You are an elite Instagram content strategist. Return ONLY valid JSON — no markdown, no extra text." },
                { role: "user", content: prompt },
              ],
            }),
          });
          const json = await resp.json() as any;
          const raw = json.choices?.[0]?.message?.content?.trim() || "";
          const cleaned = raw.replace(/```json|```/g, "").trim();
          return res.json(JSON.parse(cleaned));
        } catch (e) { continue; }
      }
      return res.status(500).json({ message: "AI improvement failed" });
    } catch (err: any) {
      console.error("Methodology improve error:", err);
      return res.status(500).json({ message: err.message || "Improvement failed" });
    }
  });

  // ── Virality Tester ──────────────────────────────────────────────────────
  app.post("/api/virality/analyze", requireAuth, async (req: Request, res: Response) => {
    try {
      const { mode, script, reelUrl, platform, audience } = req.body;
      const _uVir = req.user as any;
      if (_uVir?.role !== "admin") {
        const virCredit = await storage.deductCredits(_uVir.id, 3, "virality", "Virality analysis", _uVir.plan || "free");
        if (!virCredit.success) return res.status(402).json({ message: virCredit.message, insufficientCredits: true, balance: virCredit.balance });
      }
      let contentToAnalyze = script;

      if (mode === "reel" && reelUrl) {
        try {
          const apifyToken = process.env.APIFY_TOKEN;
          if (apifyToken) {
            const apifyRes = await fetch(`https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ directUrls: [reelUrl], resultsType: "posts", resultsLimit: 1 }),
            });
            if (apifyRes.ok) {
              const posts = await apifyRes.json();
              if (posts?.[0]) {
                const p = posts[0];
                contentToAnalyze = `REEL DATA:\nCaption: ${p.caption || p.text || ""}\nLikes: ${p.likesCount || 0}\nComments: ${p.commentsCount || 0}\nViews: ${p.videoViewCount || p.videoPlayCount || 0}\nEngagement Rate: ${p.engagementRate || "unknown"}\nURL: ${reelUrl}`;
              }
            }
          }
        } catch {}
        if (!contentToAnalyze) contentToAnalyze = `Reel URL: ${reelUrl}`;
      }

      const platformLabel = platform === "instagram" ? "Instagram Reels" : platform === "tiktok" ? "TikTok" : "YouTube Shorts";
      const audienceNote = audience ? `Target audience: ${audience}.` : "";

      const prompt = `You are an elite content retention analyst and viral content strategist. Analyse the following ${mode === "reel" ? "reel" : "script/content idea"} for ${platformLabel} and return a detailed retention analysis as strict JSON.

Content: ${contentToAnalyze}
${audienceNote}
${mode === "reel" ? "This is an EXISTING reel — analyse why it went viral or why it didn't go viral. Be specific about real engagement signals if metrics are provided." : ""}

Return ONLY valid JSON matching this exact schema:
{
  "overallScore": number (0-100),
  "confidence": number (0-100),
  "label": string,
  "viralPrediction": string (2-3 sentences: detailed verdict on virality/retention, be specific and surgical),
  "retentionCurve": [
    { "second": number, "retention": number (0-100), "label": string }
  ],
  "scores": {
    "hook": number (0-10),
    "pacing": number (0-10),
    "emotion": number (0-10),
    "clarity": number (0-10),
    "dropRisk": number (0-10, higher = lower drop risk),
    "payoff": number (0-10),
    "rewatch": number (0-10)
  },
  "penalties": [
    { "reason": string, "impact": number (negative, e.g. -15) }
  ],
  "dropoffs": [
    { "second": number, "reason": string, "severity": "high"|"medium"|"low" }
  ],
  "hookAnalysis": {
    "score": number (0-10),
    "strengths": string[],
    "weaknesses": string[],
    "scrollStoppingScore": number (0-100)
  },
  "fixes": [
    { "type": "cut"|"add"|"rewrite"|"move", "text": string, "priority": "high"|"medium"|"low" }
  ],
  "platformFit": {
    "score": number (0-100),
    "platform": string,
    "notes": string
  },
  "audienceFit": {
    "score": number (0-100),
    "notes": string
  },
  "emotionCurve": [
    { "phase": "Hook"|"Build"|"Value"|"Payoff", "emotion": string, "intensity": number (0-10) }
  ],
  "loopPotential": number (0-100),
  "narrativeFlow": string,
  "informationDensity": string
}

Scoring rules:
- Apply penalty system: weak hook -15%, no payoff -20%, early confusion -10%, flat emotion -10%
- Overall score = (hook×0.25 + pacing×0.20 + emotion×0.15 + dropRisk×0.15 + clarity×0.10 + payoff×0.10 + rewatch×0.05) × 10, then apply penalties
- Be honest and critical — do not inflate scores
- Provide 4-6 specific fixes, 2-4 drop-off points, 3-5 penalties if applicable
- retentionCurve must have at least 5 data points showing realistic audience drop-off
- Return ONLY the JSON object, no markdown, no explanation`;

      const rawText = await callGroqJson(
        "You are an elite content retention analyst and viral content strategist. Always respond with valid JSON only — no markdown, no explanation outside the JSON.",
        prompt,
        3000
      );
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
      return res.json(parsed);
    } catch (err: any) {
      console.error("[Virality Analyze] Error:", err.message);
      return res.status(500).json({ message: err.message || "Analysis failed" });
    }
  });

  app.post("/api/virality/hooks", requireAuth, async (req: Request, res: Response) => {
    try {
      const { script, platform } = req.body;
      const _uHooks = req.user as any;
      if (_uHooks?.role !== "admin") {
        const hooksCredit = await storage.deductCredits(_uHooks.id, 1, "virality_hooks", "Viral hook generation", _uHooks.plan || "free");
        if (!hooksCredit.success) return res.status(402).json({ message: hooksCredit.message, insufficientCredits: true, balance: hooksCredit.balance });
      }
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) return res.status(500).json({ message: "GROQ_API_KEY not configured" });

      const platformLabel = platform === "instagram" ? "Instagram Reels" : platform === "tiktok" ? "TikTok" : "YouTube Shorts";

      const prompt = `You are a viral content hook specialist. Based on this content, generate 5 powerful upgraded hooks for ${platformLabel}.

Content context: ${script}

Rules:
- Each hook must be under 15 words
- Use proven hook formulas: curiosity gap, pattern interrupt, bold claim, story start, controversy
- Make them scroll-stopping and impossible to ignore
- No generic hooks — be specific and punchy

Return ONLY a JSON array of 5 strings:
["hook 1", "hook 2", "hook 3", "hook 4", "hook 5"]`;

      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
          temperature: 0.8,
        }),
      });

      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      const raw = data.choices?.[0]?.message?.content || "[]";
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const hooks = JSON.parse(cleaned);
      return res.json({ hooks });
    } catch (err: any) {
      console.error("[Virality Hooks] Error:", err.message);
      return res.status(500).json({ message: err.message || "Hook generation failed" });
    }
  });

  app.post("/api/virality/rewrite", requireAuth, async (req: Request, res: Response) => {
    try {
      const { script, platform, audience, score, fixes } = req.body;
      const _uRew = req.user as any;
      if (_uRew?.role !== "admin") {
        const rewCredit = await storage.deductCredits(_uRew.id, 1, "virality_rewrite", "Viral script rewrite", _uRew.plan || "free");
        if (!rewCredit.success) return res.status(402).json({ message: rewCredit.message, insufficientCredits: true, balance: rewCredit.balance });
      }
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) return res.status(500).json({ message: "GROQ_API_KEY not configured" });

      const platformLabel = platform === "instagram" ? "Instagram Reels" : platform === "tiktok" ? "TikTok" : "YouTube Shorts";
      const audienceNote = audience ? `Target audience: ${audience}.` : "";
      const fixNote = fixes?.length ? `Apply these specific improvements: ${fixes.map((f: any) => f.text).join("; ")}` : "";

      const prompt = `You are a viral content strategist. Rewrite this script for maximum retention and virality on ${platformLabel}.

Original content: ${script}
${audienceNote}
${fixNote}
Current retention score: ${score || "unknown"}/100

Rules:
- Start with an irresistible hook (first 3 seconds = everything)
- Add pattern interrupts every 5-7 seconds
- Build tension and deliver on the promise
- Keep pacing tight — cut every unnecessary word
- End with a strong payoff and optional loop/rewatch trigger
- Match the platform format: ${platformLabel === "Instagram Reels" ? "15-60 seconds, punchy, visual cues" : platformLabel === "TikTok" ? "fast-paced, trend-aware, conversational" : "structured, value-forward, slightly longer"}
- Label each section: [HOOK] [BUILD] [VALUE] [PAYOFF]

Return ONLY the rewritten script, no explanation, no JSON.`;

      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 800,
          temperature: 0.7,
        }),
      });

      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      const rewrittenScript = data.choices?.[0]?.message?.content || "";
      return res.json({ script: rewrittenScript });
    } catch (err: any) {
      console.error("[Virality Rewrite] Error:", err.message);
      return res.status(500).json({ message: err.message || "Rewrite failed" });
    }
  });

  // ── AI Content Coach ──────────────────────────────────────────────────────
  const COACH_SYSTEM = `You are an AI Content Coach named "Coach" — a witty, sharp, animated character who helps creators make viral content. You speak like a real mentor: casual, direct, slightly funny. Never robotic.

Personality: Friendly but honest. Use "yo", "okay", "bro" occasionally. Be encouraging but NEVER sugarcoat weak content.

When no script is provided yet: greet the user warmly and ask what they're working on.

When a script/idea IS provided: analyze it and return a JSON response with BOTH a conversational reply AND structured analysis.

Return ONLY this JSON format:
{
  "reply": "your conversational coach message (1-4 sentences, punchy, mentor-style)",
  "mood": "weak" | "decent" | "strong",
  "analysis": {
    "overallScore": <0-100>,
    "scores": {
      "hook": <0-10>,
      "clarity": <0-10>,
      "emotion": <0-10>,
      "pacing": <0-10>,
      "retention": <0-10>,
      "payoff": <0-10>
    },
    "issues": [
      { "line": "exact weak line or section", "problem": "why it's weak", "fix": "rewritten version", "severity": "high"|"medium"|"low" }
    ],
    "strengths": ["strength 1", "strength 2"],
    "dropoffs": [
      { "second": <number>, "reason": "why they drop off here", "severity": "high"|"medium"|"low" }
    ],
    "verdict": "2-sentence verdict on virality potential"
  }
}

Scoring rules: hook is 25% of score, pacing 20%, emotion 15%, retention 15%, clarity 10%, payoff 15%. Apply penalties for weak hook (-15), no payoff (-20), slow pacing (-10), flat emotion (-10). Be HONEST — don't inflate scores. Provide 1-4 issues max. Only include analysis when content is provided.`;

  app.post("/api/coach/chat", requireAuth, async (req: Request, res: Response) => {
    try {
      const { message, script, mode, goal, history = [] } = req.body;
      const _uc = req.user as any;
      if (_uc.role !== "admin") {
        const creditResult = await storage.deductCredits(_uc.id, 1, "ai_coach", "AI Content Coach chat", _uc.plan || "free");
        if (!creditResult.success) return res.status(402).json({ message: creditResult.message, insufficientCredits: true, balance: creditResult.balance });
      }
      const content = script || message;
      const hasScript = content && content.trim().length > 20;

      const goalNote = goal ? `The user's goal is: ${goal} (optimize for this).` : "";
      const modeNote = mode === "pre-post" ? "This is a Pre-Post check — be extra critical about retention risks." : mode === "live" ? "Give quick line-by-line feedback." : "";
      const userPrompt = hasScript
        ? `${goalNote} ${modeNote}\n\nContent to analyze:\n"${content}"\n\nAnalyze this content and respond with the full JSON format.`
        : `The user says: "${message}". ${!hasScript ? "No script provided yet — greet them and ask what they want to work on. Return reply and mood only, set analysis to null." : ""}`;

      const msgs: any[] = [
        { role: "system", content: COACH_SYSTEM },
        ...history.slice(-6).map((h: any) => ({ role: h.role, content: h.content })),
        { role: "user", content: userPrompt },
      ];

      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: msgs,
          temperature: 0.75,
          max_tokens: 2000,
          response_format: { type: "json_object" },
        }),
      });
      const data: any = await r.json();
      if (data?.error) throw new Error(data.error.message);
      const raw = data.choices?.[0]?.message?.content || "{}";
      const parsed = JSON.parse(raw);
      return res.json(parsed);
    } catch (err: any) {
      console.error("[Coach Chat] Error:", err.message);
      return res.status(500).json({ message: err.message || "Coach failed" });
    }
  });

  app.post("/api/coach/fix-line", requireAuth, async (req: Request, res: Response) => {
    try {
      const { line, context, goal } = req.body;
      const prompt = `You are a viral content expert. Rewrite this weak line to be more scroll-stopping, emotional, and engaging.
Goal: ${goal || "viral content"}
Context: ${context || "Instagram Reel script"}
Weak line: "${line}"

Return ONLY a JSON object: { "original": "<original line>", "rewrites": ["rewrite 1", "rewrite 2", "rewrite 3"], "explanation": "why these work better" }`;

      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], temperature: 0.8, max_tokens: 600, response_format: { type: "json_object" } }),
      });
      const data: any = await r.json();
      return res.json(JSON.parse(data.choices?.[0]?.message?.content || "{}"));
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/coach/improve-script", requireAuth, async (req: Request, res: Response) => {
    try {
      const { script, goal, issues } = req.body;
      const issueList = issues?.map((i: any) => `- ${i.problem}: "${i.line}"`).join("\n") || "";
      const prompt = `You are a viral content strategist. Rewrite this script for maximum retention on Instagram Reels.
Goal: ${goal || "viral content"}
${issueList ? `Known issues to fix:\n${issueList}` : ""}

Original script:
"${script}"

Return ONLY the improved script text. No JSON, no explanation, no preamble.`;

      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 1200 }),
      });
      const data: any = await r.json();
      return res.json({ script: data.choices?.[0]?.message?.content || "" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/coach/competitor", requireAuth, async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ message: "url required" });
      const handle = url.replace(/\/$/, "").split("/").pop()?.replace("@", "") || url;
      const items = await apifyInstagram({ directUrls: [url], resultsType: "posts", resultsLimit: 15 });
      if (!items?.length) return res.json({ reply: `Hmm, couldn't scrape @${handle} — make sure it's a public account 👀`, mood: "weak", profile: null });
      const posts = items.slice(0, 10).map((p: any) => ({
        caption: (p.caption || "").slice(0, 120),
        views: p.videoViewCount || p.videoPlayCount || 0,
        likes: p.likesCount || 0,
        comments: p.commentsCount || 0,
        type: p.type || "reel",
      }));
      const avgViews = Math.round(posts.reduce((s: number, p: any) => s + p.views, 0) / posts.length);
      const avgLikes = Math.round(posts.reduce((s: number, p: any) => s + p.likes, 0) / posts.length);
      const prompt = `You are an AI Content Coach. Analyze this Instagram competitor and give actionable insights.

Handle: @${handle}
Posts analyzed: ${posts.length}
Avg views: ${avgViews}, Avg likes: ${avgLikes}
Recent posts: ${JSON.stringify(posts)}

Return JSON: { "reply": "coach-style summary (3-4 sentences, casual, actionable)", "mood": "weak"|"decent"|"strong", "topPatterns": ["pattern 1", "pattern 2", "pattern 3"], "whatWorks": ["...", "..."], "gaps": ["opportunity 1", "opportunity 2"], "stealThis": "one specific tactic to steal from this account" }`;

      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 800, response_format: { type: "json_object" } }),
      });
      const data: any = await r.json();
      const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
      return res.json({ ...parsed, profile: { handle, posts: posts.length, avgViews, avgLikes } });
    } catch (err: any) {
      console.error("[Coach Competitor] Error:", err.message);
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Coach: Tone Transform ─────────────────────────────────────────────────
  app.post("/api/coach/tone", requireAuth, async (req: Request, res: Response) => {
    try {
      const { script, tone } = req.body;
      if (!script || !tone) return res.status(400).json({ message: "script and tone required" });
      const toneDescriptions: Record<string, string> = {
        funny: "Add humor, wit, and comedy. Make it entertaining and shareable. Use unexpected twists.",
        serious: "Make it authoritative, credible, and professional. Deep and impactful.",
        educational: "Structure it as a clear lesson with steps, examples, and takeaways. Make the viewer smarter.",
        sales: "Optimize for conversion. Create urgency, highlight pain points, and make the CTA irresistible.",
        story: "Convert into a compelling narrative arc. Hook → struggle → turning point → resolution.",
        emotional: "Inject raw emotion, vulnerability, and relatability. Make people feel something deeply.",
      };
      const prompt = `You are a viral content strategist. Rewrite the following script in ${tone} mode.
${toneDescriptions[tone] || "Rewrite for maximum engagement."}

Original script:
"${script}"

Return ONLY a JSON object: { "script": "the rewritten script", "whatChanged": "2 sentences explaining the key changes you made and why they work better" }`;
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], temperature: 0.8, max_tokens: 1000, response_format: { type: "json_object" } }),
      });
      const data: any = await r.json();
      return res.json(JSON.parse(data.choices?.[0]?.message?.content || "{}"));
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // ── Coach: Clarify ────────────────────────────────────────────────────────
  app.post("/api/coach/clarify", requireAuth, async (req: Request, res: Response) => {
    try {
      const { script } = req.body;
      const prompt = `You are a clarity editor. Simplify this script — remove jargon, cut confusion, make every line instantly understandable to anyone.

Script: "${script}"

Return ONLY JSON: { "script": "clarified version", "removed": ["thing you removed 1", "thing you removed 2"], "explanation": "what made the original unclear and how you fixed it" }`;
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST", headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], temperature: 0.6, max_tokens: 800, response_format: { type: "json_object" } }),
      });
      const data: any = await r.json();
      return res.json(JSON.parse(data.choices?.[0]?.message?.content || "{}"));
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // ── Coach: Add Emotion ────────────────────────────────────────────────────
  app.post("/api/coach/add-emotion", requireAuth, async (req: Request, res: Response) => {
    try {
      const { script } = req.body;
      const prompt = `You are an emotional resonance expert. Inject curiosity, relatability, and emotional triggers into this script. Make people FEEL something.

Script: "${script}"

Return ONLY JSON: { "script": "emotionally charged version", "triggers": ["trigger 1", "trigger 2"], "explanation": "what emotions you activated and why they drive engagement" }`;
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST", headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], temperature: 0.8, max_tokens: 800, response_format: { type: "json_object" } }),
      });
      const data: any = await r.json();
      return res.json(JSON.parse(data.choices?.[0]?.message?.content || "{}"));
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // ── Coach: Shorten ────────────────────────────────────────────────────────
  app.post("/api/coach/shorten", requireAuth, async (req: Request, res: Response) => {
    try {
      const { script } = req.body;
      const prompt = `You are a content editor. Cut this script by 30-40%. Remove all fluff, filler words, and redundant lines. Keep only what makes people stay and share.

Script: "${script}"

Return ONLY JSON: { "script": "tightened version", "cutLines": ["line you cut 1", "line you cut 2"], "explanation": "what you removed and why it was slowing the content down" }`;
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST", headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], temperature: 0.6, max_tokens: 800, response_format: { type: "json_object" } }),
      });
      const data: any = await r.json();
      return res.json(JSON.parse(data.choices?.[0]?.message?.content || "{}"));
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // ── Coach: Personal Brand Builder ────────────────────────────────────────
  app.post("/api/coach/brand", requireAuth, async (req: Request, res: Response) => {
    try {
      const { niche, target, goal, currentBio, handle } = req.body;
      const prompt = `You are a personal brand strategist for Instagram/social media creators. Build a complete brand strategy.

Creator info:
- Niche: ${niche}
- Target audience: ${target}
- Goal: ${goal}
${currentBio ? `- Current bio: "${currentBio}"` : ""}
${handle ? `- Handle: @${handle}` : ""}

Return ONLY this JSON:
{
  "bioRewrite": "optimized Instagram bio (max 150 chars, punchy, keyword-rich)",
  "usernameIdeas": ["idea1", "idea2", "idea3"],
  "profilePicAdvice": "specific advice for their profile picture style",
  "highlightStrategy": ["highlight name 1", "highlight name 2", "highlight name 3", "highlight name 4"],
  "contentPillars": [
    { "pillar": "pillar name", "description": "what to post", "example": "example post idea" }
  ],
  "toneAndVoice": "2-sentence description of their brand voice",
  "audiencePsychology": "what their audience wants to feel/achieve",
  "postingPlan": "how often and what mix of content types",
  "uniqueAngle": "what makes them different from everyone else in this niche"
}`;
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST", headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], temperature: 0.75, max_tokens: 1500, response_format: { type: "json_object" } }),
      });
      const data: any = await r.json();
      return res.json(JSON.parse(data.choices?.[0]?.message?.content || "{}"));
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // ── Coach: AI Roadmap ─────────────────────────────────────────────────────
  app.post("/api/coach/roadmap", requireAuth, async (req: Request, res: Response) => {
    try {
      const { niche, goal, currentFollowers, mainProblem } = req.body;
      const prompt = `You are a growth mentor creating a personalized 30-day content roadmap.

Creator profile:
- Niche: ${niche}
- Goal: ${goal}
- Current followers: ${currentFollowers || "unknown"}
- Main problem: ${mainProblem || "getting started"}

Return ONLY this JSON:
{
  "overview": "2-sentence roadmap summary and expected outcome",
  "weeks": [
    {
      "week": 1,
      "theme": "week theme/focus",
      "goal": "specific measurable goal",
      "dailyTasks": ["task 1", "task 2", "task 3", "task 4", "task 5", "task 6", "task 7"],
      "challenge": "one creative challenge for the week",
      "metric": "what to track this week"
    },
    { "week": 2, "theme": "...", "goal": "...", "dailyTasks": ["...x7"], "challenge": "...", "metric": "..." },
    { "week": 3, "theme": "...", "goal": "...", "dailyTasks": ["...x7"], "challenge": "...", "metric": "..." },
    { "week": 4, "theme": "...", "goal": "...", "dailyTasks": ["...x7"], "challenge": "...", "metric": "..." }
  ],
  "keyHabits": ["habit 1", "habit 2", "habit 3"],
  "commonMistakes": ["mistake 1", "mistake 2"],
  "successMetrics": "how to know the roadmap is working"
}`;
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST", headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 2000, response_format: { type: "json_object" } }),
      });
      const data: any = await r.json();
      return res.json(JSON.parse(data.choices?.[0]?.message?.content || "{}"));
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // ── Meta / Instagram Webhook & Callbacks (required for Meta App Review) ───
  // Webhook verification — Meta sends GET with hub.challenge to verify endpoint
  app.get("/api/webhooks/meta", (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || "brandverse_meta_verify_2024";
    if (mode === "subscribe" && token === verifyToken) {
      console.log("[Meta Webhook] Verified successfully");
      return res.status(200).send(challenge);
    }
    console.warn("[Meta Webhook] Verification failed — token mismatch");
    return res.status(403).json({ message: "Forbidden" });
  });

  // Webhook event receiver — Meta sends POST for Instagram events
  app.post("/api/webhooks/meta", (req: Request, res: Response) => {
    const body = req.body;
    console.log("[Meta Webhook] Event received:", JSON.stringify(body, null, 2));
    if (body.object === "instagram") {
      body.entry?.forEach((entry: any) => {
        const changes = entry.changes || [];
        changes.forEach((change: any) => {
          console.log(`[Meta Webhook] Change field: ${change.field}`, change.value);
        });
        const messaging = entry.messaging || [];
        messaging.forEach((msg: any) => {
          console.log("[Meta Webhook] Message event:", JSON.stringify(msg));
        });
      });
    }
    return res.status(200).json({ status: "EVENT_RECEIVED" });
  });

  // Deauthorize callback — required by Meta; called when user removes app access
  app.post("/api/auth/meta/deauth", (req: Request, res: Response) => {
    const signedRequest = req.body.signed_request;
    console.log("[Meta Deauth] Deauthorize callback received:", signedRequest);
    return res.status(200).json({ status: "ok" });
  });

  // Data deletion callback — required by Meta; called when user requests data deletion
  app.post("/api/auth/meta/delete", (req: Request, res: Response) => {
    const signedRequest = req.body.signed_request;
    console.log("[Meta Data Deletion] Request received:", signedRequest);
    const confirmationCode = `del_${Date.now()}`;
    return res.status(200).json({
      url: `${req.protocol}://${req.get("host")}/privacy`,
      confirmation_code: confirmationCode,
    });
  });

  // ── AI Video Editor (Groq-powered) ───────────────────────────────────────
  async function callVideoGroq(prompt: string, maxTokens = 8192): Promise<any> {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error("GROQ_API_KEY not configured");
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.75,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      const errText = await r.text();
      if (r.status === 429) throw new Error("The AI is currently busy — please wait a moment and try again.");
      if (r.status === 413) throw new Error("The request was too large — try a shorter script or concept.");
      throw new Error(`AI API error ${r.status}: ${errText.substring(0, 200)}`);
    }
    const data = await r.json();
    if (data.error) throw new Error(data.error.message || "AI generation failed");
    const raw = data.choices?.[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  }

  async function runwareGenerate(apiKey: string, tasks: any[]): Promise<{ url: string; taskUUID: string }[]> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket("wss://ws.runware.ai/v1");
      const images: { url: string; taskUUID: string }[] = [];
      const timer = setTimeout(() => { ws.terminate(); reject(new Error("Runware timed out after 60s")); }, 60000);

      ws.on("open", () => {
        ws.send(JSON.stringify([{ taskType: "authentication", apiKey }]));
      });

      ws.on("message", (data: Buffer) => {
        try {
          const messages = JSON.parse(data.toString());
          for (const msg of Array.isArray(messages) ? messages : [messages]) {
            if (msg.taskType === "authentication") {
              ws.send(JSON.stringify(tasks));
            } else if (msg.taskType === "imageInference" && msg.imageURL) {
              images.push({ url: msg.imageURL, taskUUID: msg.taskUUID });
              if (images.length >= tasks.length) {
                clearTimeout(timer);
                ws.close();
                resolve(images);
              }
            } else if (msg.taskType === "error") {
              clearTimeout(timer);
              ws.close();
              reject(new Error(msg.errorMessage || "Runware image generation failed"));
            }
          }
        } catch (e) { clearTimeout(timer); ws.close(); reject(e); }
      });

      ws.on("error", (err: Error) => { clearTimeout(timer); reject(err); });
    });
  }

  async function fetchYouTubeTextContext(url: string): Promise<string> {
    try {
      const { extractYouTubeVideoId: extractId } = await import("./youtube");
      const videoId = extractId(url);
      if (!videoId) return `YouTube video URL: ${url}`;
      const ytKey = process.env.YOUTUBE_API_KEY;
      if (!ytKey) return `YouTube video URL: ${url}`;
      const resp = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoId}&key=${ytKey}`);
      if (!resp.ok) return `YouTube video URL: ${url}`;
      const ytData = await resp.json();
      const item = ytData.items?.[0];
      if (!item) return `YouTube video URL: ${url}`;
      const s = item.statistics || {};
      const sn = item.snippet || {};
      const desc = (sn.description || "").substring(0, 500);
      return `YOUTUBE VIDEO CONTEXT:\nTitle: ${sn.title || "Unknown"}\nChannel: ${sn.channelTitle || "Unknown"}\nViews: ${parseInt(s.viewCount || "0").toLocaleString()} | Likes: ${parseInt(s.likeCount || "0").toLocaleString()} | Comments: ${parseInt(s.commentCount || "0").toLocaleString()}\nPublished: ${sn.publishedAt ? new Date(sn.publishedAt).toLocaleDateString() : "Unknown"}\nDescription: ${desc}\nTags: ${(sn.tags || []).slice(0, 15).join(", ")}\nURL: ${url}`;
    } catch {
      return `YouTube video URL: ${url}`;
    }
  }

  const VID_MODE_MAP: Record<string, string> = {
    viral: "VIRAL MODE: Fast cuts every 2-3s, bold captions, pattern interrupts, curiosity loops, high energy. Every second must earn its place.",
    story: "STORY MODE: Narrative arc with emotional beats. Build tension, create connection, resolve with insight. Pacing follows emotional intensity.",
    sales: "SALES MODE: Problem, Agitate, Solution, Proof, Urgency, CTA. Every element drives toward conversion. Include price anchor and social proof.",
    funny: "FUNNY MODE: Timing is everything. Setup, pause, punchline. Use reaction cuts, callbacks, unexpected pivots. Caption every punchline.",
    cinematic: "CINEMATIC MODE: Visual storytelling. B-roll heavy, dramatic pauses, music sync cuts. Quality over quantity.",
    educational: "EDUCATIONAL MODE: Clear numbered structure. One concept per segment. Examples after each point. Recap at end. Clarity beats entertainment.",
    personal_brand: "PERSONAL BRAND MODE: Authentic voice, personal story, direct camera address. Values-driven narrative that builds trust.",
  };
  const VID_GOAL_MAP: Record<string, string> = {
    viral: "GOAL: GO VIRAL — Hook must be impossible to scroll past. Include rewatch trigger. Optimize for shares and saves.",
    followers: "GOAL: GET FOLLOWERS — Build connection and trust. End with a compelling follow reason — make them feel they'd miss out.",
    sales: "GOAL: SELL — Drive one clear decision. Include proof, urgency, and frictionless CTA.",
    brand: "GOAL: BUILD BRAND — Establish a clear, memorable point of view. Be the only creator who says this, this way.",
  };

  app.post("/api/video/analyze", requireAuth, async (req: Request, res: Response) => {
    try {
      const { inputType, instagramUrl, script, description, mode, goal, audience, style, duration } = req.body;

      const modeDesc = VID_MODE_MAP[mode] || VID_MODE_MAP.viral;
      const goalDesc = VID_GOAL_MAP[goal] || VID_GOAL_MAP.viral;
      const durationNote = duration ? `Video duration: ${duration} seconds.` : "Estimate timestamps for a 30-60s reel.";
      const audienceNote = audience ? `Target audience: ${audience}.` : "";
      const styleNote = style ? `Style reference: "${style}" — channel this approach in all suggestions.` : "";

      let contentInfo = "";

      if (inputType === "url" && instagramUrl) {
        const isYouTube = /youtube\.com|youtu\.be/.test(instagramUrl);
        if (isYouTube) {
          contentInfo = await fetchYouTubeTextContext(instagramUrl);
        } else {
          try {
            const apifyToken = process.env.APIFY_TOKEN;
            if (apifyToken) {
              const apifyRes = await fetch(`https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ directUrls: [instagramUrl], resultsType: "posts", resultsLimit: 1 }),
              });
              if (apifyRes.ok) {
                const posts = await apifyRes.json();
                if (posts?.[0]) {
                  const p = posts[0];
                  contentInfo = `INSTAGRAM REEL:\nCaption: ${p.caption || p.text || "N/A"}\nLikes: ${p.likesCount || 0}\nComments: ${p.commentsCount || 0}\nViews: ${p.videoViewCount || p.videoPlayCount || 0}\nURL: ${instagramUrl}`;
                }
              }
            }
          } catch {}
          if (!contentInfo) contentInfo = `Video URL: ${instagramUrl} — optimize for social media editing.`;
        }
      } else if (inputType === "script" && script) {
        contentInfo = `VIDEO SCRIPT:\n${script}`;
      } else if (inputType === "describe" && description) {
        contentInfo = `VIDEO CONCEPT:\n${description}`;
      }

      const editSchema = `{
  "overallScore": number (0-100),
  "modeApplied": string,
  "summary": string (3-4 sentences, specific and surgical),
  "timeline": [{ "id": number, "startLabel": string, "endLabel": string, "label": string, "type": "hook"|"body"|"payoff"|"cta"|"transition", "action": "KEEP"|"CUT"|"TRIM"|"ADD"|"REORDER", "note": string, "energyLevel": number }],
  "cuts": [{ "timestamp": string, "reason": string, "severity": "high"|"medium"|"low", "fix": string }],
  "hook": { "current": string, "score": number, "analysis": string, "improved": [string, string, string] },
  "captions": { "onScreen": [string], "postCaption": string, "hashtags": [string] },
  "ctas": [string, string, string],
  "audio": [{ "name": string, "mood": string, "bpm": string, "why": string }],
  "visuals": [{ "timestamp": string, "type": "zoom"|"broll"|"text-overlay"|"transition"|"effect", "description": string }],
  "checklist": [string],
  "variations": [{ "name": string, "targetPlatform": string, "description": string, "changes": [string] }],
  "styleGuide": { "pacing": string, "captions": string, "energy": string, "colorGrading": string, "soundDesign": string, "typography": string }
}`;

      const prompt = `You are an elite AI video editing strategist. Produce the most specific, actionable video edit plan possible.

CONTENT:
${contentInfo}

${modeDesc}
${goalDesc}
${audienceNote}
${styleNote}
${durationNote}

Be surgically specific — name exact timestamps, exact words to cut, exact replacements. Reference the actual content. Think like a viral content director who has studied 10,000 successful reels.

Return ONLY valid JSON matching this schema:
${editSchema}`;

      const result = await callVideoGroq(prompt);
      return res.json(result);
    } catch (err: any) {
      console.error("[Video Editor] Error:", err.message);
      return res.status(500).json({ message: err.message || "Video analysis failed" });
    }
  });

  app.post("/api/video/idea-builder", requireAuth, async (req: Request, res: Response) => {
    try {
      const { concept, mode, goal, audience, style, platform, duration, competitorUrls } = req.body;
      if (!concept?.trim()) return res.status(400).json({ message: "Video concept is required" });

      const modeDesc = VID_MODE_MAP[mode] || VID_MODE_MAP.viral;
      const goalDesc = VID_GOAL_MAP[goal] || VID_GOAL_MAP.viral;
      const audienceNote = audience ? `Target audience: ${audience}.` : "";
      const styleNote = style ? `Style reference: "${style}".` : "";
      const platformLabel = platform === "tiktok" ? "TikTok" : platform === "youtube" ? "YouTube Shorts" : "Instagram Reels";
      const durationLabel = duration ? `${duration} seconds` : "30-45 seconds";

      // Scrape competitor/inspiration reels
      let competitorContext = "";
      const urls: string[] = Array.isArray(competitorUrls) ? competitorUrls.filter(Boolean) : [];
      if (urls.length > 0) {
        const scraped: string[] = [];
        for (const url of urls.slice(0, 3)) {
          try {
            const isYT = /youtube\.com|youtu\.be/.test(url);
            if (isYT) {
              const ytContext = await fetchYouTubeTextContext(url);
              scraped.push(`COMPETITOR YOUTUBE VIDEO:\n${ytContext}`);
            } else {
              const apifyToken = process.env.APIFY_TOKEN;
              if (apifyToken) {
                const r = await fetch(`https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ directUrls: [url], resultsType: "posts", resultsLimit: 1 }),
                });
                if (r.ok) {
                  const posts = await r.json();
                  if (posts?.[0]) {
                    const p = posts[0];
                    scraped.push(`Competitor reel: ${url}\n  Caption: ${(p.caption || p.text || "").substring(0, 200)}\n  Likes: ${p.likesCount || 0} | Comments: ${p.commentsCount || 0} | Views: ${p.videoViewCount || p.videoPlayCount || 0}\n  Hashtags: ${(p.hashtags || []).slice(0, 10).join(", ")}`);
                  }
                }
              }
              if (!scraped.some(s => s.includes(url))) scraped.push(`Competitor reel URL: ${url} — extract the visual style, hook pattern, pacing and caption approach`);
            }
          } catch {}
        }
        if (scraped.length > 0) {
          competitorContext = `\nCOMPETITOR / INSPIRATION REELS TO STYLE-MATCH:
${scraped.join("\n\n")}

CRITICAL STYLE-MATCH INSTRUCTION: Study what makes these competitor reels successful — their hook type, pacing, cut frequency, caption style, energy level, and content structure. Create the new video concept in a similar style but with completely original content. Note in the script and shot list where you're applying competitor-inspired techniques.`;
        }
      }

      const ideaSchema = `{
  "title": string,
  "overallScore": number (85-99),
  "competitorInsights": string (if competitor URLs provided: 2-3 sentences on what patterns you borrowed from them and why they work; otherwise empty string),
  "summary": string (3-4 sentences about what this video will achieve),
  "fullScript": string (complete word-for-word voiceover script with [PAUSE] [ZOOM] [CUT] markers — at least 150 words, conversational and punchy),
  "shotList": [{ "shot": number, "timestamp": string, "type": string, "description": string, "duration": string }],
  "brollList": [string],
  "timeline": [{ "id": number, "startLabel": string, "endLabel": string, "label": string, "type": "hook"|"body"|"payoff"|"cta"|"transition", "action": "ADD", "note": string, "energyLevel": number }],
  "hook": { "current": string, "score": number, "analysis": string, "improved": [string, string, string] },
  "captions": { "onScreen": [string], "postCaption": string, "hashtags": [string] },
  "ctas": [string, string, string],
  "audio": [{ "name": string, "mood": string, "bpm": string, "why": string }],
  "visuals": [{ "timestamp": string, "type": "zoom"|"broll"|"text-overlay"|"transition"|"effect", "description": string }],
  "checklist": [string],
  "styleGuide": { "pacing": string, "captions": string, "energy": string, "colorGrading": string, "soundDesign": string, "typography": string }
}`;

      const prompt = `You are an elite viral content director. Transform this video concept into a complete, production-ready plan that will actually get views.

VIDEO CONCEPT: "${concept}"
Platform: ${platformLabel}
Target duration: ${durationLabel}
${modeDesc}
${goalDesc}
${audienceNote}
${styleNote}
${competitorContext}

Write the actual word-for-word script they should record. Be creative, specific, and genuinely engaging. This creator is counting on you.

Return ONLY valid JSON matching this schema:
${ideaSchema}`;

      const result = await callVideoGroq(prompt);
      return res.json(result);
    } catch (err: any) {
      console.error("[Video Idea Builder] Error:", err.message);
      return res.status(500).json({ message: err.message || "Idea builder failed" });
    }
  });

  app.post("/api/video/suggest-templates", requireAuth, async (req: Request, res: Response) => {
    try {
      const { concept, mode, goal } = req.body;
      const templateIds = ["hook-reel", "story-arc", "sales-convert", "funny-timing", "cinematic-reveal", "educational-breakdown", "personal-brand"];
      const prompt = `You are a viral content strategist. A creator has this video concept: "${concept || "general social media content"}". Their preferred mode is "${mode || "viral"}" and goal is "${goal || "viral"}".

From these 7 template IDs: ${templateIds.join(", ")}

Pick the TOP 2 or 3 that would work best for this concept. Be decisive and explain why.

Return ONLY valid JSON:
{
  "recommendations": [
    { "id": string (one of the template IDs above), "rank": number (1=best), "reason": string (1 sentence why this template fits perfectly), "customization": string (1 sentence on how to adapt it for this specific concept) }
  ],
  "avoidThese": [string] (1-2 template IDs that would NOT work well, with brief reason in format "id: reason")
}`;

      const result = await callVideoGroq(prompt);
      return res.json(result);
    } catch (err: any) {
      console.error("[Video Suggest Templates] Error:", err.message);
      return res.status(500).json({ message: err.message || "Template suggestion failed" });
    }
  });

  // ── Runware AI Image Generation ─────────────────────────────────────────────
  app.post("/api/video/generate-images", requireAuth, async (req: Request, res: Response) => {
    try {
      const { prompts, width = 1024, height = 576 } = req.body;
      const runwareKey = process.env.RUNWARE_API_KEY;
      if (!runwareKey) return res.status(500).json({ message: "RUNWARE_API_KEY not configured" });
      if (!Array.isArray(prompts) || !prompts.length) return res.status(400).json({ message: "prompts array required" });

      const tasks = prompts.slice(0, 6).map((prompt: string) => ({
        taskType: "imageInference",
        taskUUID: crypto.randomUUID(),
        positivePrompt: String(prompt).slice(0, 900),
        negativePrompt: "blurry, low quality, watermark, text overlay, ugly, deformed",
        model: "runware:100@1",
        width: Number(width) || 1024,
        height: Number(height) || 576,
        numberResults: 1,
        outputType: ["URL"],
        outputFormat: "WEBP",
        steps: 4,
        CFGScale: 1,
      }));

      const images = await runwareGenerate(runwareKey, tasks);
      return res.json({ images });
    } catch (err: any) {
      console.error("[Runware] Error:", err.message);
      return res.status(500).json({ message: err.message || "Image generation failed" });
    }
  });

  // ── Chat-Based Video Editing ────────────────────────────────────────────────
  app.post("/api/video/chat-edit", requireAuth, async (req: Request, res: Response) => {
    try {
      const { userMessage, context } = req.body;
      if (!userMessage?.trim()) return res.status(400).json({ message: "Message required" });
      const prompt = `You are a world-class AI video editor and creative director. You are sitting in the edit bay with this creator, making frame-level decisions. Be extremely specific, action-oriented, and fill in ALL gaps you see.

CURRENT VIDEO CONTEXT:
- Title: "${context?.title || "Untitled"}"
- Platform: "${context?.platform || "Instagram Reels / YouTube Shorts"}"
- Duration: ${context?.duration || 30} seconds
- Mode: "${context?.mode || "viral"}"
- Goal: "${context?.goal || "engagement"}"
${context?.summary ? `- Summary: "${context.summary}"` : ""}
${context?.fullScript ? `- Full Script:\n"${String(context.fullScript).slice(0, 1000)}"` : ""}
${context?.timeline?.length ? `- Timeline cuts:\n${context.timeline.slice(0, 8).map((c: any, i: number) => `  [${i+1}] ${c.startSec ?? "?"}s-${c.endSec ?? "?"}s: ${c.text || c.action || c.description || JSON.stringify(c)}`).join("\n")}` : ""}
${context?.hook?.current ? `- Current hook: "${context.hook.current}"` : ""}
${context?.currentHooks?.length ? `- Hook options: ${context.currentHooks.slice(0, 2).join(" | ")}` : ""}
${context?.currentTab ? `- Creator is on the "${context.currentTab}" tab right now` : ""}

USER REQUEST: "${userMessage}"

As an expert creative director, give a powerful, specific response. Fill in any gaps in the script or timeline. Suggest real, frame-level edits. Think like a professional editor who has watched this video 20 times.

Return ONLY valid JSON (no markdown, no code fences):
{
  "reply": "Direct, specific, energetic coaching response (2-4 sentences, creator-to-creator tone — reference specific timestamps or lines from the script if you can)",
  "suggestion": "Exact new text/script content if they asked for a rewrite — provide the COMPLETE rewritten version, not a summary (null if not applicable)",
  "suggestionType": "hook | script | title | caption | structure | pacing | b-roll | null",
  "actionLabel": "Short CTA label like 'Apply this hook' or 'Replace opening' or null",
  "edits": [
    {
      "id": 1,
      "type": "cut | b-roll | text-overlay | transition | hook | script | caption | pacing | audio | gap-fill",
      "timestamp": "e.g. '0:00-0:03' or 'sec 12-15' or 'opening' or 'closing 5 sec'",
      "action": "One specific thing to do — verb-first (Cut here, Add, Replace, Insert, Remove)",
      "content": "Exact text to use, or specific description of what to film/show/add",
      "impact": "Why this specific edit will improve performance"
    }
  ]
}

Generate 4-7 specific, diverse edits covering different parts of the video. Include at least one gap-fill edit if the script has missing pieces.`;
      const result = await callVideoGroq(prompt, 1800);
      return res.json(result);
    } catch (err: any) {
      console.error("[Video Chat Edit] Error:", err.message);
      return res.status(500).json({ message: err.message || "Chat edit failed" });
    }
  });

  // ── AI Audio Suggestions ────────────────────────────────────────────────────
  app.post("/api/video/suggest-audio", requireAuth, async (req: Request, res: Response) => {
    try {
      const { concept, mode, goal, platform, title } = req.body;
      const prompt = `You are a music and audio trend expert for social media content. Based on this video concept, suggest the perfect audio tracks and sounds.

VIDEO DETAILS:
- Concept: "${concept || title || "general content"}"
- Style: "${mode || "viral"}"
- Goal: "${goal || "engagement"}"
- Platform: "${platform || "instagram"}"

Generate 6 diverse audio suggestions that would make this video perform better. Mix trending sounds with timeless picks.

Return ONLY valid JSON:
{
  "suggestions": [
    {
      "name": "Track/Sound name",
      "artist": "Artist or source",
      "mood": "One word mood: hype | calm | emotional | funny | cinematic | energetic",
      "bpm": number (approximate BPM),
      "why": "One sentence explaining why this audio fits perfectly",
      "trendScore": number (1-100, how trending right now),
      "bestFor": "Best moment in the video to use this",
      "genre": "Genre tag"
    }
  ],
  "tip": "One golden tip about audio strategy for this type of content"
}`;
      const result = await callVideoGroq(prompt, 1200);
      return res.json(result);
    } catch (err: any) {
      console.error("[Video Audio] Error:", err.message);
      return res.status(500).json({ message: err.message || "Audio suggestion failed" });
    }
  });

  // ── Caption Generation ──────────────────────────────────────────────────────
  app.post("/api/video/generate-captions", requireAuth, async (req: Request, res: Response) => {
    try {
      const { script, title, duration = 30 } = req.body;
      if (!script?.trim()) return res.status(400).json({ message: "script required" });
      const prompt = `You are a professional caption writer for viral social media videos. Generate perfectly timed caption segments from this script.

TITLE: "${title || "Untitled"}"
SCRIPT: "${String(script).slice(0, 1400)}"
TARGET DURATION: ~${duration} seconds

Create 8-10 caption segments covering the full script. Distribute times across ${duration} seconds. For each segment, generate 4 text variations with different energy levels.

Return ONLY valid JSON:
{
  "segments": [
    {
      "id": 1,
      "startSec": 0,
      "endSec": 3,
      "original": "Exact phrase from the script",
      "engaging": "More expressive and dynamic version of the same phrase",
      "viral": "Maximum energy TikTok-style — bold word choices, exclamation energy, punchy",
      "punchy": "3-5 words absolute maximum — distilled essence only"
    }
  ]
}`;
      const result = await callVideoGroq(prompt, 2000);
      return res.json(result);
    } catch (err: any) {
      console.error("[Video Captions] Error:", err.message);
      return res.status(500).json({ message: err.message || "Caption generation failed" });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // VIDEO RESOURCE LIBRARY
  // ══════════════════════════════════════════════════════════════════════════════

  // GET /api/video-resources — list all (any auth)
  app.get("/api/video-resources", requireAuth, async (_req: Request, res: Response) => {
    try {
      const items = await storage.getVideoResources();
      return res.json(items);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // POST /api/video-resources — admin create
  app.post("/api/video-resources", requireAdmin, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { title, description, url, category, platform, thumbnailUrl } = req.body;
      if (!title || !url) return res.status(400).json({ message: "title and url are required" });
      const item = await storage.createVideoResource({ title, description, url, category: category || "General", platform, thumbnailUrl, addedBy: user.id });
      return res.status(201).json(item);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // PATCH /api/video-resources/:id — admin update
  app.patch("/api/video-resources/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { title, description, url, category, platform, thumbnailUrl } = req.body;
      const item = await storage.updateVideoResource(p(req.params.id), { title, description, url, category, platform, thumbnailUrl });
      if (!item) return res.status(404).json({ message: "Not found" });
      return res.json(item);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // DELETE /api/video-resources/:id — admin delete
  app.delete("/api/video-resources/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteVideoResource(p(req.params.id));
      return res.json({ message: "Deleted" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // CANVA CONNECT API
  // OAuth 2.0 with PKCE + design/asset creation
  // ══════════════════════════════════════════════════════════════════════════════
  const CANVA_CLIENT_ID = process.env.CANVA_CLIENT_ID!;
  const CANVA_CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET!;
  const CANVA_BASE = "https://api.canva.com/rest/v1";
  const CANVA_AUTH_URL = "https://www.canva.com/api/oauth/authorize";
  const CANVA_TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";
  const CANVA_SCOPES = [
    "design:content:read",
    "design:content:write",
    "design:meta:read",
    "asset:read",
    "asset:write",
    "folder:read",
    "profile:read",
  ].join(" ");

  // Helper: get fresh access token (refresh if expired)
  async function getCanvaAccessToken(userId: string): Promise<string | null> {
    const token = await storage.getCanvaToken(userId);
    if (!token) return null;
    if (new Date() < new Date(token.expiresAt)) return token.accessToken;
    // Refresh
    if (!token.refreshToken) { await storage.deleteCanvaToken(userId); return null; }
    try {
      const basic = Buffer.from(`${CANVA_CLIENT_ID}:${CANVA_CLIENT_SECRET}`).toString("base64");
      const r = await fetch(CANVA_TOKEN_URL, {
        method: "POST",
        headers: { "Authorization": `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: token.refreshToken }),
      });
      if (!r.ok) { await storage.deleteCanvaToken(userId); return null; }
      const data = await r.json() as any;
      await storage.upsertCanvaToken({
        userId,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || token.refreshToken,
        expiresAt: new Date(Date.now() + (data.expires_in || 14400) * 1000),
        scope: data.scope || token.scope,
      });
      return data.access_token;
    } catch { await storage.deleteCanvaToken(userId); return null; }
  }

  // Helper: call Canva REST API
  async function canvaFetch(userId: string, path: string, options: RequestInit = {}): Promise<any> {
    const token = await getCanvaAccessToken(userId);
    if (!token) throw new Error("Canva account not connected. Please connect your Canva account first.");
    const res = await fetch(`${CANVA_BASE}${path}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const body = await res.json() as any;
    if (!res.ok) throw new Error(body?.message || body?.error?.message || `Canva API error ${res.status}`);
    return body;
  }

  // ── OAuth: Start ────────────────────────────────────────────────────────────
  app.get("/api/canva/oauth/start", requireAuth, (req: Request, res: Response) => {
    const { crypto } = globalThis;
    const codeVerifier = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
    const state = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64url");
    // Store in session
    (req.session as any).canvaCodeVerifier = codeVerifier;
    (req.session as any).canvaState = state;
    // Build code challenge (S256)
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    crypto.subtle.digest("SHA-256", data).then(hash => {
      const challenge = Buffer.from(hash).toString("base64url");
      const redirectUri = `https://${req.get("host")}/api/canva/oauth/callback`;
      const params = new URLSearchParams({
        response_type: "code",
        client_id: CANVA_CLIENT_ID,
        redirect_uri: redirectUri,
        scope: CANVA_SCOPES,
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
      });
      return res.redirect(`${CANVA_AUTH_URL}?${params}`);
    }).catch(err => res.status(500).json({ message: err.message }));
  });

  // ── OAuth: Callback ─────────────────────────────────────────────────────────
  app.get("/api/canva/oauth/callback", requireAuth, async (req: Request, res: Response) => {
    try {
      const { code, state, error } = req.query as any;
      if (error) return res.redirect("/?canva=error&reason=" + encodeURIComponent(error));
      const storedState = (req.session as any).canvaState;
      const codeVerifier = (req.session as any).canvaCodeVerifier;
      if (!storedState || state !== storedState) return res.redirect("/?canva=error&reason=state_mismatch");
      delete (req.session as any).canvaState;
      delete (req.session as any).canvaCodeVerifier;
      const redirectUri = `https://${req.get("host")}/api/canva/oauth/callback`;
      const basic = Buffer.from(`${CANVA_CLIENT_ID}:${CANVA_CLIENT_SECRET}`).toString("base64");
      const tokenRes = await fetch(CANVA_TOKEN_URL, {
        method: "POST",
        headers: { "Authorization": `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "authorization_code", code, code_verifier: codeVerifier, redirect_uri: redirectUri }),
      });
      const tokenData = await tokenRes.json() as any;
      if (!tokenRes.ok) return res.redirect("/?canva=error&reason=" + encodeURIComponent(tokenData.error || "token_failed"));
      const user = req.user as any;
      await storage.upsertCanvaToken({
        userId: user.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + (tokenData.expires_in || 14400) * 1000),
        scope: tokenData.scope,
      });
      return res.redirect("/video-editor?canva=connected");
    } catch (err: any) {
      console.error("[Canva OAuth callback]", err.message);
      return res.redirect("/?canva=error&reason=server_error");
    }
  });

  // ── OAuth: Status ───────────────────────────────────────────────────────────
  app.get("/api/canva/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const token = await storage.getCanvaToken(user.id);
      if (!token) return res.json({ connected: false });
      const isExpired = new Date() >= new Date(token.expiresAt);
      const canRefresh = !isExpired || !!token.refreshToken;
      return res.json({ connected: true, expired: isExpired, canRefresh, scope: token.scope });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── OAuth: Disconnect ───────────────────────────────────────────────────────
  app.delete("/api/canva/disconnect", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const token = await storage.getCanvaToken(user.id);
      if (token?.accessToken) {
        const basic = Buffer.from(`${CANVA_CLIENT_ID}:${CANVA_CLIENT_SECRET}`).toString("base64");
        await fetch("https://api.canva.com/rest/v1/oauth/revoke", {
          method: "POST",
          headers: { "Authorization": `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: token.accessToken }),
        }).catch(() => {});
      }
      await storage.deleteCanvaToken(user.id);
      return res.json({ message: "Canva disconnected" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── List Designs ────────────────────────────────────────────────────────────
  app.get("/api/canva/designs", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { limit = "10", query } = req.query as any;
      const params = new URLSearchParams({ limit: String(limit) });
      if (query) params.set("query", query);
      const data = await canvaFetch(user.id, `/designs?${params}`);
      return res.json(data);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

  // ── Create Design ───────────────────────────────────────────────────────────
  app.post("/api/canva/designs", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { designType = "instagram-reel", title, assetId } = req.body;
      const body: any = {
        design_type: { type: "preset", name: designType },
        title: title || "Brandverse Design",
      };
      if (assetId) body.asset_id = assetId;
      const data = await canvaFetch(user.id, "/designs", { method: "POST", body: JSON.stringify(body) });
      return res.json(data);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

  // ── Upload Asset from URL ───────────────────────────────────────────────────
  app.post("/api/canva/assets/upload-url", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { url, name } = req.body;
      if (!url) return res.status(400).json({ message: "url required" });
      const data = await canvaFetch(user.id, "/asset-uploads", {
        method: "POST",
        body: JSON.stringify({ url, name: name || "Brandverse Asset" }),
      });
      return res.json(data);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

  // ── Get Asset ───────────────────────────────────────────────────────────────
  app.get("/api/canva/assets/:assetId", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const data = await canvaFetch(user.id, `/assets/${p(req.params.assetId)}`);
      return res.json(data);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

  // ── List Brand Templates ────────────────────────────────────────────────────
  app.get("/api/canva/brand-templates", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { limit = "20", query } = req.query as any;
      const params = new URLSearchParams({ limit: String(limit) });
      if (query) params.set("query", query);
      const data = await canvaFetch(user.id, `/brand-templates?${params}`);
      return res.json(data);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

  // ── Get User Profile ────────────────────────────────────────────────────────
  app.get("/api/canva/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const data = await canvaFetch(user.id, "/users/me");
      return res.json(data);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

  // ── Create Design from AI video context (Thumbnail / Reel Cover) ────────────
  app.post("/api/canva/create-from-video", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { title, concept, platform = "instagram-reel", designType } = req.body;
      const canvaDesignType = designType || (
        platform === "youtube" ? "youtube-thumbnail" :
        platform === "tiktok" ? "tiktok-video" :
        "instagram-reel"
      );
      const cleanTitle = String(title || concept || "My Video").slice(0, 80);
      const data = await canvaFetch(user.id, "/designs", {
        method: "POST",
        body: JSON.stringify({
          design_type: { type: "preset", name: canvaDesignType },
          title: cleanTitle,
        }),
      });
      return res.json(data);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
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

  // ── Credits System ──────────────────────────────────────────────────────────
  const FEATURE_COSTS: Record<string, number> = {
    ai_ideas: 2,
    ai_coach: 2,
    ai_report: 5,
    competitor: 5,
    virality: 2,
    hashtag: 1,
  };

  // GET /api/credits — get current user's credit balance
  app.get("/api/credits", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const balance = await storage.upsertCreditBalance(user.id, user.plan || "free");
      const transactions = await storage.getCreditTransactions(user.id, 15);
      return res.json({
        balance,
        transactions,
        featureCosts: FEATURE_COSTS,
        planAllowance: ({ free: 10, starter: 50, growth: 200, pro: 500, elite: 99999 } as Record<string,number>)[user.plan as string] ?? 10,
        total: balance.monthlyCredits + balance.bonusCredits,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // GET /api/credits/all — admin: all users' balances
  app.get("/api/credits/all", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const balances = await storage.getAllCreditBalances();
      return res.json(balances);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // POST /api/credits/grant — admin grant bonus credits to a user
  app.post("/api/credits/grant", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId, amount, description } = req.body;
      if (!userId || !amount || amount <= 0) return res.status(400).json({ message: "userId and positive amount required" });
      const balance = await storage.addBonusCredits(userId, amount, description || `Admin grant: ${amount} credits`);
      return res.json(balance);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Landing Leads & CRM ────────────────────────────────────────────────────

  // POST /api/leads/capture — public: capture email + name for lead magnet
  app.post("/api/leads/capture", async (req: Request, res: Response) => {
    try {
      const { name, email } = req.body;
      if (!name || !email) return res.status(400).json({ message: "Name and email required" });
      const existing = await storage.getLandingLeadByEmail(email);
      if (existing) return res.json({ message: "already_captured", lead: existing });
      const lead = await storage.createLandingLead({ name, email, source: "email_capture" });
      syncToOraviniCRM({ email, name, source: "email_capture" });
      return res.json({ message: "captured", lead });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // POST /api/leads/quiz — public: submit quiz answers + generate AI monetization report
  app.post("/api/leads/quiz", async (req: Request, res: Response) => {
    try {
      const { name, email, creatorType, platform, biggestChallenge, postFrequency, monetizationGoal } = req.body;
      if (!name || !email) return res.status(400).json({ message: "Name and email required" });

      const quizAnswers = { creatorType, platform, biggestChallenge, postFrequency, monetizationGoal };

      const sysPrompt = `You are a social media monetization expert. Generate a personalized monetization audit as a JSON object with these exact fields:
{ "headline": "punchy title", "score": <0-100>, "scoreLabel": "Early Stage|Growth Ready|Monetization Ready", "topOpportunity": "one sentence", "quickWins": ["win1","win2","win3"], "roadmap": [{"phase":"Phase 1 (Now)","action":"...","timeframe":"0-30 days"},{"phase":"Phase 2 (Next)","action":"...","timeframe":"30-90 days"},{"phase":"Phase 3 (Later)","action":"...","timeframe":"90+ days"}], "platformTip": "one platform tip", "estimatedMonthlyRevenue": "e.g. $500-2K/mo" }`;
      const userMsg = `Creator: stage=${creatorType}, platform=${platform}, challenge=${biggestChallenge}, frequency=${postFrequency}, goal=${monetizationGoal}. Be specific and actionable.`;

      let reportData: any = null;
      try {
        const raw = await callGroqJson(sysPrompt, userMsg, 800);
        reportData = JSON.parse(raw);
      } catch (aiErr) {
        reportData = {
          headline: `${platform} Monetization Blueprint`,
          score: 62,
          scoreLabel: "Growth Ready",
          topOpportunity: `Leverage your ${platform} presence to create digital products around ${monetizationGoal}`,
          quickWins: ["Post consistently 4-5x/week", "Add a clear CTA to every post", "Build your email list with a lead magnet"],
          roadmap: [
            { phase: "Phase 1 (Now)", action: "Define your niche and create a content calendar", timeframe: "0-30 days" },
            { phase: "Phase 2 (Next)", action: "Launch your first paid offer or lead magnet", timeframe: "30-90 days" },
            { phase: "Phase 3 (Later)", action: "Scale with automation and multiple revenue streams", timeframe: "90+ days" },
          ],
          platformTip: `On ${platform}, consistency and hooks in the first 3 seconds are your biggest growth levers`,
          estimatedMonthlyRevenue: "$500-2K/mo within 90 days",
        };
      }

      // Upsert lead
      const existing = await storage.getLandingLeadByEmail(email);
      let lead;
      if (existing) {
        lead = await storage.updateLandingLead(existing.id, { name, creatorType, platform, biggestChallenge, postFrequency, monetizationGoal, quizAnswers, monetizationReport: reportData, source: "quiz" });
      } else {
        lead = await storage.createLandingLead({ name, email, source: "quiz", creatorType, platform, biggestChallenge, postFrequency, monetizationGoal, quizAnswers, monetizationReport: reportData });
      }

      syncToOraviniCRM({ email, name, source: "quiz", platform, creatorType, monetizationGoal });
      return res.json({ report: reportData, lead });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // POST /api/leads/audit — public: full audit funnel submission with Instagram analysis
  app.post("/api/leads/audit", async (req: Request, res: Response) => {
    try {
      const { name, email, platform, niche, targetAudience, biggestChallenge, goals, instagramUrl } = req.body;
      if (!name || !email) return res.status(400).json({ message: "Name and email required" });

      // Extract Instagram username from URL
      let igUsername = "";
      if (instagramUrl) {
        const match = instagramUrl.replace(/\/$/, "").match(/(?:instagram\.com\/)([A-Za-z0-9_.]+)/);
        igUsername = match ? match[1] : instagramUrl.replace(/^@/, "");
      }

      // Step 1: Try Apify Instagram profile scrape
      let igProfileData: any = null;
      if (igUsername && process.env.APIFY_TOKEN) {
        try {
          const apifyRes = await fetch(
            `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${process.env.APIFY_TOKEN}&timeout=60`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ usernames: [igUsername] }),
              signal: AbortSignal.timeout(70000),
            }
          );
          if (apifyRes.ok) {
            const apifyData = await apifyRes.json();
            if (Array.isArray(apifyData) && apifyData.length > 0) igProfileData = apifyData[0];
          }
        } catch (apifyErr) {
          console.warn("[audit] Apify fetch failed, proceeding with AI-only analysis:", apifyErr);
        }
      }

      // Step 2: Build Groq analysis
      const igContext = igProfileData
        ? `Instagram Profile Data:
- Username: @${igProfileData.username || igUsername}
- Full name: ${igProfileData.fullName || "unknown"}
- Followers: ${igProfileData.followersCount?.toLocaleString() || "unknown"}
- Following: ${igProfileData.followsCount?.toLocaleString() || "unknown"}
- Posts: ${igProfileData.postsCount || "unknown"}
- Bio: ${igProfileData.biography || "none"}
- Verified: ${igProfileData.verified ? "Yes" : "No"}
- Engagement rate (est.): ${igProfileData.followersCount && igProfileData.postsCount ? ((igProfileData.postsCount / Math.max(igProfileData.followersCount, 1)) * 100).toFixed(2) + "%" : "unknown"}`
        : `Instagram handle: @${igUsername || "not provided"} (profile data unavailable — use form answers only)`;

      const sysPrompt = `You are a world-class social media growth strategist and monetisation expert. Generate a comprehensive creator audit as a JSON object with these exact fields:
{
  "overallScore": <0-100 monetisation readiness score>,
  "scoreLabel": "Beginner|Growing|Established|Monetisation Ready",
  "headline": "Personalized punchy title for their audit",
  "topInsight": "Single most important insight about their situation (1-2 sentences)",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "gaps": ["gap 1", "gap 2", "gap 3"],
  "quickWins": ["win 1 (do this week)", "win 2", "win 3"],
  "contentStrategy": "Personalized content strategy recommendation (2-3 sentences)",
  "monetisationPath": "Best monetisation path given their goals (2-3 sentences)",
  "competitiveEdge": "What makes them unique and how to leverage it",
  "90DayRoadmap": [
    {"phase": "Days 1–30", "focus": "...", "keyAction": "..."},
    {"phase": "Days 31–60", "focus": "...", "keyAction": "..."},
    {"phase": "Days 61–90", "focus": "...", "keyAction": "..."}
  ],
  "revenueEstimate": "Realistic revenue range achievable in 90 days",
  "platformSpecificTip": "One highly specific tip for their platform",
  "upgradeTeaser": "What additional value they'd get from the full Brandverse system (makes them want to upgrade)"
}
Be specific, reference their niche and platform. Be honest but encouraging.`;

      const userMsg = `Creator: ${name}
Platform: ${platform}
Niche: ${niche}
Target Audience: ${targetAudience}
Biggest Challenge: ${biggestChallenge}
Goals: ${goals}

${igContext}

Generate their personalised audit. Be specific to their situation.`;

      let auditReport: any = null;
      try {
        const raw = await callGroqJson(sysPrompt, userMsg, 1200);
        auditReport = JSON.parse(raw);
      } catch {
        auditReport = {
          overallScore: 58,
          scoreLabel: "Growing",
          headline: `${platform} Growth Audit for ${name}`,
          topInsight: `Your biggest opportunity is building a structured content system around your ${niche} niche with clear monetisation hooks.`,
          strengths: ["Active creator with real goals", "Clear platform focus", "Motivated to grow"],
          gaps: ["No defined monetisation strategy", "Content consistency needs work", "Audience connection could be stronger"],
          quickWins: ["Post 3x this week with a clear CTA", "Optimize bio with your value proposition", "Start building your email list today"],
          contentStrategy: `Focus on ${platform}-native formats in your ${niche} space. Lead with educational or entertaining hooks that speak directly to ${targetAudience}.`,
          monetisationPath: `Given your goal of ${goals}, start with one digital product or service offer within 30 days.`,
          competitiveEdge: "Your personal story and authentic perspective in your niche",
          "90DayRoadmap": [
            { phase: "Days 1–30", focus: "Foundation & Consistency", keyAction: "Post 4x/week, optimize profile, define content pillars" },
            { phase: "Days 31–60", focus: "Audience Building", keyAction: "Launch first lead magnet, collaborate with 2-3 accounts in your niche" },
            { phase: "Days 61–90", focus: "Monetisation", keyAction: "Launch first paid offer to your warm audience" },
          ],
          revenueEstimate: "$500–2,000/mo within 90 days",
          platformSpecificTip: `On ${platform}, the first 3 seconds determine everything — hook first, value second, CTA last.`,
          upgradeTeaser: "Unlock competitor analysis, AI content ideas, and a done-with-you content system to 3x your speed to results.",
        };
      }

      const quizAnswers = { platform, niche, targetAudience, biggestChallenge, goals, instagramUrl };
      const existing = await storage.getLandingLeadByEmail(email);
      let lead;
      if (existing) {
        lead = await storage.updateLandingLead(existing.id, {
          name, platform, niche, targetAudience, biggestChallenge, goals, instagramUrl,
          quizAnswers, auditData: { igProfile: igProfileData, report: auditReport }, source: "audit",
        } as any);
      } else {
        lead = await storage.createLandingLead({
          name, email, source: "audit", platform, niche, targetAudience, biggestChallenge, goals, instagramUrl,
          quizAnswers, auditData: { igProfile: igProfileData, report: auditReport },
        } as any);
      }

      // Return partial report for free users (tease upgrade)
      const partialReport = {
        overallScore: auditReport.overallScore,
        scoreLabel: auditReport.scoreLabel,
        headline: auditReport.headline,
        topInsight: auditReport.topInsight,
        strengths: auditReport.strengths,
        quickWins: auditReport.quickWins.slice(0, 2),
        revenueEstimate: auditReport.revenueEstimate,
        upgradeTeaser: auditReport.upgradeTeaser,
        // Locked fields:
        locked: ["gaps", "contentStrategy", "monetisationPath", "competitiveEdge", "90DayRoadmap", "platformSpecificTip"],
      };

      syncToOraviniCRM({ email, name, source: "audit", platform, niche, targetAudience, goals, instagramUrl, auditScore: partialReport.overallScore });
      return res.json({ report: partialReport, leadId: lead?.id });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // POST /api/admin/crm/sync — admin: bulk push all leads + clients to Oravini CRM
  app.post("/api/admin/crm/sync", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const [clients, leads] = await Promise.all([storage.getAllClients(), storage.getAllLandingLeads()]);
      let synced = 0;
      await Promise.allSettled([
        ...leads.map((l: any) => syncToOraviniCRM({ email: l.email, name: l.name, source: l.source || "lead", platform: l.platform, niche: l.niche })),
        ...clients.map((c: any) => syncToOraviniCRM({ email: c.email, name: c.name, source: "client", plan: c.plan, role: c.role })),
      ]);
      synced = leads.length + clients.length;
      return res.json({ synced, message: `${synced} records pushed to Oravini CRM` });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // GET /api/admin/crm — admin: full CRM data
  app.get("/api/admin/crm", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const [clients, leads, creditBals] = await Promise.all([
        storage.getAllClients(),
        storage.getAllLandingLeads(),
        storage.getAllCreditBalances(),
      ]);
      const creditMap = Object.fromEntries(creditBals.map((b: any) => [b.userId, b]));
      const clientsWithCredits = clients.map((c: any) => ({
        ...c,
        credits: creditMap[c.id] || null,
      }));
      return res.json({ clients: clientsWithCredits, leads });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Sessions Hub ────────────────────────────────────────────────────────────
  const TIER_ORDER: Record<string, number> = { free: 0, starter: 1, pro: 2 };

  // GET /api/sessions — all published sessions the user's plan can see
  app.get("/api/sessions", async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const plan = user?.plan ?? "free";
      const role = user?.role;
      if (role === "admin") {
        // admins see everything
        const all = await storage.getSessions();
        return res.json(all);
      }
      const allowedTiers = Object.keys(TIER_ORDER).filter(t => TIER_ORDER[t] <= TIER_ORDER[plan]);
      const list = await storage.getSessions(allowedTiers);
      return res.json(list);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // GET /api/sessions/all — admin: all sessions (published + drafts)
  app.get("/api/sessions/all", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const all = await storage.getSessions();
      return res.json(all);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // GET /api/sessions/:id
  app.get("/api/sessions/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const session = await storage.getSession(p(req.params.id));
      if (!session) return res.status(404).json({ message: "Session not found" });
      const user = req.user as any;
      if (user.role !== "admin") {
        const plan = user.plan ?? "free";
        if (TIER_ORDER[session.tierRequired] > TIER_ORDER[plan]) {
          return res.status(403).json({ message: "Upgrade required" });
        }
      }
      return res.json(session);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // POST /api/sessions — admin create
  app.post("/api/sessions", requireAdmin, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const session = await storage.createSession({ ...req.body, createdBy: user.id });
      return res.status(201).json(session);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // PATCH /api/sessions/:id — admin update
  app.patch("/api/sessions/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const session = await storage.updateSession(p(req.params.id), req.body);
      if (!session) return res.status(404).json({ message: "Session not found" });
      return res.json(session);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // DELETE /api/sessions/:id — admin delete
  app.delete("/api/sessions/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteSession(p(req.params.id));
      return res.json({ message: "Deleted" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // PATCH /api/admin/users/:id/plan — admin update user plan
  app.patch("/api/admin/users/:id/plan", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { plan } = req.body;
      if (!["free", "starter", "growth", "pro", "elite"].includes(plan)) {
        return res.status(400).json({ message: "Invalid plan" });
      }
      const existing = await storage.getUser(p(req.params.id));
      const user = await storage.updateUser(p(req.params.id), { plan } as any);
      // Sync upgrade event to Oravini CRM
      if (existing && existing.plan !== plan) {
        const tierNames: Record<string, string> = { free: "Tier 1 (Free)", starter: "Tier 2 ($29)", growth: "Tier 3 ($59)", pro: "Tier 4 ($79)", elite: "Tier 5 (Elite)" };
        syncToOraviniCRM({ email: user.email, name: user.name, source: "plan_upgrade", previousPlan: existing.plan, newPlan: plan, tierLabel: tierNames[plan] || plan, event: "upgraded" });
      }
      return res.json(user);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // POST /api/sessions/free-ai — free tier AI content ideas (3/day limit)
  app.post("/api/sessions/free-ai", async (req: Request, res: Response) => {
    try {
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "unknown";
      const user = req.user as any;
      const identifier = user?.id || ip;
      const today = new Date().toISOString().split("T")[0];
      const FREE_DAILY_LIMIT = 3;
      const usage = await storage.getFreeAiUsage(identifier, today);
      if (usage >= FREE_DAILY_LIMIT) {
        return res.status(429).json({ message: "Daily limit reached", limit: FREE_DAILY_LIMIT, used: usage });
      }
      const { niche, platform } = req.body;
      if (!niche) return res.status(400).json({ message: "Niche is required" });

      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) throw new Error("GROQ_API_KEY not configured");
      const prompt = `Generate 3 creative content ideas for a ${platform || "social media"} creator in the ${niche} niche. For each idea give: a punchy title, a one-line hook, and the content format (reel, carousel, etc.). Keep it actionable and viral-focused. Format as JSON array: [{title, hook, format}]`;
      const groqResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqApiKey}` },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], temperature: 0.85, max_tokens: 600 }),
      });
      const groqData = await groqResp.json() as any;
      const text = groqData.choices?.[0]?.message?.content || "[]";
      let ideas: any[] = [];
      try { ideas = JSON.parse(text.replace(/```json|```/g, "").trim()); } catch { ideas = []; }
      const newCount = await storage.incrementFreeAiUsage(identifier, today);
      return res.json({ ideas, used: newCount, limit: FREE_DAILY_LIMIT, remaining: FREE_DAILY_LIMIT - newCount });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── AI Session History ───────────────────────────────────────────────────────
  app.get("/api/ai/history", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const tool = (req.query.tool as string) || "ideas";
      const history = await storage.getAiHistory(userId, tool);
      return res.json(history);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/ai/history", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { tool, title, inputs, output } = req.body;
      if (!tool) return res.status(400).json({ message: "tool is required" });
      const entry = await storage.saveAiHistory({ userId, tool, title, inputs, output });
      return res.json(entry);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/ai/history/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteAiHistory(p(req.params.id), (req.user as any).id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── LinkedIn Integration ─────────────────────────────────────────────────────
  const LINKEDIN_CALLBACK = process.env.NODE_ENV === "production"
    ? "https://admin-control-hub-aryan07surana.replit.app/api/linkedin/callback"
    : `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000"}/api/linkedin/callback`;

  function encodeLinkedinState(userId: string): string {
    const nonce = Math.random().toString(36).slice(2, 10);
    return Buffer.from(`${userId}:${nonce}`).toString("base64url");
  }

  function decodeLinkedinState(state: string): string | null {
    try {
      const decoded = Buffer.from(state, "base64url").toString("utf8");
      const [userId] = decoded.split(":");
      return userId || null;
    } catch { return null; }
  }

  function linkedinAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      redirect_uri: LINKEDIN_CALLBACK,
      scope: "openid profile email w_member_social",
      state,
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  }

  async function linkedinExchangeCode(code: string): Promise<{ access_token: string; expires_in: number; refresh_token?: string }> {
    const resp = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: LINKEDIN_CALLBACK,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    });
    if (!resp.ok) throw new Error(`LinkedIn token exchange failed: ${await resp.text()}`);
    return resp.json();
  }

  async function linkedinMe(accessToken: string): Promise<{ sub: string; name: string; email?: string }> {
    const resp = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) throw new Error("Failed to fetch LinkedIn profile");
    return resp.json();
  }

  async function linkedinPost(accessToken: string, linkedinUserId: string, content: string): Promise<string> {
    const body = {
      author: `urn:li:person:${linkedinUserId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: content },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };
    const resp = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error(`LinkedIn post failed: ${await resp.text()}`);
    const data: any = await resp.json();
    return data.id ?? "";
  }

  app.get("/api/linkedin/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const token = await storage.getLinkedinToken(userId);
      return res.json({ connected: !!token, name: token?.linkedinName ?? null });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/linkedin/connect", requireAuth, (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const state = encodeLinkedinState(userId);
      return res.redirect(linkedinAuthUrl(state));
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/linkedin/callback", async (req: Request, res: Response) => {
    const base = process.env.NODE_ENV === "production"
      ? "https://admin-control-hub-aryan07surana.replit.app"
      : `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000"}`;
    try {
      const { code, state, error, error_description } = req.query as {
        code?: string; state?: string; error?: string; error_description?: string;
      };
      if (error) {
        console.log(`[linkedin] OAuth denied: ${error} — ${error_description}`);
        return res.redirect(`${base}/linkedin-scheduler?error=${encodeURIComponent(error_description || error)}`);
      }
      if (!code || !state) return res.redirect(`${base}/linkedin-scheduler?error=missing_params`);
      const userId = decodeLinkedinState(state);
      if (!userId) return res.redirect(`${base}/linkedin-scheduler?error=invalid_state`);
      const tokens = await linkedinExchangeCode(code);
      const profile = await linkedinMe(tokens.access_token);
      const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null;
      await storage.upsertLinkedinToken(userId, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt,
        linkedinUserId: profile.sub,
        linkedinName: profile.name,
      });
      return res.redirect("/linkedin-scheduler?connected=1");
    } catch (err: any) {
      console.log(`[linkedin] Callback error: ${err.message}`);
      return res.redirect(`/linkedin-scheduler?error=${encodeURIComponent(err.message || "Authentication failed")}`);
    }
  });

  app.delete("/api/linkedin/disconnect", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteLinkedinToken((req.user as any).id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/linkedin/post", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Post content is required" });
      const token = await storage.getLinkedinToken(userId);
      if (!token) return res.status(400).json({ message: "LinkedIn not connected" });
      const postId = await linkedinPost(token.accessToken, token.linkedinUserId!, content.trim());
      return res.json({ success: true, postId });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/linkedin/scheduled", requireAuth, async (req: Request, res: Response) => {
    try {
      const posts = await storage.getScheduledLinkedinPosts((req.user as any).id);
      return res.json(posts);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/linkedin/scheduled", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { content, scheduledFor } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Post content is required" });
      if (!scheduledFor) return res.status(400).json({ message: "Schedule time is required" });
      const schedDate = new Date(scheduledFor);
      if (schedDate <= new Date()) return res.status(400).json({ message: "Schedule time must be in the future" });
      const post = await storage.createScheduledLinkedinPost({ userId, content: content.trim(), scheduledFor: schedDate, status: "pending" });
      return res.json(post);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/linkedin/scheduled/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteScheduledLinkedinPost(p(req.params.id), (req.user as any).id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Twitter / X Integration ──────────────────────────────────────────────────
  const { TwitterApi } = await import("twitter-api-v2");

  function getTwitterClient() {
    return new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    });
  }

  async function getAuthedTwitterClient(userId: string) {
    const token = await storage.getTwitterToken(userId);
    if (!token) throw new Error("Twitter not connected");
    const client = getTwitterClient();
    if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
      if (!token.refreshToken) throw new Error("Twitter token expired, please reconnect");
      const { accessToken, refreshToken, expiresIn } = await client.refreshOAuth2Token(token.refreshToken);
      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
      await storage.upsertTwitterToken(userId, {
        accessToken,
        refreshToken: refreshToken ?? token.refreshToken,
        expiresAt,
        twitterUserId: token.twitterUserId,
        twitterHandle: token.twitterHandle,
      });
      return new TwitterApi(accessToken);
    }
    return new TwitterApi(token.accessToken);
  }

  const TWITTER_CALLBACK = process.env.NODE_ENV === "production"
    ? "https://admin-control-hub-aryan07surana.replit.app/api/twitter/callback"
    : `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000"}/api/twitter/callback`;

  const twitterCodeVerifiers = new Map<string, { codeVerifier: string; userId: string }>();

  app.get("/api/twitter/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const token = await storage.getTwitterToken(userId);
      return res.json({ connected: !!token, handle: token?.twitterHandle ?? null });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/twitter/connect", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const client = getTwitterClient();
      const { url, codeVerifier, state } = client.generateOAuth2AuthLink(TWITTER_CALLBACK, {
        scope: ["tweet.read", "tweet.write", "users.read", "offline.access"],
      });
      twitterCodeVerifiers.set(state, { codeVerifier, userId });
      return res.json({ url });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/twitter/callback", async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query as { code: string; state: string };
      const stored = twitterCodeVerifiers.get(state);
      if (!stored) return res.status(400).send("Invalid state — please try connecting again.");
      twitterCodeVerifiers.delete(state);

      const client = getTwitterClient();
      const { client: authedClient, accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
        code,
        codeVerifier: stored.codeVerifier,
        redirectUri: TWITTER_CALLBACK,
      });

      const me = await authedClient.v2.me();
      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
      await storage.upsertTwitterToken(stored.userId, {
        accessToken,
        refreshToken: refreshToken ?? null,
        expiresAt,
        twitterUserId: me.data.id,
        twitterHandle: me.data.username,
      });

      return res.redirect("/twitter-scheduler?connected=1");
    } catch (err: any) {
      return res.redirect("/twitter-scheduler?error=auth_failed");
    }
  });

  app.delete("/api/twitter/disconnect", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      await storage.deleteTwitterToken(userId);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/twitter/post", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Tweet content is required" });
      if (content.length > 280) return res.status(400).json({ message: "Tweet exceeds 280 characters" });
      const client = await getAuthedTwitterClient(userId);
      const tweet = await client.v2.tweet(content.trim());
      return res.json({ success: true, tweetId: tweet.data.id });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/twitter/scheduled", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const tweets = await storage.getScheduledTweets(userId);
      return res.json(tweets);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/twitter/scheduled", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { content, scheduledFor } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Tweet content is required" });
      if (content.length > 280) return res.status(400).json({ message: "Tweet exceeds 280 characters" });
      if (!scheduledFor) return res.status(400).json({ message: "Schedule time is required" });
      const schedDate = new Date(scheduledFor);
      if (schedDate <= new Date()) return res.status(400).json({ message: "Schedule time must be in the future" });
      const tweet = await storage.createScheduledTweet({ userId, content: content.trim(), scheduledFor: schedDate, status: "pending" });
      return res.json(tweet);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/twitter/scheduled/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      await storage.deleteScheduledTweet(p(req.params.id), userId);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── YouTube Integration ───────────────────────────────────────────────────────
  const { google } = await import("googleapis");

  function getSiteBase() {
    if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    if (domain) return `https://${domain}`;
    return "http://localhost:5000";
  }

  function getYoutubeCallbackUrl() {
    return `${getSiteBase()}/api/auth/youtube/callback`;
  }

  function getYoutubeOAuth2Client() {
    return new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      getYoutubeCallbackUrl(),
    );
  }

  app.get("/api/auth/youtube", requireAuth, (req: Request, res: Response) => {
    if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
      return res.status(500).json({ message: "YouTube credentials not configured" });
    }
    const oauth2Client = getYoutubeOAuth2Client();
    const callbackUrl = getYoutubeCallbackUrl();
    console.log(`[youtube] OAuth starting, callback=${callbackUrl}`);
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly",
      ],
      prompt: "consent",
      state: (req.user as any).id,
    });
    return res.redirect(url);
  });

  app.get("/api/auth/youtube/callback", async (req: Request, res: Response) => {
    const base = getSiteBase();
    try {
      const { code, state: userId, error, error_description } = req.query as {
        code?: string; state?: string; error?: string; error_description?: string;
      };

      if (error) {
        console.log(`[youtube] OAuth denied: ${error} — ${error_description}`);
        return res.redirect(`${base}/youtube-scheduler?yt_error=${encodeURIComponent(error_description || error)}`);
      }

      if (!code || !userId) {
        console.log("[youtube] OAuth callback: missing code or state");
        return res.redirect(`${base}/youtube-scheduler?yt_error=missing_code`);
      }

      const oauth2Client = getYoutubeOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      if (!tokens.access_token) throw new Error("No access token received from Google");

      const yt = google.youtube({ version: "v3", auth: oauth2Client });
      const channelRes = await yt.channels.list({ part: ["snippet"], mine: true });
      const channel = channelRes.data.items?.[0];

      await storage.upsertYoutubeToken(userId, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        channelId: channel?.id ?? null,
        channelTitle: channel?.snippet?.title ?? null,
        channelThumbnail: channel?.snippet?.thumbnails?.default?.url ?? null,
      });

      console.log(`[youtube] Connected: channel=${channel?.snippet?.title} user=${userId}`);
      return res.redirect(`${base}/youtube-scheduler?yt_connected=1`);
    } catch (err: any) {
      console.log(`[youtube] Callback error: ${err.message}`);
      return res.redirect(`${base}/youtube-scheduler?yt_error=${encodeURIComponent(err.message)}`);
    }
  });

  app.get("/api/youtube/status", requireAuth, async (req: Request, res: Response) => {
    const token = await storage.getYoutubeToken((req.user as any).id);
    if (!token) return res.json({ connected: false });
    return res.json({
      connected: true,
      channelId: token.channelId,
      channelTitle: token.channelTitle,
      channelThumbnail: token.channelThumbnail,
    });
  });

  app.delete("/api/youtube/disconnect", requireAuth, async (req: Request, res: Response) => {
    await storage.deleteYoutubeToken((req.user as any).id);
    return res.json({ success: true });
  });

  async function getAuthedYoutubeClient(userId: string) {
    const token = await storage.getYoutubeToken(userId);
    if (!token) throw new Error("YouTube not connected");
    const oauth2Client = getYoutubeOAuth2Client();
    if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
      if (!token.refreshToken) throw new Error("YouTube token expired, please reconnect");
      oauth2Client.setCredentials({ refresh_token: token.refreshToken });
      const { credentials } = await oauth2Client.refreshAccessToken();
      await storage.upsertYoutubeToken(userId, {
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token ?? token.refreshToken,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        channelId: token.channelId,
        channelTitle: token.channelTitle,
        channelThumbnail: token.channelThumbnail,
      });
      oauth2Client.setCredentials(credentials);
    } else {
      oauth2Client.setCredentials({ access_token: token.accessToken, refresh_token: token.refreshToken ?? undefined });
    }
    return google.youtube({ version: "v3", auth: oauth2Client });
  }

  async function uploadVideoFromUrl(yt: any, videoUrl: string, title: string, description: string, tags: string[], category: string, privacyStatus: string) {
    const videoResp = await fetch(videoUrl);
    if (!videoResp.ok) throw new Error(`Failed to fetch video: ${videoResp.statusText}`);
    const videoBuffer = await videoResp.arrayBuffer();
    const { Readable } = await import("stream");
    const stream = Readable.from(Buffer.from(videoBuffer));
    const res = await yt.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: { title, description, tags, categoryId: category },
        status: { privacyStatus },
      },
      media: { mimeType: "video/*", body: stream },
    });
    return res.data;
  }

  app.post("/api/youtube/post", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { title, description = "", tags = [], category = "22", privacyStatus = "public", videoUrl } = req.body;
      if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
      if (!videoUrl?.trim()) return res.status(400).json({ message: "Video URL is required" });
      const yt = await getAuthedYoutubeClient(userId);
      const result = await uploadVideoFromUrl(yt, videoUrl, title, description, tags, category, privacyStatus);
      return res.json({ success: true, videoId: result.id, url: `https://youtube.com/watch?v=${result.id}` });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/youtube/schedule", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { title, description, tags, category, privacyStatus, videoUrl, thumbnailUrl, scheduledFor } = req.body;
      if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
      if (!videoUrl?.trim()) return res.status(400).json({ message: "Video URL is required" });
      if (!scheduledFor) return res.status(400).json({ message: "Schedule time is required" });
      const schedDate = new Date(scheduledFor);
      if (schedDate <= new Date()) return res.status(400).json({ message: "Schedule time must be in the future" });
      const post = await storage.createScheduledYoutubePost({
        userId, title: title.trim(), description: description ?? "", tags: tags ?? [], category: category ?? "22",
        privacyStatus: privacyStatus ?? "public", videoUrl: videoUrl.trim(), thumbnailUrl: thumbnailUrl ?? null,
        scheduledFor: schedDate,
      });
      return res.json(post);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/youtube/scheduled", requireAuth, async (req: Request, res: Response) => {
    const posts = await storage.getScheduledYoutubePosts((req.user as any).id);
    return res.json(posts);
  });

  app.delete("/api/youtube/scheduled/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteScheduledYoutubePost(p(req.params.id), (req.user as any).id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Lead Magnet Generator ─────────────────────────────────────────────────
  app.post("/api/ai/lead-magnet/generate", requireAuth, async (req: Request, res: Response) => {
    try {
      const { niche, type, topic, audience, goal, ctaType, calendlyUrl, referenceUrl, pageCount = 8 } = req.body;
      if (!topic?.trim()) return res.status(400).json({ message: "Topic is required" });
      const _uLm = req.user as any;
      if (_uLm?.role !== "admin") {
        const lmCredit = await storage.deductCredits(_uLm.id, 4, "lead_magnet", "Lead Magnet generation", _uLm.plan || "free");
        if (!lmCredit.success) return res.status(402).json({ message: lmCredit.message, insufficientCredits: true, balance: lmCredit.balance });
      }

      const targetPages = Math.min(Math.max(Number(pageCount) || 8, 5), 25);
      const contentPages = Math.max(targetPages - 4, 1); // cover + problem + content(s) + cta

      const systemPrompt = `You are an expert lead magnet strategist and copywriter. You create high-converting, premium-quality lead magnets with detailed, actionable content. Always respond with valid JSON only — no markdown, no code fences.`;

      const ctaInstruction = ctaType === "book-call"
        ? `CTA: Book a discovery call${calendlyUrl ? ` — Calendly: ${calendlyUrl}` : ""}`
        : ctaType === "email-list" ? "CTA: Join the email list / newsletter"
        : ctaType === "follow-instagram" ? "CTA: Follow on Instagram"
        : ctaType === "buy-product" ? "CTA: Buy the product/course"
        : `CTA goal: ${goal || "Generate leads"}`;

      const userPrompt = `Create a complete, detailed lead magnet with the following details:
NICHE: ${niche || "Business / Marketing"}
TYPE: ${type || "Guide"}
TOPIC: ${topic}
AUDIENCE: ${audience || "Entrepreneurs and small business owners"}
GOAL: ${goal || "Grow their audience and generate leads"}
${ctaInstruction}
${referenceUrl ? `REFERENCE: ${referenceUrl}` : ""}

Return a JSON object with EXACTLY this structure:
{
  "titleOptions": [5 compelling, curiosity-driven title variations as strings],
  "selectedTitle": "the best title from the 5 options",
  "hookLine": "a short powerful hook sentence for page 1",
  "pages": [
    {
      "id": "page-0",
      "type": "cover",
      "title": "main title text",
      "subtitle": "compelling subtitle",
      "hook": "one punchy hook line"
    },
    {
      "id": "page-1",
      "type": "problem",
      "heading": "The Problem",
      "body": "3-4 sentences describing the painful problem the audience faces. Be specific.",
      "emphasis": "one bold key insight or stat"
    },
    {
      "id": "page-2",
      "type": "content",
      "heading": "Section heading",
      "body": "3-4 detailed, actionable sentences",
      "bullets": ["specific actionable point 1", "specific actionable point 2", "specific actionable point 3", "specific actionable point 4"]
    },
    {
      "id": "page-3",
      "type": "content",
      "heading": "Section heading",
      "body": "3-4 detailed, actionable sentences",
      "bullets": ["point 1", "point 2", "point 3", "point 4"]
    },
    {
      "id": "page-4",
      "type": "checklist",
      "heading": "Your Action Checklist",
      "items": ["at least 6 specific, actionable checklist items"]
    },
    {
      "id": "page-5",
      "type": "content",
      "heading": "Section heading",
      "body": "3-4 detailed sentences",
      "bullets": ["point 1", "point 2", "point 3"]
    },
    {
      "id": "page-6",
      "type": "tips",
      "heading": "Pro Tips",
      "tips": [
        {"number": "01", "title": "tip title", "body": "2 sentence tip explanation"},
        {"number": "02", "title": "tip title", "body": "2 sentence tip explanation"},
        {"number": "03", "title": "tip title", "body": "2 sentence tip explanation"}
      ]
    },
    {
      "id": "page-7",
      "type": "cta",
      "headline": "compelling CTA headline",
      "body": "2-3 sentences reinforcing value and next step",
      "cta": "specific action CTA (e.g. DM me GROWTH, Book a free call, etc.)"
    }
  ],
  "ctas": [
    "CTA variation 1 — action-focused",
    "CTA variation 2 — urgency-focused",
    "CTA variation 3 — value-focused"
  ],
  "repurpose": {
    "carousel": ["slide 1 text (hook)", "slide 2 text", "slide 3 text", "slide 4 text", "slide 5 text (CTA)"],
    "linkedin": "full LinkedIn post (150-200 words) based on the lead magnet content",
    "caption": "Instagram caption with hashtags"
  }
}

Make the content specific, detailed, and actionable — not generic. Tailor it precisely to the niche and audience.`;

      const raw = await callGroqJson(systemPrompt, userPrompt, 8000);
      let result: any;
      try {
        result = JSON.parse(raw);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("Failed to parse AI response");
        result = JSON.parse(match[0]);
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Lead Magnet — improve a single text field with AI
  app.post("/api/ai/lead-magnet/improve-text", requireAuth, async (req: Request, res: Response) => {
    try {
      const { text, context } = req.body;
      if (!text?.trim()) return res.status(400).json({ message: "Text required" });
      const improved = await callGroq(
        "You improve marketing copy for lead magnets. Return ONLY the improved text — no quotes, no commentary, no extra words. Keep a similar length.",
        `Improve this text to be more clear, engaging and persuasive:\n\nContext: ${context || "lead magnet page"}\n\nText:\n${text}`,
        400,
      );
      return res.json({ text: improved.trim() });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Lead Magnet — rearrange a page's content with AI
  app.post("/api/ai/lead-magnet/rearrange", requireAuth, async (req: Request, res: Response) => {
    try {
      const { page, niche, goal } = req.body;
      if (!page) return res.status(400).json({ message: "Page data required" });
      const raw = await callGroqJson(
        "You are an expert lead magnet designer. Improve and restructure page content. Return only valid JSON with the same shape as the input.",
        `Improve this lead magnet page. Make it more structured and scannable. Add useful detail where needed. Return JSON with EXACTLY the same keys as input.\n\nNiche: ${niche || "general"}\nGoal: ${goal || "generate leads"}\n\nPage:\n${JSON.stringify(page)}`,
        800,
      );
      let result: any;
      try { result = JSON.parse(raw); } catch {
        const m = raw.match(/\{[\s\S]*\}/); result = m ? JSON.parse(m[0]) : page;
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Lead Magnet — AI chat assistant (auto-applies slide changes)
  app.post("/api/ai/lead-magnet/chat", requireAuth, async (req: Request, res: Response) => {
    try {
      const { message, pages, niche, goal, topic } = req.body;
      if (!message?.trim()) return res.status(400).json({ message: "Message required" });

      const pagesJson = JSON.stringify((pages || []).map((p: any, i: number) => ({ index: i, ...p })));

      const systemPrompt = `You are an AI lead magnet editor that AUTOMATICALLY applies changes to slides. 

When the user mentions a slide/page number (e.g., "slide 3", "page 2", "slide 4"), you MUST update that slide's content and return it in pageUpdates.

Always return valid JSON in this exact format:
{
  "response": "brief description of what you did",
  "pageUpdates": [
    { "index": 2, "page": { ...complete updated page object with all fields... } }
  ]
}

Rules:
- "slide 3" = index 2 (0-based), "page 1" = index 0, etc.
- When updating a page, copy its FULL structure and improve only the requested fields
- If no specific slide is mentioned but changes make sense (e.g., "improve all CTAs"), update relevant pages
- pageUpdates can be empty [] if only giving advice
- Return ONLY the JSON, no markdown`;

      const raw = await callGroqJson(systemPrompt,
        `User request: "${message}"\n\nNiche: ${niche}\nGoal: ${goal}\nTopic: ${topic}\n\nAll pages:\n${pagesJson}`,
        2000,
      );

      let result: any;
      try { result = JSON.parse(raw); } catch {
        const m = raw.match(/\{[\s\S]*\}/); result = m ? JSON.parse(m[0]) : { response: raw, pageUpdates: [] };
      }
      if (!result.pageUpdates) result.pageUpdates = [];
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Brand Kit — improve text field ────────────────────────────────────────
  app.post("/api/ai/brand-kit/improve-text", requireAuth, async (req: Request, res: Response) => {
    try {
      const { text, field } = req.body;
      if (!text?.trim()) return res.status(400).json({ message: "text required" });
      const instructions: Record<string, string> = {
        businessDescription: "Rewrite this brand/business description to be more specific, compelling, and strategic. Keep it in first person. Make it 2–3 sentences that clearly communicate what the brand does, who it serves, and why it's unique.",
        targetAudience: "Rewrite this target audience description to be more detailed and specific — include demographics, psychographics, pain points, desires, and online behaviour. 2–3 sentences.",
      };
      const instruction = instructions[field] || "Rewrite this text to be clearer, more specific, and more compelling. Keep the same intent.";
      const result = await callGroq(
        "You are a brand strategist. Improve the given text. Return ONLY the improved text — no quotes, no explanation.",
        `Original text: "${text}"\n\nInstruction: ${instruction}`,
        400,
      );
      return res.json({ text: result.trim().replace(/^["']|["']$/g, "") });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Brand Kit Builder ─────────────────────────────────────────────────────
  app.post("/api/ai/brand-kit/generate", requireAuth, async (req: Request, res: Response) => {
    try {
      const { businessDescription, targetAudience, platforms, platformUrls, style, goal, industry, revenueModel, contentFrequency, mainCompetitor, brandHero, existingBrandColors } = req.body;
      if (!businessDescription?.trim()) return res.status(400).json({ message: "businessDescription required" });
      const _uBk = req.user as any;
      if (_uBk?.role !== "admin") {
        const bkCredit = await storage.deductCredits(_uBk.id, 4, "brand_kit", "Brand Kit generation", _uBk.plan || "free");
        if (!bkCredit.success) return res.status(402).json({ message: bkCredit.message, insufficientCredits: true, balance: bkCredit.balance });
      }

      const platformList = Array.isArray(platforms) && platforms.length > 0 ? platforms : ["Instagram"];
      const urlsText = platformUrls && typeof platformUrls === "object"
        ? Object.entries(platformUrls).filter(([, u]) => u).map(([p, u]) => `  - ${p}: ${u}`).join("\n")
        : "";

      const systemPrompt = `You are an expert brand strategist, visual designer, and marketing consultant. You create complete, premium brand identity systems. Return ONLY valid JSON — no markdown, no explanation, just the JSON object.`;

      const userPrompt = `Create a complete brand kit for this brand:

Business/Brand: ${businessDescription}
Target Audience: ${targetAudience || "Not specified"}
Industry / Niche: ${industry || "Not specified"}
Revenue Model: ${revenueModel || "Not specified"}
Platform Focus: ${platformList.join(", ")}${urlsText ? `\nPlatform URLs:\n${urlsText}` : ""}
Style Preference: ${style || "Minimal & Clean"}
Goal: ${goal || "Grow Audience"}
Content Frequency: ${contentFrequency || "Not specified"}
Main Competitor: ${mainCompetitor || "Not specified"}
Brand Hero / Inspiration: ${brandHero || "Not specified"}
Existing Brand Colours: ${existingBrandColors || "None — generate fresh colours"}

${existingBrandColors ? `IMPORTANT: The user has existing brand colours (${existingBrandColors}). Build the palette around or complementary to these — do NOT ignore them.` : ""}

Return this exact JSON structure:
{
  "brandCore": {
    "positioning": { "standFor": "string", "uniqueAngle": "string" },
    "personality": { "traits": ["trait1","trait2","trait3","trait4"], "contentExpression": "string" },
    "toneOfVoice": { "style": "string", "example": "string (a sample sentence in this brand voice)" }
  },
  "visualIdentity": {
    "colorPalette": {
      "primary": { "name": "color name", "hex": "#hexcode", "why": "why this color" },
      "secondary": { "name": "color name", "hex": "#hexcode", "why": "why this color" },
      "accent": { "name": "color name", "hex": "#hexcode", "why": "why this color" },
      "background": { "name": "color name", "hex": "#hexcode" },
      "emotionalImpact": "string explaining the emotional effect of this palette"
    },
    "typography": {
      "heading": { "style": "font description", "usage": "when to use" },
      "body": { "style": "font description", "usage": "when to use" },
      "accent": { "style": "font description", "usage": "when to use" }
    },
    "designStyle": {
      "aesthetic": "string",
      "layout": "string",
      "visualElements": "string"
    }
  },
  "socialMedia": {
    "postStyle": { "look": "string", "textPlacement": "string", "colorsSpacing": "string" },
    "carouselStyle": { "structure": "string", "fontHierarchy": "string", "visualFlow": "string" },
    "storyStyle": { "textDensity": "string", "interaction": "string", "tone": "string" }
  },
  "contentStrategy": {
    "pillars": [
      { "title": "string", "description": "string" },
      { "title": "string", "description": "string" },
      { "title": "string", "description": "string" },
      { "title": "string", "description": "string" }
    ],
    "hooks": ["hook1","hook2","hook3","hook4","hook5"],
    "ctas": { "style": "string", "examples": ["cta1","cta2","cta3"] }
  },
  "leadMagnet": {
    "types": ["type1","type2","type3"],
    "designStyle": "string",
    "tone": "string"
  },
  "brandRules": {
    "dos": ["do1","do2","do3","do4","do5"],
    "donts": ["dont1","dont2","dont3","dont4","dont5"]
  },
  "summary": ["bullet1","bullet2","bullet3","bullet4","bullet5"]
}

Make it specific, strategic, and cohesive — not generic. Optimise for modern social media growth.`;

      const raw = await callGroqJson(systemPrompt, userPrompt, 3000);

      let result: any;
      try { result = JSON.parse(raw); } catch {
        const m = raw.match(/\{[\s\S]*\}/);
        if (!m) throw new Error("Failed to parse brand kit JSON");
        result = JSON.parse(m[0]);
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Lead Magnet — expand existing slide with deeper AI content
  app.post("/api/ai/lead-magnet/expand-slide", requireAuth, async (req: Request, res: Response) => {
    try {
      const { page, niche, goal, topic, context } = req.body;
      if (!page) return res.status(400).json({ message: "page required" });

      const instrMap: Record<string, string> = {
        content: "Add 2–3 more detailed bullet points and make the body paragraph richer with a specific example or statistic. Keep all existing content.",
        checklist: "Add 3–5 more specific, actionable checklist items that are distinct from the existing ones.",
        tips: "Add 2–3 more expert tips, each with a clear number, title, and body. Keep all existing tips.",
        problem: "Deepen the body text with a relatable real-world example. Make the emphasis field more specific, striking, and impactful.",
        cover: "Write a stronger, more emotionally resonant hook quote. Enrich the subtitle to highlight a key benefit.",
        cta: "Strengthen the headline with urgency. Make the body copy more persuasive and benefit-driven. Improve the CTA button text to be action-oriented.",
      };
      const instrText = instrMap[page.type] || "Add more depth, examples, and value to every text field in this slide.";

      const raw = await callGroqJson(
        `You are an expert lead magnet copywriter. Expand and enrich the given slide. Return ONLY valid JSON matching the exact same shape — same 'id', same 'type'. NEVER remove existing content, only improve and add.`,
        `Expand this slide:\n${JSON.stringify(page)}\n\nNiche: ${niche}\nGoal: ${goal}\nTopic: ${topic}\nExtra context: ${context || "none"}\n\nInstruction: ${instrText}\n\nReturn the complete updated slide as JSON.`,
        1400,
      );

      let result: any;
      try { result = JSON.parse(raw); } catch {
        const m = raw.match(/\{[\s\S]*\}/); if (!m) throw new Error("Parse failed");
        result = JSON.parse(m[0]);
      }
      result.id = page.id;
      result.type = page.type;
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Lead Magnet — fill/expand an empty page
  app.post("/api/ai/lead-magnet/fill-page", requireAuth, async (req: Request, res: Response) => {
    try {
      const { pageType, niche, goal, topic, pageIndex } = req.body;
      const raw = await callGroqJson(
        "You generate lead magnet page content. Return valid JSON only — no markdown.",
        `Generate content for a "${pageType}" page in a lead magnet.\nTopic: ${topic}\nNiche: ${niche}\nGoal: ${goal}\nPage number: ${pageIndex + 1}\n\nReturn JSON matching this shape based on type:\n- cover: {type, id, title, subtitle, hook}\n- content: {type, id, heading, body, bullets:[]}\n- checklist: {type, id, heading, items:[]}\n- tips: {type, id, heading, tips:[{number,title,body}]}\n- cta: {type, id, headline, body, cta}`,
        600,
      );
      let result: any;
      try { result = JSON.parse(raw); } catch {
        const m = raw.match(/\{[\s\S]*\}/); if (!m) throw new Error("Parse failed");
        result = JSON.parse(m[0]);
      }
      result.id = `page-${pageIndex}`;
      result.type = pageType;
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Instagram Story Generator
  app.post("/api/ai/story/generate", requireAuth, async (req: Request, res: Response) => {
    try {
      const { goal, topic, niche, targetAudience, instagramUrl, ctaType, slidesCount, style, tone, hookStyle, contentDepth } = req.body;
      const _uSt = req.user as any;
      if (_uSt?.role !== "admin") {
        const stCredit = await storage.deductCredits(_uSt.id, 2, "story", "Instagram Story sequence generation", _uSt.plan || "free");
        if (!stCredit.success) return res.status(402).json({ message: stCredit.message, insufficientCredits: true, balance: stCredit.balance });
      }
      const hookStyleMap: Record<string, string> = {
        "curiosity": "Start with a powerful curiosity question that makes them want to keep tapping (e.g. 'What if I told you...' / 'Have you ever wondered why...')",
        "bold-stat": "Open with a surprising, specific statistic or data point that challenges assumptions",
        "story": "Begin with a personal story opening — set the scene with vivid first-person detail",
        "challenge": "Throw down a challenge that creates urgency or competitive instinct",
        "bold-claim": "Lead with a bold, contrarian claim that challenges conventional wisdom",
        "relatable": "Start with a deeply relatable observation or shared experience",
      };
      const depthMap: Record<string, string> = {
        "quick": "Keep slides SHORT and punchy — 1-3 words headline, single concept per slide, fast pace. Optimise for speed and impact.",
        "balanced": "Mix quick-hitting slides with deeper insight slides. Balance brevity with substance.",
        "deep-dive": "Go deep on each slide — more detailed explanations, richer context, educational depth. Users who want the full picture.",
      };
      const systemPrompt = `You are an expert Instagram Story strategist. Generate high-converting story sequences as structured JSON. Return ONLY valid JSON — no markdown, no extra text, no code fences.`;
      const userPrompt = `Generate a HIGH-CONVERTING Instagram Story Sequence as JSON.

User Inputs:
- Goal: ${goal}
- Topic: ${topic}
- Niche: ${niche}
- Target Audience: ${targetAudience}
- Instagram Profile: ${instagramUrl || "not provided"}
- Call To Action: ${ctaType}
- Number of Slides: ${slidesCount}
- Visual Style: ${style}
- Tone of Voice: ${tone || "inspirational"} — Every slide must feel ${tone || "inspirational"}. The language, word choice, and energy should consistently reflect this tone.
- Hook Style: ${hookStyleMap[hookStyle] || hookStyleMap["curiosity"]}
- Content Depth: ${depthMap[contentDepth] || depthMap["balanced"]}

Rules:
- Each slide must feel like a REAL Instagram story (short, punchy, visual)
- STRICTLY apply the requested tone of voice throughout — it must be felt in every slide
- The FIRST slide hook must use the specified hook style
- Apply the content depth level consistently across all slides
- Focus on flow: each slide should naturally lead to the next
- Use curiosity, emotion, or value to keep users tapping
- Balance text + visuals (don't overload text)

Return this EXACT JSON structure (no other output):
{
  "flowStrategy": {
    "sequenceType": "educational / storytelling / sales / engagement",
    "whyItWorks": "2-3 sentence explanation of why this works for the selected goal"
  },
  "slides": [
    {
      "slideNumber": 1,
      "slideType": "Hook",
      "headline": "Short punchy headline (5-8 words max)",
      "subtext": "One supporting line (or empty string)",
      "textContent": "Full text for this slide (1-2 lines)",
      "visualDirection": "How to design/style this slide visually",
      "designNotes": {
        "fontStyle": "Bold / Light / Script",
        "textSizeEmphasis": "Headline dominant, subtext small",
        "colorUsage": "Dark bg with gold headline text"
      },
      "interaction": {
        "type": "Poll",
        "content": "The poll question or prompt text"
      }
    }
  ],
  "ctaSlide": {
    "variations": ["CTA variation 1", "CTA variation 2", "CTA variation 3"],
    "instruction": "Exact action instruction for viewers"
  },
  "designSystem": {
    "headingFont": "Font name and weight",
    "bodyFont": "Font name and weight",
    "primaryColor": "#hex",
    "accentColor": "#hex",
    "layoutStyle": "How to lay out slides — centered / asymmetric / split"
  },
  "imageUsagePlan": {
    "slidesWithImages": [1, 3, 5],
    "textHeavySlides": [2, 4],
    "balanceNotes": "How to balance uploaded images with text overlays"
  },
  "variations": [
    {
      "hook": "Alternative hook text for variation 1",
      "tone": "casual / bold / inspirational",
      "description": "How this variation differs and why it works"
    },
    {
      "hook": "Alternative hook for variation 2",
      "tone": "emotional / direct / humorous",
      "description": "How this angle differs and who it resonates with"
    }
  ]
}

CRITICAL: Make EXACTLY ${slidesCount} slides. Use a natural mix of slide types: Hook → Problem/Value → Value → Proof/Engagement → CTA. The last slide must be of type "CTA". For interaction, use one of: "Poll", "Question", "Slider", "Tap" — or null if not applicable. Make it feel native to Instagram.`;

      const raw = await callGroqJson(systemPrompt, userPrompt, 4500);
      let result: any;
      try { result = JSON.parse(raw); } catch {
        const m = raw.match(/\{[\s\S]*\}/); if (!m) throw new Error("Failed to parse story response");
        result = JSON.parse(m[0]);
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Write better with AI ─────────────────────────────────────────────────────
  app.post("/api/ai/enhance-text", requireAuth, async (req: Request, res: Response) => {
    try {
      const { text, context } = req.body;
      if (!text?.trim()) return res.status(400).json({ error: "text required" });
      const _uEnh = req.user as any;
      if (_uEnh?.role !== "admin") {
        const enhCredit = await storage.deductCredits(_uEnh.id, 1, "enhance_text", "Write With AI text enhancement", _uEnh.plan || "free");
        if (!enhCredit.success) return res.status(402).json({ error: enhCredit.message, insufficientCredits: true });
      }
      const systemPrompt = `You are an elite copywriter. Rewrite the user's text to be clearer, more compelling, more specific and more persuasive — while keeping their core meaning and voice. ${context ? `Context: ${context}` : ""} Return ONLY the improved text. No explanations, no quotation marks wrapping the whole response.`;
      const enhanced = await callGroq(systemPrompt, text, 600);
      return res.json({ enhanced: enhanced.trim() });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── SOP / Content System Builder ─────────────────────────────────────────────
  app.post("/api/ai/sop/generate", requireAuth, async (req: Request, res: Response) => {
    try {
      const { businessType, niche, platform, contentType, experienceLevel, teamSetup, goal, postingFrequency, biggestStruggle } = req.body;
      const _uSop = req.user as any;
      if (_uSop?.role !== "admin") {
        const sopCredit = await storage.deductCredits(_uSop.id, 3, "sop", "Content System SOP generation", _uSop.plan || "free");
        if (!sopCredit.success) return res.status(402).json({ message: sopCredit.message, insufficientCredits: true, balance: sopCredit.balance });
      }
      const systemPrompt = `You are an elite operations architect and systems designer who builds premium, agency-level SOPs for creators, personal brands, and online businesses. Your SOPs are extremely structured, step-by-step actionable, and immediately implementable. Return ONLY valid JSON — no markdown, no code fences, no extra text.`;
      const userPrompt = `Build a complete, hyper-detailed Content System SOP for this creator/business.

USER CONTEXT:
- Business Type: ${businessType}
- Niche: ${niche}
- Primary Platform: ${platform}
- Content Type: ${contentType}
- Experience Level: ${experienceLevel}
- Team Setup: ${teamSetup}
- Primary Goal: ${goal}
- Posting Frequency: ${postingFrequency}
- Biggest Struggle: ${biggestStruggle}

CUSTOMIZATION RULES:
- If Beginner → simplify steps, add more clarity and decision rules
- If Advanced → include optimization and scaling systems
- If Solo → focus on efficiency, batching, and automation
- If team → include delegation workflows, roles and handoffs
- Tailor EVERYTHING specifically to their niche and platform

Return EXACTLY this JSON structure:
{
  "sopName": "Custom name for this SOP — make it powerful and specific to their niche/goal",
  "tagline": "One-sentence description of what this SOP achieves — outcome-driven",
  "overview": {
    "objective": "Clear, specific objective of this SOP",
    "outcome": "Measurable result they will achieve — be specific with numbers/timeframes where possible",
    "whoExecutes": "Who is responsible for executing this — their role description",
    "toolsRequired": ["Tool 1 with specific use case", "Tool 2", "Tool 3", "Tool 4", "Tool 5", "Tool 6"],
    "timeInvestment": "Total estimated time per week to execute this system",
    "difficultyLevel": "${experienceLevel}-calibrated",
    "proTip": "One powerful pro tip specific to their situation"
  },
  "workflowStages": [
    { "name": "Stage 1 Name", "description": "What happens in this stage and why it matters", "duration": "X min/hrs", "who": "Who executes this", "output": "What gets produced" },
    { "name": "Stage 2", "description": "...", "duration": "...", "who": "...", "output": "..." },
    { "name": "Stage 3", "description": "...", "duration": "...", "who": "...", "output": "..." },
    { "name": "Stage 4", "description": "...", "duration": "...", "who": "...", "output": "..." },
    { "name": "Stage 5", "description": "...", "duration": "...", "who": "...", "output": "..." },
    { "name": "Stage 6", "description": "...", "duration": "...", "who": "...", "output": "..." }
  ],
  "executionSteps": [
    {
      "stage": "Stage 1 Name",
      "steps": [
        { "number": 1, "action": "Specific action to take", "microActions": ["Micro-action 1", "Micro-action 2", "Micro-action 3"], "timeEstimate": "X minutes", "tools": ["Tool name"], "decisionRule": "If X → do Y, else do Z", "qualityStandard": "What good looks like here" },
        { "number": 2, "action": "...", "microActions": ["..."], "timeEstimate": "...", "tools": ["..."], "decisionRule": "...", "qualityStandard": "..." },
        { "number": 3, "action": "...", "microActions": ["..."], "timeEstimate": "...", "tools": ["..."], "decisionRule": "...", "qualityStandard": "..." }
      ]
    },
    { "stage": "Stage 2", "steps": [{"number": 1, "action": "...", "microActions": ["..."], "timeEstimate": "...", "tools": ["..."], "decisionRule": "...", "qualityStandard": "..."}] },
    { "stage": "Stage 3", "steps": [{"number": 1, "action": "...", "microActions": ["..."], "timeEstimate": "...", "tools": ["..."], "decisionRule": "...", "qualityStandard": "..."}] },
    { "stage": "Stage 4", "steps": [{"number": 1, "action": "...", "microActions": ["..."], "timeEstimate": "...", "tools": ["..."], "decisionRule": "...", "qualityStandard": "..."}] },
    { "stage": "Stage 5", "steps": [{"number": 1, "action": "...", "microActions": ["..."], "timeEstimate": "...", "tools": ["..."], "decisionRule": "...", "qualityStandard": "..."}] },
    { "stage": "Stage 6", "steps": [{"number": 1, "action": "...", "microActions": ["..."], "timeEstimate": "...", "tools": ["..."], "decisionRule": "...", "qualityStandard": "..."}] }
  ],
  "qualityControl": {
    "prePublishChecklist": ["Checklist item 1", "Item 2", "Item 3", "Item 4", "Item 5", "Item 6", "Item 7", "Item 8"],
    "whatGoodLooksLike": "Specific description of what a high-quality ${contentType} looks like for their niche",
    "commonMistakes": ["Mistake 1 with why it kills results", "Mistake 2", "Mistake 3", "Mistake 4", "Mistake 5"],
    "avoidThis": "The single biggest mistake people in this niche make that tanks their ${goal}",
    "qualityBenchmarks": { "engagement": "Target engagement rate", "reach": "Expected reach per post", "consistency": "Minimum posting consistency", "retention": "Hook retention benchmark if applicable" }
  },
  "automation": {
    "whatToAutomate": ["Task 1 — Tool to use", "Task 2 — Tool", "Task 3 — Tool", "Task 4", "Task 5"],
    "whatToBatch": ["Batch task 1 — when and how often", "Batch task 2", "Batch task 3", "Batch task 4"],
    "aiUsagePoints": ["Where to use AI: specific step — tool recommendation", "AI point 2", "AI point 3", "AI point 4", "AI point 5"],
    "timeReductionTips": ["Tip to cut time on X by Y%", "Tip 2", "Tip 3"],
    "speedHack": "The single most powerful speed hack for their specific setup (${teamSetup}, ${experienceLevel})"
  },
  "optimizationLoop": {
    "metricsToTrack": [
      { "metric": "Metric name", "why": "Why this matters", "target": "Target benchmark", "frequency": "How often to check" },
      { "metric": "...", "why": "...", "target": "...", "frequency": "..." },
      { "metric": "...", "why": "...", "target": "...", "frequency": "..." },
      { "metric": "...", "why": "...", "target": "...", "frequency": "..." },
      { "metric": "...", "why": "...", "target": "...", "frequency": "..." }
    ],
    "weeklyReviewSystem": "Exact weekly review process — step by step",
    "improvementLoop": "How to take data → insight → action → test → repeat",
    "monthlyResetProtocol": "What to do every month to reset, refine and level up the system"
  },
  "repurposingSystem": {
    "coreToFive": "How to turn one ${contentType} into 5 pieces of content — be specific",
    "platformAdaptations": [
      { "platform": "Platform name", "format": "Content format", "adaptation": "How to adapt it specifically", "uniqueAngle": "What angle works best here" },
      { "platform": "...", "format": "...", "adaptation": "...", "uniqueAngle": "..." },
      { "platform": "...", "format": "...", "adaptation": "...", "uniqueAngle": "..." },
      { "platform": "...", "format": "...", "adaptation": "...", "uniqueAngle": "..." }
    ],
    "repurposingSchedule": "How to spread the content across the week/month"
  },
  "scalingSystem": {
    "roles": [
      { "role": "Role title", "responsibilities": ["Responsibility 1", "Responsibility 2", "Responsibility 3"], "hireWhen": "When to hire this role" },
      { "role": "...", "responsibilities": ["..."], "hireWhen": "..." }
    ],
    "handoffProcess": "How to hand off tasks without losing quality or consistency",
    "communicationStructure": "How the team communicates — tools, cadence, structure",
    "consistencySystem": "How to maintain brand voice and quality as team grows",
    "applicableNote": "${teamSetup === "Solo" ? "This section is for when you scale. Review it when you hire your first VA." : "Implement these systems now to build a scalable operation."}"
  },
  "executionSummary": {
    "simplifiedSystem": "The entire SOP distilled into 5 simple steps anyone can follow",
    "keyRules": ["Rule 1 — non-negotiable for success", "Rule 2", "Rule 3", "Rule 4", "Rule 5", "Rule 6"],
    "consistencyTips": ["Tip 1 specific to beating their struggle (${biggestStruggle})", "Tip 2", "Tip 3", "Tip 4", "Tip 5"],
    "firstWeekPlan": "Exactly what to do in the first 7 days to get this system running",
    "motivationalClose": "A powerful closing statement that makes them feel equipped and confident"
  }
}

CRITICAL: Make every step hyper-specific to their niche (${niche}), platform (${platform}), and goal (${goal}). Avoid generic advice entirely. Every tool recommendation, time estimate, and decision rule must feel tailored and immediately actionable.`;

      const raw = await callGroqJson(systemPrompt, userPrompt, 6000);
      let result: any;
      try { result = JSON.parse(raw); } catch {
        const m = raw.match(/\{[\s\S]*\}/); if (!m) throw new Error("Failed to parse SOP response");
        result = JSON.parse(m[0]);
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── ICP Builder ──────────────────────────────────────────────────────────────
  app.post("/api/ai/icp/generate", requireAuth, async (req: Request, res: Response) => {
    try {
      const { businessName, whatYouSell, targetAudience, coreTransformation, priceRange } = req.body;
      const _uIcp = req.user as any;
      if (_uIcp?.role !== "admin") {
        const icpCredit = await storage.deductCredits(_uIcp.id, 4, "icp", "Ideal Customer Profile generation", _uIcp.plan || "free");
        if (!icpCredit.success) return res.status(402).json({ message: icpCredit.message, insufficientCredits: true, balance: icpCredit.balance });
      }
      const systemPrompt = `You are a world-class customer research strategist, behavioral psychologist, and direct response marketer. Build deeply researched Ideal Customer Profiles with extreme precision and real-world applicability. Return ONLY valid JSON — no markdown, no code fences, no extra text.`;
      const userPrompt = `Build a complete, deeply researched Ideal Customer Profile (ICP) for this business.

BUSINESS CONTEXT:
- Business Name: ${businessName || "Not specified"}
- What They Sell: ${whatYouSell}
- Who They Think Their Audience Is: ${targetAudience}
- Core Transformation / Outcome: ${coreTransformation || "Not specified"}
- Price Range: ${priceRange}

Go extremely deep. Be hyper-specific. Use real-world, human language. Avoid generic advice. Think like a world-class strategist who deeply understands human behaviour, emotional drivers, and buying psychology. Every section should feel like you truly know this person.

Return EXACTLY this JSON structure:
{
  "businessSummary": {
    "sharperDescription": "A sharper, more compelling version of what they sell — 2-3 sentences, outcome-driven and specific",
    "refinedTargetAudience": "The most specific and valuable target audience segment — avoid being broad, name the exact type of person",
    "coreTransformation": "The core transformation in a powerful, vivid, outcome-driven way — before state vs after state",
    "positioningStatement": "A strong, differentiated positioning statement — 1-2 sentences that makes this business impossible to ignore",
    "unfairAdvantage": "What unique advantage does this business have that competitors cannot easily copy",
    "marketSophistication": "How aware and sophisticated is this market? What level of proof/credibility do they need?"
  },
  "demographics": {
    "ageRange": "Specific age range with peak demographic",
    "gender": "Gender breakdown with percentages if relevant",
    "location": "Primary locations/markets — countries, regions, urban vs rural",
    "incomeLevel": "Specific income level range with spending capacity notes",
    "profession": "Specific profession, industry and seniority level",
    "educationLevel": "Education level and how it affects their decision-making",
    "deviceUsage": "Primary devices and platforms they use daily",
    "purchasingBehaviour": "How they typically research, evaluate and buy — online vs offline, impulse vs deliberate"
  },
  "psychographics": {
    "beliefs": "Their core beliefs about money, success, growth and opportunity — be specific and emotionally real",
    "coreValues": "What they deeply value in life, business and relationships — their non-negotiables",
    "aspirations": "Who they want to become in the next 1-3 years — make it vivid, emotional and personal",
    "deepFears": "What they are secretly afraid of becoming or failing at — their darkest concern",
    "worldview": "How they see the world, their industry, and their role in it — their operating lens",
    "selfPerception": "How they see themselves right now — their internal narrative and identity"
  },
  "currentSituation": {
    "dailyLife": "What their day actually looks like — specific, realistic and relatable",
    "alreadyTried": ["Specific thing they tried", "Another failed attempt", "Third approach that disappointed them", "A tool or program that overpromised"],
    "whyFailed": "Why those attempts failed — specific root cause, not surface-level",
    "repeatedFrustrations": "What frustrates them every single week — make it visceral and specific",
    "currentWorkarounds": "What are they doing right now to cope — their imperfect solution",
    "informationSources": "Where do they currently learn and research — YouTube, podcasts, Instagram, forums, courses?"
  },
  "painPoints": [
    {
      "title": "Short, punchy pain point title",
      "situation": "Describe the specific situation that triggers this pain in vivid detail — set the scene",
      "emotionalFeel": "Exactly how this feels emotionally — write in first person as if they are feeling it right now",
      "cost": "What this pain costs them in time, money, identity, confidence, relationships or opportunity",
      "severity": 9,
      "urgency": 8,
      "frequency": 7
    },
    {"title": "...", "situation": "...", "emotionalFeel": "...", "cost": "...", "severity": 8, "urgency": 7, "frequency": 9},
    {"title": "...", "situation": "...", "emotionalFeel": "...", "cost": "...", "severity": 7, "urgency": 8, "frequency": 6},
    {"title": "...", "situation": "...", "emotionalFeel": "...", "cost": "...", "severity": 8, "urgency": 6, "frequency": 8},
    {"title": "...", "situation": "...", "emotionalFeel": "...", "cost": "...", "severity": 6, "urgency": 7, "frequency": 7}
  ],
  "desiredOutcomes": {
    "dreamOutcome": "Their dream outcome — specific, vivid and emotionally charged — what does winning look like?",
    "shortTermDesires": "What they want in the next 30-90 days — the quick wins they're after",
    "longTermDesires": "What they want in 1-3 years — the deeper transformation",
    "successDefinition": "What 'success' looks like in their mind — socially, financially, personally, and emotionally",
    "lifeAfterSolution": "What their life looks like after your offer works — paint a vivid picture of the after state"
  },
  "buyingTriggers": {
    "momentOfDecision": "The specific moment or event that pushes them from consideration to buying",
    "emotionalDrivers": ["Primary emotional driver", "Secondary driver", "Third driver"],
    "logicalJustifications": ["How they justify the purchase logically to themselves", "Second justification", "Third"],
    "socialProofType": "What type of social proof converts them — testimonials, case studies, follower counts, expert authority?",
    "priceAnchoring": "How they think about price — what makes it feel worth it or too expensive?"
  },
  "insights": {
    "marketAwarenessScore": 6,
    "painIntensity": 8,
    "buyingReadiness": 5,
    "desireStrength": 7,
    "trustDeficit": 6,
    "priceResistance": 5,
    "insightNotes": "Brief explanation of the above scores and what they mean for marketing strategy"
  }
}

CRITICAL: Return exactly 5 pain points with real severity/urgency/frequency scores (1-10). Be hyper-specific — this should read like a deep dossier on a real person, not a generic persona. Every insight should be actionable.`;

      const raw = await callGroqJson(systemPrompt, userPrompt, 4000);
      let result: any;
      try { result = JSON.parse(raw); } catch {
        const m = raw.match(/\{[\s\S]*\}/); if (!m) throw new Error("Failed to parse ICP response");
        result = JSON.parse(m[0]);
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Audience Psychology Map ──────────────────────────────────────────────────
  app.post("/api/ai/audience-psychology/generate", requireAuth, async (req: Request, res: Response) => {
    try {
      const { businessDescription, targetAudienceDescription, icpSummary } = req.body;
      const _uApm = req.user as any;
      if (_uApm?.role !== "admin") {
        const apmCredit = await storage.deductCredits(_uApm.id, 4, "audience_psychology", "Audience Psychology Map generation", _uApm.plan || "free");
        if (!apmCredit.success) return res.status(402).json({ message: apmCredit.message, insufficientCredits: true, balance: apmCredit.balance });
      }
      const systemPrompt = `You are a world-class behavioral psychologist, direct response marketer, and audience strategist. Map audience psychology with extreme depth — buying behaviour, identity, emotions, beliefs, messaging, and content strategy. Return ONLY valid JSON — no markdown, no code fences, no extra text.`;
      const userPrompt = `Generate a complete Audience Psychology Map for this business.

BUSINESS CONTEXT:
- Business Description: ${businessDescription}
- Target Audience: ${targetAudienceDescription || "Not specified — infer from business description"}
- ICP Summary (if provided): ${icpSummary || "Not provided"}

Go to the deepest level of psychology, emotions, and behaviour. Use real human language. Make every insight feel like you truly understand this person. Be specific, actionable, and emotionally intelligent.

Return EXACTLY this JSON structure:
{
  "buyerClarity": {
    "awarenessStage": "Are they problem-aware, solution-aware, or product-aware? Explain their current state in detail and what that means for marketing",
    "triggerToSearch": "What specific event, moment or breaking point triggers them to actively search for a solution?",
    "whatMakesThemSayYes": "What specifically makes them say yes — be precise about the combination of factors",
    "trustBuilders": "What builds trust for this specific audience — authority, relatability, social proof, simplicity, certifications?",
    "proofNeeded": "What kind of proof converts them — case studies, before/after, testimonials, logical breakdown, credentials?",
    "decisionTimeline": "How long does it typically take them to make a buying decision and what happens during that time?",
    "objections": [
      {"title": "Objection title", "type": "visible", "description": "Detailed explanation of this objection, how they express it, and what fear drives it"},
      {"title": "...", "type": "visible", "description": "..."},
      {"title": "...", "type": "hidden", "description": "Hidden objection they won't say out loud — their deep internal resistance"},
      {"title": "...", "type": "hidden", "description": "..."},
      {"title": "...", "type": "visible", "description": "..."},
      {"title": "...", "type": "hidden", "description": "..."}
    ],
    "internalDialogue": "Write their exact internal dialogue before buying — the thoughts running through their head. Write it as real thoughts, first person, stream of consciousness.",
    "emotionalTriggers": ["fear", "ambition", "status", "relief", "urgency", "identity", "belonging"],
    "externalTriggers": ["deadline", "pain spike", "competitor success", "social proof moment", "opportunity window", "life event"]
  },
  "psychologyMap": {
    "currentSelfImage": "How they see themselves right now — their honest internal narrative and self-assessment",
    "desiredPublicImage": "How they want to be seen by others — their social identity aspiration and personal brand",
    "identityShiftNeeded": "The exact identity shift they need to make — make this powerful and transformational",
    "coreEmotions": ["frustrated", "overwhelmed", "stuck", "hopeful", "uncertain", "embarrassed", "determined"],
    "emotionalHighs": "What makes them feel excited, confident and motivated — when do they feel on top of the world?",
    "emotionalLows": "What brings them down — their darkest moments, their shame and their deepest doubts",
    "whatKeepsThemStuck": "The psychological patterns, habits, thought loops and environment that prevent them from moving forward",
    "limitingBeliefs": ["Specific limiting belief they hold", "Another deeply held belief blocking them", "Third belief keeping them small", "Fourth false belief about the market or themselves", "Fifth belief about their own capability"],
    "empoweringBeliefs": ["Empowering belief after transformation", "Second empowering belief", "Third", "Fourth", "Fifth"],
    "falseAssumptions": ["False assumption about what success requires", "False assumption about the market", "False assumption about themselves", "False assumption about timing", "False assumption about the solution"],
    "exactPhrases": ["Exact phrase they say or think", "Second phrase", "Third", "Fourth", "Fifth", "Sixth"],
    "frustrationExpressions": ["Frustration expression 1", "Expression 2", "Expression 3", "Expression 4", "Expression 5"],
    "emotionalKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8"]
  },
  "messagingInsights": {
    "resonantAngles": ["Angle 1 that deeply resonates", "Angle 2", "Angle 3", "Angle 4", "Angle 5", "Angle 6", "Angle 7"],
    "immediateAttentionAngle": "The single angle that would stop their scroll and grab their full attention immediately",
    "doNotSay": ["Phrase or positioning that turns them off and why", "Second repellent phrase", "Third", "Fourth"],
    "mostCompellingPromise": "The most compelling, specific promise you can make — visceral, real, and undeniable",
    "headlineFormulas": ["Headline formula 1 that would convert for this audience", "Formula 2", "Formula 3"],
    "ctaApproach": "What type of CTA works best for this audience — soft, hard, curiosity-based, value-first?"
  },
  "contentDirection": {
    "contentIdeas": ["Specific content idea 1 tailored to their exact psychology", "Idea 2", "Idea 3", "Idea 4", "Idea 5", "Idea 6", "Idea 7", "Idea 8", "Idea 9", "Idea 10"],
    "offerAngles": ["Offer angle that would convert for this audience", "Angle 2", "Angle 3", "Angle 4", "Angle 5"],
    "scrollStoppingHooks": ["Hook 1", "Hook 2", "Hook 3", "Hook 4", "Hook 5", "Hook 6", "Hook 7", "Hook 8"],
    "positioningSuggestions": ["Positioning suggestion 1", "Suggestion 2", "Suggestion 3", "Suggestion 4"],
    "platformStrategy": "Which platforms are best for this audience and what type of content performs on each?"
  },
  "scores": {
    "buyerReadiness": 5,
    "emotionalIntensity": 8,
    "resistanceLevel": 6,
    "identityGapSize": 7,
    "messagingResonance": 6,
    "purchaseUrgency": 5,
    "trustRequired": 7,
    "scoreNotes": "Brief explanation of these scores and what they mean for the marketing approach"
  }
}

CRITICAL: Be hyper-specific and deeply human. Avoid generic advice entirely. Write as if you have studied this person for years and understand them better than they understand themselves. Every insight must be immediately actionable.`;

      const raw = await callGroqJson(systemPrompt, userPrompt, 4500);
      let result: any;
      try { result = JSON.parse(raw); } catch {
        const m = raw.match(/\{[\s\S]*\}/); if (!m) throw new Error("Failed to parse psychology map response");
        result = JSON.parse(m[0]);
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── AI Content Planner — Generate weekly plan ──────────────────────────────
  app.post("/api/ai/content-planner/generate", requireAuth, async (req: Request, res: Response) => {
    try {
      const { niche, targetAudience, goal, platforms, postingFrequency, contentStyle, brandVoice, contentPillars, biggestChallenge, weeklyFocus } = req.body;
      if (!niche?.trim()) return res.status(400).json({ message: "niche required" });
      const _uCp = req.user as any;
      if (_uCp?.role !== "admin") {
        const cpCredit = await storage.deductCredits(_uCp.id, 5, "content_planner", "AI Content Planner weekly plan", _uCp.plan || "free");
        if (!cpCredit.success) return res.status(402).json({ message: cpCredit.message, insufficientCredits: true, balance: cpCredit.balance });
      }

      const platformList = Array.isArray(platforms) && platforms.length > 0 ? platforms.join(", ") : "Instagram";
      const freqMap: Record<string, number> = { daily: 7, frequent: 6, moderate: 4, light: 2 };
      const numDays = freqMap[postingFrequency] ?? 5;

      const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].slice(0, numDays);

      const systemPrompt = `You are an elite content strategist and growth operator embedded in a high-performance SaaS platform.

Your task is to generate a highly strategic, performance-driven weekly content calendar. This is NOT about filling dates — it is about creating a system that drives growth, engagement, and consistency.

CORE THINKING RULES:
1. DO NOT generate random or generic ideas — every post must have a purpose
2. THINK IN CONTENT TYPES — balance across: Authority (build trust), Engagement (drive interaction), Virality (reach new people), Conversion (drive action), Value (educate)
3. THINK IN SYSTEMS, NOT POSTS — each post connects to a larger weekly strategy
4. OPTIMIZE FOR EXECUTION — ideas must be simple, clear, and easy to create
5. AVOID REPETITION — ensure variety in format, topic, and angle

PLANNING LOGIC:
- Step 1: Define weekly objective and theme based on user's goal
- Step 2: Assign content roles across the week (at minimum: 1 Virality, 2 Authority, 1 Engagement, 1 Conversion)
- Step 3: Map content to platform behavior (short-form = hook heavy, long-form = depth + value)
- Step 4: Generate specific, non-generic content ideas
- Step 5: Craft a scroll-stopping hook for EVERY idea
- Step 6: Assign the right format (Reel, Carousel, Tweet, Story, Video, LinkedIn post)

OUTPUT: Return ONLY valid JSON in this exact structure:
{
  "weekObjective": "One clear sentence describing what this week's content will achieve",
  "weekTheme": "A unifying theme that connects all posts this week",
  "contentMix": {
    "virality": 1,
    "authority": 2,
    "engagement": 1,
    "conversion": 1,
    "value": 1
  },
  "days": [
    {
      "day": "Monday",
      "role": "Virality",
      "contentIdea": "Specific, non-generic content idea in 1-2 sentences",
      "hook": "The exact first line/sentence that stops the scroll — must be compelling",
      "format": "Reel",
      "goal": "Why this post exists and what result it drives",
      "tip": "One execution tip to make this post better"
    }
  ],
  "executionNote": "Strategic note on how to execute this week for maximum results",
  "repurposingOpportunity": "One high-value piece of content that can be repurposed across multiple formats"
}`;

      const userPrompt = `Generate a ${numDays}-day content plan for:

Niche: ${niche}
Target Audience: ${targetAudience || "Not specified"}
Primary Goal: ${goal}
Platforms: ${platformList}
Posting Frequency: ${postingFrequency}
Content Style: ${contentStyle}
Brand Voice: ${brandVoice}
Content Pillars: ${contentPillars || "Not specified"}
Biggest Challenge: ${biggestChallenge || "Not specified"}
Weekly Focus / Campaign: ${weeklyFocus || "General brand building"}

Days to plan: ${dayNames.join(", ")}

Make every content idea SPECIFIC and ACTIONABLE. Do not use generic advice. The hook for each post must be so good it stops someone mid-scroll. Match the format to the platform (${platformList}).`;

      const raw = await callGroqJson(systemPrompt, userPrompt, 3500);
      let result: any;
      try { result = JSON.parse(raw); } catch {
        const m = raw.match(/\{[\s\S]*\}/); if (!m) throw new Error("Failed to parse content plan");
        result = JSON.parse(m[0]);
      }
      if (!Array.isArray(result.days)) throw new Error("Invalid response structure");
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── AI Content Planner — Regenerate single day ─────────────────────────────
  app.post("/api/ai/content-planner/regenerate-day", requireAuth, async (req: Request, res: Response) => {
    try {
      const { dayName, role, niche, goal, platforms, contentStyle, brandVoice, contentPillars } = req.body;
      if (!dayName || !niche) return res.status(400).json({ message: "dayName and niche required" });
      const _uRd = req.user as any;
      if (_uRd?.role !== "admin") {
        const rdCredit = await storage.deductCredits(_uRd.id, 2, "content_planner", "Content Planner day regeneration", _uRd.plan || "free");
        if (!rdCredit.success) return res.status(402).json({ message: rdCredit.message, insufficientCredits: true, balance: rdCredit.balance });
      }

      const platformList = Array.isArray(platforms) ? platforms.join(", ") : "Instagram";
      const systemPrompt = `You are an elite content strategist. Regenerate a SINGLE content day with a fresh, specific idea. Return ONLY valid JSON with this structure:
{
  "day": {
    "day": "${dayName}",
    "role": "${role}",
    "contentIdea": "Fresh, specific content idea",
    "hook": "Scroll-stopping first line",
    "format": "Reel/Carousel/Tweet/etc",
    "goal": "Why this post exists",
    "tip": "One execution tip"
  }
}`;
      const userPrompt = `New ${role} content for ${dayName}. Niche: ${niche}. Goal: ${goal}. Platform: ${platformList}. Style: ${contentStyle}. Voice: ${brandVoice}. Pillars: ${contentPillars || "general"}. Make it different from a typical post — be specific and punchy.`;

      const raw = await callGroqJson(systemPrompt, userPrompt, 700);
      let result: any;
      try { result = JSON.parse(raw); } catch {
        const m = raw.match(/\{[\s\S]*\}/); if (!m) throw new Error("Parse error");
        result = JSON.parse(m[0]);
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── AI Content Planner — Make it viral ────────────────────────────────────
  app.post("/api/ai/content-planner/make-viral", requireAuth, async (req: Request, res: Response) => {
    try {
      const { dayName, currentIdea, niche, platforms, targetAudience } = req.body;
      if (!dayName || !currentIdea) return res.status(400).json({ message: "dayName and currentIdea required" });
      const _uMv = req.user as any;
      if (_uMv?.role !== "admin") {
        const mvCredit = await storage.deductCredits(_uMv.id, 2, "content_planner", "Content Planner make-viral", _uMv.plan || "free");
        if (!mvCredit.success) return res.status(402).json({ message: mvCredit.message, insufficientCredits: true, balance: mvCredit.balance });
      }

      const platformList = Array.isArray(platforms) ? platforms.join(", ") : "Instagram";
      const systemPrompt = `You are an elite viral content strategist. Your ONLY job is to rewrite a content idea to maximize reach, shares, and new audience growth. Make it controversial-enough-to-share, emotionally charged, and platform-optimized. Return ONLY valid JSON:
{
  "day": {
    "day": "${dayName}",
    "role": "Virality",
    "contentIdea": "Viral-optimized version of the idea — more provocative, shareable, emotionally charged",
    "hook": "The most scroll-stopping, pattern-disrupting first line possible",
    "format": "Best format for virality on this platform",
    "goal": "Maximize reach and new follower acquisition",
    "tip": "One specific virality tip for executing this post"
  }
}`;
      const userPrompt = `Make this viral for ${platformList} in the ${niche} niche. Original idea: "${currentIdea}". Target: ${targetAudience || "general audience"}. Rewrite it to be more provocative, emotionally engaging, and shareable — without being dishonest.`;

      const raw = await callGroqJson(systemPrompt, userPrompt, 600);
      let result: any;
      try { result = JSON.parse(raw); } catch {
        const m = raw.match(/\{[\s\S]*\}/); if (!m) throw new Error("Parse error");
        result = JSON.parse(m[0]);
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Razorpay Payments ────────────────────────────────────────────────────────
  const CREDIT_PACKAGES_MAP: Record<string, { credits: number; amountPaise: number; label: string }> = {
    starter: { credits: 25,  amountPaise: 74900,  label: "Starter Pack – 25 Credits" },
    growth:  { credits: 75,  amountPaise: 199900, label: "Growth Pack – 75 Credits" },
    power:   { credits: 200, amountPaise: 499900, label: "Power Pack – 200 Credits" },
  };

  app.post("/api/payment/create-order", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { packageId } = req.body;
      const pkg = CREDIT_PACKAGES_MAP[packageId];
      if (!pkg) return res.status(400).json({ message: "Invalid package" });

      const Razorpay = (await import("razorpay")).default;
      const rzp = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
      });

      const order = await rzp.orders.create({
        amount: pkg.amountPaise,
        currency: "INR",
        receipt: `credits_${userId}_${Date.now()}`,
        notes: { userId, packageId, credits: String(pkg.credits) },
      });

      return res.json({
        orderId: order.id,
        amount: pkg.amountPaise,
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID,
        packageLabel: pkg.label,
        credits: pkg.credits,
      });
    } catch (err: any) {
      console.log("[razorpay create-order] error:", JSON.stringify(err));
      return res.status(500).json({ message: (err as any)?.error?.description || err?.message || "Failed to create order" });
    }
  });

  app.post("/api/payment/verify", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageId } = req.body;
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !packageId) {
        return res.status(400).json({ message: "Missing payment fields" });
      }

      const crypto = await import("crypto");
      const expectedSig = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (expectedSig !== razorpay_signature) {
        return res.status(400).json({ message: "Payment verification failed — invalid signature" });
      }

      const pkg = CREDIT_PACKAGES_MAP[packageId];
      if (!pkg) return res.status(400).json({ message: "Invalid package" });

      const balance = await storage.addBonusCredits(userId, pkg.credits, `Razorpay purchase: ${pkg.label} (${razorpay_payment_id})`);
      return res.json({ success: true, credits: pkg.credits, balance });
    } catch (err: any) {
      console.log("[razorpay verify] error:", err?.message);
      return res.status(500).json({ message: err?.message || "Payment verification failed" });
    }
  });

  // ── Jarvis AI Assistant ───────────────────────────────────────────────────
  function buildJarvisSystem(assistantName: string, userName: string, plan: string) {
    const firstName = userName.split(" ")[0] || userName;
    return `You are ${assistantName} — an AI AGENT embedded inside Oravini, an elite content creation & brand growth platform by Brandverse.

CRITICAL IDENTITY RULES:
- Your name is "${assistantName}". You are NOT a chatbot. You are a voice-activated AI agent.
- You EXECUTE commands. You DON'T just talk about them.
- Keep responses SHORT (1-3 lines max). You're an agent, not an advisor.
- Speak warmly, casually — like a brilliant friend. Use ${firstName}'s name naturally.
- ALWAYS include an action tag when the user wants to do ANYTHING on the platform.
- When someone greets you ("hey ${assistantName}", "what's up"), respond warmly + ask what they need.

USER: ${firstName} | Plan: ${plan}

PLATFORM TOOLS YOU CONTROL:
1. /ai-ideas — AI Content Ideas (generate viral hooks, captions, reels concepts)
   Accepts: platform, niche, goal, audience, contentType, additionalContext
   Use autoRun=true to automatically generate (when user says "generate", "give me", "make", "create")
   
2. /ai-coach — Content Coach (script analysis, virality feedback, line-by-line coaching)
   Accepts: script (pre-fill the textarea with user's content)

3. /ai-design — Design Studio (AI carousels, captions, stories, SOPs, lead magnets)

4. /tracking/competitor — Competitor Analysis (analyze any Instagram profile)

5. /tracking — Performance Tracking (Instagram + YouTube metrics)

6. /credits — Credits (buy ₹749/₹1,999/₹4,999 top-ups)

7. /settings/plan — Plans (Free/Starter ₹2,499/Growth ₹4,999/Pro ₹6,499/Elite)

8. /dashboard — Dashboard (tasks, notifications, progress)

9. /chat — Chat (message Oravini team)

COMMAND EXECUTION RULES — CRITICAL:
For EVERY command that involves a tool or page, append ONE action tag at the END of your reply:

[GO /path "Short Label"]

WHEN TO AUTO-RUN (add autoRun=true to URL):
- User says: "generate", "give me", "create", "make", "write", "show me ideas", "5 viral hooks", etc.
- Add params + autoRun=true → platform will automatically execute the tool

EXAMPLES OF CORRECT RESPONSES:

User: "take me to content ideas"
Reply: "On it ${firstName}! Taking you to Content Ideas now."
[GO /ai-ideas "Opening Content Ideas"]

User: "give me 5 viral hooks for fitness on instagram"
Reply: "Generating your fitness hooks for Instagram now 🔥"
[GO /ai-ideas?platform=instagram&niche=fitness&goal=viral+growth&autoRun=true "Generating Hooks"]

User: "analyze my competitor @nike on instagram"
Reply: "Let's see what Nike is doing — opening Competitor Study."
[GO /tracking/competitor "Opening Competitor Study"]

User: "check my content coach"
Reply: "Opening your Content Coach!"
[GO /ai-coach "Opening Content Coach"]

User: "I have a script, can you review it?"
Reply: "Let's get it reviewed! Paste your script in the Content Coach — I'm opening it now."
[GO /ai-coach "Open Content Coach"]

User: "hey ${assistantName}, how are you?"
Reply: "Hey ${firstName}! I'm great and ready to work 🚀 What are we building today?"
[no action tag for pure conversation]

User: "what can you do?"
Reply: "I can take you anywhere on Oravini, generate content ideas, analyze competitors, review scripts, and more. Just tell me what you need and I'll do it. What's first?"
[no action tag]

ALWAYS: If user mentions content creation → steer to /ai-ideas or /ai-coach
ALWAYS: For any "go to", "open", "take me to" → immediately navigate with [GO]
ALWAYS: For any "generate", "create", "give me", "make" → use autoRun=true on the right tool

Support: support.oravini@gmail.com | @oravini_ai | https://calendly.com/brandversee/30min`;
  }

  app.post("/api/jarvis/chat", requireAuth, async (req: Request, res: Response) => {
    try {
      const { message, history = [], assistantName = "Jarvis" } = req.body;
      const u = req.user as any;
      if (!message?.trim()) return res.status(400).json({ message: "Message is required" });

      const FREE_PLANS = ["growth", "pro", "elite"];
      const creditCost = FREE_PLANS.includes(u.plan) ? 0 : 2;

      if (u.role !== "admin" && creditCost > 0) {
        const creditResult = await storage.deductCredits(u.id, creditCost, "jarvis", `${assistantName} AI assistant message`, u.plan || "free");
        if (!creditResult.success) {
          return res.status(402).json({ message: creditResult.message, insufficientCredits: true, balance: creditResult.balance });
        }
      }

      const systemPrompt = buildJarvisSystem(
        String(assistantName).trim() || "Jarvis",
        u.name || u.email || "friend",
        u.plan || "free"
      );

      const msgs: any[] = [
        { role: "system", content: systemPrompt },
        ...history.slice(-12).map((h: any) => ({ role: h.role, content: String(h.content) })),
        { role: "user", content: message },
      ];

      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: msgs,
          temperature: 0.82,
          max_tokens: 1200,
        }),
      });
      const data: any = await r.json();
      if (data?.error) throw new Error(data.error.message);
      const rawReply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response. Try again!";

      // Parse action tag [GO /path "Label"]
      const actionMatch = rawReply.match(/\[GO\s+(\S+)\s+"([^"]+)"\]/);
      const reply = rawReply.replace(actionMatch?.[0] || "", "").trim();
      const action = actionMatch ? { url: actionMatch[1], label: actionMatch[2] } : null;

      return res.json({ reply, action, creditCost });
    } catch (err: any) {
      console.error("[Jarvis Chat] Error:", err.message);
      return res.status(500).json({ message: err.message || "Jarvis failed to respond" });
    }
  });

  // ── Razorpay Plan Purchases ────────────────────────────────────────────────
  const PLAN_PACKAGES_MAP: Record<string, { amountPaise: number; label: string }> = {
    starter: { amountPaise: 249900, label: "Tier 2 – Starter Plan" },
    growth:  { amountPaise: 499900, label: "Tier 3 – Growth Plan" },
    pro:     { amountPaise: 649900, label: "Tier 4 – Pro Plan" },
  };

  app.post("/api/payment/create-plan-order", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { planSlug } = req.body;
      const plan = PLAN_PACKAGES_MAP[planSlug];
      if (!plan) return res.status(400).json({ message: "Invalid plan" });

      const Razorpay = (await import("razorpay")).default;
      const rzp = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
      });

      const order = await rzp.orders.create({
        amount: plan.amountPaise,
        currency: "INR",
        receipt: `plan_${userId}_${Date.now()}`,
        notes: { userId, planSlug },
      });

      return res.json({
        orderId: order.id,
        amount: plan.amountPaise,
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID,
        planLabel: plan.label,
        planSlug,
      });
    } catch (err: any) {
      console.log("[razorpay create-plan-order] error:", JSON.stringify(err));
      return res.status(500).json({ message: (err as any)?.error?.description || err?.message || "Failed to create plan order" });
    }
  });

  app.post("/api/payment/verify-plan", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planSlug } = req.body;
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planSlug) {
        return res.status(400).json({ message: "Missing payment fields" });
      }

      const crypto = await import("crypto");
      const expectedSig = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (expectedSig !== razorpay_signature) {
        return res.status(400).json({ message: "Payment verification failed — invalid signature" });
      }

      if (!PLAN_PACKAGES_MAP[planSlug]) return res.status(400).json({ message: "Invalid plan" });

      const updated = await storage.updateUser(userId, { plan: planSlug });
      return res.json({ success: true, plan: planSlug, user: updated });
    } catch (err: any) {
      console.log("[razorpay verify-plan] error:", err?.message);
      return res.status(500).json({ message: err?.message || "Plan verification failed" });
    }
  });

  return httpServer;
}
