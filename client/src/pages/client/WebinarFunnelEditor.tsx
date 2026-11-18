import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { parseYouTubeVideoId, slugifyWebinarTitle, WEBINAR_SLUG_RE, formatIST } from "@shared/webinarFunnel";
import { ArrowLeft, Radio, Save, CheckCircle2, AlertCircle, ExternalLink, Users, Copy, Loader2, Eye } from "lucide-react";
import type { WebinarFunnelRow } from "./WebinarFunnels";

const GOLD = "#d4b461";
const IST_OFFSET_MIN = 330;
const inputCls = "w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-zinc-600";
const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", outline: "none", colorScheme: "dark" as const };

/** UTC ISO → "YYYY-MM-DDTHH:mm" wall-clock in IST, for <input type="datetime-local">. */
function toISTInput(iso: string) {
  return new Date(new Date(iso).getTime() + IST_OFFSET_MIN * 60_000).toISOString().slice(0, 16);
}
/** "YYYY-MM-DDTHH:mm" interpreted as IST → UTC ISO string. */
function fromISTInput(value: string) {
  const d = new Date(`${value}:00+05:30`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

type WebinarStatus = "draft" | "published" | "ended";

/** What a visitor sees right now, from the SAVED status + scheduledAt (mirrors WebinarFunnelLanding/Live). */
function visitorState(status: WebinarStatus, scheduledAt: string, hasVideo: boolean, now: number) {
  const started = new Date(scheduledAt).getTime() <= now;
  if (status === "draft") {
    return { tone: "#71717a", label: "Hidden", text: "Draft — /w/ links show \"not found\". Publish to open registration." };
  }
  if (status === "ended") {
    return started
      ? { tone: "#a78bfa", label: "Replay", text: `Registration closed · /live plays the ${hasVideo ? "replay" : "video (none set yet)"} with your CTA.` }
      : { tone: "#a78bfa", label: "Closed", text: "Registration closed · /live shows a countdown until the scheduled time, then the replay." };
  }
  return started
    ? { tone: "#f87171", label: "Live", text: hasVideo ? "Live now · registration page links to /live, which shows the stream + CTA." : "Live now · but no YouTube video is set, so /live shows \"stream isn't connected yet\"." }
    : { tone: "#34d399", label: "Registration", text: `Registration open · /w/ shows the sign-up form, /live shows a countdown to ${formatIST(scheduledAt)}.` };
}

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">{label}</label>
      {children}
      {hint && <div className="text-[11px] text-zinc-600 mt-1.5">{hint}</div>}
    </div>
  );
}

export default function WebinarFunnelEditor({ id }: { id?: string }) {
  const isNew = !id || id === "new";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: existing, isLoading } = useQuery<WebinarFunnelRow | null>({
    queryKey: [`/api/webinar-funnels/${id}`],
    enabled: !isNew,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hostName, setHostName] = useState("");
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [youtube, setYoutube] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<WebinarStatus>("draft");
  const [now, setNow] = useState(() => Date.now());
  const hydratedId = useRef<string | null>(null);

  // Re-evaluate the visitor-state line as the scheduled time passes.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Hydrate the form once per webinar. Later cache updates (e.g. the publish toggle
  // saving on its own) must not wipe unsaved edits in the other fields.
  useEffect(() => {
    if (!existing || hydratedId.current === existing.id) return;
    hydratedId.current = existing.id;
    setTitle(existing.title);
    setDescription(existing.description || "");
    setHostName(existing.hostName || "");
    setScheduledLocal(toISTInput(existing.scheduledAt));
    setYoutube(existing.youtubeVideoId || "");
    setCtaText(existing.ctaText || "");
    setCtaUrl(existing.ctaUrl || "");
    setSlug(existing.slug);
    setStatus(existing.status);
  }, [existing]);

  const videoId = parseYouTubeVideoId(youtube);
  const youtubeInvalid = youtube.trim() !== "" && !videoId;
  const slugInvalid = slug.trim() !== "" && !WEBINAR_SLUG_RE.test(slug.trim());
  const ctaUrlInvalid = ctaUrl.trim() !== "" && !/^https?:\/\/\S+$/i.test(ctaUrl.trim());
  const scheduledIso = scheduledLocal ? fromISTInput(scheduledLocal) : null;

  const save = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        hostName: hostName.trim() || null,
        scheduledAt: scheduledIso,
        youtube: youtube.trim() || null,
        ctaText: ctaText.trim() || null,
        ctaUrl: ctaUrl.trim() || null,
        status,
      };
      if (slug.trim()) body.slug = slug.trim();
      return isNew
        ? apiRequest("POST", "/api/webinar-funnels", body)
        : apiRequest("PATCH", `/api/webinar-funnels/${id}`, body);
    },
    onSuccess: (row: WebinarFunnelRow) => {
      queryClient.invalidateQueries({ queryKey: ["/api/webinar-funnels"] });
      queryClient.setQueryData([`/api/webinar-funnels/${row.id}`], row);
      toast({ title: isNew ? "Webinar created" : "Webinar saved", description: row.status === "published" ? `${window.location.origin}/w/${row.slug}` : "Saved as draft — publish it to share the link." });
      if (isNew) navigate(`/tools/webinars/${row.id}`);
    },
    onError: (e: any) => toast({ title: "Couldn't save", description: e.message, variant: "destructive" }),
  });

  // Publish switch / "Mark ended" persist immediately (status only), independent of Save.
  const saveStatus = useMutation({
    mutationFn: async (next: WebinarStatus) => apiRequest("PATCH", `/api/webinar-funnels/${id}`, { status: next }),
    onMutate: (next: WebinarStatus) => {
      const prev = status;
      setStatus(next);
      return { prev };
    },
    onSuccess: (row: WebinarFunnelRow) => {
      queryClient.invalidateQueries({ queryKey: ["/api/webinar-funnels"] });
      queryClient.setQueryData([`/api/webinar-funnels/${row.id}`], row);
      setStatus(row.status);
      toast({
        title: row.status === "published" ? "Webinar published" : row.status === "ended" ? "Webinar marked as ended" : "Webinar unpublished",
        description: row.status === "published" ? `Registration is open at ${window.location.origin}/w/${row.slug}`
          : row.status === "ended" ? "Registration closed; the replay page stays up."
          : "The public page is hidden again.",
      });
    },
    onError: (e: any, _next, ctx) => {
      if (ctx) setStatus(ctx.prev);
      toast({ title: "Couldn't update publish status", description: e.message, variant: "destructive" });
    },
  });

  const changeStatus = (next: WebinarStatus) => {
    if (isNew) { setStatus(next); return; } // nothing to persist yet — applied on "Create webinar"
    saveStatus.mutate(next);
  };

  const handleSave = () => {
    if (!title.trim()) return toast({ title: "Title is required", variant: "destructive" });
    if (!scheduledIso) return toast({ title: "Pick a date and time", variant: "destructive" });
    if (youtubeInvalid) return toast({ title: "That doesn't look like a YouTube link", variant: "destructive" });
    if (ctaUrlInvalid) return toast({ title: "CTA URL must start with https://", variant: "destructive" });
    if (slugInvalid) return toast({ title: "Link can only use a-z, 0-9 and dashes", variant: "destructive" });
    save.mutate();
  };

  const publicUrl = existing ? `${window.location.origin}/w/${existing.slug}` : null;

  if (!isNew && isLoading) {
    return (
      <ClientLayout>
        <div className="max-w-3xl mx-auto px-6 py-10 space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />)}
        </div>
      </ClientLayout>
    );
  }
  if (!isNew && !existing) {
    return (
      <ClientLayout>
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <p className="text-white font-bold text-lg mb-2">Webinar not found</p>
          <button onClick={() => navigate("/tools/webinars")} className="text-sm font-bold" style={{ color: GOLD }}>← Back to webinars</button>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <button onClick={() => navigate("/tools/webinars")} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-300 mb-5">
          <ArrowLeft className="w-3.5 h-3.5" /> All webinars
        </button>
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.2)" }}>
              <Radio className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">{isNew ? "New Webinar" : "Edit Webinar"}</h1>
              <p className="text-xs text-zinc-500">Registration page at /w/your-link · live page at /w/your-link/live</p>
            </div>
          </div>
          {!isNew && existing && (
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(`/tools/webinars/${existing.id}/registrations`)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                style={{ background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.25)", color: "#f472b6" }}>
                <Users className="w-3.5 h-3.5" /> Registrations
              </button>
              {existing.status !== "draft" && (
                <a href={`/w/${existing.slug}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-300"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <ExternalLink className="w-3.5 h-3.5" /> View page
                </a>
              )}
            </div>
          )}
        </div>

        {/* Publish toggle */}
        <div className="rounded-2xl p-5 mb-6 flex items-center justify-between gap-4" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${status === "published" ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.07)"}` }}>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">
              {status === "published" ? "Published" : status === "ended" ? "Ended" : "Draft"}
            </p>
            <p className="text-xs text-zinc-500">
              {status === "published" ? "Anyone with the link can register and watch."
                : status === "ended" ? "Public pages stay up (replay + CTA) but registration is closed."
                : "Only you can see this. Publish to open registration."}
              {isNew && <span className="text-zinc-600"> Applied when you create the webinar.</span>}
            </p>
            {!isNew && existing && (() => {
              const v = visitorState(existing.status, existing.scheduledAt, !!existing.youtubeVideoId, now);
              return (
                <p data-testid="text-visitor-state" className="flex items-start gap-1.5 mt-2 text-[11px] text-zinc-400">
                  <Eye className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: v.tone }} />
                  <span><b style={{ color: v.tone }}>Visitors see: {v.label}</b> — {v.text}</span>
                </p>
              );
            })()}
            {publicUrl && status !== "draft" && (
              <button onClick={() => { navigator.clipboard.writeText(publicUrl).then(() => toast({ title: "Link copied!", description: publicUrl })).catch(() => {}); }}
                className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold truncate max-w-full" style={{ color: GOLD }}>
                <Copy className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{publicUrl}</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {status === "published" && (
              <button data-testid="btn-mark-ended" onClick={() => changeStatus("ended")} disabled={saveStatus.isPending}
                className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-300 disabled:opacity-50">Mark ended</button>
            )}
            {saveStatus.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" aria-label="Saving publish status" />}
            <Switch
              data-testid="switch-publish"
              checked={status === "published"}
              disabled={saveStatus.isPending}
              onCheckedChange={(on) => changeStatus(on ? "published" : "draft")}
              aria-label="Publish webinar"
            />
          </div>
        </div>

        <div className="rounded-2xl p-6 space-y-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <Field label="Title *">
            <input data-testid="input-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
              placeholder="e.g. How to get your first 10 coaching clients" className={inputCls} style={inputStyle} />
          </Field>

          <Field label="Description">
            <textarea data-testid="input-description" value={description} onChange={e => setDescription(e.target.value)} rows={4} maxLength={5000}
              placeholder="What will attendees learn? Who is it for?" className={`${inputCls} resize-y`} style={inputStyle} />
          </Field>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Host name">
              <input data-testid="input-host" value={hostName} onChange={e => setHostName(e.target.value)} maxLength={120}
                placeholder="Your name" className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Date & time (IST) *" hint={scheduledIso ? formatIST(scheduledIso) : "India Standard Time (UTC+5:30)"}>
              <input data-testid="input-scheduled" type="datetime-local" value={scheduledLocal} onChange={e => setScheduledLocal(e.target.value)}
                className={inputCls} style={inputStyle} />
            </Field>
          </div>

          <Field
            label="YouTube Live URL or video ID"
            hint={
              youtube.trim() === "" ? "Paste the link of your scheduled YouTube Live (youtube.com/live/…, youtu.be/…, watch?v=…). You can add it later."
                : videoId ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3 h-3" /> Video ID: {videoId}</span>
                : <span className="flex items-center gap-1 text-red-400"><AlertCircle className="w-3 h-3" /> Couldn't find a video ID in that link</span>
            }
          >
            <input data-testid="input-youtube" value={youtube} onChange={e => setYoutube(e.target.value)}
              placeholder="https://youtube.com/live/..." className={inputCls}
              style={youtubeInvalid ? { ...inputStyle, border: "1px solid rgba(248,113,113,0.5)" } : inputStyle} />
          </Field>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="CTA button text" hint="Shown under the video once the webinar starts.">
              <input data-testid="input-cta-text" value={ctaText} onChange={e => setCtaText(e.target.value)} maxLength={120}
                placeholder="e.g. Book a free strategy call" className={inputCls} style={inputStyle} />
            </Field>
            <Field label="CTA URL" hint={ctaUrlInvalid ? <span className="text-red-400">Must start with http:// or https://</span> : "Opens in a new tab."}>
              <input data-testid="input-cta-url" value={ctaUrl} onChange={e => setCtaUrl(e.target.value)}
                placeholder="https://..." className={inputCls} style={inputStyle} />
            </Field>
          </div>

          <Field
            label="Custom link (optional)"
            hint={slugInvalid ? <span className="text-red-400">Use lowercase letters, numbers and dashes only</span>
              : `${window.location.origin}/w/${slug.trim() || (isNew ? `${slugifyWebinarTitle(title)}-xxxxxx` : "")}`}
          >
            <input data-testid="input-slug" value={slug} onChange={e => setSlug(e.target.value.toLowerCase())} maxLength={64}
              placeholder={isNew ? "Leave blank to auto-generate" : ""} className={inputCls} style={inputStyle} />
          </Field>
        </div>

        <div className="flex justify-end mt-6">
          <button
            data-testid="btn-save-webinar"
            onClick={handleSave}
            disabled={save.isPending}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}40`, color: GOLD }}
          >
            <Save className="w-4 h-4" /> {save.isPending ? "Saving..." : isNew ? "Create webinar" : "Save changes"}
          </button>
        </div>
      </div>
    </ClientLayout>
  );
}
