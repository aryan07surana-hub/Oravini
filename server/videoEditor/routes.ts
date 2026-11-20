/**
 * AI Video Editor ("Video Studio") routes.
 *
 * Flow: upload (or import from Clip Finder) → background Whisper transcription
 * → AI chat produces concrete EDL operations → client-side EDL preview →
 * background ffmpeg render → download / share.
 *
 * Every heavy step is a job in `video_editor_jobs`; routes only enqueue and
 * return `{ job }`. Poll GET /api/video-editor/jobs/:id.
 */
import type { Express, Request, Response, RequestHandler } from "express";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { storage, pool } from "../storage";
import { saveMedia, isCloudinaryConfigured, UPLOADS_DIR } from "../mediaStorage";
import { FFMPEG_PATH, ffmpegAvailable } from "../ffmpegPath";
import {
  applyOperations, defaultEdl, describeEdl, keepSegments, normalizeEdl, outputDuration, ruleBasedOps,
  type EDL, type Word,
} from "./edl";
import { probe } from "./ffmpeg";
import { transcribeMedia, type Transcript } from "./transcribe";
import { renderWithFfmpeg, renderWithShotstackStage, shotstackConfigured, type Quality } from "./render";
import {
  enqueueJob, getJob, latestJobForEdit, publicJob, queuePosition, registerJobHandler, startVideoJobRunner, type JobRow,
} from "./jobs";

type AiJson = (system: string, user: string, maxTokens?: number) => Promise<string>;

const CLOUDINARY_SOURCE_LIMIT = 95 * 1024 * 1024; // Cloudinary free plan rejects >100MB videos

class UserError extends Error {
  constructor(public userMessage: string) { super(userMessage); }
}

function uid(req: Request): string { return (req.user as any).id; }

function wordsOf(edit: any): Word[] {
  return Array.isArray(edit?.transcript?.words) ? edit.transcript.words : [];
}

function durationOf(edit: any): number {
  return Number(edit?.duration) || Number(edit?.transcript?.duration) || wordsOf(edit).at(-1)?.end || 0;
}

function edlOf(edit: any): EDL {
  return normalizeEdl(edit?.edl || null, durationOf(edit));
}

function localPathFor(edit: any): string | null {
  if (edit?.filePath && fs.existsSync(edit.filePath)) return edit.filePath;
  if (edit?.fileUrl?.startsWith("/uploads/")) {
    const p = path.join(UPLOADS_DIR, path.basename(edit.fileUrl));
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Local file if it survived, else the durable Cloudinary copy, else a clear error. */
function resolveSource(edit: any): string {
  const local = localPathFor(edit);
  if (local) return local;
  if (edit?.sourceRemoteUrl) return edit.sourceRemoteUrl;
  if (edit?.fileUrl && /^https?:\/\//.test(edit.fileUrl)) return edit.fileUrl;
  throw new UserError(
    isCloudinaryConfigured()
      ? "The source video is no longer on the server and has no cloud copy. Please re-upload it."
      : "The source video was removed when the server restarted (Render's free tier has no persistent disk). Re-upload it, or configure Cloudinary so uploads survive restarts.",
  );
}

function publicSourceUrl(edit: any): string | null {
  if (edit?.sourceRemoteUrl) return edit.sourceRemoteUrl;
  if (edit?.fileUrl && /^https?:\/\//.test(edit.fileUrl)) return edit.fileUrl;
  const base = (process.env.APP_URL || "").replace(/\/$/, "");
  if (base && edit?.fileUrl?.startsWith("/uploads/")) return `${base}${edit.fileUrl}`;
  return null;
}

export function capabilities() {
  const ffmpeg = ffmpegAvailable();
  return {
    ffmpeg,
    transcription: !!process.env.GROQ_API_KEY,
    cloudinary: isCloudinaryConfigured(),
    shotstack: shotstackConfigured(),
    renderEngine: ffmpeg ? "ffmpeg" : shotstackConfigured() ? "shotstack-stage" : "none",
    watermarked: !ffmpeg && shotstackConfigured(),
    persistentStorage: isCloudinaryConfigured(),
  };
}

function detectSilences(words: Word[], threshold = 0.5) {
  const out: { start: number; end: number; duration: number }[] = [];
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    if (gap >= threshold) out.push({ start: words[i - 1].end, end: words[i].start, duration: +gap.toFixed(3) });
  }
  return out;
}

async function presentEdit(edit: any, userId: string) {
  const job = await latestJobForEdit(edit.id, userId);
  const edl = edlOf(edit);
  return {
    ...edit,
    edl,
    edlSummary: describeEdl(edl),
    keepSegments: keepSegments(edl),
    outputDuration: outputDuration(edl),
    job: job ? publicJob(job, await queuePosition(job)) : null,
  };
}

/** Clip Finder: turn an already-transcribed upload into an editor project (no re-transcription). */
export async function createProjectFromTranscript(input: {
  userId: string; filePath: string; originalName: string; title: string; transcript: { text: string; words: Word[]; duration?: number };
}) {
  const fileUrl = `/uploads/${path.basename(input.filePath)}`;
  let duration = Number(input.transcript.duration) || input.transcript.words.at(-1)?.end || 0;
  try { duration = (await probe(input.filePath)).duration || duration; } catch { /* keep transcript duration */ }
  const edit = await storage.createVideoEdit({
    userId: input.userId, title: input.title, originalFilename: input.originalName, filePath: input.filePath, fileUrl,
    status: "transcribed", duration,
    transcript: { text: input.transcript.text, words: input.transcript.words, duration, method: "clip-finder" },
    silences: detectSilences(input.transcript.words),
    edl: defaultEdl(duration), source: "clip_finder",
  } as any);
  return edit;
}

/**
 * Boot-time reconciliation (updates status fields only, never deletes rows):
 *  - Projects left in a busy state with no queued/running job (e.g. renders
 *    started by the old Shotstack flow, or a job that exhausted its retries)
 *    are returned to a usable state with an explanatory error, otherwise the
 *    render route would answer 409 "busy" forever.
 *  - Outputs produced by the old Shotstack *stage* flow are flagged as
 *    watermarked so the UI labels them honestly.
 */
export async function reconcileProjects(): Promise<void> {
  try {
    const stuck = await pool.query(`
      UPDATE video_edits e SET
        status = CASE
          WHEN e.status = 'rendering' AND e.output_url IS NOT NULL THEN 'done'
          WHEN e.status = 'rendering' AND e.transcript IS NOT NULL THEN 'transcribed'
          ELSE 'failed' END,
        error = CASE
          WHEN e.status = 'rendering' THEN 'The previous render was interrupted. Please render again.'
          ELSE 'Processing was interrupted. Retry transcription or re-upload the video.' END
      WHERE e.status IN ('rendering','transcribing','importing')
        AND NOT EXISTS (SELECT 1 FROM video_editor_jobs j WHERE j.edit_id = e.id AND j.status IN ('queued','running'))
      RETURNING e.id`);
    const legacy = await pool.query(`
      UPDATE video_edits SET output_engine = 'shotstack-stage', output_watermarked = TRUE
      WHERE shotstack_render_id IS NOT NULL AND output_url IS NOT NULL AND output_engine IS NULL
      RETURNING id`);
    if (stuck.rowCount || legacy.rowCount) {
      console.log(`[video-studio] reconciled ${stuck.rowCount} stuck project(s), flagged ${legacy.rowCount} legacy Shotstack output(s) as watermarked`);
    }
  } catch (e: any) {
    console.warn("[video-studio] reconcile skipped:", e.message);
  }
}

/** Temp files ffmpeg leaves behind if the process is killed mid-job. Never touches uploads or finished outputs. */
const TEMP_ARTIFACT = /^(studio-\d+-\d+\.part\.mp4|clip-tmp-\d+-\d+\.mp4|concat-\d+\.txt|concat-tmp-\d+\.mp4|xfade-\d+\.mp4|wm-\d+\.mp4|export-\d+\.part\.mp4)$/;

export async function sweepTempArtifacts(minAgeMs = 2 * 60 * 1000): Promise<number> {
  let removed = 0;
  try {
    const now = Date.now();
    for (const name of await fs.promises.readdir(UPLOADS_DIR)) {
      if (!TEMP_ARTIFACT.test(name)) continue;
      const p = path.join(UPLOADS_DIR, name);
      const st = await fs.promises.stat(p).catch(() => null);
      // An mtime older than minAgeMs means no ffmpeg is still writing it.
      if (st && now - st.mtimeMs > minAgeMs) { await fs.promises.unlink(p).catch(() => {}); removed++; }
    }
    if (removed) console.log(`[video-studio] removed ${removed} stale temp file(s) from interrupted jobs`);
  } catch { /* uploads dir may not exist yet */ }
  return removed;
}

export function registerVideoStudioRoutes(app: Express, deps: { requireAuth: RequestHandler; videoUpload: any; aiJson: AiJson }) {
  const { requireAuth, videoUpload, aiJson } = deps;

  // ── Job handlers ────────────────────────────────────────────────────────────
  registerJobHandler("studio_transcribe", async (job, ctx) => {
    const edit: any = await storage.getVideoEdit(job.edit_id!, job.user_id);
    if (!edit) throw new UserError("Project was deleted.");
    await storage.updateVideoEdit(edit.id, job.user_id, { status: "transcribing", error: null } as any);
    try {
      const src = resolveSource(edit);
      let duration = 0;
      try { duration = (await probe(src)).duration; } catch { /* transcriber reports */ }
      const t: Transcript = await transcribeMedia(src, {
        filename: edit.originalFilename,
        onStage: (stage, p) => ctx.progress(p ?? 0, stage),
      });
      duration = duration || t.duration;
      const edl = edit.edl ? normalizeEdl(edit.edl, duration) : defaultEdl(duration);
      await storage.updateVideoEdit(edit.id, job.user_id, {
        transcript: { text: t.text, words: t.words, segments: t.segments, duration, language: t.language, method: t.method, chunks: t.chunks },
        silences: detectSilences(t.words), duration, edl, status: "transcribed", error: null,
      } as any);

      // Make the source durable (Render's disk is wiped on restart). Non-fatal.
      if (isCloudinaryConfigured() && !edit.sourceRemoteUrl) {
        const local = localPathFor(edit);
        if (local && fs.statSync(local).size <= CLOUDINARY_SOURCE_LIMIT) {
          await ctx.progress(0.97, "Saving a cloud copy of the source");
          const url = await saveMedia(local, path.basename(local), { removeLocalAfterUpload: false }).catch(() => null);
          if (url && /^https?:/.test(url)) await storage.updateVideoEdit(edit.id, job.user_id, { sourceRemoteUrl: url } as any);
        }
      }
      return { words: t.words.length, duration, method: t.method, chunks: t.chunks, language: t.language };
    } catch (e: any) {
      await storage.updateVideoEdit(edit.id, job.user_id, { status: "failed", error: e?.userMessage || e?.message || "Transcription failed" } as any);
      throw e;
    }
  });

  registerJobHandler("studio_render", async (job, ctx) => {
    const edit: any = await storage.getVideoEdit(job.edit_id!, job.user_id);
    if (!edit) throw new UserError("Project was deleted.");
    const quality: Quality = job.payload?.quality === "preview" ? "preview" : "final";
    const edl = normalizeEdl(job.payload?.edl || edit.edl, durationOf(edit));
    const words = wordsOf(edit);
    const readyStatus = edit.transcript ? "transcribed" : "failed";
    await storage.updateVideoEdit(edit.id, job.user_id, { status: "rendering", error: null } as any);
    try {
      if (ffmpegAvailable()) {
        const src = resolveSource(edit);
        await ctx.progress(0.02, "Rendering with ffmpeg");
        const outName = `studio-${edit.id}-${Date.now()}.mp4`;
        const outPath = path.join(UPLOADS_DIR, outName);
        // Render to a .part file and rename on success, so a crash never leaves a
        // half-written file under the final name (stale parts are swept at boot).
        const partPath = path.join(UPLOADS_DIR, `${outName.replace(/\.mp4$/, "")}.part.mp4`);
        if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        let r;
        try {
          r = await renderWithFfmpeg({ input: src, edl, words, outputPath: partPath, quality, onProgress: p => ctx.progress(0.02 + p * 0.9, "Rendering with ffmpeg") });
          await fs.promises.rename(partPath, outPath);
        } catch (e) {
          fs.promises.unlink(partPath).catch(() => {});
          throw e;
        }
        await ctx.progress(0.94, isCloudinaryConfigured() ? "Uploading to Cloudinary" : "Saving output");
        const outputUrl = await saveMedia(outPath, outName);
        const meta = { duration: r.duration, width: r.width, height: r.height, sizeBytes: r.sizeBytes, hasAudio: r.hasAudio, captionLines: r.captionLines, quality, storage: /^https?:/.test(outputUrl) ? "cloudinary" : "local", renderedAt: new Date().toISOString() };
        await storage.updateVideoEdit(edit.id, job.user_id, { status: "done", outputUrl, outputEngine: "ffmpeg", outputWatermarked: false, outputMeta: meta, settings: edl, error: null } as any);
        return { outputUrl, engine: "ffmpeg", watermarked: false, ...meta };
      }
      if (shotstackConfigured()) {
        const url = publicSourceUrl(edit);
        if (!url) throw new UserError("Shotstack needs a public URL for the source video. Set APP_URL or configure Cloudinary.");
        const r = await renderWithShotstackStage(url, edl, words, (p, s) => ctx.progress(p, s));
        const meta = { quality: "preview", storage: "shotstack", renderedAt: new Date().toISOString() };
        await storage.updateVideoEdit(edit.id, job.user_id, { status: "done", outputUrl: r.url, outputEngine: "shotstack-stage", outputWatermarked: true, outputMeta: meta, settings: edl, error: null } as any);
        return { outputUrl: r.url, engine: "shotstack-stage", watermarked: true };
      }
      throw new UserError("No render engine available: ffmpeg is missing on the server and Shotstack is not configured.");
    } catch (e: any) {
      await storage.updateVideoEdit(edit.id, job.user_id, { status: edit.outputUrl ? "done" : readyStatus, error: `Render failed: ${e?.userMessage || e?.message}` } as any);
      throw e;
    }
  });

  registerJobHandler("studio_import_youtube", async (job, ctx) => {
    const edit: any = await storage.getVideoEdit(job.edit_id!, job.user_id);
    if (!edit) throw new UserError("Project was deleted.");
    const { videoId, start, end } = job.payload || {};
    const outPath = path.join(UPLOADS_DIR, `yt-${edit.id}-${Date.now()}.mp4`);
    try {
      await ctx.progress(0.05, "Downloading from YouTube");
      await new Promise<void>((resolve, reject) => {
        const args = ["-f", "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b", "--merge-output-format", "mp4", "--no-playlist",
          "--ffmpeg-location", FFMPEG_PATH, "-o", outPath];
        if (Number.isFinite(start) && Number.isFinite(end) && end > start) args.push("--download-sections", `*${start}-${end}`, "--force-keyframes-at-cuts");
        args.push(`https://www.youtube.com/watch?v=${videoId}`);
        const p = spawn("yt-dlp", args);
        let err = "";
        p.stderr.on("data", d => (err = (err + d).slice(-800)));
        p.on("error", e => reject(new UserError(`yt-dlp is not installed on this server (${e.message}). Download the clip and upload it instead.`)));
        p.on("close", code => (code === 0 ? resolve() : reject(new UserError(`YouTube download failed: ${err.trim().split("\n").pop() || `exit ${code}`}`))));
      });
      const info = await probe(outPath);
      await storage.updateVideoEdit(edit.id, job.user_id, { filePath: outPath, fileUrl: `/uploads/${path.basename(outPath)}`, duration: info.duration, status: "transcribing" } as any);
      const t = await enqueueJob({ userId: job.user_id, editId: edit.id, kind: "studio_transcribe" });
      return { imported: true, duration: info.duration, transcribeJobId: t.id };
    } catch (e: any) {
      await storage.updateVideoEdit(edit.id, job.user_id, { status: "failed", error: e?.userMessage || e?.message } as any);
      throw e;
    }
  });

  // ── Routes ──────────────────────────────────────────────────────────────────
  app.get("/api/video-editor/jobs/:jobId", requireAuth, async (req, res) => {
    const job = await getJob(Number(req.params.jobId), uid(req));
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(publicJob(job, await queuePosition(job)));
  });

  app.get("/api/video-studio/capabilities", requireAuth, (_req, res) => res.json(capabilities()));

  app.get("/api/video-studio", requireAuth, async (req, res) => {
    res.json(await storage.getVideoEdits(uid(req)));
  });

  app.get("/api/video-studio/:id", requireAuth, async (req, res) => {
    const edit = await storage.getVideoEdit(Number(req.params.id), uid(req));
    if (!edit) return res.status(404).json({ message: "Not found" });
    res.json(await presentEdit(edit, uid(req)));
  });

  // Back-compat for older clients that polled /status.
  app.get("/api/video-studio/:id/status", requireAuth, async (req, res) => {
    const edit = await storage.getVideoEdit(Number(req.params.id), uid(req));
    if (!edit) return res.status(404).json({ message: "Not found" });
    res.json(await presentEdit(edit, uid(req)));
  });

  app.delete("/api/video-studio/:id", requireAuth, async (req, res) => {
    const edit: any = await storage.getVideoEdit(Number(req.params.id), uid(req));
    if (edit?.filePath) try { fs.unlinkSync(edit.filePath); } catch { /* already gone */ }
    await storage.deleteVideoEdit(Number(req.params.id), uid(req));
    res.json({ ok: true });
  });

  app.post("/api/video-studio/upload", requireAuth, videoUpload.single("video"), async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    try {
      const userId = uid(req);
      const title = (req.body.title || req.file.originalname.replace(/\.[^/.]+$/, "")).slice(0, 200);
      const edit = await storage.createVideoEdit({
        userId, title, originalFilename: req.file.originalname, filePath: req.file.path,
        fileUrl: `/uploads/${req.file.filename}`, status: "transcribing", source: "upload",
      } as any);
      const job = await enqueueJob({ userId, editId: edit.id, kind: "studio_transcribe" });
      res.json({ ...edit, job: publicJob(job) });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Clip Finder (YouTube result) → new project, imported in the background.
  app.post("/api/video-studio/from-youtube", requireAuth, async (req, res) => {
    const { videoId, start, end, title } = req.body || {};
    if (!/^[\w-]{6,20}$/.test(String(videoId || ""))) return res.status(400).json({ message: "Valid videoId required" });
    const s = Number(start), e = Number(end);
    if (Number.isFinite(s) && Number.isFinite(e) && (e <= s || e - s > 600)) return res.status(400).json({ message: "Clip must be between 1 second and 10 minutes" });
    const userId = uid(req);
    const edit = await storage.createVideoEdit({
      userId, title: String(title || `YouTube clip ${videoId}`).slice(0, 200), originalFilename: `${videoId}.mp4`,
      filePath: "", fileUrl: null, status: "importing", source: "youtube",
    } as any);
    const job = await enqueueJob({ userId, editId: edit.id, kind: "studio_import_youtube", payload: { videoId, start: s, end: e } });
    res.json({ ...edit, job: publicJob(job) });
  });

  app.post("/api/video-studio/:id/transcribe", requireAuth, async (req, res) => {
    const userId = uid(req);
    const edit = await storage.getVideoEdit(Number(req.params.id), userId);
    if (!edit) return res.status(404).json({ message: "Not found" });
    await storage.updateVideoEdit(edit.id, userId, { status: "transcribing", error: null } as any);
    const job = await enqueueJob({ userId, editId: edit.id, kind: "studio_transcribe" });
    res.json({ job: publicJob(job) });
  });

  // Continue without a transcript (no captions / transcript-based cuts).
  app.post("/api/video-studio/:id/skip-transcript", requireAuth, async (req, res) => {
    const userId = uid(req);
    const edit: any = await storage.getVideoEdit(Number(req.params.id), userId);
    if (!edit) return res.status(404).json({ message: "Not found" });
    let duration = durationOf(edit);
    if (!duration) { try { duration = (await probe(resolveSource(edit))).duration; } catch { /* unknown */ } }
    const updated = await storage.updateVideoEdit(edit.id, userId, {
      status: "transcribed", duration, transcript: { text: "", words: [], duration, skipped: true }, edl: normalizeEdl(edit.edl || { ...defaultEdl(duration), captions: { ...defaultEdl(duration).captions, enabled: false } }, duration), error: null,
    } as any);
    res.json(await presentEdit(updated, userId));
  });

  // Manual edits from the UI: full EDL replace or a list of operations.
  app.patch("/api/video-studio/:id/edl", requireAuth, async (req, res) => {
    const userId = uid(req);
    const edit: any = await storage.getVideoEdit(Number(req.params.id), userId);
    if (!edit) return res.status(404).json({ message: "Not found" });
    const dur = durationOf(edit);
    let edl: EDL;
    let applied: any[] = [];
    if (Array.isArray(req.body?.operations)) {
      const r = applyOperations(edlOf(edit), req.body.operations, wordsOf(edit), dur);
      edl = r.edl; applied = r.applied.map(a => a.summary);
    } else {
      edl = normalizeEdl(req.body?.edl, dur);
    }
    const updated = await storage.updateVideoEdit(edit.id, userId, { edl, updatedAt: new Date() } as any);
    res.json({ ...(await presentEdit(updated, userId)), applied });
  });

  app.post("/api/video-studio/:id/chat", requireAuth, async (req, res) => {
    const userId = uid(req);
    const message = String(req.body?.message || "").trim().slice(0, 2000);
    if (!message) return res.status(400).json({ message: "message required" });
    const edit: any = await storage.getVideoEdit(Number(req.params.id), userId);
    if (!edit) return res.status(404).json({ message: "Not found" });
    const dur = durationOf(edit);
    const words = wordsOf(edit);
    const before = edlOf(edit);

    let reply = "";
    let ops: any[] = [];
    let engine: "llm" | "rules" = "llm";
    try {
      const lines: string[] = [];
      const segs: any[] = edit.transcript?.segments?.length ? edit.transcript.segments : [];
      if (segs.length) for (const s of segs) lines.push(`[${s.start.toFixed(2)}-${s.end.toFixed(2)}] ${s.text}`);
      else for (let i = 0; i < words.length; i += 12) {
        const c = words.slice(i, i + 12);
        lines.push(`[${c[0].start.toFixed(2)}-${c[c.length - 1].end.toFixed(2)}] ${c.map(w => w.word).join(" ")}`);
      }
      const history = (Array.isArray(edit.chatHistory) ? edit.chatHistory : []).slice(-6).map((m: any) => `${m.role}: ${m.content}${m.applied?.length ? ` [applied: ${m.applied.join("; ")}]` : ""}`).join("\n");
      const system = `You are the edit engine of a video editor. Turn the user's request into CONCRETE edit operations on the edit decision list. Never answer with advice only — if the request is vague ("make it better", "make it viral"), choose sensible concrete edits yourself (e.g. remove silences + fillers, bold captions, a tight trim around the strongest hook).

Return ONLY JSON: {"reply": "<1-2 sentences saying exactly what you changed, with timestamps>", "operations": [ ... ]}

Operations (times are SOURCE seconds from the transcript timestamps, numbers not strings):
{"op":"set_trim","start":s,"end":s}             keep only this window
{"op":"cut","start":s,"end":s,"reason":"..."}    remove a range (rambling, off-topic, mistakes, retakes)
{"op":"uncut","start":s,"end":s}                 restore a previously cut range
{"op":"clear_cuts","source":"silence|filler|ai|manual"}  (omit source = all)
{"op":"keep_only","ranges":[{"start":s,"end":s},...]}    build a highlight from several ranges
{"op":"remove_silences","minGap":0.6}            cut pauses longer than minGap seconds
{"op":"remove_fillers"}                          cut um/uh/etc.
{"op":"set_captions","enabled":true,"style":"bold|karaoke|minimal|boxed","position":"bottom|middle|top","wordsPerLine":1-8,"uppercase":bool}
{"op":"set_color_grade","grade":"none|cinematic|warm|cool|bright|vivid|bw"}
{"op":"set_speed","value":0.5-2}
{"op":"set_aspect","value":"original|9:16|1:1|16:9"}

Snap cut/trim boundaries to word boundaries from the transcript. Video duration: ${dur.toFixed(2)}s.`;
      const user = `CURRENT EDIT: ${describeEdl(before)}
EXISTING CUTS: ${JSON.stringify(before.cuts.slice(0, 40).map(c => [c.start, c.end, c.source]))}
TRANSCRIPT:
${lines.join("\n").slice(0, 12000) || "(no transcript — only non-transcript operations are possible)"}
${history ? `\nRECENT CHAT:\n${history}` : ""}

USER REQUEST: ${message}`;
      const raw = await aiJson(system, user, 1500);
      const parsed = JSON.parse(raw);
      reply = String(parsed.reply || parsed.response || "").slice(0, 600);
      ops = Array.isArray(parsed.operations) ? parsed.operations : Array.isArray(parsed.actions) ? parsed.actions : [];
    } catch (e: any) {
      console.warn("[video-studio/chat] LLM unavailable, using rule parser:", e?.message);
      engine = "rules";
    }

    let { edl, applied, skipped } = applyOperations(before, ops, words, dur);
    if (!applied.length) {
      // Requirement: chat must produce concrete edits — fall back to the deterministic parser.
      const r = applyOperations(before, ruleBasedOps(message, dur), words, dur);
      if (r.applied.length) { edl = r.edl; applied = r.applied; skipped = r.skipped; engine = "rules"; reply = ""; }
    }
    if (!applied.length) {
      reply = `I couldn't turn that into an edit${skipped.length ? ` (${skipped[0]})` : ""}. Try e.g. "remove silences and filler words", "cut 0:12 to 0:18", "karaoke captions at the top", "warm color grade", "make it 9:16", or "keep the first 30 seconds".`;
    } else if (!reply || engine === "rules") {
      reply = `Done: ${applied.map(a => a.summary).join("; ")}.`;
    }

    const now = new Date().toISOString();
    const history = [
      ...(Array.isArray(edit.chatHistory) ? edit.chatHistory : []),
      { role: "user", content: message, at: now },
      { role: "assistant", content: reply, applied: applied.map(a => a.summary), operations: applied.map(a => a.op), skipped, engine, edlBefore: applied.length ? before : undefined, at: now },
    ].slice(-40);
    const updated = await storage.updateVideoEdit(edit.id, userId, { edl, chatHistory: history, updatedAt: new Date() } as any);
    res.json({ reply, applied: applied.map(a => ({ summary: a.summary, operation: a.op })), skipped, engine, project: await presentEdit(updated, userId) });
  });

  app.post("/api/video-studio/:id/undo", requireAuth, async (req, res) => {
    const userId = uid(req);
    const edit: any = await storage.getVideoEdit(Number(req.params.id), userId);
    if (!edit) return res.status(404).json({ message: "Not found" });
    const history: any[] = Array.isArray(edit.chatHistory) ? [...edit.chatHistory] : [];
    const idx = history.map(m => !!(m.role === "assistant" && m.edlBefore && !m.undone)).lastIndexOf(true);
    if (idx < 0) return res.status(400).json({ message: "Nothing to undo" });
    const restored = normalizeEdl(history[idx].edlBefore, durationOf(edit));
    history[idx] = { ...history[idx], undone: true };
    history.push({ role: "assistant", content: `Undid: ${(history[idx].applied || []).join("; ")}`, at: new Date().toISOString(), engine: "undo" });
    const updated = await storage.updateVideoEdit(edit.id, userId, { edl: restored, chatHistory: history.slice(-40) } as any);
    res.json(await presentEdit(updated, userId));
  });

  app.post("/api/video-studio/:id/render", requireAuth, async (req, res) => {
    const userId = uid(req);
    const edit: any = await storage.getVideoEdit(Number(req.params.id), userId);
    if (!edit) return res.status(404).json({ message: "Not found" });
    if (["transcribing", "importing", "rendering"].includes(edit.status)) {
      return res.status(409).json({ message: `Project is busy (${edit.status}). Wait for it to finish.` });
    }
    const caps = capabilities();
    if (caps.renderEngine === "none") return res.status(503).json({ message: "No render engine available on the server (ffmpeg missing, Shotstack not configured)." });
    try { resolveSource(edit); } catch (e: any) { return res.status(410).json({ message: e.userMessage || e.message }); }
    const edl = req.body?.edl ? normalizeEdl(req.body.edl, durationOf(edit)) : edlOf(edit);
    if (!keepSegments(edl).length) return res.status(400).json({ message: "Nothing left to render — every part of the video is cut." });
    if (req.body?.edl) await storage.updateVideoEdit(edit.id, userId, { edl } as any);
    await storage.updateVideoEdit(edit.id, userId, { status: "rendering", error: null } as any);
    const job = await enqueueJob({ userId, editId: edit.id, kind: "studio_render", payload: { quality: req.body?.quality === "preview" ? "preview" : "final", edl }, stage: "Queued for render" });
    res.json({ job: publicJob(job, await queuePosition(job)), engine: caps.renderEngine, watermarked: caps.watermarked });
  });

  app.get("/api/video-studio/:id/download", requireAuth, async (req, res) => {
    const edit: any = await storage.getVideoEdit(Number(req.params.id), uid(req));
    if (!edit?.outputUrl) return res.status(404).json({ message: "No rendered video yet" });
    const name = `${String(edit.title || "video").replace(/[^a-z0-9-_ ]/gi, "").trim().replace(/\s+/g, "_") || "video"}-edited.mp4`;
    if (/^https?:\/\//.test(edit.outputUrl)) {
      // Cloudinary: ask for an attachment download; other hosts: plain redirect.
      const url = edit.outputUrl.includes("res.cloudinary.com") && edit.outputUrl.includes("/upload/")
        ? edit.outputUrl.replace("/upload/", `/upload/fl_attachment:${name.replace(/\.mp4$/, "")}/`)
        : edit.outputUrl;
      return res.redirect(302, url);
    }
    const p = path.join(UPLOADS_DIR, path.basename(edit.outputUrl));
    if (!fs.existsSync(p)) return res.status(410).json({ message: "The rendered file was removed by a server restart (no persistent disk). Render again, or configure Cloudinary to keep outputs." });
    res.download(p, name);
  });

  startVideoJobRunner()
    .then(() => reconcileProjects())
    .then(() => sweepTempArtifacts())
    .catch(e => console.warn("[video-jobs] runner start failed:", e?.message));
}

export type { JobRow };
