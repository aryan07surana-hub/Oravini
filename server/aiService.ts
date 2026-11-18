/**
 * Central AI service — provider layer.
 *
 * Default provider: Groq (OpenAI-compatible, key from GROQ_API_KEY only).
 * Fallback provider: OpenRouter (key from API_KEY_1 / OPENROUTER_API_KEY / OPENROUTER_KEY / OR_API_KEY / AI_API_KEY).
 *
 * Every text call tries Groq first. If Groq is unconfigured or errors, the call falls back to
 * OpenRouter. Features marked quality-critical (Content Coach, /api/coach/*) always fall back;
 * non-critical features (platform chat, refine-text, everything else) also fall back so users
 * never see a hard failure just because Groq's free tier is rate limiting.
 *
 * Feature labels / critical flags can be passed per call, or set for a whole request with the
 * aiFeature() express middleware (AsyncLocalStorage), so nested helper calls inherit them.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import type { Request, Response, NextFunction } from "express";

const OR_BASE = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions";
const TIMEOUT_MS = 30000;
const OR_HEADERS = { "HTTP-Referer": "https://oravini.com", "X-Title": "Oravini" };

export const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";

// OpenRouter model names (fallback chain)
const DEFAULT_MODELS = [
  "meta-llama/llama-3.3-70b-instruct",
  "meta-llama/llama-3.1-8b-instruct",
];

export type AIProvider = "groq" | "openrouter";

export interface AIOptions {
  maxTokens?: number;
  temperature?: number;
  /** OpenRouter model id (used for the OpenRouter fallback). */
  model?: string;
  /** Groq model id (defaults to llama-3.3-70b-versatile). */
  groqModel?: string;
  /** Feature label for logs, e.g. "content-coach". */
  feature?: string;
  /** Quality-critical feature: must fall back to OpenRouter if Groq fails. */
  critical?: boolean;
}

// ── Request-scoped feature context ──────────────────────────────────────────
interface AIContext { feature: string; critical: boolean }
const aiContext = new AsyncLocalStorage<AIContext>();

/** Express middleware: tag every AI call made while handling this request. */
export function aiFeature(feature: string, opts: { critical?: boolean } = {}) {
  return (_req: Request, _res: Response, next: NextFunction) => {
    aiContext.run({ feature, critical: !!opts.critical }, () => next());
  };
}

function resolveContext(opts: AIOptions): AIContext {
  const ctx = aiContext.getStore();
  return {
    feature: opts.feature ?? ctx?.feature ?? "general",
    critical: opts.critical ?? ctx?.critical ?? false,
  };
}

// ── Keys ────────────────────────────────────────────────────────────────────
function getGroqKey(): string | undefined {
  return process.env.GROQ_API_KEY || undefined;
}

function getOpenRouterKeyOptional(): string | undefined {
  return (
    process.env.API_KEY_1 ||
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENROUTER_KEY ||
    process.env.OR_API_KEY ||
    process.env.AI_API_KEY ||
    undefined
  );
}

function getKey(): string {
  const key = getOpenRouterKeyOptional();
  if (!key) {
    const available = Object.keys(process.env).filter(k =>
      k.includes("KEY") || k.includes("TOKEN") || k.includes("SECRET")
    ).join(", ");
    console.error("[aiService] No OpenRouter key found. Available env keys:", available || "none");
    throw new Error("AI API key not configured");
  }
  return key;
}

// Log key status on module load
const _startupKey = getOpenRouterKeyOptional();
console.log(`[aiService] Groq key: ${getGroqKey() ? "FOUND (default provider)" : "MISSING — set GROQ_API_KEY; all calls will use OpenRouter"}`);
console.log(`[aiService] OpenRouter key: ${_startupKey ? "FOUND (" + _startupKey.slice(0, 12) + "...)" : "MISSING — set API_KEY_1 or OPENROUTER_API_KEY on Render"}`);

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  try { JSON.parse(trimmed); return trimmed; } catch {}
  const stripped = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try { JSON.parse(stripped); return stripped; } catch {}
  const objMatch = stripped.match(/(\{[\s\S]*\})/);
  if (objMatch) { try { JSON.parse(objMatch[1]); return objMatch[1]; } catch {} }
  const arrMatch = stripped.match(/(\[[\s\S]*\])/);
  if (arrMatch) { try { JSON.parse(arrMatch[1]); return arrMatch[1]; } catch {} }
  throw new Error("No valid JSON found in AI response");
}

// ── Low-level provider calls ────────────────────────────────────────────────
async function postCompletion(provider: AIProvider, key: string, body: Record<string, any>, timeoutMs = TIMEOUT_MS): Promise<any> {
  const url = provider === "groq" ? GROQ_BASE : OR_BASE;
  const headers: Record<string, string> = { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" };
  if (provider === "openrouter") Object.assign(headers, OR_HEADERS);
  const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
  if (r.status === 429) {
    // OpenRouter: brief backoff before trying the next model. Groq: fall back immediately.
    if (provider === "openrouter") await new Promise(res => setTimeout(res, 2000));
    throw new Error("Rate limited (429)");
  }
  if (!r.ok) { const t = await r.text(); throw new Error(`HTTP ${r.status}: ${t.slice(0, 200)}`); }
  const data: any = await r.json();
  if (data?.error) throw new Error(data.error.message || "AI error");
  return data;
}

/**
 * Run a chat-completions request with Groq first, then the OpenRouter model chain.
 * `body` must not include `model`. `validate` can reject a response (e.g. empty / bad JSON)
 * so that the next provider is tried. Returns the raw response JSON and the provider used.
 */
async function completeWithFallback<T>(
  label: string,
  body: Record<string, any>,
  opts: AIOptions,
  pick: (data: any) => T,
): Promise<{ result: T; provider: AIProvider; model: string }> {
  const { feature, critical } = resolveContext(opts);
  const groqKey = getGroqKey();
  const errors: string[] = [];

  if (groqKey) {
    const model = opts.groqModel || GROQ_DEFAULT_MODEL;
    try {
      const data = await postCompletion("groq", groqKey, { ...body, model });
      const result = pick(data);
      console.log(`[aiService] ${label} feature=${feature} provider=groq model=${model}`);
      return { result, provider: "groq", model };
    } catch (e: any) {
      errors.push(`groq/${model}: ${e.message}`);
      console.warn(`[aiService] ${label} feature=${feature} groq failed (${e.message}) — falling back to OpenRouter${critical ? " [quality-critical]" : ""}`);
    }
  }

  const orKey = getOpenRouterKeyOptional();
  if (!orKey) {
    if (!groqKey) getKey(); // throws the standard "not configured" error with diagnostics
    throw new Error(`AI generation failed: ${errors.join(" | ")}`);
  }
  const models = opts.model ? [opts.model] : DEFAULT_MODELS;
  for (const m of models) {
    try {
      const data = await postCompletion("openrouter", orKey, { ...body, model: m });
      const result = pick(data);
      console.log(`[aiService] ${label} feature=${feature} provider=openrouter model=${m}${groqKey ? " (fallback)" : " (groq unconfigured)"}`);
      return { result, provider: "openrouter", model: m };
    } catch (e: any) {
      errors.push(`openrouter/${m}: ${e.message}`);
      console.warn(`[${label}] ${m}: ${e.message}`);
    }
  }
  throw new Error(`AI generation failed: ${errors[errors.length - 1] || "unknown error"}`);
}

function pickText(data: any): string {
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response");
  return text;
}

export async function aiChat(
  systemPrompt: string,
  userPrompt: string,
  options: AIOptions = {}
): Promise<string> {
  const { maxTokens = 3000, temperature = 0.7 } = options;
  const { result } = await completeWithFallback("aiChat", {
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    temperature,
    max_tokens: Math.min(maxTokens, 32768),
  }, options, pickText);
  return result;
}

export async function aiChatJson(
  systemPrompt: string,
  userPrompt: string,
  options: AIOptions = {}
): Promise<string> {
  const { maxTokens = 3000, temperature = 0.6 } = options;
  try {
    const { result } = await completeWithFallback("aiChatJson", {
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature,
      max_tokens: Math.min(maxTokens, 32768),
      response_format: { type: "json_object" },
    }, options, (data) => extractJson(pickText(data)));
    return result;
  } catch (e: any) {
    throw new Error(e.message.replace(/^AI generation failed/, "AI JSON generation failed"));
  }
}

/**
 * Raw OpenAI-compatible chat completion (e.g. for tool calling). `body` must not include `model`.
 * Returns the full response JSON from whichever provider answered.
 */
export async function aiChatCompletion(body: Record<string, any>, options: AIOptions = {}): Promise<any> {
  const { result } = await completeWithFallback("aiChatCompletion", body, options, (data) => {
    if (!data?.choices?.[0]?.message) throw new Error("Empty response");
    return data;
  });
  return result;
}

/**
 * Streaming chat completion. Tries Groq first; falls back to OpenRouter only if Groq fails
 * before any token has been emitted (a stream can't be restarted once the client has text).
 */
export async function aiChatStream(
  messages: { role: string; content: string }[],
  onToken: (token: string) => void,
  options: AIOptions = {}
): Promise<string> {
  const { maxTokens = 1400, temperature = 0.7 } = options;
  const { feature, critical } = resolveContext(options);
  const groqKey = getGroqKey();
  const orKey = getOpenRouterKeyOptional();
  const attempts: { provider: AIProvider; key: string; model: string }[] = [];
  if (groqKey) attempts.push({ provider: "groq", key: groqKey, model: options.groqModel || GROQ_DEFAULT_MODEL });
  if (orKey) attempts.push({ provider: "openrouter", key: orKey, model: options.model || DEFAULT_MODELS[0] });
  if (!attempts.length) getKey(); // throws "AI API key not configured"

  let lastError = "";
  for (const a of attempts) {
    let emitted = false;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${a.key}` };
      if (a.provider === "openrouter") Object.assign(headers, OR_HEADERS);
      const r = await fetch(a.provider === "groq" ? GROQ_BASE : OR_BASE, {
        method: "POST",
        headers,
        body: JSON.stringify({ model: a.model, messages, temperature, max_tokens: maxTokens, stream: true }),
      });
      if (!r.ok || !r.body) {
        let msg = String(r.status);
        try { const err = await r.json() as any; msg = err?.error?.message || msg; } catch {}
        throw new Error("AI error: " + msg);
      }
      console.log(`[aiService] aiChatStream feature=${feature} provider=${a.provider} model=${a.model}${a.provider === "openrouter" && groqKey ? " (fallback)" : ""}`);
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let full = "";
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") continue;
          try {
            const chunk = JSON.parse(raw);
            const token: string = chunk.choices?.[0]?.delta?.content ?? "";
            if (token) { full += token; emitted = true; onToken(token); }
          } catch { /* ignore malformed chunks */ }
        }
      }
      return full;
    } catch (e: any) {
      lastError = e.message;
      if (emitted) throw e; // can't fall back mid-stream
      console.warn(`[aiService] aiChatStream feature=${feature} ${a.provider} failed (${e.message})${a.provider === "groq" && orKey ? ` — falling back to OpenRouter${critical ? " [quality-critical]" : ""}` : ""}`);
    }
  }
  throw new Error(lastError || "AI stream failed");
}

export async function aiVisionJson(
  systemPrompt: string,
  userPrompt: string,
  base64Image: string,
  mimeType = "image/jpeg",
  maxTokens = 4096
): Promise<string> {
  const key = getKey();
  const visionModels = [
    "meta-llama/llama-3.2-11b-vision-instruct",
    "openai/gpt-4o-mini",
  ];

  let lastError = "";
  for (const model of visionModels) {
    try {
      const r = await fetch(OR_BASE, {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json", ...OR_HEADERS },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            ]},
          ],
          temperature: 0.5,
          max_tokens: maxTokens,
        }),
        signal: AbortSignal.timeout(45000),
      });
      if (r.status === 429) { await new Promise(res => setTimeout(res, 2000)); throw new Error("Rate limited"); }
      if (!r.ok) { const t = await r.text(); throw new Error(`HTTP ${r.status}: ${t.slice(0, 200)}`); }
      const data: any = await r.json();
      if (data?.error) throw new Error(data.error.message);
      const text = data?.choices?.[0]?.message?.content;
      if (text) {
        const json = extractJson(text);
        console.log(`[aiService] aiVisionJson feature=${resolveContext({}).feature} provider=openrouter model=${model}`);
        return json;
      }
      throw new Error("Empty response");
    } catch (e: any) {
      lastError = e.message;
      console.warn(`[aiVisionJson] ${model}: ${lastError}`);
    }
  }
  throw new Error(`Vision AI failed: ${lastError}`);
}

// Convenience re-exports matching old Groq helper signatures
export const callAI = aiChat;
export const callAIJson = aiChatJson;
