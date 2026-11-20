/**
 * Whisper transcription via Groq (free tier) with automatic audio extraction.
 *
 * Groq rejects uploads over 25MB. Instead of failing on bigger videos we:
 *   1. extract the audio track with ffmpeg to mono 16kHz 48kbps MP3
 *      (~0.36MB per minute → ~65 minutes fits under 24MB), and
 *   2. if that is still too big, split the audio into 20-minute chunks,
 *      transcribe each and shift the timestamps back onto one timeline.
 *
 * Word-level timestamps are returned for captions and AI cut suggestions.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { ffmpegAvailable } from "../ffmpegPath";
import { probe, runFfmpeg } from "./ffmpeg";
import type { Word } from "./edl";

export const GROQ_MAX_BYTES = 25 * 1024 * 1024;
// Env overrides exist only so the chunking path can be exercised in tests.
const SAFE_BYTES = parseInt(process.env.WHISPER_SAFE_BYTES || "", 10) || 24 * 1024 * 1024;
const CHUNK_SECONDS = parseInt(process.env.WHISPER_CHUNK_SECONDS || "", 10) || 20 * 60;
// Override only for a local test harness / compatible proxy. Default unchanged.
const GROQ_AUDIO_URL = process.env.AI_GROQ_AUDIO_URL || "https://api.groq.com/openai/v1/audio/transcriptions";
const WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo";

export interface TranscriptSegment { start: number; end: number; text: string }
export interface Transcript {
  text: string;
  words: Word[];
  segments: TranscriptSegment[];
  duration: number;
  language?: string;
  /** How the audio was prepared — useful for debugging / the UI. */
  method: "direct" | "extracted" | "chunked";
  chunks: number;
}

export class TranscriptionError extends Error {
  constructor(message: string, public userMessage: string) { super(message); }
}

type Stage = (stage: string, progress?: number) => void | Promise<void>;

function tmpFile(ext: string) {
  return path.join(os.tmpdir(), `oravini-asr-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`);
}

const MIME: Record<string, string> = {
  ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav", ".mp4": "video/mp4", ".mov": "video/quicktime",
  ".webm": "video/webm", ".mkv": "video/x-matroska", ".m4v": "video/x-m4v", ".avi": "video/x-msvideo",
};

async function fileBlob(p: string, name: string): Promise<Blob> {
  const type = MIME[path.extname(name).toLowerCase()] || "application/octet-stream";
  const anyFs = fs as any;
  if (typeof anyFs.openAsBlob === "function") return anyFs.openAsBlob(p, { type }); // file-backed, no RAM copy
  return new Blob([new Uint8Array(await fs.promises.readFile(p))], { type });
}

async function callWhisper(filePath: string, filename: string, granularities: ("word" | "segment")[]): Promise<any> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new TranscriptionError("GROQ_API_KEY missing", "Transcription is not configured (GROQ_API_KEY is missing on the server).");
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const form = new FormData();
    form.append("file", await fileBlob(filePath, filename), filename);
    form.append("model", WHISPER_MODEL);
    form.append("response_format", "verbose_json");
    for (const g of granularities) form.append("timestamp_granularities[]", g);
    const res = await fetch(GROQ_AUDIO_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: AbortSignal.timeout(5 * 60 * 1000),
    }).catch((e: any) => { lastErr = e?.message || String(e); return null; });
    if (res && res.ok) return res.json();
    if (res) {
      const body = await res.text().catch(() => "");
      lastErr = `HTTP ${res.status}: ${body.slice(0, 300)}`;
      if (res.status === 413) throw new TranscriptionError(lastErr, "Audio chunk was still over Groq's 25MB limit.");
      if (res.status === 401) throw new TranscriptionError(lastErr, "Groq rejected the API key (401). Check GROQ_API_KEY.");
      if (res.status !== 429 && res.status < 500) break;
      const retryAfter = parseFloat(res.headers.get("retry-after") || "") || (attempt + 1) * 5;
      await new Promise(r => setTimeout(r, Math.min(60, retryAfter) * 1000));
    } else {
      await new Promise(r => setTimeout(r, (attempt + 1) * 3000));
    }
  }
  throw new TranscriptionError(`Whisper failed: ${lastErr}`, lastErr.includes("429")
    ? "Groq's free-tier rate limit was hit. Wait a minute and retry transcription."
    : `Transcription failed: ${lastErr.slice(0, 160)}`);
}

function normWords(raw: any[], offset: number): Word[] {
  return (raw || [])
    .map(w => ({ word: String(w.word ?? w.text ?? "").trim(), start: Number(w.start) + offset, end: Number(w.end) + offset }))
    .filter(w => w.word && Number.isFinite(w.start) && Number.isFinite(w.end) && w.end >= w.start)
    .map(w => ({ word: w.word, start: Math.round(w.start * 1000) / 1000, end: Math.round(w.end * 1000) / 1000 }));
}

/**
 * Transcribe a local file or http(s) URL. Never loads the whole video into memory.
 */
export async function transcribeMedia(input: string, opts: { onStage?: Stage; filename?: string } = {}): Promise<Transcript> {
  const stage: Stage = opts.onStage || (() => {});
  const isLocal = !/^https?:\/\//i.test(input);
  const temps: string[] = [];
  try {
    if (!ffmpegAvailable()) {
      // No ffmpeg: only small local files can be sent as-is.
      if (!isLocal) throw new TranscriptionError("ffmpeg missing for remote input", "ffmpeg is not available on the server, so this file can't be prepared for transcription.");
      const size = (await fs.promises.stat(input)).size;
      if (size > GROQ_MAX_BYTES) throw new TranscriptionError("file > 25MB and no ffmpeg", "File is over Whisper's 25MB limit and ffmpeg isn't available to extract the audio.");
      await stage("Transcribing with Whisper", 0.3);
      const data = await callWhisper(input, opts.filename || path.basename(input), ["word", "segment"]);
      const words = normWords(data.words, 0);
      return { text: String(data.text || "").trim(), words, segments: (data.segments || []).map((s: any) => ({ start: s.start, end: s.end, text: String(s.text || "").trim() })), duration: Number(data.duration) || words.at(-1)?.end || 0, language: data.language, method: "direct", chunks: 1 };
    }

    await stage("Reading media", 0.05);
    const info = await probe(input);
    if (!info.hasAudio) throw new TranscriptionError("no audio stream", "This video has no audio track, so there is nothing to transcribe. You can still edit and render it without captions.");

    await stage("Extracting audio", 0.1);
    const audio = tmpFile("mp3");
    temps.push(audio);
    await runFfmpeg(["-i", input, "-vn", "-map", "0:a:0", "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "48k", audio], { timeoutMs: 15 * 60 * 1000 });
    const audioSize = (await fs.promises.stat(audio)).size;
    const duration = info.duration;

    const pieces: { file: string; offset: number }[] = [];
    if (audioSize <= SAFE_BYTES) {
      pieces.push({ file: audio, offset: 0 });
    } else {
      await stage("Splitting long audio", 0.15);
      for (let off = 0; off < duration; off += CHUNK_SECONDS) {
        const f = tmpFile("mp3");
        temps.push(f);
        await runFfmpeg(["-ss", String(off), "-t", String(CHUNK_SECONDS), "-i", audio, "-c", "copy", f]);
        pieces.push({ file: f, offset: off });
      }
    }

    const words: Word[] = [];
    const segments: TranscriptSegment[] = [];
    const texts: string[] = [];
    let language: string | undefined;
    for (let i = 0; i < pieces.length; i++) {
      await stage(pieces.length > 1 ? `Transcribing part ${i + 1} of ${pieces.length}` : "Transcribing with Whisper", 0.2 + (0.75 * i) / pieces.length);
      const data = await callWhisper(pieces[i].file, `audio-${i}.mp3`, ["word", "segment"]);
      words.push(...normWords(data.words, pieces[i].offset));
      for (const s of data.segments || []) segments.push({ start: s.start + pieces[i].offset, end: s.end + pieces[i].offset, text: String(s.text || "").trim() });
      texts.push(String(data.text || "").trim());
      language = language || data.language;
    }
    return {
      text: texts.join(" ").trim(), words, segments, duration: duration || words.at(-1)?.end || 0, language,
      method: pieces.length > 1 ? "chunked" : "extracted", chunks: pieces.length,
    };
  } finally {
    for (const f of temps) fs.promises.unlink(f).catch(() => {});
  }
}
