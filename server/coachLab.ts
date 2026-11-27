// AI Content Coach "Growth Lab": winners, viral library, hook bank, weekly report, calendar.
// No schema changes: state is one JSON document stored in the existing ai_session_history table.
import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { aiChatJson, aiFeature } from "./aiService";

const STATE_TOOL = "coach-lab-state";

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

async function charge(req: Request, res: Response, amount: number, label: string): Promise<boolean> {
  const u = req.user as any;
  if (u.role === "admin") return true;
  const r = await storage.deductCredits(u.id, amount, "ai_coach", label, u.plan || "free");
  if (!r.success) {
    res.status(402).json({ message: r.message, insufficientCredits: true, balance: r.balance });
    return false;
  }
  return true;
}

async function ai(system: string, user: string, maxTokens = 2200): Promise<any> {
  const raw = await aiChatJson(system, user, { maxTokens, temperature: 0.6 });
  return JSON.parse(raw || "{}");
}

const KEY_MISSING = /API key not configured/i;
/** Run the AI call first and charge only when it worked. When no AI key is configured on this server (for example a
 *  preview environment) return clearly flagged sample output instead of an error, and charge nothing. */
async function ai2(req: Request, res: Response, amount: number, label: string, system: string, user: string, maxTokens: number, demo: () => any): Promise<any | null> {
  let out: any;
  try { out = await ai(system, user, maxTokens); }
  catch (e: any) {
    if (KEY_MISSING.test(String(e?.message))) { res.json({ ...demo(), demo: true }); return null; }
    throw e;
  }
  if (!(await charge(req, res, amount, label))) return null;
  return out;
}

const num = (v: any) => { const n = Number(String(v ?? "").replace(/[, ]/g, "")); return Number.isFinite(n) && n > 0 ? n : 0; };
const clip = (s: any, n: number) => String(s ?? "").slice(0, n);

type Reel = { id?: string; url?: string; hook?: string; transcript?: string; views?: number; likes?: number; comments?: number; saves?: number; shares?: number; lengthSec?: number; postedAt?: string; topic?: string };

function cleanReels(input: any): Reel[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 60).map((r: any) => ({
    id: clip(r.id, 40), url: clip(r.url, 300), hook: clip(r.hook, 300), transcript: clip(r.transcript, 1800), topic: clip(r.topic, 120),
    views: num(r.views), likes: num(r.likes), comments: num(r.comments), saves: num(r.saves), shares: num(r.shares),
    lengthSec: num(r.lengthSec), postedAt: clip(r.postedAt, 40),
  })).filter((r) => r.hook || r.transcript);
}

/** Rank by blend of reach and how much people saved/shared relative to views. */
function rank(reels: Reel[]) {
  const rate = (r: Reel) => ((r.saves || 0) * 3 + (r.shares || 0) * 4 + (r.likes || 0) + (r.comments || 0) * 2) / Math.max(r.views || 0, 1);
  const byViews = [...reels].sort((a, b) => (b.views || 0) - (a.views || 0));
  const byRate = [...reels].sort((a, b) => rate(b) - rate(a));
  const n = Math.max(reels.length - 1, 1);
  const scored = reels.map((r) => {
    const s = 100 * (1 - 0.5 * byViews.indexOf(r) / n - 0.5 * byRate.indexOf(r) / n);
    return { ...r, score: Math.round(s), rate: Number(rate(r).toFixed(4)) };
  }).sort((a, b) => b.score - a.score);
  const winCount = Math.min(5, Math.max(1, Math.ceil(reels.length * 0.3)));
  return { scored, winners: scored.slice(0, winCount), flops: scored.slice(-Math.min(3, Math.max(1, Math.floor(reels.length / 3)))) };
}

const brief = (r: any) => `- hook: "${r.hook || ""}" | views ${r.views || 0}, saves ${r.saves || 0}, shares ${r.shares || 0}, likes ${r.likes || 0}, length ${r.lengthSec || "?"}s${r.topic ? `, topic ${r.topic}` : ""}${r.transcript ? `\n  script: ${clip(r.transcript, 500)}` : ""}`;

const SYS = "You are a short-form video strategist. Be specific and concrete, never generic. Return ONLY valid JSON.";

export function registerCoachLab(app: Express) {
  const gate = [requireAuth, aiFeature("content-coach", { critical: true })];

  // State document (reels, hooks, reports, calendars). Free.
  app.get("/api/coach/lab/state", requireAuth, async (req: Request, res: Response) => {
    try {
      const rows = await storage.getAiHistory((req.user as any).id, STATE_TOOL, 1);
      return res.json(rows[0]?.output || {});
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });
  app.put("/api/coach/lab/state", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const body = req.body && typeof req.body === "object" ? req.body : {};
      if (JSON.stringify(body).length > 400_000) return res.status(413).json({ message: "State too large" });
      const old = await storage.getAiHistory(userId, STATE_TOOL, 5);
      await storage.saveAiHistory({ userId, tool: STATE_TOOL, title: "Coach Growth Lab", inputs: {}, output: body });
      for (const o of old) await storage.deleteAiHistory(o.id, userId);
      return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // 1) Winners: what the user's best reels share.
  app.post("/api/coach/lab/winners", ...gate, async (req: Request, res: Response) => {
    try {
      const reels = cleanReels(req.body?.reels);
      if (reels.length < 3) return res.status(400).json({ message: "Add at least 3 reels so the coach can compare winners and flops." });
      const { scored, winners, flops } = rank(reels);
      const out = await ai2(req, res, 3, "Coach Lab: winner analysis", SYS, `Here are a creator's reels.\n\nWINNERS:\n${winners.map(brief).join("\n")}\n\nFLOPS:\n${flops.map(brief).join("\n")}\n\nALL REELS COUNT: ${reels.length}\n\nFind what the winners share that the flops do not. Return JSON: {"headline": string (one sentence), "formula": {"hookStyles": string[] (2-4 named hook patterns with a short example from their own reels), "idealLengthSec": [min,max], "openers": string[] (3 opening lines they use that work), "topics": string[], "structure": string[] (3-5 beats in order), "doMore": string[] (3), "stopDoing": string[] (3)}, "winnerNotes": [{"hook": string, "why": string}]}`, 2400, () => demoWinners(reels));
      if (!out) return;
      return res.json({ ranked: scored.map((r) => ({ id: r.id, hook: r.hook, views: r.views, saves: r.saves, shares: r.shares, score: r.score })), winnerIds: winners.map((w) => w.id), ...out });
    } catch (e: any) { return res.status(500).json({ message: e.message || "Winner analysis failed" }); }
  });

  // 1b) Score a new script against the creator's own winners.
  app.post("/api/coach/lab/score", ...gate, async (req: Request, res: Response) => {
    try {
      const script = clip(req.body?.script, 3000);
      if (script.trim().length < 20) return res.status(400).json({ message: "Paste a script of at least a couple of sentences." });
      const formula = JSON.stringify(req.body?.formula || {}).slice(0, 3500);
      const winners = cleanReels(req.body?.winners).slice(0, 5).map(brief).join("\n");
      const out = await ai2(req, res, 1, "Coach Lab: score vs winners", SYS, `The creator's winning formula:\n${formula}\n\nTheir winning reels:\n${winners}\n\nNEW SCRIPT:\n"""${script}"""\n\nScore how closely it matches what already works for THIS creator (not generic virality). Return JSON: {"score": 0-100, "verdict": string, "matches": string[] (what it does like the winners), "gaps": string[] (what winners do that this misses), "fixHook": string (rewritten opening line in their winning style), "fixes": string[] (3 concrete edits)}`, 1500, () => demoScore());
      if (!out) return;
      return res.json(out);
    } catch (e: any) { return res.status(500).json({ message: e.message || "Scoring failed" }); }
  });

  // 2) Viral library: break down a pasted reel and rewrite it for the user's niche.
  app.post("/api/coach/lab/viral", ...gate, async (req: Request, res: Response) => {
    try {
      const reel = cleanReels([req.body?.reel])[0];
      if (!reel) return res.status(400).json({ message: "Paste the reel's hook or script text so the coach can break it down." });
      const niche = clip(req.body?.niche, 200) || "the creator's niche";
      const out = await ai2(req, res, 2, "Coach Lab: viral breakdown", SYS, `Break down this viral reel and rewrite it for a creator in: ${niche}.\n\nREEL:\n${brief(reel)}\n\nReturn JSON: {"breakdown": {"hook": {"type": string, "why": string}, "pacing": string, "structure": [{"beat": string, "detail": string}], "whyItWorked": string[] (3), "triggers": string[] (emotions or curiosity gaps used)}, "rewrite": {"hook": string, "script": string (full spoken script, same structure, new topic for the niche, 45-60s), "caption": string, "cta": string}}`, 2600, () => demoViral(niche));
      if (!out) return;
      return res.json(out);
    } catch (e: any) { return res.status(500).json({ message: e.message || "Breakdown failed" }); }
  });

  // 3) Hook bank: variations of a hook with predicted scores.
  app.post("/api/coach/lab/hooks", ...gate, async (req: Request, res: Response) => {
    try {
      const hook = clip(req.body?.hook, 300);
      const topic = clip(req.body?.topic, 200);
      if (!hook && !topic) return res.status(400).json({ message: "Add a hook or a topic." });
      const formula = JSON.stringify(req.body?.formula || {}).slice(0, 2000);
      const out = await ai2(req, res, 1, "Coach Lab: hook variations", SYS, `${hook ? `Base hook: "${hook}"` : `Topic: ${topic}`}\n${topic && hook ? `Topic: ${topic}\n` : ""}Creator winning formula (use it if present): ${formula}\n\nWrite 6 variations using different angles (curiosity gap, contrarian, number, story, direct callout, pain point). Predict a 0-100 score for each and give the weak spot. Return JSON: {"variations": [{"hook": string, "angle": string, "score": number, "weakness": string}], "best": number (index of the strongest)}`, 1500, () => demoHooks(hook || topic));
      if (!out) return;
      return res.json(out);
    } catch (e: any) { return res.status(500).json({ message: e.message || "Hook test failed" }); }
  });

  // 4) Weekly report.
  app.post("/api/coach/lab/report", ...gate, async (req: Request, res: Response) => {
    try {
      const reels = cleanReels(req.body?.reels);
      if (reels.length < 2) return res.status(400).json({ message: "Add at least 2 reels to build a report." });
      const cutoff = Date.now() - 7 * 86400000;
      const recent = reels.filter((r) => r.postedAt && new Date(r.postedAt).getTime() >= cutoff);
      const period = recent.length >= 2 ? recent : reels;
      const { winners, flops } = rank(period);
      const sum = (k: "views" | "saves" | "shares" | "likes") => period.reduce((a, r) => a + (r[k] || 0), 0);
      const metrics = { reels: period.length, views: sum("views"), saves: sum("saves"), shares: sum("shares"), likes: sum("likes"), usedLast7Days: recent.length >= 2 };
      const formula = JSON.stringify(req.body?.formula || {}).slice(0, 2000);
      const out = await ai2(req, res, 2, "Coach Lab: weekly report", SYS, `Weekly report for a creator. Metrics: ${JSON.stringify(metrics)}\n\nTOP:\n${winners.map(brief).join("\n")}\n\nWEAKEST:\n${flops.map(brief).join("\n")}\n\nTheir formula: ${formula}\n\nReturn JSON: {"headline": string, "worked": [{"title": string, "why": string}] (max 3), "flopped": [{"title": string, "why": string}] (max 3), "nextPosts": [{"hook": string, "format": string, "why": string}] (exactly 3), "oneChange": string (the single biggest change for next week)}`, 1800, () => demoReport());
      if (!out) return;
      return res.json({ metrics, ...out, generatedAt: new Date().toISOString() });
    } catch (e: any) { return res.status(500).json({ message: e.message || "Report failed" }); }
  });

  // 5) Content calendar built from winners.
  app.post("/api/coach/lab/calendar", ...gate, async (req: Request, res: Response) => {
    try {
      const niche = clip(req.body?.niche, 200);
      if (!niche) return res.status(400).json({ message: "Add your niche first." });
      const perWeek = Math.min(7, Math.max(2, num(req.body?.perWeek) || 4));
      const weeks = Math.min(4, Math.max(1, num(req.body?.weeks) || 2));
      const formula = JSON.stringify(req.body?.formula || {}).slice(0, 2500);
      const winners = cleanReels(req.body?.winners).slice(0, 5).map(brief).join("\n");
      const out = await ai2(req, res, 3, "Coach Lab: content calendar", SYS, `Build a ${weeks}-week reel calendar, ${perWeek} posts per week, for: ${niche}. Base it on what already works for this creator.\n\nWinning formula: ${formula}\nWinning reels:\n${winners}\n\nReturn JSON: {"posts": [{"week": number, "day": string (Mon-Sun), "topic": string, "hook": string, "format": string (talking head, b-roll voiceover, carousel-to-reel, etc.), "goal": "reach" | "trust" | "sales", "basedOn": string (which winner pattern it repeats)}]} with exactly ${weeks * perWeek} posts. Vary goals, put one sales post per week.`, 3200, () => demoCalendar(niche, weeks, perWeek));
      if (!out) return;
      return res.json(out);
    } catch (e: any) { return res.status(500).json({ message: e.message || "Calendar failed" }); }
  });
}

// ── Sample output, only used when no AI key is configured on the server ──────────────────────────────
function demoWinners(reels: Reel[]) {
  const { scored, winners } = rank(reels);
  return {
    ranked: scored.map((r) => ({ id: r.id, hook: r.hook, views: r.views, saves: r.saves, shares: r.shares, score: r.score })),
    winnerIds: winners.map((w) => w.id),
    headline: "Your winners open with a personal result or a specific promise, and stay under 45 seconds.",
    formula: {
      hookStyles: ["Personal loss or mistake: \"I lost 14 clients before I learned this\"", "Specific promise with a number: \"3 DM scripts that book calls\"", "Insider reveal: \"Nobody tells you this about...\""],
      idealLengthSec: [33, 44],
      openers: ["I lost... before I learned...", "3 ... that ...", "Nobody tells you this about..."],
      topics: ["Client acquisition", "DM scripts", "Offers"],
      structure: ["Bold claim in the first second", "One proof or story beat", "The method in 2-3 steps", "Single call to action"],
      doMore: ["Lead with a result or a mistake", "Use numbers in the first line", "Keep it under 45 seconds"],
      stopDoing: ["Starting with \"Hey guys\"", "Updates with no promise", "Videos over 60 seconds"],
    },
    winnerNotes: winners.slice(0, 3).map((w) => ({ hook: w.hook, why: "High saves and shares relative to views." })),
  };
}
function demoScore() {
  return { score: 72, verdict: "Close to your winners, but the opening is soft.", matches: ["Short and direct", "Ends with one call to action"], gaps: ["No number or personal result in the first line", "Runs longer than your 33-44s sweet spot"], fixHook: "I lost 14 clients before I learned this one rule", fixes: ["Lead with the result", "Cut the intro sentence", "Add one proof beat"] };
}
function demoViral(niche: string) {
  return {
    breakdown: { hook: { type: "Curiosity gap with a personal stake", why: "It promises a hidden rule and shows a cost, so people stay to find out." }, pacing: "A cut every 2-3 seconds, payoff at the 20 second mark.", structure: [{ beat: "Hook", detail: "Bold claim in one line" }, { beat: "Proof", detail: "A quick story with a number" }, { beat: "Method", detail: "Three short steps" }, { beat: "CTA", detail: "Comment a keyword" }], whyItWorked: ["Specific number", "Clear payoff", "Easy to save"], triggers: ["Curiosity", "Fear of loss"] },
    rewrite: { hook: `The one mistake that costs ${niche || "coaches"} their best clients`, script: "The one mistake that costs you your best clients. I made it for two years. Here is what to do instead: first, reply within the hour. Second, ask one question. Third, send one next step. Comment GUIDE and I will send the script.", caption: "Save this for your next client call.", cta: "Comment GUIDE" },
  };
}
function demoHooks(base: string) {
  const b = (base || "this").slice(0, 60);
  const v = [
    ["Curiosity gap", `Nobody tells you this about ${b}`, 88, "Vague about the payoff"],
    ["Number", `3 things I wish I knew about ${b}`, 84, "Common format"],
    ["Story", `I lost a client over ${b}. Here is what changed`, 81, "Needs a clear result"],
    ["Contrarian", `Stop doing ${b} the way everyone says`, 78, "Risk of sounding preachy"],
    ["Direct callout", `If you struggle with ${b}, watch this`, 70, "Less curiosity"],
    ["Pain point", `Why ${b} keeps failing for you`, 66, "Negative framing"],
  ];
  return { variations: v.map(([angle, hook, score, weakness]) => ({ angle, hook, score, weakness })), best: 0 };
}
function demoReport() {
  return {
    metrics: { reels: 8, views: 645000, saves: 22000, shares: 12000, likes: 32000, usedLast7Days: false },
    headline: "Reels with a number or a personal result in the first line got 20x the views of generic updates.",
    worked: [{ title: "I lost 14 clients before I learned this one rule", why: "Personal stake, short, strong saves." }, { title: "3 DM scripts that book calls while you sleep", why: "Specific promise, most saved reel." }],
    flopped: [{ title: "Hey guys, quick update on my week", why: "No promise in the first second and 74s long." }, { title: "Today I want to talk about content strategy", why: "Generic opener, no payoff." }],
    nextPosts: [{ hook: "I lost a client over one missed DM. Here is the fix", format: "Talking head, 35s", why: "Repeats your best personal-loss hook." }, { hook: "3 follow-up messages that win back cold leads", format: "Screen recording voiceover, 40s", why: "Numbered promise like your top saved reel." }, { hook: "The offer I stopped selling and why", format: "Talking head, 38s", why: "Insider reveal, your third winning style." }],
    oneChange: "Open every reel with a number or a personal result, and keep it under 45 seconds.",
    generatedAt: new Date().toISOString(),
  };
}
function demoCalendar(niche: string, weeks: number, perWeek: number) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const goals = ["reach", "trust", "reach", "sales", "trust", "reach", "trust"];
  const hooks = ["I lost 14 clients before I learned this", "3 DM scripts that book calls", "Nobody tells you this about your first 1,000", "The $0 offer that got me 9 clients", "Stop posting every day, do this", "The follow-up that doubled replies", "What my best clients have in common"];
  const w = Math.min(4, Math.max(1, weeks || 2)), p = Math.min(7, Math.max(2, perWeek || 4));
  const posts: any[] = [];
  for (let i = 0; i < w; i++) for (let j = 0; j < p; j++) {
    const k = (i * p + j) % hooks.length;
    posts.push({ week: i + 1, day: days[Math.floor((j * 7) / p)], topic: niche || "Client acquisition", hook: hooks[k], format: j % 2 ? "Screen recording voiceover" : "Talking head", goal: j === p - 1 ? "sales" : goals[k], basedOn: "Personal result or numbered promise" });
  }
  return { posts };
}
