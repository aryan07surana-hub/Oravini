import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";


const GOLD = "#d4b461";
const GOLD_BRIGHT = "#f0c84b";

// Growth with video marketing purchased, Pro, or Elite can access
export function hasVideoMarketingAccess(plan: string | undefined | null, hasVideoMarketing: boolean = false): boolean {
    if (!plan) return false;
    if (plan === "pro" || plan === "elite") return true;
    if (plan === "growth" && hasVideoMarketing) return true;
    return false;
}

// ── Scroll Animate ────────────────────────────────────────────────────────────
function useScrollAnim() {
    useEffect(() => {
        const els = document.querySelectorAll("[data-anim]");
        const obs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    (e.target as HTMLElement).style.opacity = "1";
                    (e.target as HTMLElement).style.transform = "none";
                }
            });
        }, { threshold: 0.1 });
        els.forEach(el => obs.observe(el));
        return () => obs.disconnect();
    }, []);
}

function Anim({ children, delay = 0, from = "translateY(40px)", style = {} }: { children: React.ReactNode; delay?: number; from?: string; style?: React.CSSProperties }) {
    return (
        <div data-anim="1" style={{ opacity: 0, transform: from, transition: `opacity 0.8s ease ${delay}ms, transform 0.8s ease ${delay}ms`, ...style }}>
            {children}
        </div>
    );
}

// ── Counter ───────────────────────────────────────────────────────────────────
function Counter({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
    const [val, setVal] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const started = useRef(false);
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting && !started.current) {
                started.current = true;
                const dur = 1800, start = Date.now();
                const tick = () => {
                    const p = Math.min((Date.now() - start) / dur, 1);
                    setVal(Math.round(p * to));
                    if (p < 1) requestAnimationFrame(tick);
                };
                tick();
            }
        }, { threshold: 0.5 });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [to]);
    return <span ref={ref}>{prefix}{val}{suffix}</span>;
}

// ── Tilt Card ─────────────────────────────────────────────────────────────────
function TiltCard({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
    const ref = useRef<HTMLDivElement>(null);
    const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const el = ref.current!;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(600px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale(1.03)`;
    }, []);
    const onLeave = useCallback(() => { if (ref.current) ref.current.style.transform = "perspective(600px) rotateY(0) rotateX(0) scale(1)"; }, []);
    return (
        <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={{ transition: "transform 0.2s ease", transformStyle: "preserve-3d", ...style }}>
            {children}
        </div>
    );
}

// ── Data ──────────────────────────────────────────────────────────────────────
const FEATURES = [
    { icon: "📡", title: "Live Webinars", desc: "Run webinars on your own eligible YouTube live channel, streamed from YouTube Studio or an encoder such as OBS. Oravini builds the registration page, the countdown and the live room. No webinar email or SMS is sent.", tag: "Core Feature" },
    { icon: "🎯", title: "VSL Engine", desc: "Deploy video sales letters with a custom progress bar you fully control. Set the timing yourself and see watch-through reported per video.", tag: "Pacing Control" },
    { icon: "✂️", title: "AI Clip Finder", desc: "Bring in a long-form video — a webinar replay, podcast, or VSL — and review suggested clips before you use them. AI generation is currently preview-only while generation cost is approved.", tag: "Preview Only" },
    { icon: "🗂️", title: "Video Library", desc: "One organised library for all your content — VSLs, linked recordings, and standard videos. Add them by URL (YouTube, Vimeo, Wistia, Loom or a direct file) or by uploading a file.", tag: "Organised" },
    { icon: "📊", title: "Webinar Analytics", desc: "See exactly how your webinar performed — attendee counts, drop-off points, watch-through rates, and engagement spikes — all in one real-time dashboard.", tag: "Data Driven" },
    { icon: "🔗", title: "Community Links", desc: "Point registrants at your own group after signup. Add optional community links once and they appear to attendees on the confirmation and live pages.", tag: "Optional" },
    { icon: "👥", title: "Attendee CRM", desc: "Every registration lands in your CRM. See who showed up, how long they watched, who clicked your offer and who dropped off, then follow up yourself.", tag: "CRM Built-in" },
    { icon: "🌐", title: "Registration Pages", desc: "A registration page is built automatically for every webinar. Customise the headline, presenter info, CTA and countdown timer.", tag: "Auto-Built" },
    { icon: "🎬", title: "Webinar Replays", desc: "Your session is recorded by YouTube, not by Oravini. Once YouTube finishes processing the archive, link it as the replay on your webinar page in one click.", tag: "Link Replay" },
    { icon: "🔗", title: "Embed Anywhere", desc: "Embed your VSL or hosted video on any external page via a simple iframe or link. White-label player with no Oravini branding on Pro.", tag: "Flexible" },
    { icon: "⏱️", title: "Timed Email Gates", desc: "Lock your VSL behind an email opt-in that triggers at any timestamp. Capture leads exactly when they're most engaged — right at peak interest.", tag: "Lead Capture" },
    { icon: "📱", title: "Webinar Series", desc: "Build a multi-session webinar series with shared attendee lists and consistent branding across every session.", tag: "Multi-Session" },
];

// Counts only — each is sourced from this page's own data, never a performance claim.
const STATS = [
    { val: FEATURES.length, suffix: "", label: "Tools In The Suite", prefix: "" },
    { val: 3, suffix: "", label: "Plans With Video Access", prefix: "" },
    { val: 4, suffix: "", label: "Steps To Set Up A Webinar", prefix: "" },
];

const PRICING_TIERS = [
    {
        name: "Growth + Add-on", price: "+$20", period: "/mo", accent: GOLD,
        bg: `${GOLD}0a`, border: `${GOLD}44`, highlight: false,
        tag: "Add-on",
        features: ["3 live webinars per month", "VSL pages + progress bar", "Optional community links", "Registration pages auto-built", "Basic attendee analytics", "Video hosting — 5 videos"],
        cta: "Add Video Marketing",
        route: "/video-marketing-addon",
    },
    {
        name: "Pro", price: "$59", period: "/mo", accent: "#34d399",
        bg: "rgba(52,211,153,0.05)", border: "rgba(52,211,153,0.22)", highlight: true,
        tag: "Recommended",
        features: ["Unlimited live webinars", "VSL Engine + custom progress bar", "AI Clip Finder", "Full attendee CRM", "White-label video pages", "Unlimited video storage", "500 AI credits / month", "Private support chat"],
        cta: "Upgrade to Pro",
        route: "/select-plan",
    },
    {
        name: "Elite", price: "$99", period: "/mo", accent: "#c084fc",
        bg: "rgba(168,85,247,0.05)", border: "rgba(168,85,247,0.22)", highlight: false,
        tag: "White Glove",
        features: ["Everything in Pro", "Unlimited AI credits", "1-on-1 strategy sessions", "Done-for-you content audits", "Priority video rendering", "White-label platform branding"],
        cta: "Upgrade to Elite",
        route: "/select-plan",
    },
];

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onUpgrade, needsAddon }: { onUpgrade: () => void; needsAddon: boolean }) {
    const [scrolled, setScrolled] = useState(false);
    const [, nav] = useLocation();
    useEffect(() => {
        const fn = () => setScrolled(window.scrollY > 60);
        window.addEventListener("scroll", fn);
        return () => window.removeEventListener("scroll", fn);
    }, []);
    return (
        <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 500, background: scrolled ? "rgba(0,0,0,0.92)" : "transparent", backdropFilter: scrolled ? "blur(20px)" : "none", borderBottom: scrolled ? "1px solid rgba(212,180,97,0.1)" : "none", transition: "all 0.4s ease" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img src="/oravini-logo.png" alt="Oravini" style={{ height: 42, width: 42, objectFit: "cover", objectPosition: "50% 32%", borderRadius: 8, filter: "drop-shadow(0 0 12px rgba(212,180,97,0.3))" }} />
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: "#fff", lineHeight: 1.1 }}>ORAVINI</div>
                        <div style={{ fontSize: 9, color: `${GOLD}66`, letterSpacing: "0.12em", textTransform: "uppercase" }}>Video Marketing</div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button
                        onClick={() => document.getElementById("vm-features")?.scrollIntoView({ behavior: "smooth" })}
                        style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, padding: "8px 14px", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                    >Features</button>
                    <button
                        onClick={() => document.getElementById("vm-pricing")?.scrollIntoView({ behavior: "smooth" })}
                        style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, padding: "8px 14px", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                    >Pricing</button>
                    <button
                        onClick={() => nav("/dashboard")}
                        style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, padding: "8px 18px", cursor: "pointer" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}55`; e.currentTarget.style.color = GOLD; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                    >Dashboard</button>
                    <button
                        onClick={onUpgrade}
                        style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, border: "none", borderRadius: 8, color: "#000", fontSize: 13, fontWeight: 800, padding: "9px 20px", cursor: "pointer" }}
                    >
                        {needsAddon ? "Add Video Marketing" : "Upgrade Now"}
                    </button>
                </div>
            </div>
        </nav>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
interface TierGateProps {
    currentPlan?: string;
    userName?: string;
    hasVideoMarketing?: boolean;
}

export default function TierGate({ currentPlan, userName, hasVideoMarketing = false }: TierGateProps) {
    const [, nav] = useLocation();

    useScrollAnim();

    const plan = (currentPlan || "free").toLowerCase();
    const isGrowth = plan === "growth";
    const needsAddon = isGrowth && !hasVideoMarketing;
    const firstName = userName ? userName.split(" ")[0] : null;

    const handleUpgrade = useCallback(() => {
        if (needsAddon) nav("/video-marketing-addon");
        else nav("/select-plan");
    }, [needsAddon, nav]);

    return (
        <div style={{ background: "#000", color: "#fff", fontFamily: "'Inter', system-ui, sans-serif", overflowX: "hidden" }}>
            <style>{`
                @keyframes shimmer { 0%{ background-position:-400px 0; } 100%{ background-position:400px 0; } }

                .vm-feature-card:hover { border-color: rgba(212,180,97,0.4) !important; box-shadow: 0 0 40px rgba(212,180,97,0.08) !important; }
                .vm-pricing-card:hover { transform: translateY(-6px) !important; }
            `}</style>

            <Navbar onUpgrade={handleUpgrade} needsAddon={needsAddon} />

            {/* ── WHAT IS ORAVINI VIDEO MARKETING ──────────────────────────────── */}
            <section style={{ padding: "120px 24px", maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
                <Anim>
                    <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 16 }}>The Platform</div>
                </Anim>
                <Anim delay={100}>
                    <h2 style={{ fontSize: "clamp(32px, 5vw, 58px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 24, letterSpacing: "-0.025em" }}>
                        Your whole video funnel,<br /><span style={{ color: GOLD }}>in one dashboard.</span>
                    </h2>
                </Anim>
                <Anim delay={200}>
                    <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, maxWidth: 680, margin: "0 auto 56px" }}>
                        Oravini Video Marketing lives inside your existing dashboard — webinar registration and live pages, VSLs, video hosting, an attendee CRM and optional community links. Webinars stream on your own YouTube live channel. No extra logins. Everything in one place.
                    </p>
                </Anim>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
                    {[
                        { icon: "📡", title: "Webinars", desc: "Run webinars on your own YouTube live channel with built-in registration, a live room and a full attendee CRM." },
                        { icon: "🎯", title: "VSL Pages", desc: "Deploy video sales letters with progress bars you control and an email opt-in gate at any timestamp." },
                        { icon: "✂️", title: "AI Clip Finder", desc: "Review suggested clips from any long-form video. AI generation is preview-only for now." },
                    ].map(({ icon, title, desc }) => (
                        <Anim key={title} delay={150}>
                            <TiltCard style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "32px 28px" }}>
                                <div style={{ fontSize: 36, marginBottom: 16 }}>{icon}</div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{title}</div>
                                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>{desc}</div>
                            </TiltCard>
                        </Anim>
                    ))}
                </div>
            </section>

            {/* ── STATS ────────────────────────────────────────────────────────── */}
            <section style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "80px 24px", background: "rgba(212,180,97,0.02)" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 40, textAlign: "center" }}>
                    {STATS.map(s => (
                        <Anim key={s.label}>
                            <div style={{ fontSize: "clamp(40px, 5vw, 62px)", fontWeight: 900, color: GOLD, lineHeight: 1 }}>
                                <Counter to={s.val} prefix={s.prefix} suffix={s.suffix} />
                            </div>
                            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 8, letterSpacing: "0.04em" }}>{s.label}</div>
                        </Anim>
                    ))}
                </div>
            </section>

            {/* ── FEATURES ─────────────────────────────────────────────────────── */}
            <section id="vm-features" style={{ padding: "120px 24px" }}>
                <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                    <Anim style={{ textAlign: "center", marginBottom: 64 }}>
                        <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>The Toolkit</div>
                        <h2 style={{ fontSize: "clamp(28px, 4.5vw, 52px)", fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1.1 }}>{FEATURES.length} tools. One dashboard.<br /><span style={{ color: GOLD }}>Built around your funnel.</span></h2>
                    </Anim>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
                        {FEATURES.map((f, i) => (
                            <Anim key={f.title} delay={i * 50}>
                                <TiltCard>
                                    <div className="vm-feature-card" style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "30px 28px", height: "100%", transition: "border-color 0.3s, box-shadow 0.3s", cursor: "default" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                                            <div style={{ fontSize: 34 }}>{f.icon}</div>
                                            <span style={{ fontSize: 10, fontWeight: 700, color: GOLD, background: `${GOLD}15`, border: `1px solid ${GOLD}33`, borderRadius: 99, padding: "3px 10px", letterSpacing: "0.06em", textTransform: "uppercase" }}>{f.tag}</span>
                                        </div>
                                        <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{f.title}</div>
                                        <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>{f.desc}</div>
                                    </div>
                                </TiltCard>
                            </Anim>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
            <section style={{ padding: "120px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "radial-gradient(ellipse 90% 60% at 50% 0%, rgba(212,180,97,0.04) 0%, transparent 65%)" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                    <Anim style={{ textAlign: "center", marginBottom: 80 }}>
                        <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>How It Works</div>
                        <h2 style={{ fontSize: "clamp(28px, 4.5vw, 52px)", fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1.1, margin: "0 0 20px" }}>
                            Set up your video funnel<br /><span style={{ color: GOLD }}>in four steps.</span>
                        </h2>
                        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "clamp(15px, 1.8vw, 17px)", maxWidth: 560, margin: "0 auto", lineHeight: 1.75 }}>
                            Registration page, live room, attendee CRM and replay — set up and tracked inside Oravini, with the stream itself running on your YouTube channel.
                        </p>
                    </Anim>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 2, position: "relative" }}>
                        {[
                            {
                                num: "01", icon: "🎬",
                                title: "Create Your Event",
                                body: "Set up a webinar or VSL. Add the title, date and cover image, connect an eligible YouTube live channel or paste a stream link, and Oravini builds your registration and live pages.",
                                bullets: ["Webinar or VSL mode", "Auto registration page", "Optional community links"],
                            },
                            {
                                num: "02", icon: "📣",
                                title: "Share & Get Registrants",
                                body: "Copy your registration link and share it anywhere — Instagram bio, DMs, email list. Every sign-up lands in your attendee CRM automatically with full contact info.",
                                bullets: ["One link to share anywhere", "Auto CRM tagging", "Real-time registrant feed"],
                            },
                            {
                                num: "03", icon: "📡",
                                title: "Go Live & Convert",
                                body: "Go live from YouTube Studio or your encoder. Your Oravini live page switches from countdown to live on its own, and you watch attendance, chat and drop-off as it happens.",
                                bullets: ["Live attendance dashboard", "Live chat and Q&A", "Link the replay afterwards"],
                            },
                            {
                                num: "04", icon: "✂️",
                                title: "Repurpose With AI",
                                body: "Bring your replay into AI Clip Finder to review suggested moments for Instagram, TikTok, YouTube Shorts and LinkedIn. AI generation is preview-only while generation cost is approved.",
                                bullets: ["Clip review workflow", "Multi-platform formats", "Preview-only for now"],
                            },
                        ].map((step, i) => (
                            <Anim key={step.num} delay={i * 100}>
                                <div style={{
                                    position: "relative",
                                    background: i === 1 ? `rgba(212,180,97,0.04)` : "rgba(255,255,255,0.015)",
                                    border: i === 1 ? `1px solid rgba(212,180,97,0.22)` : "1px solid rgba(255,255,255,0.06)",
                                    borderRadius: 20, padding: "36px 30px", height: "100%",
                                    display: "flex", flexDirection: "column", gap: 0, overflow: "hidden",
                                }}>
                                    <div style={{ position: "absolute", top: -12, right: 20, fontSize: 110, fontWeight: 900, lineHeight: 1, color: i === 1 ? `rgba(212,180,97,0.07)` : "rgba(255,255,255,0.04)", userSelect: "none", pointerEvents: "none", letterSpacing: "-0.04em" }}>{step.num}</div>
                                    <div style={{ fontSize: 30, marginBottom: 16 }}>{step.icon}</div>
                                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10, color: i === 1 ? GOLD : "rgba(255,255,255,0.3)" }}>Step {step.num}</div>
                                    <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", marginBottom: 14, lineHeight: 1.25 }}>{step.title}</div>
                                    <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.42)", lineHeight: 1.8, margin: "0 0 22px", flex: 1 }}>{step.body}</p>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                                        {step.bullets.map(b => (
                                            <div key={b} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <div style={{ width: 5, height: 5, borderRadius: "50%", background: i === 1 ? GOLD : "rgba(255,255,255,0.25)", flexShrink: 0 }} />
                                                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", fontWeight: 500 }}>{b}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Anim>
                        ))}
                    </div>

                    <Anim style={{ textAlign: "center", marginTop: 64 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "rgba(212,180,97,0.06)", border: "1px solid rgba(212,180,97,0.18)", borderRadius: 99, padding: "12px 28px" }}>
                            <span style={{ fontSize: 16 }}>🤖</span>
                            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
                                Registration, the live room and CRM updates run on their own. Oravini sends no webinar email or SMS — share your optional community links instead.
                            </span>
                        </div>
                    </Anim>
                </div>
            </section>

            {/* ── OUTCOMES ─────────────────────────────────────────────────────── */}
            <section style={{ padding: "100px 24px", background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(212,180,97,0.05) 0%, transparent 70%)" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }} className="vm-outcomes-grid">
                    <Anim from="translateX(-40px)">
                        <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>What You Can Track</div>
                        <h2 style={{ fontSize: "clamp(28px, 4vw, 50px)", fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: 24 }}>
                            Stop guessing.<br />Start <span style={{ color: GOLD }}>measuring.</span>
                        </h2>
                        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.8, marginBottom: 32 }}>
                            Every video funnel in Oravini is tracked end-to-end — registration, attendance, watch time, offer clicks and replay views. The numbers below are the metrics your dashboard reports; Oravini does not publish benchmark results.
                        </p>
                        <button
                            onClick={handleUpgrade}
                            style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 14, border: "none", borderRadius: 10, padding: "14px 30px", cursor: "pointer" }}
                        >
                            {needsAddon ? "Add Video Marketing →" : "Upgrade to Pro →"}
                        </button>
                    </Anim>
                    <Anim from="translateX(40px)">
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {[
                                { label: "VSL watch-through", note: "Per video" },
                                { label: "Webinar attendance & drop-off", note: "Per session" },
                                { label: "Offer clicks from the live room", note: "Per attendee" },
                                { label: "Registrations and show-ups", note: "Per webinar" },
                            ].map(({ label, note }) => (
                                <div key={label} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>{label}</span>
                                        <span style={{ fontSize: 13, color: GOLD, fontWeight: 700 }}>{note}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Anim>
                </div>
                <style>{`@media(max-width:768px){ .vm-outcomes-grid{ grid-template-columns:1fr !important; gap:40px !important; } }`}</style>
            </section>

            {/* ── PRICING ──────────────────────────────────────────────────────── */}
            <section id="vm-pricing" style={{ padding: "120px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                    <Anim style={{ textAlign: "center", marginBottom: 64 }}>
                        <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>Simple Pricing</div>
                        <h2 style={{ fontSize: "clamp(28px, 4.5vw, 52px)", fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
                            {needsAddon ? "Add video access." : "Get Video Marketing free."}<br /><span style={{ color: GOLD }}>{needsAddon ? "Scale when ready." : "It's included on Pro."}</span>
                        </h2>
                    </Anim>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
                        {PRICING_TIERS.map((t, i) => (
                            <Anim key={t.name} delay={i * 80}>
                                <div className="vm-pricing-card" style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 20, padding: "32px 28px", display: "flex", flexDirection: "column", height: "100%", transition: "transform 0.3s, box-shadow 0.3s", position: "relative", overflow: "hidden", boxShadow: t.highlight ? `0 0 60px rgba(52,211,153,0.1)` : "none" }}>
                                    {t.highlight && (
                                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)` }} />
                                    )}
                                    {t.highlight && (
                                        <div style={{ position: "absolute", top: 14, right: 14, fontSize: 9, fontWeight: 800, color: "#000", background: t.accent, borderRadius: 99, padding: "3px 8px", letterSpacing: "0.08em", textTransform: "uppercase" }}>{t.tag}</div>
                                    )}
                                    {!t.highlight && (
                                        <div style={{ position: "absolute", top: 14, right: 14, fontSize: 9, fontWeight: 700, color: t.accent, background: `${t.accent}18`, border: `1px solid ${t.accent}33`, borderRadius: 99, padding: "3px 8px", textTransform: "uppercase" }}>{t.tag}</div>
                                    )}
                                    <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{t.name}</div>
                                    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 24 }}>
                                        <span style={{ fontSize: 42, fontWeight: 900, color: t.accent, lineHeight: 1 }}>{t.price}</span>
                                        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", paddingBottom: 4 }}>{t.period}</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, marginBottom: 24 }}>
                                        {t.features.map(f => (
                                            <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                                <span style={{ color: t.accent, fontSize: 12, marginTop: 1, flexShrink: 0 }}>✓</span>
                                                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{f}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => nav(t.route)}
                                        style={{ width: "100%", padding: "13px 0", borderRadius: 11, fontWeight: 800, fontSize: 14, cursor: "pointer", border: `1px solid ${t.accent}44`, background: t.highlight ? t.accent : `${t.accent}15`, color: t.highlight ? "#000" : t.accent, transition: "all 0.2s" }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = t.accent; (e.currentTarget as HTMLButtonElement).style.color = "#000"; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = t.highlight ? t.accent : `${t.accent}15`; (e.currentTarget as HTMLButtonElement).style.color = t.highlight ? "#000" : t.accent; }}
                                    >
                                        {t.cta} →
                                    </button>
                                </div>
                            </Anim>
                        ))}
                    </div>

                    <Anim style={{ textAlign: "center", marginTop: 48 }}>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)" }}>Monthly billing · cancel anytime · no lock-in</p>
                        <button onClick={() => nav("/dashboard")} style={{ marginTop: 14, background: "none", border: "none", color: "rgba(255,255,255,0.28)", fontSize: 13, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>
                            Go back to dashboard
                        </button>
                    </Anim>
                </div>
            </section>

            {/* ── FOOTER ───────────────────────────────────────────────────────── */}
            <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "48px 24px", textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
                    <img src="/oravini-logo.png" alt="Oravini" style={{ height: 32, width: 32, objectFit: "cover", objectPosition: "50% 32%", borderRadius: 8, opacity: 0.6 }} />
                    <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>ORAVINI</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", marginLeft: 4 }}>· Video Marketing Suite</span>
                </div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.18)" }}>© 2025 Oravini by Brandverse. All rights reserved.</p>
            </footer>
        </div>
    );
}
