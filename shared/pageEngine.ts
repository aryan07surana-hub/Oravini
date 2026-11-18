// ─────────────────────────────────────────────────────────────────────────────
// Unified page engine — shared by the AI Page Studio (landing pages), funnel
// steps and the template gallery. A "page document" is { title, theme, sections }.
// Section types/fields are the funnel-step section schema (a superset of the
// legacy landing-page schema), so documents move freely between landing pages,
// funnel steps and templates.
// ─────────────────────────────────────────────────────────────────────────────

export const PAGE_SECTION_TYPES = [
  "hero", "urgency_bar", "video", "benefits", "stats", "press", "testimonials", "bio",
  "pricing", "comparison", "faq", "guarantee", "cta", "form", "two_step_form",
  "countdown", "image", "divider",
] as const;
export type PageSectionType = (typeof PAGE_SECTION_TYPES)[number];
export type PageSection = { id: string; type: string; data: Record<string, any> };

export type ThemeMode = "dark" | "light";
export type ThemeFont = "inter" | "jakarta" | "grotesk" | "playfair" | "dmserif" | "poppins";
export type ThemeRadius = "none" | "md" | "xl" | "full";
export type ThemeButton = "solid" | "gradient" | "outline" | "pill";
export type ThemeSurface = "flat" | "cards" | "bordered" | "glass";

export type PageTheme = {
  name: string;
  mode: ThemeMode;
  palette: {
    bg: string; surface: string; text: string; muted: string;
    primary: string; primaryText: string; accent: string; border: string;
  };
  headingFont: ThemeFont;
  bodyFont: ThemeFont;
  radius: ThemeRadius;
  button: ThemeButton;
  surface: ThemeSurface;
  /** Optional CSS background for the hero / page top (gradient). */
  heroBackground?: string;
};

export type PageDoc = { title: string; theme: PageTheme; sections: PageSection[] };

export const FONT_STACKS: Record<ThemeFont, { css: string; google: string }> = {
  inter:    { css: "'Inter', system-ui, sans-serif", google: "Inter:wght@400;500;600;700;800;900" },
  jakarta:  { css: "'Plus Jakarta Sans', system-ui, sans-serif", google: "Plus+Jakarta+Sans:wght@400;500;600;700;800" },
  grotesk:  { css: "'Space Grotesk', system-ui, sans-serif", google: "Space+Grotesk:wght@400;500;600;700" },
  playfair: { css: "'Playfair Display', Georgia, serif", google: "Playfair+Display:wght@500;600;700;800;900" },
  dmserif:  { css: "'DM Serif Display', Georgia, serif", google: "DM+Serif+Display" },
  poppins:  { css: "'Poppins', system-ui, sans-serif", google: "Poppins:wght@400;500;600;700;800" },
};

export const THEME_PRESETS: Record<string, PageTheme> = {
  midnight_gold: {
    name: "Midnight Gold", mode: "dark",
    palette: { bg: "#07070b", surface: "#111118", text: "#f5f5f4", muted: "#a1a1aa", primary: "#d4b461", primaryText: "#0a0910", accent: "#f2d98d", border: "#26262f" },
    headingFont: "jakarta", bodyFont: "inter", radius: "xl", button: "gradient", surface: "cards",
    heroBackground: "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(212,180,97,0.18) 0%, transparent 60%)",
  },
  clean_light: {
    name: "Clean Light", mode: "light",
    palette: { bg: "#ffffff", surface: "#f6f7f9", text: "#0f172a", muted: "#64748b", primary: "#2563eb", primaryText: "#ffffff", accent: "#7c3aed", border: "#e2e8f0" },
    headingFont: "jakarta", bodyFont: "inter", radius: "xl", button: "solid", surface: "bordered",
    heroBackground: "linear-gradient(180deg, #eef4ff 0%, #ffffff 100%)",
  },
  ocean: {
    name: "Ocean", mode: "dark",
    palette: { bg: "#04121c", surface: "#0a1f2e", text: "#e6f6ff", muted: "#8fb3c7", primary: "#22d3ee", primaryText: "#032029", accent: "#38bdf8", border: "#163448" },
    headingFont: "grotesk", bodyFont: "inter", radius: "md", button: "solid", surface: "glass",
    heroBackground: "radial-gradient(ellipse 100% 60% at 20% 0%, rgba(34,211,238,0.22) 0%, transparent 60%), radial-gradient(ellipse 80% 50% at 90% 10%, rgba(56,189,248,0.15) 0%, transparent 60%)",
  },
  sunset: {
    name: "Sunset", mode: "light",
    palette: { bg: "#fffaf5", surface: "#fff1e6", text: "#1c1917", muted: "#78716c", primary: "#f97316", primaryText: "#ffffff", accent: "#e11d48", border: "#fed7aa" },
    headingFont: "poppins", bodyFont: "inter", radius: "full", button: "pill", surface: "cards",
    heroBackground: "linear-gradient(135deg, #fff1e6 0%, #ffe4e6 100%)",
  },
  forest: {
    name: "Forest", mode: "dark",
    palette: { bg: "#06110c", surface: "#0d1f16", text: "#ecfdf5", muted: "#9cc4ae", primary: "#34d399", primaryText: "#022c1a", accent: "#a3e635", border: "#1b3a2a" },
    headingFont: "dmserif", bodyFont: "inter", radius: "xl", button: "solid", surface: "cards",
    heroBackground: "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(52,211,153,0.16) 0%, transparent 60%)",
  },
  editorial: {
    name: "Editorial", mode: "light",
    palette: { bg: "#faf8f3", surface: "#ffffff", text: "#1a1a1a", muted: "#6b6b6b", primary: "#111111", primaryText: "#faf8f3", accent: "#b45309", border: "#e7e2d6" },
    headingFont: "playfair", bodyFont: "inter", radius: "none", button: "solid", surface: "bordered",
  },
  lavender: {
    name: "Lavender Glow", mode: "dark",
    palette: { bg: "#0b0714", surface: "#151024", text: "#f5f3ff", muted: "#b4a8d6", primary: "#a78bfa", primaryText: "#140b2e", accent: "#f0abfc", border: "#2a2145" },
    headingFont: "grotesk", bodyFont: "inter", radius: "xl", button: "gradient", surface: "glass",
    heroBackground: "radial-gradient(ellipse 100% 60% at 50% 0%, rgba(167,139,250,0.25) 0%, transparent 60%)",
  },
  mono: {
    name: "Mono", mode: "light",
    palette: { bg: "#ffffff", surface: "#f4f4f5", text: "#09090b", muted: "#71717a", primary: "#09090b", primaryText: "#ffffff", accent: "#71717a", border: "#e4e4e7" },
    headingFont: "inter", bodyFont: "inter", radius: "md", button: "outline", surface: "flat",
  },
};
export const DEFAULT_THEME = THEME_PRESETS.midnight_gold;

const HEX = /^#[0-9a-f]{6}$/i;
const pickEnum = <T extends string>(v: any, allowed: readonly T[], fb: T): T => (allowed.includes(v) ? v : fb);
const safeCssBg = (v: any): string | undefined =>
  typeof v === "string" && v.length < 600 && /^(linear|radial)-gradient\(/.test(v.trim()) && !/url\(|expression|javascript|[<>;{}]/i.test(v) ? v.trim() : undefined;

/** Validate/repair an untrusted theme (AI output, PATCH body). Missing pieces come from `base` or the closest preset. */
export function normalizeTheme(input: any, base?: PageTheme | null): PageTheme {
  const presetKey = typeof input?.preset === "string" ? input.preset : "";
  const start: PageTheme = THEME_PRESETS[presetKey] || base || (input?.mode === "light" ? THEME_PRESETS.clean_light : DEFAULT_THEME);
  const i = input && typeof input === "object" ? input : {};
  const pal = { ...start.palette };
  for (const k of Object.keys(pal) as (keyof PageTheme["palette"])[]) {
    const v = i.palette?.[k];
    if (typeof v === "string" && HEX.test(v.trim())) pal[k] = v.trim();
  }
  return {
    name: typeof i.name === "string" && i.name.trim() ? i.name.trim().slice(0, 40) : start.name,
    mode: pickEnum(i.mode, ["dark", "light"] as const, start.mode),
    palette: pal,
    headingFont: pickEnum(i.headingFont, Object.keys(FONT_STACKS) as ThemeFont[], start.headingFont),
    bodyFont: pickEnum(i.bodyFont, Object.keys(FONT_STACKS) as ThemeFont[], start.bodyFont),
    radius: pickEnum(i.radius, ["none", "md", "xl", "full"] as const, start.radius),
    button: pickEnum(i.button, ["solid", "gradient", "outline", "pill"] as const, start.button),
    surface: pickEnum(i.surface, ["flat", "cards", "bordered", "glass"] as const, start.surface),
    heroBackground: i.heroBackground === null ? undefined : safeCssBg(i.heroBackground) ?? start.heroBackground,
  };
}

// ── Free imagery: curated Unsplash photos by keyword (no API key, no paid service).
// Rendered as CSS backgrounds layered over a gradient, so a missing photo degrades gracefully.
const U = (id: string, w = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;
export const IMAGE_LIBRARY: Record<string, string[]> = {
  business:   ["1557804506-669a67965ba0", "1556761175-5973dc0f32e7", "1600880292203-757bb62b4baf"],
  team:       ["1522202176988-66273c2fd55f", "1517245386807-bb43f82c33c4", "1519389950473-47ba0277781c"],
  office:     ["1497366216548-37526070297c", "1497215728101-856f4ea42174", "1504384308090-c894fdcc538d"],
  laptop:     ["1515378791036-0648a3ef77b2", "1460925895917-afdab827c52f", "1498050108023-c5249f4df085"],
  fitness:    ["1571019613454-1cb2f99b2d8b", "1534438327276-14e5300c3a48", "1517836357463-d25dfeac3438"],
  wellness:   ["1544367567-0f2fcb009e0b", "1506126613408-eca07ce68773"],
  food:       ["1490645935967-10de6ba17061", "1512621776951-a57141f2eefd"],
  finance:    ["1554224155-6726b3ff858f", "1579621970563-ebec7560ff3e", "1611974789855-9c2a0a7236a3"],
  education:  ["1501504905252-473c47e087f8", "1523240795612-9a054b0db644", "1516321318423-f06f85e504b3"],
  event:      ["1505373877841-8d25f7d46678", "1540575467063-178a50c2df87", "1475721027785-f74eccf877e2"],
  marketing:  ["1563986768609-322da13575f3", "1611162617213-7d7a39e9b1d7"],
  ecommerce:  ["1441986300917-64674bd600d8", "1483985988355-763728e1935b"],
  nature:     ["1470071459604-3b5ec3a7fe05", "1506905925346-21bda4d32df4"],
  startup:    ["1559136555-9303baea8ebd", "1551434678-e076c223a692"],
  portrait_m: ["1507003211169-0a1dd7228f2d", "1500648767791-00dcc994a43e"],
  portrait_f: ["1494790108377-be9c29b29330", "1438761681033-6461ffad8d80"],
};
export const IMAGE_KEYWORDS = Object.keys(IMAGE_LIBRARY);

function hashStr(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

/** "unsplash:fitness" | "fitness" | an https URL → image URL (or "" for none). */
export function resolveImage(ref: any, seed = "", width = 1600): string {
  if (typeof ref !== "string" || !ref.trim()) return "";
  const v = ref.trim();
  if (/^https:\/\/[^\s"'()<>]+$/i.test(v)) return v;
  const key = v.replace(/^unsplash:/i, "").toLowerCase().replace(/[^a-z_]/g, "");
  const list = IMAGE_LIBRARY[key] || (key.includes("portrait") ? IMAGE_LIBRARY.portrait_f : null);
  if (!list) return "";
  return U(list[hashStr(seed + key) % list.length], width);
}

// ── Section normalisation ────────────────────────────────────────────────────
const str = (v: any, max = 600) => (v === undefined || v === null ? "" : String(v)).slice(0, max);
const strList = (v: any, maxItems = 12, max = 300) => (Array.isArray(v) ? v : []).map(x => str(typeof x === "object" && x ? [x.title, x.text].filter(Boolean).join(" — ") : x, max)).filter(Boolean).slice(0, maxItems);
const httpUrl = (v: any) => (typeof v === "string" && /^https?:\/\/\S+$/i.test(v.trim()) ? v.trim() : "");
const imageRef = (v: any) => (typeof v === "string" ? (/^https:\/\//i.test(v.trim()) ? httpUrl(v) : v.trim().slice(0, 40)) : "");

const newId = () => Math.random().toString(36).slice(2, 10);

/** Coerce one untrusted section into a renderable shape (unknown types → null). */
export function normalizeSection(s: any, keepUnknown = false): PageSection | null {
  if (!s || typeof s !== "object" || typeof s.type !== "string") return null;
  const type = s.type;
  const d = s.data && typeof s.data === "object" ? s.data : {};
  const id = typeof s.id === "string" && /^[\w-]{1,40}$/.test(s.id) ? s.id : newId();
  let data: Record<string, any>;
  switch (type) {
    case "hero": data = { badge: str(d.badge, 80), headline: str(d.headline, 200), subheadline: str(d.subheadline, 500), ctaText: str(d.ctaText, 60), ctaUrl: httpUrl(d.ctaUrl), showForm: !!d.showForm, fields: strList(d.fields, 3, 10).filter(f => ["name", "email", "phone"].includes(f)), layout: pickEnum(d.layout, ["centered", "split", "image-bg"] as const, "centered"), image: imageRef(d.image) }; break;
    case "urgency_bar": data = { text: str(d.text, 160), subtext: str(d.subtext, 160) }; break;
    case "video": data = { videoUrl: httpUrl(d.videoUrl), caption: str(d.caption, 200) }; break;
    case "benefits": data = { title: str(d.title, 120), subtitle: str(d.subtitle, 240), items: strList(d.items, 9), layout: pickEnum(d.layout, ["grid", "list"] as const, "grid") }; break;
    case "stats": data = { label: str(d.label, 120), stats: (Array.isArray(d.stats) ? d.stats : []).slice(0, 4).map((x: any) => ({ number: str(x?.number, 20), desc: str(x?.desc, 60) })) }; break;
    case "press": data = { label: str(d.label, 60), logos: strList(d.logos, 6, 40) }; break;
    case "testimonials": data = { title: str(d.title, 120), testimonials: (Array.isArray(d.testimonials) ? d.testimonials : []).slice(0, 6).map((t: any) => ({ name: str(t?.name, 60), role: str(t?.role, 80), quote: str(t?.quote, 400), avatar: imageRef(t?.avatar) })) }; break;
    case "bio": data = { title: str(d.title, 80), name: str(d.name, 80), role: str(d.role, 120), bio: str(d.bio, 900), avatar: imageRef(d.avatar) }; break;
    case "pricing": data = { pricingTitle: str(d.pricingTitle, 120), price: str(d.price, 20), originalPrice: str(d.originalPrice, 20), pricingFeatures: strList(d.pricingFeatures, 10, 120), ctaText: str(d.ctaText, 60), ctaUrl: httpUrl(d.ctaUrl) }; break;
    case "comparison": data = { title: str(d.title, 120), headers: strList(d.headers, 4, 40), rows: (Array.isArray(d.rows) ? d.rows : []).slice(0, 10).map((r: any) => strList(r, 4, 80)) }; break;
    case "faq": data = { title: str(d.title, 120), faqs: (Array.isArray(d.faqs) ? d.faqs : []).slice(0, 10).map((f: any) => ({ question: str(f?.question, 200), answer: str(f?.answer, 800) })) }; break;
    case "guarantee": data = { title: str(d.title, 120), body: str(d.body, 600), badgeText: str(d.badgeText, 40) }; break;
    case "cta": data = { headline: str(d.headline, 200), subtext: str(d.subtext, 300), ctaText: str(d.ctaText, 60), ctaUrl: httpUrl(d.ctaUrl) }; break;
    case "form":
    case "two_step_form": data = { formTitle: str(d.formTitle || d.headline, 160), formSubtext: str(d.formSubtext, 300), buttonText: str(d.buttonText, 60), fields: (strList(d.fields, 3, 10).filter(f => ["name", "email", "phone"].includes(f)).length ? strList(d.fields, 3, 10).filter(f => ["name", "email", "phone"].includes(f)) : ["name", "email"]) }; break;
    case "countdown": { const ms = Date.parse(d.targetDate); data = { countdownTitle: str(d.countdownTitle, 120), targetDate: isNaN(ms) ? new Date(Date.now() + 3 * 86400000).toISOString() : new Date(ms).toISOString() }; break; }
    case "image": data = { src: imageRef(d.src), alt: str(d.alt, 160), caption: str(d.caption, 200) }; break;
    case "divider": data = {}; break;
    default:
      if (!keepUnknown) return null;
      return { id, type: type.slice(0, 40), data: d };
  }
  return { id, type, data };
}

/** keepUnknown: preserve funnel-only section types (order_bump, sticky_cta, …) when editing funnel steps. */
export function normalizeSections(input: any, keepUnknown = false): PageSection[] {
  const seen = new Set<string>();
  return (Array.isArray(input) ? input : []).slice(0, 30).map(s => normalizeSection(s, keepUnknown)).filter((s): s is PageSection => {
    if (!s) return false;
    if (seen.has(s.id)) s.id = newId();
    seen.add(s.id);
    return true;
  });
}

export function normalizePageDoc(input: any, base?: Partial<PageDoc>): PageDoc {
  return {
    title: str(input?.title || base?.title || "Untitled Page", 120),
    theme: normalizeTheme(input?.theme, base?.theme),
    sections: normalizeSections(input?.sections ?? base?.sections),
  };
}

/** A compact section-schema reference for AI prompts. */
export const SECTION_SCHEMA_DOC = `
hero: { badge, headline, subheadline, ctaText, ctaUrl?, showForm (bool, inline opt-in), fields ["name","email","phone"], layout "centered"|"split"|"image-bg", image (keyword) }
urgency_bar: { text, subtext }
video: { videoUrl (YouTube/Vimeo URL or ""), caption }
benefits: { title, subtitle, items [string, "Title — one line explanation"], layout "grid"|"list" }
stats: { label, stats [{ number, desc }] (exactly 3 or 4) }
press: { label, logos [publication names] }
testimonials: { title, testimonials [{ name, role, quote, avatar (portrait_f|portrait_m) }] }
bio: { title, name, role, bio, avatar (portrait_f|portrait_m) }
pricing: { pricingTitle, price, originalPrice, pricingFeatures [string], ctaText }
comparison: { title, headers [3 strings], rows [[label, "✅"/"❌", "✅"/"❌"]] }
faq: { title, faqs [{ question, answer }] }
guarantee: { title, body, badgeText }
cta: { headline, subtext, ctaText }
form: { formTitle, formSubtext, buttonText, fields ["name","email","phone"] }
countdown: { countdownTitle, targetDate (ISO) }
image: { src (keyword), alt, caption }
divider: {}`.trim();

export const THEME_SCHEMA_DOC = `{ "preset": one of ${Object.keys(THEME_PRESETS).join("|")} (starting point), "name": short theme name, "mode": "dark"|"light",
  "palette": { "bg","surface","text","muted","primary","primaryText","accent","border" } (all #rrggbb, readable contrast),
  "headingFont": ${Object.keys(FONT_STACKS).join("|")}, "bodyFont": same options, "radius": "none"|"md"|"xl"|"full",
  "button": "solid"|"gradient"|"outline"|"pill", "surface": "flat"|"cards"|"bordered"|"glass",
  "heroBackground": optional CSS linear-gradient(...) or radial-gradient(...) }`;
