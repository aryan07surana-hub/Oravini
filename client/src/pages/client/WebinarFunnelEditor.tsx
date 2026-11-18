import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { parseYouTubeVideoId, slugifyWebinarTitle, WEBINAR_SLUG_RE, formatIST } from "@shared/webinarFunnel";
import { ArrowLeft, Radio, Save, CheckCircle2, AlertCircle, ExternalLink, Users, Copy } from "lucide-react";
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
  const [status, setStatus] = useState<"draft" | "published" | "ended">("draft");

  useEffect(() => {
    if (!existing) return;
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
            </p>
            {publicUrl && status !== "draft" && (
              <button onClick={() => { navigator.clipboard.writeText(publicUrl).then(() => toast({ title: "Link copied!", description: publicUrl })).catch(() => {}); }}
                className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold truncate max-w-full" style={{ color: GOLD }}>
                <Copy className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{publicUrl}</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {status === "published" && (
              <button onClick={() => setStatus("ended")} className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-300">Mark ended</button>
            )}
            <Switch
              data-testid="switch-publish"
              checked={status === "published"}
              onCheckedChange={(on) => setStatus(on ? "published" : "draft")}
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
