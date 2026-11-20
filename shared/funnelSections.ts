/**
 * Funnel step sections: schema, robust AI-JSON parsing, sanitizing and validation.
 *
 * Shared by every server path that writes `funnel_steps.sections` (manual builder
 * save, funnel chat copilot, per-step AI chat / AI generate) so AI output can never
 * be more broken than hand-built content.
 */

// ── Schema ────────────────────────────────────────────────────────────────────

/** Section type → "data" shape (used in AI prompts). Mirrors FunnelStepBuilder's SectionType. */
export const FUNNEL_SECTION_SCHEMAS: Record<string, string> = {
  hero: `{headline, subheadline, ctaText, badge?}`,
  video: `{caption, videoUrl}`,
  benefits: `{title, items: string[]}`,
  testimonials: `{testimonials: [{name, role, quote}]}`,
  pricing: `{pricingTitle, price, originalPrice, pricingFeatures: string[], ctaText}`,
  faq: `{faqs: [{question, answer}]}`,
  cta: `{headline, subtext, ctaText, ctaUrl?}`,
  form: `{formTitle, formSubtext, buttonText, fields: ["name","email"]}`,
  countdown: `{countdownTitle, targetDate: "YYYY-MM-DDTHH:mm"}`,
  bio: `{name, role, bio}`,
  guarantee: `{title, body, badgeText}`,
  order_bump: `{title, description, price, ctaText}`,
  urgency_bar: `{text, subtext}`,
  stats: `{label, stats: [{number, desc}]}`,
  press: `{label, logos: string[]}`,
  comparison: `{title, headers: string[], rows: string[][]}`,
  two_step_form: `{headline, buttonText, formTitle, buttonText2, fields: ["name","email"]}`,
  image: `{src, alt, caption}`,
  sticky_cta: `{text, ctaText, showAfterScroll}`,
  exit_intent: `{headline, body, ctaText, dismissText}`,
  divider: `{}`,
};

/** Types the AI may emit (social_proof_popup exists in the builder but is not offered to the AI). */
export const FUNNEL_SECTION_TYPES: string[] = [...Object.keys(FUNNEL_SECTION_SCHEMAS), "social_proof_popup"];
const KNOWN_TYPES = new Set(FUNNEL_SECTION_TYPES);

/** Fields that must be string[] per section type. */
const STRING_ARRAY_FIELDS: Record<string, string[]> = {
  benefits: ["items"],
  pricing: ["pricingFeatures"],
  press: ["logos"],
  comparison: ["headers"],
  form: ["fields"],
  two_step_form: ["fields"],
  social_proof_popup: ["names", "locations"],
};
/** Fields that must be an array of plain objects per section type. */
const OBJECT_ARRAY_FIELDS: Record<string, string[]> = {
  testimonials: ["testimonials"],
  faq: ["faqs"],
  stats: ["stats"],
};
const FORM_FIELD_NAMES = new Set(["name", "email", "phone"]);

const MAX_TEXT = 4000;
const MAX_SECTIONS = 60;
const MAX_DEPTH = 6;

// ── JSON parsing ──────────────────────────────────────────────────────────────

export class FunnelAiResponseError extends Error {
  constructor(message: string) { super(message); this.name = "FunnelAiResponseError"; }
}

/** Return the first balanced top-level `{...}` in `text` (string/escape aware), or null. */
export function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === "\"") inStr = false;
      continue;
    }
    if (c === "\"") inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

/** Remove trailing commas before `}` / `]`, outside of strings. */
export function stripTrailingCommas(json: string): string {
  let out = "", inStr = false, esc = false;
  for (let i = 0; i < json.length; i++) {
    const c = json[i];
    if (inStr) {
      out += c;
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === "\"") inStr = false;
      continue;
    }
    if (c === "\"") { inStr = true; out += c; continue; }
    if (c === ",") {
      let j = i + 1;
      while (j < json.length && /\s/.test(json[j])) j++;
      if (json[j] === "}" || json[j] === "]") continue; // drop it
    }
    out += c;
  }
  return out;
}

/**
 * Parse an AI response into a JSON object: strips markdown code fences and any
 * prose around the object, then JSON.parse with a repair pass for trailing commas.
 * Throws FunnelAiResponseError when nothing parseable is found.
 */
export function parseAiJsonObject(raw: unknown): any {
  if (raw && typeof raw === "object") return raw;
  if (typeof raw !== "string" || !raw.trim()) throw new FunnelAiResponseError("Empty AI response");
  let text = raw.replace(/^﻿/, "").trim();
  const fenced = text.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  if (fenced && fenced[1].includes("{")) text = fenced[1].trim();
  else text = text.replace(/^```(?:json|JSON)?\s*/, "").replace(/\s*```\s*$/, "").trim();

  const candidates: string[] = [text];
  const obj = extractFirstJsonObject(text);
  if (obj && obj !== text) candidates.push(obj);
  for (const c of candidates) {
    try { return JSON.parse(c); } catch {}
    try { return JSON.parse(stripTrailingCommas(c)); } catch {}
  }
  // Unbalanced (truncated) or otherwise broken
  throw new FunnelAiResponseError("AI response was not valid JSON");
}

// ── String sanitizing ─────────────────────────────────────────────────────────

/**
 * JSON structural fragments that never occur in real marketing copy:
 * `}}`, `]}`, `}]`, `},{`, `],[`, `},[`, `],{`, `})`, `])`, or a leaked `{"key":`.
 * An optional leading quote / close-paren is included so the cut lands before them.
 */
const JSON_FRAGMENT = /["'`]?\s*(?:\)\s*)*(?:\}\s*\}|\]\s*\}|\}\s*\]|\}\s*,\s*[{[]|\]\s*,\s*[{[]|\}\s*\)|\]\s*\)|\{\s*"[A-Za-z_][A-Za-z0-9_]*"\s*:)/;

/** True when `s` contains leaked JSON syntax. */
export function hasJsonFragment(s: string): boolean {
  return JSON_FRAGMENT.test(s);
}

export type SanitizeIssue = string;

/**
 * Clean a copy string: strip control characters, cut at the first leaked JSON
 * fragment (the leaked tail is returned so nested sections can be recovered),
 * drop dangling structural characters, and cap the length.
 */
export function sanitizeCopyText(input: string): { text: string; leaked: string | null } {
  let s = input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  let leaked: string | null = null;
  let removed = "";
  const m = JSON_FRAGMENT.exec(s);
  if (m) {
    leaked = s.slice(m.index);
    removed += leaked;
    s = s.slice(0, m.index);
  }
  // Dangling structural junk at the end, e.g. `good"}` or `good',[`
  const tail = s.match(/[\s"'`()[\]{},;:]+$/);
  if (tail && /[{}[\]]/.test(tail[0])) {
    removed = tail[0] + removed;
    s = s.slice(0, tail.index);
  }
  s = s.trim();
  // Keep a legitimately closed parenthesis, e.g. "Results (fast)}" → "Results (fast)"
  if (removed.includes(")")) {
    const open = (s.match(/\(/g) || []).length, close = (s.match(/\)/g) || []).length;
    if (open > close) s += ")";
  }
  if (s.length > MAX_TEXT) s = s.slice(0, MAX_TEXT).trimEnd() + "…";
  return { text: s, leaked };
}

// ── Section sanitizing ────────────────────────────────────────────────────────

export type FunnelSection = { id: string; type: string; data: Record<string, any>; [k: string]: any };

const isPlainObject = (v: any): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/** A nested object that is itself a section (e.g. a `form` dropped inside `benefits`). */
function isSectionLike(v: any): boolean {
  if (!isPlainObject(v) || typeof v.type !== "string" || !KNOWN_TYPES.has(v.type)) return false;
  return isPlainObject(v.data) || typeof v.id === "string" || Object.keys(v).some(k => k !== "type");
}

/** Try to recover section objects from leaked JSON text like `'),[{"type":"form",...}`. */
function recoverSectionsFromText(text: string): any[] {
  const found: any[] = [];
  let rest = text;
  for (let guard = 0; guard < 10; guard++) {
    const idx = rest.indexOf("{");
    if (idx < 0) break;
    const objText = extractFirstJsonObject(rest.slice(idx));
    if (!objText) break;
    try {
      const obj = JSON.parse(stripTrailingCommas(objText));
      if (isSectionLike(obj)) found.push(obj);
      else if (Array.isArray(obj?.sections)) found.push(...obj.sections.filter(isSectionLike));
    } catch {}
    rest = rest.slice(idx + objText.length);
  }
  return found;
}

type Ctx = { hoisted: any[]; issues: SanitizeIssue[]; where: string };

/** Pick a usable string out of an object that was put where a string belongs. */
function objectToText(o: Record<string, any>): string | null {
  for (const k of ["text", "title", "label", "name", "value", "item", "benefit", "feature", "headline", "description"]) {
    if (typeof o[k] === "string" && o[k].trim()) return o[k];
  }
  return null;
}

function cleanString(s: string, ctx: Ctx, path: string): string {
  const { text, leaked } = sanitizeCopyText(s);
  if (leaked) {
    ctx.issues.push(`${ctx.where}${path}: removed leaked JSON text`);
    const rec = recoverSectionsFromText(leaked);
    if (rec.length) {
      ctx.issues.push(`${ctx.where}${path}: recovered ${rec.length} section(s) from leaked JSON`);
      ctx.hoisted.push(...rec);
    }
  }
  return text;
}

function cleanValue(v: any, ctx: Ctx, path: string, depth: number): any {
  if (typeof v === "string") return cleanString(v, ctx, path);
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "boolean" || v === null) return v;
  if (depth > MAX_DEPTH) { ctx.issues.push(`${ctx.where}${path}: too deeply nested, dropped`); return undefined; }
  if (Array.isArray(v)) {
    const out: any[] = [];
    v.forEach((el, i) => {
      if (isSectionLike(el)) {
        ctx.issues.push(`${ctx.where}${path}[${i}]: hoisted nested "${el.type}" section to top level`);
        ctx.hoisted.push(el);
        return;
      }
      const c = cleanValue(el, ctx, `${path}[${i}]`, depth + 1);
      if (c === undefined || c === "") return;
      if (isPlainObject(c) && Object.keys(c).length === 0) return;
      out.push(c);
    });
    return out;
  }
  if (isPlainObject(v)) {
    const out: Record<string, any> = {};
    for (const [k, val] of Object.entries(v)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      if (isSectionLike(val)) {
        ctx.issues.push(`${ctx.where}${path}.${k}: hoisted nested "${val.type}" section to top level`);
        ctx.hoisted.push(val);
        continue;
      }
      if (k === "sections" && Array.isArray(val)) {
        const nested = val.filter(isSectionLike);
        if (nested.length) {
          ctx.issues.push(`${ctx.where}${path}.sections: hoisted ${nested.length} nested section(s) to top level`);
          ctx.hoisted.push(...nested);
        }
        continue;
      }
      const c = cleanValue(val, ctx, `${path}.${k}`, depth + 1);
      if (c !== undefined) out[k] = c;
    }
    return out;
  }
  return undefined; // functions, symbols, bigint…
}

/** Enforce the per-type array shapes the renderer relies on. */
function coerceShapes(type: string, data: Record<string, any>, ctx: Ctx) {
  for (const f of STRING_ARRAY_FIELDS[type] || []) {
    if (!(f in data)) continue;
    const arr = Array.isArray(data[f]) ? data[f] : typeof data[f] === "string" ? [data[f]] : [];
    data[f] = arr
      .map((el: any) => typeof el === "string" ? el : typeof el === "number" ? String(el) : isPlainObject(el) ? objectToText(el) : null)
      .filter((el: any): el is string => typeof el === "string" && el.trim() !== "");
    if (f === "fields") {
      data[f] = data[f].map((x: string) => x.toLowerCase().trim()).filter((x: string) => FORM_FIELD_NAMES.has(x));
      if (!data[f].includes("email")) data[f].push("email");
    }
  }
  for (const f of OBJECT_ARRAY_FIELDS[type] || []) {
    if (!(f in data)) continue;
    const arr = Array.isArray(data[f]) ? data[f] : [];
    const kept = arr.filter(isPlainObject);
    if (kept.length !== arr.length) ctx.issues.push(`${ctx.where}.${f}: dropped ${arr.length - kept.length} malformed item(s)`);
    data[f] = kept;
  }
  if (type === "comparison" && "rows" in data) {
    data.rows = (Array.isArray(data.rows) ? data.rows : [])
      .filter(Array.isArray)
      .map((r: any[]) => r.map(c => typeof c === "string" ? c : c == null ? "" : String(c)));
  }
}

const SECTION_META_KEYS = new Set(["id", "type", "data"]);

function sanitizeOne(raw: any, ctx: Ctx, newId: () => string): FunnelSection | null {
  if (!isPlainObject(raw)) { ctx.issues.push(`${ctx.where}: dropped non-object section`); return null; }
  const type = typeof raw.type === "string" ? raw.type.trim() : "";
  if (!KNOWN_TYPES.has(type)) { ctx.issues.push(`${ctx.where}: dropped section with unknown type "${String(raw.type).slice(0, 40)}"`); return null; }

  // Data may arrive flattened onto the section (no "data" key) — collect it.
  const extras: Record<string, any> = {};
  let dataIn: Record<string, any> = isPlainObject(raw.data) ? { ...raw.data } : {};
  for (const [k, v] of Object.entries(raw)) {
    if (SECTION_META_KEYS.has(k)) continue;
    if (isSectionLike(v) || (k === "sections" && Array.isArray(v))) { extras[k] = v; continue; }
    if (!isPlainObject(raw.data)) dataIn[k] = v;
    else extras[k] = v;
  }
  const localCtx: Ctx = { ...ctx, where: `${ctx.where}(${type})` };
  const data = cleanValue(dataIn, localCtx, ".data", 0) as Record<string, any>;
  // Section-level extra keys: hoist nested sections, keep small primitive metadata only.
  const rest: Record<string, any> = {};
  const cleanedExtras = cleanValue(extras, localCtx, "", 0) as Record<string, any>;
  for (const [k, v] of Object.entries(cleanedExtras)) {
    if (["string", "number", "boolean"].includes(typeof v)) rest[k] = v;
  }
  coerceShapes(type, data, localCtx);
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim().slice(0, 64) : newId();
  return { ...rest, id, type, data };
}

const defaultNewId = () => Math.random().toString(36).slice(2, 10);

/**
 * Sanitize an AI-produced sections array:
 * - every section becomes a top-level `{id, type, data}` with a known type
 * - section objects nested inside another section (anywhere in its fields) are
 *   hoisted to the top level right after their parent
 * - leaked JSON syntax is cut out of every string (and any section it was
 *   smuggling is recovered and hoisted)
 * - per-type array shapes are enforced (items: string[], faqs: object[] …)
 */
export function sanitizeFunnelSections(
  input: unknown,
  opts: { newId?: () => string; where?: string } = {},
): { sections: FunnelSection[]; issues: SanitizeIssue[] } {
  const issues: SanitizeIssue[] = [];
  const newId = opts.newId || defaultNewId;
  const where = opts.where || "sections";
  if (!Array.isArray(input)) return { sections: [], issues: [`${where}: not an array`] };

  const out: FunnelSection[] = [];
  const queue: { raw: any; depth: number }[] = input.map(raw => ({ raw, depth: 0 }));
  while (queue.length && out.length < MAX_SECTIONS) {
    const { raw, depth } = queue.shift()!;
    const ctx: Ctx = { hoisted: [], issues, where: `${where}[${out.length}]` };
    const s = sanitizeOne(raw, ctx, newId);
    if (s) out.push(s);
    // Hoisted sections go right after their parent, before the remaining queue.
    if (ctx.hoisted.length && depth < MAX_DEPTH) queue.unshift(...ctx.hoisted.map(h => ({ raw: h, depth: depth + 1 })));
  }
  if (queue.length) issues.push(`${where}: truncated to ${MAX_SECTIONS} sections`);

  // Unique ids
  const seen = new Set<string>();
  for (const s of out) {
    if (seen.has(s.id)) s.id = newId();
    seen.add(s.id);
  }
  return { sections: out, issues };
}

// ── Validation ────────────────────────────────────────────────────────────────

function findNested(v: any, path: string, depth: number, errors: string[], checkText: boolean) {
  if (errors.length > 20 || depth > MAX_DEPTH + 2) return;
  if (typeof v === "string") {
    if (checkText && hasJsonFragment(v)) errors.push(`${path}: contains leaked JSON syntax`);
    return;
  }
  if (Array.isArray(v)) { v.forEach((el, i) => findNested(el, `${path}[${i}]`, depth + 1, errors, checkText)); return; }
  if (isPlainObject(v)) {
    if (depth > 0 && isSectionLike(v)) errors.push(`${path}: "${v.type}" section nested inside another section`);
    for (const [k, val] of Object.entries(v)) findNested(val, `${path}.${k}`, depth + 1, errors, checkText);
  }
}

/**
 * Validate a sections array before it is written to funnel_steps.sections.
 *
 * - "structure" (manual builder save): an array of `{type: string, data?: object}` objects.
 * - "strict" (AI output, after sanitizeFunnelSections): additionally requires known
 *   types, string ids, object data, no section nested inside another section, no
 *   leaked JSON syntax in copy, and the per-type array shapes.
 */
export function validateFunnelSections(
  sections: unknown,
  level: "structure" | "strict" = "strict",
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(sections)) return { ok: false, errors: ["sections must be an array"] };
  if (sections.length > 200) errors.push("too many sections");
  sections.forEach((s: any, i: number) => {
    const p = `sections[${i}]`;
    if (!isPlainObject(s)) { errors.push(`${p}: must be an object`); return; }
    if (typeof s.type !== "string" || !s.type) { errors.push(`${p}: missing type`); return; }
    if (s.data !== undefined && !isPlainObject(s.data)) errors.push(`${p}.data: must be an object`);
    if (level === "structure") return;
    if (!KNOWN_TYPES.has(s.type)) errors.push(`${p}: unknown type "${s.type}"`);
    if (typeof s.id !== "string" || !s.id) errors.push(`${p}: missing id`);
    if (!isPlainObject(s.data)) return;
    for (const [k, v] of Object.entries(s)) {
      if (k !== "data") findNested(v, `${p}.${k}`, 1, errors, false);
    }
    findNested(s.data, `${p}.data`, 1, errors, true);
    for (const f of STRING_ARRAY_FIELDS[s.type] || []) {
      if (f in s.data && !(Array.isArray(s.data[f]) && s.data[f].every((x: any) => typeof x === "string"))) {
        errors.push(`${p}.data.${f}: must be an array of strings`);
      }
    }
    for (const f of OBJECT_ARRAY_FIELDS[s.type] || []) {
      if (f in s.data && !(Array.isArray(s.data[f]) && s.data[f].every(isPlainObject))) {
        errors.push(`${p}.data.${f}: must be an array of objects`);
      }
    }
  });
  return errors.length ? { ok: false, errors } : { ok: true };
}

/** Sanitize then strictly validate; throws FunnelAiResponseError if still invalid. */
export function cleanAiFunnelSections(
  input: unknown,
  opts: { newId?: () => string; where?: string } = {},
): { sections: FunnelSection[]; issues: SanitizeIssue[] } {
  const result = sanitizeFunnelSections(input, opts);
  const v = validateFunnelSections(result.sections, "strict");
  if (!v.ok) throw new FunnelAiResponseError(`Invalid sections: ${v.errors.slice(0, 3).join("; ")}`);
  return result;
}
