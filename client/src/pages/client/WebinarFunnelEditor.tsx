import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { parseYouTubeVideoId, slugifyWebinarTitle, WEBINAR_SLUG_RE, formatIST, deckEmbed, isValidCtaUrl } from "@shared/webinarFunnel";
import { CtaLinkInput } from "@/components/webinar-funnel/CtaLinkInput";
import { Save, CheckCircle2, AlertCircle, ExternalLink, Users, Copy, Loader2, Eye, Wand2, BarChart3, MessagesSquare, Settings2, Upload, X, Bell } from "lucide-react";
import { funnelDisplayStatus } from "@/components/webinar-funnel/eventTime";
import { BackLink, ErrorState, PageHeader, Skeleton, StatusBadge, btn, focusRing, iconBtn } from "@/components/webinar-funnel/ui";
import type { WebinarFunnelRow } from "./WebinarFunnels";
import { uploadDeck, type WebinarFunnelFull } from "@/components/webinar-funnel/hostUtils";
import { HostLiveRoom, WebinarAnalyticsPanel } from "@/components/webinar-funnel/HostPanels";
import { YoutubeLivePanel } from "@/components/webinar-funnel/YoutubeLivePanel";
import { YOUTUBE_STATUS_KEY, consumeYoutubeConnectResult } from "@/components/webinar-funnel/youtube";

const GOLD = "#d4b461";
const IST_OFFSET_MIN = 330;
const inputCls =
  "w-full h-11 px-3.5 rounded-lg text-sm text-white placeholder:text-zinc-600 transition-colors bg-white/[0.03] border border-white/[0.1] hover:border-white/[0.16] focus:border-[#d4b461]/70 focus-visible:ring-2 focus-visible:ring-[#d4b461]/25 outline-none [&:is(textarea)]:h-auto [&:is(textarea)]:py-2.5";
const inputStyle = { outline: "none", colorScheme: "dark" as const };
const inputErr = { ...inputStyle, borderColor: "rgba(248,113,113,0.6)" };

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
    return { tone: "#a78bfa", label: "Replay", text: `Registration closed · /live plays the ${hasVideo ? "replay" : "video (none set yet)"} with your offer; chat is read-only.` };
  }
  return started
    ? { tone: "#f87171", label: "Live", text: hasVideo ? "Live now · registration page links to /live, which shows the stream + CTA." : "Live now · but no YouTube video is set, so /live shows \"stream isn't connected yet\"." }
    : { tone: "#34d399", label: "Registration", text: `Registration open · /w/ shows the sign-up form, /live shows a countdown to ${formatIST(scheduledAt)}.` };
}

function Field({ label, hint, children, htmlFor }: { label: string; hint?: React.ReactNode; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-zinc-300 mb-1.5">{label}</label>
      {children}
      {hint && <div className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{hint}</div>}
    </div>
  );
}

export default function WebinarFunnelEditor({ id }: { id?: string }) {
  const isNew = !id || id === "new";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [tab, setTab] = useState<"details" | "live" | "analytics">(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    return t === "live" || t === "analytics" ? t : "details";
  });
  const { data: existing, isLoading, isError, refetch } = useQuery<WebinarFunnelFull | null>({
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
  const [deckUrl, setDeckUrl] = useState("");
  const [deckUploading, setDeckUploading] = useState(false);
  const [replay, setReplay] = useState("");
  const [offerText, setOfferText] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [offerExpiresLocal, setOfferExpiresLocal] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const hydratedId = useRef<string | null>(null);

  // Back from "Connect YouTube" (?yt_connected / ?yt_error)
  useEffect(() => {
    const result = consumeYoutubeConnectResult();
    if (!result) return;
    queryClient.invalidateQueries({ queryKey: YOUTUBE_STATUS_KEY });
    if (result.ok) toast({ title: "YouTube connected" });
    else toast({ title: "Couldn't connect YouTube", description: result.error, variant: "destructive" });
  }, []);

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
    setDeckUrl(existing.deckUrl || "");
    setReplay(existing.replayUrl || "");
    setOfferText(existing.offerText || "");
    setOfferPrice(existing.offerPrice || "");
    setOfferExpiresLocal(existing.offerExpiresAt ? toISTInput(existing.offerExpiresAt) : "");
    setDurationMinutes(existing.durationMinutes || 60);
    setRemindersEnabled(existing.remindersEnabled ?? true);
  }, [existing]);

  const videoId = parseYouTubeVideoId(youtube);
  const youtubeInvalid = youtube.trim() !== "" && !videoId;
  const slugInvalid = slug.trim() !== "" && !WEBINAR_SLUG_RE.test(slug.trim());
  const ctaUrlInvalid = ctaUrl.trim() !== "" && !isValidCtaUrl(ctaUrl);
  const scheduledIso = scheduledLocal ? fromISTInput(scheduledLocal) : null;
  const replayId = parseYouTubeVideoId(replay);
  const replayInvalid = replay.trim() !== "" && !replayId;
  const deckInvalid = deckUrl.trim() !== "" && !/^(https?:\/\/\S+|\/uploads\/[\w.\-]+)$/i.test(deckUrl.trim());
  const offerExpiresIso = offerExpiresLocal ? fromISTInput(offerExpiresLocal) : null;

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
        deckUrl: deckUrl.trim() || null,
        replay: replay.trim() || null,
        offerText: offerText.trim() || null,
        offerPrice: offerPrice.trim() || null,
        offerExpiresAt: offerExpiresIso,
        durationMinutes,
        remindersEnabled,
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
    if (replayInvalid) return toast({ title: "That replay link isn't a YouTube video", variant: "destructive" });
    if (deckInvalid) return toast({ title: "Slides link must start with https://", variant: "destructive" });
    save.mutate();
  };

  const publicUrl = existing ? `${window.location.origin}/w/${existing.slug}` : null;

  if (!isNew && isLoading) {
    return (
      <ClientLayout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-4" aria-busy="true" aria-label="Loading webinar">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-24" />
          <Skeleton className="h-80" />
        </div>
      </ClientLayout>
    );
  }
  if (!isNew && isError) {
    return (
      <ClientLayout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-5">
          <BackLink onClick={() => navigate("/tools/webinars")} />
          <ErrorState title="Couldn't load this webinar" description="Check your connection and try again." onRetry={() => refetch()} />
        </div>
      </ClientLayout>
    );
  }
  if (!isNew && !existing) {
    return (
      <ClientLayout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
          <p className="text-lg font-semibold text-white mb-1">Webinar not found</p>
          <p className="text-sm text-zinc-500 mb-6">It may have been deleted.</p>
          <button onClick={() => navigate("/tools/webinars")} className={btn("secondary", "md")}>Back to webinars</button>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className={`${!isNew && tab !== "details" ? "max-w-5xl" : "max-w-3xl"} mx-auto px-4 sm:px-6 py-8 sm:py-10 transition-[max-width]`}>
        <PageHeader
          back={<BackLink onClick={() => navigate("/tools/webinars")} />}
          eyebrow={!isNew && existing ? (
            <span className="flex items-center gap-2 min-w-0">
              <StatusBadge status={funnelDisplayStatus(existing.status, existing.scheduledAt, now)} testid="editor-status" />
              <span className="text-zinc-500 truncate min-w-0">/w/{existing.slug}</span>
            </span>
          ) : "Webinar funnels"}
          title={isNew ? "New webinar" : existing?.title || "Edit webinar"}
          description={isNew ? "Registration page at /w/your-link · live page at /w/your-link/live" : undefined}
          actions={
            isNew ? (
              <button onClick={() => navigate("/tools/webinars/new")} className={btn("secondary", "md")}>
                <Wand2 className="w-4 h-4" /> Use guided setup
              </button>
            ) : existing ? (
              <>
                <button onClick={() => navigate(`/tools/webinars/${existing.id}/setup`)} data-testid="btn-guided-setup" className={btn("secondary", "md")}>
                  <Wand2 className="w-4 h-4" /> Guided setup
                </button>
                <button onClick={() => navigate(`/tools/webinars/${existing.id}/registrations`)} className={btn("secondary", "md")}>
                  <Users className="w-4 h-4" /> Registrations
                </button>
                {existing.status !== "draft" && (
                  <a href={`/w/${existing.slug}`} target="_blank" rel="noopener noreferrer" className={btn("secondary", "md")}>
                    <ExternalLink className="w-4 h-4" /> View page
                  </a>
                )}
              </>
            ) : undefined
          }
        />

        {!isNew && existing && (
          <div role="tablist" aria-label="Webinar sections" className="flex gap-1 p-1 rounded-lg mb-6 bg-white/[0.03] border border-white/[0.07] overflow-x-auto">
            {([
              { id: "details", label: "Details", icon: Settings2 },
              { id: "live", label: "Live room", icon: MessagesSquare },
              { id: "analytics", label: "Analytics", icon: BarChart3 },
            ] as const).map(t => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} data-testid={`editor-tab-${t.id}`}
                className={`flex-1 min-w-[112px] flex items-center justify-center gap-1.5 h-9 rounded-md text-[13px] font-medium transition-colors ${focusRing} ${tab === t.id ? "text-white bg-white/[0.07]" : "text-zinc-500 hover:text-zinc-200"}`}>
                <t.icon className={`w-3.5 h-3.5 ${tab === t.id ? "text-[#d4b461]" : ""}`} aria-hidden /> {t.label}
              </button>
            ))}
          </div>
        )}

        {!isNew && existing && tab === "live" && <HostLiveRoom webinar={existing} />}
        {!isNew && existing && tab === "analytics" && <WebinarAnalyticsPanel webinar={existing} />}

        <div hidden={!isNew && tab !== "details"}>
        {/* Publish state */}
        <div className={`rounded-xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111115] border ${status === "published" ? "border-emerald-500/25" : "border-white/[0.08]"}`}>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-white">
              {status === "published" ? "Published" : status === "ended" ? "Ended" : "Draft"}
            </p>
            <p className="text-[13px] text-zinc-500 mt-0.5 leading-relaxed">
              {status === "published" ? "Anyone with the link can register and watch."
                : status === "ended" ? "Public pages stay up (replay + CTA) but registration is closed."
                : "Only you can see this. Publish to open registration."}
              {isNew && <span className="text-zinc-600"> Applied when you create the webinar.</span>}
            </p>
            {!isNew && existing && (() => {
              const v = visitorState(existing.status, existing.scheduledAt, !!existing.youtubeVideoId, now);
              return (
                <p data-testid="text-visitor-state" className="flex items-start gap-1.5 mt-2.5 text-xs text-zinc-400">
                  <Eye className="w-3.5 h-3.5 mt-px flex-shrink-0" style={{ color: v.tone }} aria-hidden />
                  <span><b className="font-semibold" style={{ color: v.tone }}>Visitors see: {v.label}</b> — {v.text}</span>
                </p>
              );
            })()}
            {publicUrl && status !== "draft" && (
              <button onClick={() => { navigator.clipboard.writeText(publicUrl).then(() => toast({ title: "Link copied!", description: publicUrl })).catch(() => {}); }}
                className={`flex items-center gap-1.5 mt-2.5 text-xs font-medium max-w-full text-zinc-400 hover:text-white rounded ${focusRing}`}>
                <Copy className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">{publicUrl}</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 border-t border-white/[0.06] pt-3 sm:border-0 sm:pt-0">
            {status === "published" && (
              <button data-testid="btn-mark-ended" onClick={() => changeStatus("ended")} disabled={saveStatus.isPending} className={btn("ghost", "sm")}>Mark ended</button>
            )}
            {saveStatus.isPending && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" aria-label="Saving publish status" />}
            <label className="flex items-center gap-2 text-[13px] font-medium text-zinc-300">
              <span>Published</span>
              <Switch
                data-testid="switch-publish"
                checked={status === "published"}
                disabled={saveStatus.isPending}
                onCheckedChange={(on) => changeStatus(on ? "published" : "draft")}
                aria-label="Publish webinar"
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl p-5 sm:p-6 space-y-5 bg-[#111115] border border-white/[0.08]">
          <h2 className="text-[15px] font-semibold text-white">Webinar details</h2>
          <Field label="Title *" htmlFor="ed-title">
            <input id="ed-title" data-testid="input-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
              placeholder="e.g. How to get your first 10 coaching clients" className={inputCls} style={inputStyle} />
          </Field>

          <Field label="Description" htmlFor="ed-description">
            <textarea id="ed-description" data-testid="input-description" value={description} onChange={e => setDescription(e.target.value)} rows={4} maxLength={5000}
              placeholder="What will attendees learn? Who is it for?" className={`${inputCls} resize-y`} style={inputStyle} />
          </Field>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Host name" htmlFor="ed-host">
              <input id="ed-host" data-testid="input-host" value={hostName} onChange={e => setHostName(e.target.value)} maxLength={120}
                placeholder="Your name" className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Date & time (IST) *" htmlFor="ed-scheduled" hint={scheduledIso ? formatIST(scheduledIso) : "India Standard Time (UTC+5:30)"}>
              <input id="ed-scheduled" data-testid="input-scheduled" type="datetime-local" value={scheduledLocal} onChange={e => setScheduledLocal(e.target.value)}
                className={inputCls} style={inputStyle} />
            </Field>
          </div>

          <Field
            label="YouTube Live URL or video ID" htmlFor="ed-youtube"
            hint={
              youtube.trim() === "" ? "Paste the link of your scheduled YouTube Live (youtube.com/live/…, youtu.be/…, watch?v=…). You can add it later."
                : videoId ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3 h-3" /> Video ID: {videoId}</span>
                : <span className="flex items-center gap-1 text-red-400"><AlertCircle className="w-3 h-3" /> Couldn't find a video ID in that link</span>
            }
          >
            <input id="ed-youtube" data-testid="input-youtube" value={youtube} onChange={e => setYoutube(e.target.value)}
              placeholder="https://youtube.com/live/..." className={inputCls}
              style={youtubeInvalid ? inputErr : inputStyle} />
          </Field>

          {!isNew && existing && (
            <YoutubeLivePanel webinar={existing} onLinked={setYoutube} onReplay={setReplay} />
          )}

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="CTA button text" htmlFor="ed-cta-text" hint="Shown under the video once the webinar starts.">
              <input id="ed-cta-text" data-testid="input-cta-text" value={ctaText} onChange={e => setCtaText(e.target.value)} maxLength={120}
                placeholder="e.g. Book a free strategy call" className={inputCls} style={inputStyle} />
            </Field>
            <Field label="CTA URL" hint={ctaUrlInvalid ? <span className="text-red-400">Must start with http:// or https://</span> : "Opens in a new tab."}>
              <CtaLinkInput value={ctaUrl} onChange={setCtaUrl}
                placeholder="https://..." className={inputCls} style={inputStyle} />
            </Field>
          </div>

          <Field
            label="Custom link (optional)" htmlFor="ed-slug"
            hint={slugInvalid ? <span className="text-red-400">Use lowercase letters, numbers and dashes only</span>
              : `${window.location.origin}/w/${slug.trim() || (isNew ? `${slugifyWebinarTitle(title)}-xxxxxx` : "")}`}
          >
            <input id="ed-slug" data-testid="input-slug" value={slug} onChange={e => setSlug(e.target.value.toLowerCase())} maxLength={64}
              placeholder={isNew ? "Leave blank to auto-generate" : ""} className={inputCls} style={inputStyle} />
          </Field>
        </div>

        <div className="rounded-xl p-5 sm:p-6 space-y-5 mt-6 bg-[#111115] border border-white/[0.08]">
          <div>
            <h2 className="text-[15px] font-semibold text-white">Live room &amp; offer</h2>
            <p className="text-[13px] text-zinc-500 mt-0.5">Slides, offer and replay shown on the live page.</p>
          </div>
          <Field label="Slides (PDF, Google Slides or Canva link)" htmlFor="ed-deck"
            hint={deckInvalid ? <span className="text-red-400">Must start with https://</span>
              : deckEmbed(deckUrl) ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {deckEmbed(deckUrl)!.label} — shown in the Slides tab</span>
              : "Optional. Viewers see it in the Slides tab next to the stream."}>
            <div className="flex gap-2">
              <input id="ed-deck" data-testid="input-deck-url" value={deckUrl} onChange={e => setDeckUrl(e.target.value)} placeholder="https://docs.google.com/presentation/d/…"
                className={inputCls} style={deckInvalid ? inputErr : inputStyle} />
              {deckUrl && (
                <button type="button" onClick={() => setDeckUrl("")} className={iconBtn("secondary")} aria-label="Clear slides"><X className="w-4 h-4" /></button>
              )}
              <label className={`${btn("secondary", "md")} cursor-pointer flex-shrink-0 focus-within:ring-2 focus-within:ring-[#d4b461]/70`}>
                {deckUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} PDF
                <input type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="Upload a PDF deck" disabled={deckUploading} onChange={async e => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setDeckUploading(true);
                  try { setDeckUrl(await uploadDeck(f)); toast({ title: "Deck uploaded — remember to save" }); }
                  catch (err: any) { toast({ title: "Upload failed", description: err.message, variant: "destructive" }); }
                  finally { setDeckUploading(false); }
                }} />
              </label>
            </div>
          </Field>
          <Field label="Offer text" htmlFor="ed-offer-text" hint="Shown under the video with your CTA button.">
            <textarea id="ed-offer-text" data-testid="input-offer-text" value={offerText} onChange={e => setOfferText(e.target.value)} rows={2} maxLength={1000}
              placeholder="What they get when they buy today" className={`${inputCls} resize-y`} style={inputStyle} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Price line" htmlFor="ed-offer-price">
              <input id="ed-offer-price" data-testid="input-offer-price" value={offerPrice} onChange={e => setOfferPrice(e.target.value)} maxLength={120}
                placeholder="₹14,999 (webinar-only price)" className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Offer expires (IST)" htmlFor="ed-offer-expires" hint={offerExpiresIso ? `Countdown until ${formatIST(offerExpiresIso)}; button hides after.` : "Optional countdown."}>
              <input id="ed-offer-expires" data-testid="input-offer-expires" type="datetime-local" value={offerExpiresLocal} onChange={e => setOfferExpiresLocal(e.target.value)} className={inputCls} style={inputStyle} />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Replay link (optional)" htmlFor="ed-replay"
              hint={replayInvalid ? <span className="text-red-400">Couldn't find a YouTube video ID</span>
                : replayId ? <span className="text-emerald-400">Replay video: {replayId}</span>
                : "After you mark the webinar ended. Leave blank to reuse the live link — YouTube turns lives into videos."}>
              <input id="ed-replay" data-testid="input-replay" value={replay} onChange={e => setReplay(e.target.value)} placeholder="https://youtu.be/…"
                className={inputCls} style={replayInvalid ? inputErr : inputStyle} />
            </Field>
            <Field label="Length (minutes)" htmlFor="ed-duration" hint="Used for watch-through %.">
              <input id="ed-duration" data-testid="input-duration" type="number" min={5} max={600} value={durationMinutes}
                onChange={e => setDurationMinutes(Math.min(600, Math.max(5, Number(e.target.value) || 60)))} className={inputCls} style={inputStyle} />
            </Field>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-white/[0.06] mt-1 pt-5">
            <div className="flex items-start gap-2.5">
              <Bell className="w-4 h-4 mt-0.5 text-zinc-400" aria-hidden />
              <div>
                <p className="text-[13px] font-medium text-white">Email reminders</p>
                <p className="text-xs text-zinc-500 mt-0.5">Confirmation with calendar invite on registration, plus a reminder 1 hour before.</p>
              </div>
            </div>
            <Switch data-testid="switch-reminders" checked={remindersEnabled} onCheckedChange={setRemindersEnabled} aria-label="Email reminders" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 mt-6 sticky bottom-0 py-4 bg-gradient-to-t from-[#0b0b0e] via-[#0b0b0e] to-transparent">
          <p className="text-xs text-zinc-500 sm:mr-auto">
            {isNew ? "The publish setting above is applied when you create the webinar." : "Publish state saves on its own; other changes need Save."}
          </p>
          <button
            data-testid="btn-save-webinar"
            onClick={handleSave}
            disabled={save.isPending}
            className={`${btn("primary", "lg")} w-full sm:w-auto`}
          >
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {save.isPending ? "Saving..." : isNew ? "Create webinar" : "Save changes"}
          </button>
        </div>
        </div>
      </div>
    </ClientLayout>
  );
}
