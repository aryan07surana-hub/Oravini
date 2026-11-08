import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, ChevronDown, Home, Zap, Heart, ShieldCheck, Sparkles, Crown,
} from "lucide-react";
import { MY_WHY } from "./myWhy";

type Section = { title: string; blocks: string[] };

const THEMES = [
  { accent: "#d4b461", accent2: "#f97316", icon: Crown },       // intro
  { accent: "#06b6d4", accent2: "#3b82f6", icon: Home },        // the life
  { accent: "#f97316", accent2: "#ef4444", icon: Zap },         // the person
  { accent: "#ec4899", accent2: "#a855f7", icon: Heart },       // family
  { accent: "#22c55e", accent2: "#10b981", icon: ShieldCheck }, // non-negotiables
  { accent: "#a855f7", accent2: "#6366f1", icon: Sparkles },    // giving up
];

function parse(md: string): { headline: string; sections: Section[] } {
  const blocks = md.trim().split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  let headline = "";
  const sections: Section[] = [{ title: "", blocks: [] }];
  for (const b of blocks) {
    if (b.startsWith("# ")) continue;
    if (b.startsWith("### ")) { headline = b.slice(4); continue; }
    if (b.startsWith("## ")) { sections.push({ title: b.slice(3), blocks: [] }); continue; }
    sections[sections.length - 1].blocks.push(b);
  }
  return { headline, sections };
}

// Key themes → color. Order matters (longer phrases first).
const HIGHLIGHTS: { color: string; label: string; words: string[] }[] = [
  { color: "#facc15", label: "Money", words: [
    "$100K-per-month business", "$100,000 per month", "$100K every single month", "$100K",
    "financially independent", "financial freedom", "financially intelligent", "wealthy", "richest", "richer", "rich",
  ] },
  { color: "#4ade80", label: "Football", words: [
    "professional footballer", "competitive football", "football pitch", "footballer", "football",
  ] },
  { color: "#22d3ee", label: "Dream life", words: [
    "Chevrolet Corvette Stingray", "Czech Republic", "Prague", "personal chef", "beautiful household", "freedom",
  ] },
  { color: "#f472b6", label: "Family", words: [
    "my parents", "your parents", "my father", "my mother", "my family", "my future wife and children", "family", "parents",
  ] },
  { color: "#fb923c", label: "Discipline", words: [
    "relentless", "discipline", "execute", "hungry", "Every single day matters", "I need to execute",
  ] },
];

const escapeRe = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ALL_WORDS = HIGHLIGHTS.flatMap((h) => h.words.map((w) => ({ w, color: h.color })))
  .sort((a, b) => b.w.length - a.w.length);
const HL_RE = new RegExp(`(${ALL_WORDS.map((x) => escapeRe(x.w)).join("|")})`, "gi");
const colorFor = (match: string) =>
  ALL_WORDS.find((x) => x.w.toLowerCase() === match.toLowerCase())?.color;

function highlight(text: string, keyBase: string): ReactNode[] {
  return text.split(HL_RE).map((seg, i) => {
    const c = i % 2 === 1 ? colorFor(seg) : undefined;
    return c
      ? <span key={`${keyBase}-${i}`} className="font-semibold" style={{ color: c }}>{seg}</span>
      : seg;
  });
}

function inline(text: string, accent: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).flatMap((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? [<strong key={i} className="font-extrabold" style={{ color: accent }}>{part.slice(2, -2)}</strong>]
      : highlight(part, String(i)),
  );
}

const isBoldLine = (b: string) => /^\*\*[^*]+\*\*$/.test(b);
const isRemember = (b: string) => b.startsWith("Remember ");

function Callout({ text, accent }: { text: string; accent: string; accent2?: string }) {
  return (
    <div
      className="rounded-xl border-l-4 px-4 py-4 md:px-5"
      style={{ borderColor: accent, background: `${accent}14` }}
    >
      <p className="text-base md:text-lg font-black leading-snug tracking-tight" style={{ color: accent }}>
        {text.slice(2, -2)}
      </p>
    </div>
  );
}

function SectionBlock({ section, index }: { section: Section; index: number }) {
  const { accent, accent2, icon: Icon } = THEMES[index % THEMES.length];
  const out: ReactNode[] = [];
  let remember: string[] = [];
  const flushRemember = (key: string) => {
    if (!remember.length) return;
    out.push(
      <ul key={key} className="space-y-2.5 rounded-xl p-4" style={{ background: `${accent}0f` }}>
        {remember.map((r, i) => (
          <li key={i} className="flex items-start gap-3 text-[15px] md:text-base leading-relaxed text-foreground/90">
            <span className="mt-0.5 font-black" style={{ color: accent }}>→</span>
            <span>
              <span className="font-bold" style={{ color: accent }}>Remember</span>
              {highlight(r.slice("Remember".length), `rm${i}`)}
            </span>
          </li>
        ))}
      </ul>,
    );
    remember = [];
  };

  section.blocks.forEach((b, bi) => {
    if (isRemember(b) && b.length < 140) { remember.push(b); return; }
    flushRemember(`r${bi}`);
    const lines = b.split("\n").map((l) => l.trim());
    if (lines.every((l) => l.startsWith("- "))) {
      out.push(
        <div key={bi} className="grid gap-2 sm:grid-cols-2">
          {lines.map((l, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03 }}
              className="flex items-start gap-3 rounded-xl border p-3"
              style={{ borderColor: `${accent}33`, background: `linear-gradient(135deg, ${accent}12, transparent)` }}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-black text-black"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent2})` }}
              >
                {i + 1}
              </span>
              <p className="text-[15px] leading-snug text-foreground/90">{highlight(l.slice(2), `b${i}`)}</p>
            </motion.div>
          ))}
        </div>,
      );
      return;
    }
    if (isBoldLine(b)) { out.push(<Callout key={bi} text={b} accent={accent} accent2={accent2} />); return; }
    const short = b.length < 60;
    out.push(
      <p
        key={bi}
        className={short
          ? "text-base md:text-lg font-bold text-foreground"
          : "max-w-[68ch] text-[15px] md:text-base leading-7 md:leading-8 text-foreground/85"}
      >
        {inline(b, accent)}
      </p>,
    );
  });
  flushRemember("r-end");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45 }}
      className="relative overflow-hidden rounded-2xl border p-5 md:p-6"
      style={{ borderColor: `${accent}30`, background: `radial-gradient(120% 80% at 0% 0%, ${accent}14, transparent 60%)` }}
    >
      <div
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: `linear-gradient(to bottom, ${accent}, ${accent2})` }}
      />
      {section.title && (
        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent2})` }}
          >
            <Icon className="h-5 w-5 text-black" />
          </div>
          <h3 className="text-base md:text-lg font-black uppercase tracking-wide" style={{ color: accent }}>
            {section.title}
          </h3>
        </div>
      )}
      <div className="space-y-5">{out}</div>
    </motion.div>
  );
}

export default function MyWhyCard() {
  const [open, setOpen] = useState(true);
  const { headline, sections } = parse(MY_WHY);

  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative w-full overflow-hidden px-6 py-7 md:px-8 md:py-9 text-left"
      >
        <motion.div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(40% 80% at 10% 20%, #d4b46155, transparent), radial-gradient(40% 80% at 90% 30%, #ec489944, transparent), radial-gradient(50% 90% at 50% 120%, #06b6d444, transparent)",
          }}
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative flex items-start gap-4">
          <motion.div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "linear-gradient(135deg, #d4b461, #f97316, #ec4899)" }}
            animate={{ rotate: [0, -6, 6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Flame className="h-6 w-6 text-black" />
          </motion.div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Read this every day</p>
            <h2
              className="mt-1 text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg, #d4b461, #f97316, #ec4899, #a855f7)" }}
            >
              MY WHY
            </h2>
            {headline && (
              <p className="mt-2 text-sm md:text-base font-bold tracking-wide text-foreground">{headline}</p>
            )}
          </div>
          <ChevronDown
            className={`mt-2 h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 px-4 pb-6 md:px-6 md:pb-8">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-xs">
                {HIGHLIGHTS.map((h) => (
                  <span key={h.label} className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: h.color }} />
                    {h.label}
                  </span>
                ))}
              </div>
              {sections.map((s, i) => (
                <SectionBlock key={i} section={s} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
