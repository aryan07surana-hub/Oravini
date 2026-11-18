import { useEffect, useMemo, useState, createContext, useContext } from "react";
import { ArrowRight, Check, ChevronDown, Loader2, Play, ShieldCheck, Star, CheckCircle2 } from "lucide-react";
import { DEFAULT_THEME, FONT_STACKS, normalizeTheme, resolveImage, type PageSection, type PageTheme } from "@shared/pageEngine";

/**
 * Unified page renderer (AI Page Studio, themed funnel steps, template gallery).
 * - `editable`: click any text to edit inline (calls onField(sectionId, path, value))
 * - `device="mobile"`: forces single-column layout inside a narrow preview frame
 */
export type LeadData = { name?: string; email: string; phone?: string };
export type ThemedPageProps = {
  theme: PageTheme | null | undefined;
  sections: PageSection[];
  editable?: boolean;
  device?: "desktop" | "mobile";
  onField?: (sectionId: string, path: string, value: string) => void;
  onLead?: (data: LeadData) => Promise<{ redirect?: string } | void>;
  selectedId?: string | null;
  onSelect?: (sectionId: string) => void;
  /** scale-down thumbnail mode for galleries: no interactivity */
  thumbnail?: boolean;
};

type Ctx = {
  t: PageTheme; editable: boolean; mobile: boolean; thumbnail: boolean;
  onField?: ThemedPageProps["onField"]; onLead?: ThemedPageProps["onLead"];
};
const PageCtx = createContext<Ctx>(null as any);
const useP = () => useContext(PageCtx);

const RADIUS = { none: { card: "0px", btn: "0px", img: "0px" }, md: { card: "12px", btn: "10px", img: "12px" }, xl: { card: "22px", btn: "14px", img: "22px" }, full: { card: "28px", btn: "999px", img: "28px" } } as const;

function useGoogleFonts(t: PageTheme) {
  useEffect(() => {
    for (const f of new Set([t.headingFont, t.bodyFont])) {
      const id = `gf-${f}`;
      if (document.getElementById(id)) continue;
      const link = document.createElement("link");
      link.id = id; link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${FONT_STACKS[f].google}&display=swap`;
      document.head.appendChild(link);
    }
  }, [t.headingFont, t.bodyFont]);
}

/** responsive class only on real viewports; dropped in the forced-mobile preview */
function useR() { const { mobile } = useP(); return (cls: string) => (mobile ? "" : cls); }

// ── Inline-editable text ─────────────────────────────────────────────────────
function Txt({ sid, path, value, as: Tag = "span", className, style, placeholder }: {
  sid: string; path: string; value: any; as?: any; className?: string; style?: React.CSSProperties; placeholder?: string;
}) {
  const { editable, onField } = useP();
  const text = value == null ? "" : String(value);
  if (!editable) return text ? <Tag className={className} style={style}>{text}</Tag> : null;
  return (
    <Tag
      key={text}
      className={`${className || ""} outline-none rounded-md transition-shadow hover:ring-1 hover:ring-current/30 focus:ring-2 focus:ring-current/50 empty:before:content-[attr(data-placeholder)] empty:before:opacity-40`}
      style={{ ...style, cursor: "text" }}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder || "Click to write…"}
      data-path={`${sid}:${path}`}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" && Tag !== "p") { e.preventDefault(); (e.target as HTMLElement).blur(); } }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const v = e.currentTarget.innerText.replace(/\n{3,}/g, "\n\n").trim();
        if (v !== text) onField?.(sid, path, v);
      }}
    >{text}</Tag>
  );
}

// ── Building blocks ──────────────────────────────────────────────────────────
function Button({ children, href, onClick, full, testId }: { children: React.ReactNode; href?: string; onClick?: () => void; full?: boolean; testId?: string }) {
  const { t, editable, thumbnail } = useP();
  const r = RADIUS[t.radius];
  const p = t.palette;
  const base: React.CSSProperties = { borderRadius: t.button === "pill" ? "999px" : r.btn, fontFamily: FONT_STACKS[t.headingFont].css };
  const style: React.CSSProperties =
    t.button === "outline" ? { ...base, border: `2px solid ${p.primary}`, color: p.primary, background: "transparent" }
    : t.button === "gradient" ? { ...base, background: `linear-gradient(135deg, ${p.primary} 0%, ${p.accent} 100%)`, color: p.primaryText, boxShadow: `0 10px 30px -10px ${p.primary}aa` }
    : { ...base, background: p.primary, color: p.primaryText, boxShadow: `0 10px 30px -14px ${p.primary}` };
  const cls = `inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-bold transition-transform hover:scale-[1.03] active:scale-[0.99] ${full ? "w-full" : ""}`;
  const go = (e: React.MouseEvent) => {
    if (editable || thumbnail) { e.preventDefault(); return; }
    if (onClick) { e.preventDefault(); onClick(); }
  };
  if (href && !editable && !thumbnail) return <a data-testid={testId} href={href} target={/^https?:/.test(href) ? "_blank" : undefined} rel="noopener noreferrer" className={cls} style={style}>{children}</a>;
  return <button data-testid={testId} type="button" onClick={go} className={cls} style={style}>{children}</button>;
}

function scrollToForm() {
  const el = document.querySelector("[data-lead-form]");
  if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); (el.querySelector("input") as HTMLInputElement | null)?.focus({ preventScroll: true }); }
}

function Surface({ children, className, style, pad = true }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; pad?: boolean }) {
  const { t } = useP();
  const p = t.palette;
  const r = RADIUS[t.radius].card;
  const s: React.CSSProperties =
    t.surface === "flat" ? { background: "transparent" }
    : t.surface === "bordered" ? { background: t.mode === "light" ? "#ffffff" : "transparent", border: `1px solid ${p.border}` }
    : t.surface === "glass" ? { background: `${p.surface}cc`, border: `1px solid ${p.border}`, backdropFilter: "blur(12px)" }
    : { background: p.surface, border: `1px solid ${p.border}` };
  return <div className={`${pad ? "p-6" : ""} ${className || ""}`} style={{ ...s, borderRadius: r, ...style }}>{children}</div>;
}

function Section({ children, id, tight, style }: { children: React.ReactNode; id?: string; tight?: boolean; style?: React.CSSProperties }) {
  const R = useR();
  return <section id={id} className={`px-5 ${tight ? "py-8" : `py-14 ${R("md:py-20")}`}`} style={style}><div className="max-w-5xl mx-auto">{children}</div></section>;
}

function Heading({ sid, path, value, size = "h2", className, placeholder }: { sid: string; path: string; value: any; size?: "h1" | "h2"; className?: string; placeholder?: string }) {
  const { t } = useP();
  const R = useR();
  const cls = size === "h1"
    ? `text-4xl ${R("md:text-6xl")} font-extrabold leading-[1.05] tracking-tight`
    : `text-3xl ${R("md:text-4xl")} font-bold leading-tight tracking-tight`;
  return <Txt sid={sid} path={path} value={value} as={size} placeholder={placeholder} className={`${cls} ${className || ""}`} style={{ fontFamily: FONT_STACKS[t.headingFont].css, color: t.palette.text }} />;
}

function Img({ src, seed, className, style, alt, gradient }: { src: string; seed: string; className?: string; style?: React.CSSProperties; alt?: string; gradient?: string }) {
  const { t } = useP();
  const url = resolveImage(src, seed);
  const fallback = gradient || `linear-gradient(135deg, ${t.palette.primary}55 0%, ${t.palette.accent}33 50%, ${t.palette.surface} 100%)`;
  return <div role="img" aria-label={alt || ""} className={className} style={{ backgroundImage: url ? `url("${url}"), ${fallback}` : fallback, backgroundSize: "cover", backgroundPosition: "center", ...style }} />;
}

function Avatar({ src, name, seed, size = 48 }: { src?: string; name?: string; seed: string; size?: number }) {
  const { t } = useP();
  const url = resolveImage(src || "", seed, 200);
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex-shrink-0 flex items-center justify-center font-bold rounded-full overflow-hidden"
      style={{ width: size, height: size, background: url ? `url("${url}") center/cover, ${t.palette.primary}` : `linear-gradient(135deg, ${t.palette.primary}, ${t.palette.accent})`, color: t.palette.primaryText, fontSize: size / 2.8 }}>
      {!url && initials}
    </div>
  );
}

// ── Lead form ────────────────────────────────────────────────────────────────
function LeadForm({ sid, fields, buttonText, compact }: { sid: string; fields: string[]; buttonText: string; compact?: boolean }) {
  const { t, editable, thumbnail, onLead } = useP();
  const p = t.palette;
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const f = fields?.length ? fields : ["name", "email"];
  const inputStyle: React.CSSProperties = {
    background: t.mode === "light" ? "#ffffff" : `${p.bg}`, border: `1px solid ${p.border}`, color: p.text,
    borderRadius: t.button === "pill" ? "999px" : RADIUS[t.radius].btn,
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editable || thumbnail || !onLead) return;
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError("Please enter a valid email");
    if (f.includes("name") && !form.name.trim()) return setError("Please enter your name");
    setState("sending");
    try {
      const out = await onLead({ name: form.name.trim() || undefined, email: form.email.trim(), phone: form.phone.trim() || undefined });
      if (out && (out as any).redirect) { window.location.href = (out as any).redirect; return; }
      setState("done");
    } catch (err: any) {
      setError(err?.message || "Something went wrong — please try again");
      setState("idle");
    }
  };
  if (state === "done") {
    return (
      <div data-testid="lead-success" className="text-center py-4">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-2" style={{ color: p.primary }} />
        <p className="font-bold text-lg" style={{ color: p.text }}>You're in!</p>
        <p className="text-sm" style={{ color: p.muted }}>Check your inbox — we've sent the details.</p>
      </div>
    );
  }
  return (
    <form data-lead-form onSubmit={submit} className={`space-y-3 ${compact ? "max-w-md" : ""}`} noValidate>
      {f.includes("name") && <input data-testid="lead-name" aria-label="Your name" placeholder="Your name" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} className="w-full px-4 py-3.5 text-sm outline-none" style={inputStyle} />}
      {f.includes("email") || !f.length ? <input data-testid="lead-email" type="email" aria-label="Email address" placeholder="Email address" value={form.email} onChange={e => setForm(v => ({ ...v, email: e.target.value }))} className="w-full px-4 py-3.5 text-sm outline-none" style={inputStyle} /> : null}
      {f.includes("phone") && <input data-testid="lead-phone" type="tel" aria-label="Phone" placeholder="Phone (optional)" value={form.phone} onChange={e => setForm(v => ({ ...v, phone: e.target.value }))} className="w-full px-4 py-3.5 text-sm outline-none" style={inputStyle} />}
      {error && <p role="alert" className="text-sm" style={{ color: "#ef4444" }}>{error}</p>}
      <div onClick={e => editable && e.stopPropagation()}>
        <SubmitButton sid={sid} text={buttonText} sending={state === "sending"} />
      </div>
    </form>
  );
}

function SubmitButton({ sid, text, sending }: { sid: string; text: string; sending: boolean }) {
  const { t, editable } = useP();
  const p = t.palette;
  const style: React.CSSProperties =
    t.button === "outline" ? { border: `2px solid ${p.primary}`, color: p.primary, background: "transparent" }
    : t.button === "gradient" ? { background: `linear-gradient(135deg, ${p.primary} 0%, ${p.accent} 100%)`, color: p.primaryText }
    : { background: p.primary, color: p.primaryText };
  return (
    <button data-testid="lead-submit" type="submit" disabled={sending}
      className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 font-bold text-base transition-transform hover:scale-[1.01] disabled:opacity-60"
      style={{ ...style, borderRadius: t.button === "pill" ? "999px" : RADIUS[t.radius].btn, fontFamily: FONT_STACKS[t.headingFont].css }}>
      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : editable ? <Txt sid={sid} path="buttonText" value={text || "Get started"} /> : <>{text || "Get started"} <ArrowRight className="w-4 h-4" /></>}
    </button>
  );
}

// ── Countdown ────────────────────────────────────────────────────────────────
function useTick(target: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const ms = Math.max(0, new Date(target).getTime() - now);
  return { d: Math.floor(ms / 86400000), h: Math.floor(ms / 3600000) % 24, m: Math.floor(ms / 60000) % 60, s: Math.floor(ms / 1000) % 60 };
}

// ── Sections ─────────────────────────────────────────────────────────────────
function SectionView({ s }: { s: PageSection }) {
  const { t, editable } = useP();
  const R = useR();
  const p = t.palette;
  const d = s.data || {};
  const muted = { color: p.muted };
  const body = { fontFamily: FONT_STACKS[t.bodyFont].css };
  const cta = (text: string, url: string | undefined, testId?: string) =>
    text || editable ? (
      <Button testId={testId} href={url || undefined} onClick={url ? undefined : scrollToForm}>
        <Txt sid={s.id} path="ctaText" value={text} placeholder="Button text" /> {!editable && <ArrowRight className="w-4 h-4" />}
      </Button>
    ) : null;

  switch (s.type) {
    case "hero": {
      const layout = d.layout || "centered";
      const hasImg = !!d.image;
      const inner = (center: boolean) => (
        <div className={center ? "text-center max-w-3xl mx-auto" : ""}>
          {(d.badge || editable) && (
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 text-xs font-bold uppercase tracking-wider rounded-full"
              style={{ background: `${p.primary}1f`, color: layout === "image-bg" ? "#fff" : p.primary, border: `1px solid ${p.primary}40` }}>
              <Txt sid={s.id} path="badge" value={d.badge} placeholder="Badge" />
            </span>
          )}
          <Heading sid={s.id} path="headline" value={d.headline} size="h1" className={layout === "image-bg" ? "!text-white" : ""} placeholder="Headline" />
          <Txt sid={s.id} path="subheadline" value={d.subheadline} as="p" placeholder="Subheadline"
            className={`mt-5 text-lg ${R("md:text-xl")} leading-relaxed ${center ? "mx-auto max-w-2xl" : ""}`}
            style={{ color: layout === "image-bg" ? "rgba(255,255,255,0.85)" : p.muted }} />
          <div className={`mt-9 ${center ? "flex justify-center" : ""}`}>
            {d.showForm
              ? <div className={`w-full ${center ? "max-w-md mx-auto" : "max-w-md"}`}><LeadForm sid={s.id} fields={d.fields} buttonText={d.ctaText} compact /></div>
              : cta(d.ctaText, d.ctaUrl, "hero-cta")}
          </div>
        </div>
      );
      if (layout === "image-bg") {
        return (
          <section className={`relative px-5 py-24 ${R("md:py-36")} overflow-hidden`}>
            <Img src={d.image || "business"} seed={s.id} className="absolute inset-0" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(0,0,0,0.55) 0%, ${p.bg}ee 100%)` }} />
            <div className="relative max-w-5xl mx-auto">{inner(true)}</div>
          </section>
        );
      }
      if (layout === "split") {
        return (
          <section className={`px-5 py-16 ${R("md:py-24")}`} style={{ background: t.heroBackground }}>
            <div className={`max-w-6xl mx-auto grid gap-10 items-center ${R("md:grid-cols-2")}`}>
              {inner(false)}
              <Img src={d.image || "business"} seed={s.id} alt={d.headline} className="w-full aspect-[4/3]" style={{ borderRadius: RADIUS[t.radius].img, boxShadow: "0 30px 80px -30px rgba(0,0,0,0.45)" }} />
            </div>
          </section>
        );
      }
      return (
        <section className={`px-5 pt-20 pb-16 ${R("md:pt-28 md:pb-24")}`} style={{ background: t.heroBackground }}>
          <div className="max-w-5xl mx-auto">{inner(true)}</div>
          {hasImg && <div className="max-w-5xl mx-auto mt-14"><Img src={d.image} seed={s.id} className="w-full aspect-[16/8]" style={{ borderRadius: RADIUS[t.radius].img }} /></div>}
        </section>
      );
    }

    case "urgency_bar":
      return (
        <div className="px-5 py-3 text-center text-sm font-semibold" style={{ background: p.primary, color: p.primaryText }}>
          <Txt sid={s.id} path="text" value={d.text} /> {(d.subtext || editable) && <span className="opacity-80 font-normal">· <Txt sid={s.id} path="subtext" value={d.subtext} /></span>}
        </div>
      );

    case "video": {
      const yt = String(d.videoUrl || "").match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/(?:live|embed|shorts)\/)([\w-]{11})/);
      const vm = String(d.videoUrl || "").match(/vimeo\.com\/(\d+)/);
      const src = yt ? `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0` : vm ? `https://player.vimeo.com/video/${vm[1]}` : "";
      return (
        <Section tight>
          <div className="aspect-video w-full overflow-hidden flex items-center justify-center" style={{ borderRadius: RADIUS[t.radius].img, background: p.surface, border: `1px solid ${p.border}` }}>
            {src && !editable ? <iframe src={src} title="Video" className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
              : <div className="text-center" style={muted}><div className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: p.primary, color: p.primaryText }}><Play className="w-7 h-7 ml-1" /></div>{src ? "Video" : "Add a YouTube or Vimeo link"}</div>}
          </div>
          <Txt sid={s.id} path="caption" value={d.caption} as="p" className="text-center text-sm mt-4" style={muted} />
        </Section>
      );
    }

    case "benefits": {
      const items: string[] = d.items || [];
      const list = d.layout === "list";
      return (
        <Section>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Heading sid={s.id} path="title" value={d.title} placeholder="Section title" />
            <Txt sid={s.id} path="subtitle" value={d.subtitle} as="p" className="mt-3 text-lg" style={muted} />
          </div>
          <div className={list ? "max-w-3xl mx-auto space-y-3" : `grid gap-4 ${R("sm:grid-cols-2")} ${items.length % 3 === 0 ? R("lg:grid-cols-3") : ""}`}>
            {items.map((it, i) => {
              const [head, ...rest] = String(it).split(" — ");
              const tail = rest.join(" — ");
              return (
                <Surface key={i} className={list ? "flex gap-4 items-start !p-5" : ""}>
                  <div className={`w-10 h-10 flex items-center justify-center flex-shrink-0 ${list ? "" : "mb-4"}`} style={{ borderRadius: RADIUS[t.radius].btn, background: `${p.primary}1f`, color: p.primary }}><Check className="w-5 h-5" /></div>
                  <div>
                    {tail ? <>
                      <p className="font-bold text-lg" style={{ color: p.text, fontFamily: FONT_STACKS[t.headingFont].css }}>{editable ? <Txt sid={s.id} path={`items.${i}`} value={it} /> : head}</p>
                      {!editable && <p className="mt-1.5 leading-relaxed" style={muted}>{tail}</p>}
                    </> : <Txt sid={s.id} path={`items.${i}`} value={it} as="p" className="font-semibold leading-relaxed" style={{ color: p.text }} />}
                  </div>
                </Surface>
              );
            })}
          </div>
        </Section>
      );
    }

    case "stats":
      return (
        <Section tight>
          <Txt sid={s.id} path="label" value={d.label} as="p" className="text-center text-xs font-bold uppercase tracking-[0.2em] mb-6" style={muted} />
          <div className={`grid grid-cols-2 gap-4 ${(d.stats || []).length >= 4 ? R("md:grid-cols-4") : R("md:grid-cols-3")}`}>
            {(d.stats || []).map((x: any, i: number) => (
              <Surface key={i} className="text-center">
                <Txt sid={s.id} path={`stats.${i}.number`} value={x.number} as="p" className={`text-3xl ${R("md:text-4xl")} font-extrabold`} style={{ color: p.primary, fontFamily: FONT_STACKS[t.headingFont].css }} />
                <Txt sid={s.id} path={`stats.${i}.desc`} value={x.desc} as="p" className="text-sm mt-1" style={muted} />
              </Surface>
            ))}
          </div>
        </Section>
      );

    case "press":
      return (
        <Section tight>
          <Txt sid={s.id} path="label" value={d.label} as="p" className="text-center text-xs font-bold uppercase tracking-[0.25em] mb-5" style={muted} />
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-3">
            {(d.logos || []).map((l: string, i: number) => <Txt key={i} sid={s.id} path={`logos.${i}`} value={l} className="text-xl font-extrabold tracking-tight opacity-50" style={{ color: p.text, fontFamily: FONT_STACKS[t.headingFont].css }} />)}
          </div>
        </Section>
      );

    case "testimonials":
      return (
        <Section>
          {(d.title || editable) && <div className="text-center mb-12"><Heading sid={s.id} path="title" value={d.title} placeholder="What people say" /></div>}
          <div className={`grid gap-5 ${R("md:grid-cols-2")} ${(d.testimonials || []).length >= 3 ? R("lg:grid-cols-3") : ""}`}>
            {(d.testimonials || []).map((x: any, i: number) => (
              <Surface key={i} className="flex flex-col">
                <div className="flex gap-0.5 mb-4">{[0, 1, 2, 3, 4].map(k => <Star key={k} className="w-4 h-4 fill-current" style={{ color: p.primary }} />)}</div>
                <Txt sid={s.id} path={`testimonials.${i}.quote`} value={x.quote} as="p" className="leading-relaxed flex-1 text-[15px]" style={{ color: p.text }} />
                <div className="flex items-center gap-3 mt-5">
                  <Avatar src={x.avatar} name={x.name} seed={`${s.id}${i}`} size={42} />
                  <div>
                    <Txt sid={s.id} path={`testimonials.${i}.name`} value={x.name} as="p" className="font-bold text-sm" style={{ color: p.text }} />
                    <Txt sid={s.id} path={`testimonials.${i}.role`} value={x.role} as="p" className="text-xs" style={muted} />
                  </div>
                </div>
              </Surface>
            ))}
          </div>
        </Section>
      );

    case "bio":
      return (
        <Section>
          <Surface className={`grid gap-8 items-center ${R("md:grid-cols-[220px_1fr]")} ${R("md:!p-10")}`}>
            <div className="flex justify-center"><Avatar src={d.avatar || "portrait_m"} name={d.name} seed={s.id} size={180} /></div>
            <div>
              <Txt sid={s.id} path="title" value={d.title} as="p" className="text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color: p.primary }} />
              <Heading sid={s.id} path="name" value={d.name} placeholder="Name" />
              <Txt sid={s.id} path="role" value={d.role} as="p" className="mt-1 font-semibold" style={muted} />
              <Txt sid={s.id} path="bio" value={d.bio} as="p" className="mt-4 leading-relaxed" style={{ color: p.text, opacity: 0.85 }} />
            </div>
          </Surface>
        </Section>
      );

    case "pricing":
      return (
        <Section>
          <div className="max-w-lg mx-auto">
            <Surface className={`text-center ${R("md:!p-10")}`} style={{ border: `2px solid ${p.primary}`, boxShadow: `0 30px 80px -40px ${p.primary}` }}>
              <Txt sid={s.id} path="pricingTitle" value={d.pricingTitle} as="p" className="font-bold text-lg mb-4" style={{ color: p.text }} />
              <div className="flex items-baseline justify-center gap-3">
                <Txt sid={s.id} path="price" value={d.price} className="text-6xl font-extrabold" style={{ color: p.text, fontFamily: FONT_STACKS[t.headingFont].css }} />
                <Txt sid={s.id} path="originalPrice" value={d.originalPrice} className="text-xl line-through" style={muted} />
              </div>
              <ul className="my-8 space-y-3 text-left">
                {(d.pricingFeatures || []).map((f: string, i: number) => (
                  <li key={i} className="flex gap-3 items-start"><Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: p.primary }} /><Txt sid={s.id} path={`pricingFeatures.${i}`} value={f} style={{ color: p.text }} /></li>
                ))}
              </ul>
              <Button full href={d.ctaUrl || undefined} onClick={d.ctaUrl ? undefined : scrollToForm}><Txt sid={s.id} path="ctaText" value={d.ctaText || "Get started"} /></Button>
            </Surface>
          </div>
        </Section>
      );

    case "comparison":
      return (
        <Section>
          <div className="text-center mb-10"><Heading sid={s.id} path="title" value={d.title} /></div>
          <Surface pad={false} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr>{(d.headers || []).map((h: string, i: number) => <th key={i} className={`p-4 font-bold ${i ? "text-center" : "text-left"}`} style={{ color: i === 1 ? p.primary : p.text, borderBottom: `1px solid ${p.border}` }}><Txt sid={s.id} path={`headers.${i}`} value={h} /></th>)}</tr></thead>
              <tbody>{(d.rows || []).map((row: string[], ri: number) => (
                <tr key={ri}>{row.map((c, ci) => <td key={ci} className={`p-4 ${ci ? "text-center" : ""}`} style={{ color: ci ? p.text : p.muted, borderBottom: ri < d.rows.length - 1 ? `1px solid ${p.border}` : undefined }}><Txt sid={s.id} path={`rows.${ri}.${ci}`} value={c} /></td>)}</tr>
              ))}</tbody>
            </table>
          </Surface>
        </Section>
      );

    case "faq":
      return (
        <Section>
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10"><Heading sid={s.id} path="title" value={d.title || (editable ? "" : "Frequently asked questions")} placeholder="Frequently asked questions" /></div>
            <div className="space-y-3">
              {(d.faqs || []).map((f: any, i: number) => (
                <details key={i} open={editable || undefined} className="group">
                  <summary className="list-none cursor-pointer">
                    <Surface className="!py-4 flex items-center justify-between gap-4">
                      <Txt sid={s.id} path={`faqs.${i}.question`} value={f.question} className="font-semibold" style={{ color: p.text }} />
                      <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform group-open:rotate-180" style={muted} />
                    </Surface>
                  </summary>
                  <Txt sid={s.id} path={`faqs.${i}.answer`} value={f.answer} as="p" className="px-6 pt-3 pb-2 leading-relaxed" style={muted} />
                </details>
              ))}
            </div>
          </div>
        </Section>
      );

    case "guarantee":
      return (
        <Section tight>
          <Surface className={`max-w-3xl mx-auto flex flex-col ${R("md:flex-row")} items-center gap-6 text-center ${R("md:text-left")}`}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${p.primary}1f`, color: p.primary }}><ShieldCheck className="w-10 h-10" /></div>
            <div>
              <Txt sid={s.id} path="badgeText" value={d.badgeText} as="p" className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color: p.primary }} />
              <Txt sid={s.id} path="title" value={d.title} as="p" className="text-xl font-bold" style={{ color: p.text, fontFamily: FONT_STACKS[t.headingFont].css }} />
              <Txt sid={s.id} path="body" value={d.body} as="p" className="mt-2 leading-relaxed" style={muted} />
            </div>
          </Surface>
        </Section>
      );

    case "cta":
      return (
        <Section>
          <div className="text-center px-6 py-14" style={{ borderRadius: RADIUS[t.radius].card, background: `linear-gradient(135deg, ${p.primary}26 0%, ${p.accent}14 100%)`, border: `1px solid ${p.primary}33` }}>
            <Heading sid={s.id} path="headline" value={d.headline} placeholder="Call to action" />
            <Txt sid={s.id} path="subtext" value={d.subtext} as="p" className="mt-3 text-lg max-w-xl mx-auto" style={muted} />
            <div className="mt-8 flex justify-center">{cta(d.ctaText, d.ctaUrl, "cta-button")}</div>
          </div>
        </Section>
      );

    case "form":
    case "two_step_form":
      return (
        <Section id="lead-form">
          <Surface className={`max-w-lg mx-auto ${R("md:!p-10")}`} style={{ boxShadow: `0 30px 80px -40px ${p.primary}` }}>
            <div className="text-center mb-6">
              <Txt sid={s.id} path="formTitle" value={d.formTitle} as="h2" className="text-2xl font-bold" style={{ color: p.text, fontFamily: FONT_STACKS[t.headingFont].css }} />
              <Txt sid={s.id} path="formSubtext" value={d.formSubtext} as="p" className="mt-2" style={muted} />
            </div>
            <LeadForm sid={s.id} fields={d.fields} buttonText={d.buttonText} />
          </Surface>
        </Section>
      );

    case "countdown":
      return <CountdownView s={s} />;

    case "image":
      return (
        <Section tight>
          <Img src={d.src} seed={s.id} alt={d.alt} className="w-full aspect-[16/8]" style={{ borderRadius: RADIUS[t.radius].img }} />
          <Txt sid={s.id} path="caption" value={d.caption} as="p" className="text-center text-sm mt-3" style={muted} />
        </Section>
      );

    case "divider":
      return <div className="max-w-5xl mx-auto px-5"><hr style={{ borderColor: p.border }} /></div>;

    default:
      return null; // funnel-only types (order_bump, sticky_cta, …) render nothing here
  }
}

function CountdownView({ s }: { s: PageSection }) {
  const { t } = useP();
  const R = useR();
  const p = t.palette;
  const c = useTick(s.data.targetDate);
  return (
    <Section tight>
      <Txt sid={s.id} path="countdownTitle" value={s.data.countdownTitle} as="p" className="text-center text-sm font-bold uppercase tracking-[0.2em] mb-5" style={{ color: p.muted }} />
      <div className="grid grid-cols-4 gap-3 max-w-xl mx-auto" data-testid="page-countdown">
        {([["Days", c.d], ["Hours", c.h], ["Minutes", c.m], ["Seconds", c.s]] as const).map(([l, v]) => (
          <Surface key={l} className="text-center !px-2 !py-4">
            <p className={`text-3xl ${R("md:text-5xl")} font-extrabold tabular-nums`} style={{ color: p.text, fontFamily: FONT_STACKS[t.headingFont].css }}>{String(v).padStart(2, "0")}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: p.muted }}>{l}</p>
          </Surface>
        ))}
      </div>
    </Section>
  );
}

export default function ThemedPage({ theme, sections, editable = false, device = "desktop", onField, onLead, selectedId, onSelect, thumbnail = false }: ThemedPageProps) {
  const t = useMemo(() => normalizeTheme(theme || DEFAULT_THEME), [theme]);
  useGoogleFonts(t);
  const ctx: Ctx = { t, editable, mobile: device === "mobile", thumbnail, onField, onLead };
  return (
    <PageCtx.Provider value={ctx}>
      <div data-testid="themed-page" data-theme-name={t.name} data-theme-mode={t.mode} className="min-h-full w-full antialiased"
        style={{ background: t.palette.bg, color: t.palette.text, fontFamily: FONT_STACKS[t.bodyFont].css, pointerEvents: thumbnail ? "none" : undefined }}>
        {sections.map(s => (
          <div key={s.id} data-section-id={s.id} data-section-type={s.type}
            onClick={onSelect ? () => onSelect(s.id) : undefined}
            className={editable ? "relative transition-shadow" : undefined}
            style={editable && selectedId === s.id ? { boxShadow: `inset 0 0 0 2px ${t.palette.primary}` } : undefined}>
            <SectionView s={s} />
          </div>
        ))}
      </div>
    </PageCtx.Provider>
  );
}

/** Immutable set by "a.b.2.c" path (used by inline editing). */
export function setByPath<T extends Record<string, any>>(obj: T, path: string, value: any): T {
  const keys = path.split(".");
  const clone: any = Array.isArray(obj) ? [...obj] : { ...obj };
  let cur = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const next = cur[k];
    cur[k] = Array.isArray(next) ? [...next] : next && typeof next === "object" ? { ...next } : (/^\d+$/.test(keys[i + 1]) ? [] : {});
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return clone;
}

export function applyFieldEdit(sections: PageSection[], sid: string, path: string, value: string): PageSection[] {
  return sections.map(s => (s.id === sid ? { ...s, data: setByPath(s.data || {}, path, value) } : s));
}
