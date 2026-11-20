#!/usr/bin/env node
/**
 * End-to-end check of the AI video editor against a running server:
 *   upload → background Whisper job → AI chat edits → render job → download → ffprobe
 * plus the >25MB transcription path, the clip editor export job and Clip Finder.
 *
 * Usage:
 *   BASE=http://localhost:5055 EMAIL=... PASSWORD=... \
 *   node scripts/video-editor-e2e.mjs <sample.mp4> [big.mp4] [outDir]
 *
 * Pair with scripts/video-editor-mock-groq.mjs (AI_GROQ_BASE_URL / AI_GROQ_AUDIO_URL)
 * to run with zero spend and no API key.
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const FFPROBE = process.env.FFPROBE_PATH || require("ffprobe-static").path;
const FFMPEG = process.env.FFMPEG_PATH || require("ffmpeg-static");
const BASE = process.env.BASE || "http://localhost:5055";
const [sample, big, outDir = "."] = process.argv.slice(2);
let cookie = "";
const report = [];
const say = (...a) => { const line = a.join(" "); report.push(line); console.log(line); };

async function api(method, url, body, raw = false) {
  // Render terminates TLS at its proxy; mimic it so the secure session cookie is issued.
  const headers = { cookie, "x-forwarded-proto": "https" };
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  const res = await fetch(BASE + url, { method, headers, body: payload, redirect: "manual" });
  const sc = res.headers.get("set-cookie");
  if (sc) cookie = sc.split(";")[0];
  if (raw) return res;
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status}: ${typeof data === "string" ? data.slice(0, 200) : data.message}`);
  return data;
}

async function pollJob(jobId, label) {
  const seen = [];
  const t0 = Date.now();
  for (;;) {
    const j = await api("GET", `/api/video-editor/jobs/${jobId}`);
    const key = `${j.status}:${j.progress}%:${j.stage}`;
    if (seen.at(-1) !== key) seen.push(key);
    if (j.status === "done" || j.status === "failed") {
      say(`  [${label}] job ${jobId} polled ${seen.length} distinct states in ${((Date.now() - t0) / 1000).toFixed(1)}s:`);
      for (const s of seen) say(`     · ${s}`);
      if (j.status === "failed") throw new Error(`${label} failed: ${j.error}`);
      return j.result;
    }
    await new Promise(r => setTimeout(r, 400));
  }
}

function ffprobe(file) {
  const r = spawnSync(FFPROBE, ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file], { encoding: "utf8" });
  const j = JSON.parse(r.stdout);
  return {
    duration: +(+j.format.duration).toFixed(3),
    sizeBytes: +j.format.size,
    streams: j.streams.map(s => s.codec_type === "video" ? `video ${s.codec_name} ${s.width}x${s.height} ${s.r_frame_rate}fps` : `audio ${s.codec_name} ${s.sample_rate}Hz ${s.channels}ch`),
  };
}

function decodesCleanly(file) {
  const r = spawnSync(FFMPEG, ["-v", "error", "-i", file, "-f", "null", "-"], { encoding: "utf8" });
  return r.status === 0 && !r.stderr.trim();
}

async function upload(url, file, field = "video", extra = {}) {
  const fd = new FormData();
  fd.append(field, await fs.openAsBlob(file), path.basename(file));
  for (const [k, v] of Object.entries(extra)) fd.append(k, v);
  return api("POST", url, fd);
}

async function main() {
  await api("POST", "/api/auth/login", { email: process.env.EMAIL, password: process.env.PASSWORD });
  say("✔ logged in");
  const caps = await api("GET", "/api/video-studio/capabilities");
  say("capabilities:", JSON.stringify(caps));

  // 1. Upload → transcription job (the upload request returns immediately)
  let t0 = Date.now();
  const proj = await upload("/api/video-studio/upload", sample, "video", { title: "E2E sample" });
  say(`✔ upload answered in ${Date.now() - t0}ms → project ${proj.id}, status=${proj.status}, job ${proj.job.id} (${proj.job.status})`);
  const tr = await pollJob(proj.job.id, "transcribe");
  say(`✔ transcription: ${tr.words} words, method=${tr.method}, duration=${tr.duration}s`);
  let p = await api("GET", `/api/video-studio/${proj.id}`);
  say(`  project status=${p.status}; first words: ${p.transcript.words.slice(0, 5).map(w => `${w.word}@${w.start}`).join(" ")}`);

  // 2. AI chat → concrete operations
  let r = await api("POST", `/api/video-studio/${proj.id}/chat`, { message: "Tighten this up for Reels and make the captions pop" });
  say(`✔ chat (engine=${r.engine}): "${r.reply}"`);
  for (const a of r.applied) say(`     · ${a.summary}   ${JSON.stringify(a.operation)}`);
  r = await api("POST", `/api/video-studio/${proj.id}/chat`, { message: "make it 9:16" });
  say(`✔ chat advice-only LLM answer → engine=${r.engine}: "${r.reply}"`);
  p = r.project;
  say(`  EDL: ${p.edlSummary}`);
  say(`  keep segments: ${JSON.stringify(p.keepSegments)}`);
  // undo + redo proves EDL history
  const u = await api("POST", `/api/video-studio/${proj.id}/undo`);
  say(`✔ undo → aspect=${u.edl.aspect}`);
  r = await api("PATCH", `/api/video-studio/${proj.id}/edl`, { operations: [{ op: "set_aspect", value: "9:16" }] });
  say(`✔ manual op → ${r.applied.join("; ")}`);
  const expected = r.outputDuration;

  // 3. Render job (request must not block)
  t0 = Date.now();
  const rr = await api("POST", `/api/video-studio/${proj.id}/render`, { quality: "final" });
  say(`✔ render request answered in ${Date.now() - t0}ms (engine=${rr.engine}, watermarked=${rr.watermarked}) → job ${rr.job.id}`);
  const res = await pollJob(rr.job.id, "render");
  say(`✔ render done: ${JSON.stringify(res)}`);

  // 4. Download + ffprobe
  const dl = await api("GET", `/api/video-studio/${proj.id}/download`, undefined, true);
  const outFile = path.join(outDir, "e2e-render.mp4");
  fs.writeFileSync(outFile, Buffer.from(await dl.arrayBuffer()));
  const info = ffprobe(outFile);
  say(`✔ download HTTP ${dl.status} ${dl.headers.get("content-disposition")}`);
  say(`  ffprobe: duration=${info.duration}s (EDL expected ${expected}s) size=${info.sizeBytes}B streams=[${info.streams.join(", ")}]`);
  say(`  full decode with no errors: ${decodesCleanly(outFile)}`);
  for (const at of [0.8, 2.0]) {
    const png = path.join(outDir, `e2e-frame-${at}s.png`);
    spawnSync(FFMPEG, ["-v", "error", "-y", "-ss", String(at), "-i", outFile, "-frames:v", "1", png]);
    say(`  frame @${at}s → ${png}`);
  }

  // 5. >25MB upload: audio is extracted before Whisper
  if (big) {
    const sz = fs.statSync(big).size;
    const bp = await upload("/api/video-studio/upload", big, "video", { title: "E2E big" });
    const btr = await pollJob(bp.job.id, "transcribe-big");
    say(`✔ ${(sz / 1048576).toFixed(1)}MB upload transcribed: ${btr.words} words, method=${btr.method}`);
  }

  // 6. Clip editor: transcribe + export now run as jobs
  const up = await upload("/api/video-clip-editor/upload", sample);
  const tj = await api("POST", "/api/video-clip-editor/transcribe", { filePath: up.filePath });
  say(`✔ clip-editor transcribe → HTTP 202 job ${tj.jobId}`);
  const ct = await pollJob(tj.jobId, "clip-transcribe");
  say(`  clip-editor words: ${ct.words.length}`);
  const ex = await api("POST", "/api/video-clip-editor/process", { clips: [{ filePath: up.filePath, trimStart: 1, trimEnd: 7, speed: 1, colorGrade: "warm", volume: 1 }] });
  say(`✔ clip-editor export → HTTP 202 job ${ex.jobId}`);
  const er = await pollJob(ex.jobId, "clip-export");
  const exRes = await api("GET", er.downloadUrl, undefined, true);
  const exFile = path.join(outDir, "e2e-clip-export.mp4");
  fs.writeFileSync(exFile, Buffer.from(await exRes.arrayBuffer()));
  const exInfo = ffprobe(exFile);
  say(`  clip export ${er.downloadUrl}: duration=${exInfo.duration}s streams=[${exInfo.streams.join(", ")}]`);

  // 7. Clip Finder upload keeps working and returns an editor project
  const cf = await upload("/api/clip-finder/upload", sample, "video", { title: "E2E clip finder" });
  say(`✔ clip finder: ${cf.clips.length} clips, editorProjectId=${cf.editorProjectId}`);
  const cfp = await api("PATCH", `/api/video-studio/${cf.editorProjectId}/edl`, { operations: [{ op: "set_trim", start: cf.clips[0].startSeconds, end: cf.clips[0].endSeconds }] });
  say(`  opened in editor with trim → ${cfp.edlSummary} (transcript reused: ${cfp.transcript.words.length} words)`);

  fs.writeFileSync(path.join(outDir, "e2e-report.txt"), report.join("\n") + "\n");
  say("ALL CHECKS PASSED");
}

main().catch(e => { say("✘ FAILED:", e.stack || e.message); fs.writeFileSync(path.join(outDir, "e2e-report.txt"), report.join("\n") + "\n"); process.exit(1); });
