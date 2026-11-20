import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { CalendarClock, CheckCircle2, Mic, PlayCircle, Radio } from "lucide-react";
import { formatIST } from "@shared/webinarFunnel";
import {
  GOLD, Countdown, PublicLoading, PublicShell, WebinarNotFound, useCountdown, usePublicWebinar,
} from "@/components/webinar-funnel/shared";
import { getUtmParams } from "@/lib/utm";

const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" };
const regKey = (slug: string) => `oravini:webinar-registered:${slug}`;

export default function WebinarFunnelLanding() {
  const { slug } = useParams<{ slug: string }>();
  const { data: webinar, isLoading, isError } = usePublicWebinar(slug);
  const msLeft = useCountdown(webinar?.scheduledAt);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (!slug) return;
    try { if (localStorage.getItem(regKey(slug))) setRegistered(true); } catch {}
  }, [slug]);

  useEffect(() => {
    if (webinar?.title) document.title = webinar.title;
  }, [webinar?.title]);

  if (isLoading) return <PublicLoading />;
  if (isError || !webinar) return <WebinarNotFound />;

  const liveHref = `/w/${webinar.slug}/live`;
  const started = msLeft === 0;
  const canRegister = webinar.status === "published";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Please enter your name");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Please enter a valid email");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/webinar-funnels/${encodeURIComponent(webinar.slug)}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, ...getUtmParams() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Registration failed. Please try again.");
      try { localStorage.setItem(regKey(webinar.slug), "1"); } catch {}
      setRegistered(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicShell>
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-5"
          style={{ background: `${GOLD}14`, border: `1px solid ${GOLD}30`, color: GOLD }}>
          <Radio className="w-3 h-3" /> {webinar.status === "ended" ? "Webinar replay" : "Free live webinar"}
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-4" data-testid="webinar-title">{webinar.title}</h1>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-5 text-sm text-zinc-400">
          {webinar.hostName && (
            <span className="flex items-center gap-1.5" data-testid="webinar-host"><Mic className="w-4 h-4" style={{ color: GOLD }} /> Hosted by <b className="text-white">{webinar.hostName}</b></span>
          )}
          <span className="flex items-center gap-1.5" data-testid="webinar-datetime"><CalendarClock className="w-4 h-4" style={{ color: GOLD }} /> {formatIST(webinar.scheduledAt)}</span>
        </div>
      </div>

      {/* Countdown */}
      <div className="mb-8">
        {started ? (
          <div className="rounded-2xl p-5 text-center" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <p className="text-sm font-bold text-red-300">{webinar.status === "ended" ? "This webinar has ended — the replay may be available." : "The webinar has started!"}</p>
            <Link href={liveHref} className="inline-flex items-center gap-2 mt-3 text-sm font-bold" style={{ color: GOLD }}>
              <PlayCircle className="w-4 h-4" /> Watch now
            </Link>
          </div>
        ) : (
          <>
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Starts in</p>
            <Countdown msLeft={msLeft} />
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        {/* Description */}
        <div className="md:col-span-3 rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: GOLD }}>About this webinar</h2>
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line" data-testid="webinar-description">
            {webinar.description || "Join us live for this session."}
          </p>
        </div>

        {/* Registration */}
        <div className="md:col-span-2 rounded-2xl p-6" style={{ background: "#0e0e10", border: `1px solid ${GOLD}30` }}>
          {registered && webinar.status === "ended" ? (
            <div className="text-center py-4" data-testid="webinar-ended-replay">
              <PlayCircle className="w-10 h-10 mx-auto mb-3" style={{ color: GOLD }} />
              <p className="text-xl font-black text-white mb-4">This webinar has ended - watch the replay</p>
              <Link href={liveHref} data-testid="link-replay-page"
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold"
                style={{ background: GOLD, color: "#0a0910" }}>
                <PlayCircle className="w-4 h-4" /> Watch the replay
              </Link>
            </div>
          ) : registered ? (
            <div className="text-center py-4" data-testid="webinar-registered">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
              <p className="text-xl font-black text-white mb-1">You're in!</p>
              <p className="text-xs text-zinc-500 mb-5">Save the date: {formatIST(webinar.scheduledAt)}. Come back to this link when it's time.</p>
              <Link href={liveHref} data-testid="link-live-page"
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold"
                style={{ background: GOLD, color: "#0a0910" }}>
                <PlayCircle className="w-4 h-4" /> Go to the live page
              </Link>
            </div>
          ) : !canRegister ? (
            <div className="text-center py-4">
              <p className="text-sm text-zinc-400 mb-4">Registration is closed.</p>
              <Link href={liveHref} className="inline-flex items-center gap-2 text-sm font-bold" style={{ color: GOLD }}>
                <PlayCircle className="w-4 h-4" /> Go to the webinar page
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3" data-testid="webinar-register-form" noValidate>
              <p className="text-base font-black text-white mb-1">Reserve your free spot</p>
              <input data-testid="input-reg-name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoComplete="name" maxLength={120}
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-zinc-600" style={inputStyle} />
              <input data-testid="input-reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" maxLength={254}
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-zinc-600" style={inputStyle} />
              <input data-testid="input-reg-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone (optional)" autoComplete="tel" maxLength={32}
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-zinc-600" style={inputStyle} />
              {error && <p className="text-xs text-red-400" role="alert">{error}</p>}
              <button data-testid="btn-register" type="submit" disabled={submitting}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{ background: GOLD, color: "#0a0910" }}>
                {submitting ? "Registering..." : "Register now"}
              </button>
            </form>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
