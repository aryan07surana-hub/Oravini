/**
 * Unit + integration checks for server/videoEditor (no server or DB needed).
 *   npx tsx scripts/video-editor-unit.ts <sample.mp4> [outDir]
 * The chunked-transcription check needs the mock Groq server
 * (scripts/video-editor-mock-groq.mjs) and AI_GROQ_AUDIO_URL + GROQ_API_KEY set,
 * plus WHISPER_SAFE_BYTES / WHISPER_CHUNK_SECONDS to force chunking.
 */
import assert from "assert";
import path from "path";
import { spawnSync } from "child_process";
import {
  applyOperations, defaultEdl, keepSegments, normalizeEdl, outputDuration, remapWords, ruleBasedOps, type Word,
} from "../server/videoEditor/edl";
import { buildAss, groupLines } from "../server/videoEditor/captions";
import { renderWithFfmpeg } from "../server/videoEditor/render";
import { transcribeMedia } from "../server/videoEditor/transcribe";
import { probe } from "../server/videoEditor/ffmpeg";
import { FFMPEG_PATH } from "../server/ffmpegPath";

const [sample, outDir = "."] = process.argv.slice(2);
let passed = 0;
const ok = (name: string, fn: () => void) => { fn(); passed++; console.log(`✔ ${name}`); };

const words: Word[] = [
  { word: "so", start: 0.5, end: 0.8 }, { word: "um", start: 0.9, end: 1.2 }, { word: "today", start: 1.3, end: 1.7 },
  { word: "we", start: 4.5, end: 4.7 }, { word: "edit.", start: 4.8, end: 5.2 }, { word: "uh", start: 5.3, end: 5.5 },
  { word: "captions", start: 9.0, end: 9.6 }, { word: "rock", start: 9.7, end: 10.0 },
];

async function main() {
  ok("defaultEdl covers the whole source", () => {
    const e = defaultEdl(12);
    assert.deepStrictEqual(keepSegments(e), [{ start: 0, end: 12 }]);
    assert.strictEqual(outputDuration(e), 12);
  });

  ok("normalizeEdl clamps garbage input (LLM/DB/client)", () => {
    const e = normalizeEdl({ trim: { start: -5, end: 999 }, speed: 9, colorGrade: "Black and White", aspect: "vertical", captions: { style: "netflix", wordsPerLine: 40 }, cuts: [{ start: 3, end: 2 }, { start: 1, end: 2 }, { start: 1.5, end: 2.5 }] }, 12);
    assert.deepStrictEqual(e.trim, { start: 0, end: 12 });
    assert.strictEqual(e.speed, 2);
    assert.strictEqual(e.colorGrade, "bw");
    assert.strictEqual(e.aspect, "9:16");
    assert.strictEqual(e.captions.style, "boxed");
    assert.strictEqual(e.captions.wordsPerLine, 8);
    assert.deepStrictEqual(e.cuts.map(c => [c.start, c.end]), [[1, 2.5]]); // inverted dropped, overlaps merged
  });

  ok("cuts separated by a <0.2s sliver are joined", () => {
    const e = normalizeEdl({ cuts: [{ start: 2, end: 3 }, { start: 3.1, end: 4 }] }, 10);
    assert.deepStrictEqual(e.cuts.map(c => [c.start, c.end]), [[2, 4]]);
  });

  ok("remove_silences / remove_fillers produce timestamped cuts", () => {
    const { edl, applied } = applyOperations(defaultEdl(12), [{ op: "remove_silences", minGap: 1 }, { op: "remove_fillers" }], words, 12);
    assert.strictEqual(applied.length, 2);
    assert.ok(edl.cuts.some(c => c.source === "filler" && c.start < 0.9 && c.end > 1.2), "um cut");
    assert.ok(edl.cuts.some(c => c.source === "silence" && c.start > 1.7 && c.end < 4.5), "gap 1.7–4.5 cut");
    const out = remapWords(words, edl);
    assert.ok(!out.some(w => w.word === "um" || w.word === "uh"), "fillers gone from captions");
    for (let i = 1; i < out.length; i++) assert.ok(out[i].start >= out[i - 1].start, "monotonic output time");
    assert.ok(outputDuration(edl) < 7, `output shortened (${outputDuration(edl)})`);
  });

  ok("speed and trim remap caption timing", () => {
    const { edl } = applyOperations(defaultEdl(12), [{ op: "set_trim", start: 4, end: 11 }, { op: "set_speed", value: 2 }], words, 12);
    const out = remapWords(words, edl);
    assert.strictEqual(out[0].word, "we");
    assert.strictEqual(out[0].start, 0.25); // (4.5-4)/2
    assert.strictEqual(outputDuration(edl), 3.5);
  });

  ok("invalid operations are skipped, valid ones kept", () => {
    const r = applyOperations(defaultEdl(12), [{ op: "explode" }, { op: "cut", start: 5, end: 4 }, { op: "set_color_grade", grade: "warm" }], words, 12);
    assert.strictEqual(r.applied.length, 1);
    assert.strictEqual(r.skipped.length, 2);
    assert.strictEqual(r.edl.colorGrade, "warm");
  });

  ok("undo restores via uncut", () => {
    const a = applyOperations(defaultEdl(12), [{ op: "cut", start: 2, end: 6 }], words, 12).edl;
    const b = applyOperations(a, [{ op: "uncut", start: 3, end: 4 }], words, 12).edl;
    assert.deepStrictEqual(b.cuts.map(c => [c.start, c.end]), [[2, 3], [4, 6]]);
  });

  ok("rule parser turns plain requests into concrete ops", () => {
    const ops = ruleBasedOps("remove the silences and ums, karaoke captions at the top in caps, cinematic look, 1.25x, vertical", 60);
    const kinds = ops.map(o => o.op);
    for (const k of ["remove_silences", "remove_fillers", "set_captions", "set_color_grade", "set_speed", "set_aspect"]) assert.ok(kinds.includes(k as any), k);
    const cut = ruleBasedOps("cut 0:12 to 0:18", 60)[0] as any;
    assert.deepStrictEqual([cut.op, cut.start, cut.end], ["cut", 12, 18]);
    const keep = ruleBasedOps("keep the first 30 seconds", 60)[0] as any;
    assert.deepStrictEqual([keep.op, keep.start, keep.end], ["set_trim", 0, 30]);
  });

  ok("captions: line grouping + ASS for every preset", () => {
    const lines = groupLines(words, 3);
    assert.ok(lines.every(l => l.words.length <= 3));
    assert.ok(lines.some(l => l.words.at(-1)!.word === "edit."), "breaks on sentence end");
    for (const style of ["bold", "karaoke", "minimal", "boxed"] as const) {
      const e = normalizeEdl({ captions: { enabled: true, style } }, 12);
      const ass = buildAss(words, e, 1080, 1920);
      assert.ok(ass.includes("PlayResY: 1920"));
      const n = ass.split("\n").filter(l => l.startsWith("Dialogue:")).length;
      assert.ok(style === "karaoke" ? n === words.length : n === lines.length || n > 0, `${style} events`);
      if (style === "karaoke") assert.ok(ass.includes("\\c&H0000E5FF&"), "active word highlight");
      if (style === "boxed") assert.ok(/Style: Cap,[^\n]*,3,\d+,0,2,/.test(ass), "BorderStyle 3 box");
    }
  });

  if (sample) {
    const info = await probe(sample);

    // BASIC version: trim + automatic word-timed captions → rendered export.
    const basicWords: Word[] = [
      { word: "before", start: 0.6, end: 1.2 }, { word: "keep", start: 2.6, end: 3.0 }, { word: "these", start: 3.1, end: 3.6 },
      { word: "words", start: 4.6, end: 5.2 }, { word: "only.", start: 5.3, end: 6.0 }, { word: "after", start: 9.0, end: 9.5 },
    ];
    const def = defaultEdl(info.duration);
    assert.ok(def.captions.enabled, "captions are on by default (automatic)");
    const trimmed = applyOperations(def, [{ op: "set_trim", start: 2, end: 8 }], basicWords, info.duration).edl;
    const capWords = remapWords(basicWords, trimmed);
    ok("basic: trim keeps only words inside the window, re-timed from 0", () => {
      assert.deepStrictEqual(capWords.map(w => w.word), ["keep", "these", "words", "only."]);
      assert.strictEqual(capWords[0].start, 0.6); // 2.6 - 2
      assert.ok(capWords.every(w => w.end <= 6.001));
    });
    const basicOut = path.join(outDir, "basic-trim-captions.mp4");
    const br = await renderWithFfmpeg({ input: sample, edl: trimmed, words: basicWords, outputPath: basicOut, quality: "final" });
    ok(`basic: trimmed render with auto captions → ${br.duration}s ${br.width}x${br.height}, ${br.captionLines} caption events, audio=${br.hasAudio}`, () => {
      assert.ok(Math.abs(br.duration - 6) < 0.1, `duration ${br.duration}`);
      assert.ok(br.captionLines > 0, "captions burned in");
      assert.ok(br.hasAudio);
      const dec = spawnSync(FFMPEG_PATH, ["-v", "error", "-i", basicOut, "-f", "null", "-"], { encoding: "utf8" });
      assert.ok(dec.status === 0 && !dec.stderr.trim(), "decodes cleanly");
    });
    const sw: Word[] = [
      { word: "caption", start: 0.6, end: 1.4 }, { word: "preset", start: 1.5, end: 2.4 }, { word: "check", start: 2.5, end: 3.2 },
    ];
    for (const style of ["bold", "karaoke", "minimal", "boxed"] as const) {
      const edl = normalizeEdl({ trim: { start: 0, end: 4 }, captions: { enabled: true, style, position: style === "minimal" ? "top" : "bottom" }, colorGrade: style === "boxed" ? "bw" : "cinematic" }, info.duration);
      const out = path.join(outDir, `preset-${style}.mp4`);
      const r = await renderWithFfmpeg({ input: sample, edl, words: sw, outputPath: out, quality: "preview" });
      assert.ok(Math.abs(r.duration - 4) < 0.15, `${style} duration ${r.duration}`);
      const png = path.join(outDir, `preset-${style}.png`);
      spawnSync(FFMPEG_PATH, ["-v", "error", "-y", "-ss", "1.8", "-i", out, "-frames:v", "1", png]);
      ok(`render preset "${style}" → ${r.width}x${r.height} ${r.duration}s, ${r.captionLines} caption events (${png})`, () => {});
    }
  }

  if (sample && process.env.WHISPER_SAFE_BYTES) {
    const t = await transcribeMedia(sample);
    ok(`chunked transcription: ${t.chunks} chunks, ${t.words.length} words, method=${t.method}, last word @${t.words.at(-1)?.start}s`, () => {
      assert.strictEqual(t.method, "chunked");
      assert.ok(t.chunks > 1);
      for (let i = 1; i < t.words.length; i++) assert.ok(t.words[i].start >= t.words[i - 1].start - 0.01, "offsets applied in order");
      assert.ok((t.words.at(-1)?.start || 0) > 12, "later chunks shifted onto the full timeline");
    });
  }
  console.log(`\n${passed} checks passed`);
}

main().catch(e => { console.error("✘", e); process.exit(1); });
