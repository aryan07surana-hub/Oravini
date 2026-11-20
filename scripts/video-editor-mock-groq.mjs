#!/usr/bin/env node
/**
 * Local stand-in for Groq's OpenAI-compatible API, used by
 * scripts/video-editor-e2e.mjs so the full editor loop can be verified
 * without an API key and with zero spend.
 *
 *  - POST /openai/v1/audio/transcriptions: runs ffmpeg silencedetect on the
 *    audio it actually receives and returns Whisper-style word timestamps over
 *    the non-silent spans (so timestamps match the real media). Every request
 *    is logged (size, filename, content-type) to prove what the server sent.
 *  - POST /openai/v1/chat/completions: returns canned JSON for the video
 *    editor chat (concrete operations, or advice-only to exercise the
 *    rule-based fallback) and for Clip Finder's clip analysis.
 *
 * Usage: node scripts/video-editor-mock-groq.mjs [port] [logFile]
 */
import http from "http";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const FFMPEG = process.env.FFMPEG_PATH || require("ffmpeg-static");
const port = parseInt(process.argv[2] || "18080", 10);
const logFile = process.argv[3] || path.join(os.tmpdir(), "mock-groq-log.jsonl");
const SCRIPT = "so um today I want to show you how this editor works it cuts the pauses uh and adds captions automatically that is the whole idea thanks for watching".split(" ");

const log = obj => fs.appendFileSync(logFile, JSON.stringify({ at: new Date().toISOString(), ...obj }) + "\n");

function parseMultipart(buf, contentType) {
  const boundary = "--" + /boundary=(?:"([^"]+)"|([^;]+))/.exec(contentType).slice(1).find(Boolean);
  const parts = {};
  let pos = buf.indexOf(boundary);
  while (pos !== -1) {
    const next = buf.indexOf(boundary, pos + boundary.length);
    if (next === -1) break;
    const part = buf.subarray(pos + boundary.length + 2, next - 2);
    const headEnd = part.indexOf("\r\n\r\n");
    const head = part.subarray(0, headEnd).toString();
    const body = part.subarray(headEnd + 4);
    const name = /name="([^"]+)"/.exec(head)?.[1];
    const filename = /filename="([^"]*)"/.exec(head)?.[1];
    const ctype = /Content-Type:\s*([^\r\n]+)/i.exec(head)?.[1];
    if (name) parts[name] = filename !== undefined ? { filename, ctype, data: body } : body.toString();
    pos = next;
  }
  return parts;
}

function speechSpans(file) {
  const r = spawnSync(FFMPEG, ["-hide_banner", "-i", file, "-af", "silencedetect=n=-30dB:d=0.25", "-f", "null", "-"], { encoding: "utf8" });
  const out = r.stderr || "";
  const dur = (() => { const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(out); return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0; })();
  const starts = [...out.matchAll(/silence_start: ([\d.]+)/g)].map(m => +m[1]);
  const ends = [...out.matchAll(/silence_end: ([\d.]+)/g)].map(m => +m[1]);
  const spans = [];
  let cur = 0;
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] - cur > 0.2) spans.push([cur, starts[i]]);
    cur = ends[i] ?? dur;
  }
  if (dur - cur > 0.2) spans.push([cur, dur]);
  return { spans, dur };
}

function transcribe(file) {
  const { spans, dur } = speechSpans(file);
  const words = [];
  let k = 0;
  for (const [a, b] of spans) {
    const n = Math.max(1, Math.round((b - a) / 0.45));
    const step = (b - a) / n;
    for (let i = 0; i < n; i++) {
      words.push({ word: SCRIPT[k++ % SCRIPT.length], start: +(a + i * step).toFixed(3), end: +(a + (i + 1) * step - 0.05).toFixed(3) });
    }
  }
  const segments = spans.map(([a, b]) => ({ start: a, end: b, text: words.filter(w => w.start >= a && w.end <= b + 0.01).map(w => w.word).join(" ") }));
  return { task: "transcribe", language: "english", duration: dur, text: words.map(w => w.word).join(" "), words, segments };
}

function chatReply(messages) {
  const system = messages.find(m => m.role === "system")?.content || "";
  const user = messages.filter(m => m.role === "user").at(-1)?.content || "";
  if (/viral clip|viral content strategist/i.test(system)) {
    return { clips: [
      { startSeconds: 0.5, endSeconds: 8, title: "How the editor works", hook: "Watch this", whyViral: "Clear demo.", viralityScore: 82, category: "educational", platform: "all", emotionalTrigger: "curiosity", retentionPrediction: "high", suggestedCaption: "AI editing in 10s" },
      { startSeconds: 8.3, endSeconds: 18, title: "Captions automatically", hook: "No more manual subs", whyViral: "Useful.", viralityScore: 75, category: "educational", platform: "reels", emotionalTrigger: "relatability", retentionPrediction: "medium", suggestedCaption: "Auto captions" },
    ] };
  }
  const req = (/USER REQUEST: (.*)$/s.exec(user)?.[1] || "").toLowerCase();
  if (req.includes("tighten")) {
    // Pick a real transcript line to cut, like the LLM would.
    const lines = [...user.matchAll(/\[(\d+\.\d+)-(\d+\.\d+)\]/g)].map(m => [+m[1], +m[2]]);
    const target = lines[2] || lines[0];
    return {
      reply: `Removed pauses over 0.5s and filler words, cut the rambling line at ${target[0]}–${target[1]}s, switched to karaoke captions and a warm grade.`,
      operations: [
        { op: "remove_silences", minGap: 0.5 },
        { op: "remove_fillers" },
        { op: "cut", start: target[0], end: target[1], reason: "rambling" },
        { op: "set_captions", style: "karaoke", position: "bottom", wordsPerLine: 3 },
        { op: "set_color_grade", grade: "warm" },
      ],
    };
  }
  // Advice-only answer: the server must fall back to deterministic edits.
  return { reply: "You could consider making it vertical for social platforms.", operations: [] };
}

http.createServer((req, res) => {
  const chunks = [];
  req.on("data", c => chunks.push(c));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    try {
      if (req.url.endsWith("/audio/transcriptions")) {
        const parts = parseMultipart(body, req.headers["content-type"]);
        const f = parts.file;
        const tmp = path.join(os.tmpdir(), `mock-asr-${Date.now()}-${f.filename}`);
        fs.writeFileSync(tmp, f.data);
        const result = transcribe(tmp);
        fs.unlinkSync(tmp);
        log({ kind: "transcription", bytes: f.data.length, filename: f.filename, contentType: f.ctype, model: parts.model, words: result.words.length, duration: result.duration, firstWord: result.words[0], lastWord: result.words.at(-1) });
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(result));
      }
      if (req.url.endsWith("/chat/completions")) {
        const j = JSON.parse(body.toString());
        const content = JSON.stringify(chatReply(j.messages || []));
        log({ kind: "chat", model: j.model, reply: content.slice(0, 200) });
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ id: "mock", object: "chat.completion", model: j.model, choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }));
      }
      res.writeHead(404); res.end("not found");
    } catch (e) {
      log({ kind: "error", url: req.url, error: String(e?.stack || e) });
      res.writeHead(500); res.end(String(e));
    }
  });
}).listen(port, () => console.log(`[mock-groq] listening on ${port}, log ${logFile}`));
