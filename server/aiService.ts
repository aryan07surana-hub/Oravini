/**
 * Central AI service — OpenRouter only.
 */

const OR_BASE = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 30000;
const OR_HEADERS = { "HTTP-Referer": "https://oravini.com", "X-Title": "Oravini" };

// OpenRouter model names
const DEFAULT_MODELS = [
  "meta-llama/llama-3.3-70b-instruct",
  "meta-llama/llama-3.1-8b-instruct",
];

function getKey(): string {
  const key = process.env.API_KEY_1 || process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("AI API key not configured (set API_KEY_1 or OPENROUTER_API_KEY)");
  return key;
}

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

export async function aiChat(
  systemPrompt: string,
  userPrompt: string,
  options: { maxTokens?: number; temperature?: number; model?: string } = {}
): Promise<string> {
  const { maxTokens = 3000, temperature = 0.7, model } = options;
  const key = getKey();
  const models = model ? [model] : DEFAULT_MODELS;

  let lastError = "";
  for (const m of models) {
    try {
      const r = await fetch(OR_BASE, {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json", ...OR_HEADERS },
        body: JSON.stringify({
          model: m,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          temperature,
          max_tokens: Math.min(maxTokens, 32768),
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (r.status === 429) { await new Promise(res => setTimeout(res, 2000)); throw new Error("Rate limited (429)"); }
      if (!r.ok) { const t = await r.text(); throw new Error(`HTTP ${r.status}: ${t.slice(0, 200)}`); }
      const data: any = await r.json();
      if (data?.error) throw new Error(data.error.message || "AI error");
      const text = data?.choices?.[0]?.message?.content;
      if (text) return text;
      throw new Error("Empty response");
    } catch (e: any) {
      lastError = e.message;
      console.warn(`[aiChat] ${m}: ${lastError}`);
    }
  }
  throw new Error(`AI generation failed: ${lastError}`);
}

export async function aiChatJson(
  systemPrompt: string,
  userPrompt: string,
  options: { maxTokens?: number; temperature?: number; model?: string } = {}
): Promise<string> {
  const { maxTokens = 3000, temperature = 0.6, model } = options;
  const key = getKey();
  const models = model ? [model] : DEFAULT_MODELS;

  let lastError = "";
  for (const m of models) {
    try {
      const r = await fetch(OR_BASE, {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json", ...OR_HEADERS },
        body: JSON.stringify({
          model: m,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          temperature,
          max_tokens: Math.min(maxTokens, 32768),
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (r.status === 429) { await new Promise(res => setTimeout(res, 2000)); throw new Error("Rate limited (429)"); }
      if (!r.ok) { const t = await r.text(); throw new Error(`HTTP ${r.status}: ${t.slice(0, 200)}`); }
      const data: any = await r.json();
      if (data?.error) throw new Error(data.error.message || "AI error");
      const text = data?.choices?.[0]?.message?.content;
      if (text) return extractJson(text);
      throw new Error("Empty response");
    } catch (e: any) {
      lastError = e.message;
      console.warn(`[aiChatJson] ${m}: ${lastError}`);
    }
  }
  throw new Error(`AI JSON generation failed: ${lastError}`);
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
      if (text) return extractJson(text);
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
