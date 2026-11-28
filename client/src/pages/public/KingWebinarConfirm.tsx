// King Astrology — the two confirmation pages.
//
//   /king-astrology/general  free registrants: the General section video + the
//                            General WhatsApp group
//   /king-astrology/vip      paid registrants (where Whop sends them after the
//                            $15 checkout): the VIP section video + the VIP
//                            WhatsApp group
//
// One component, driven by `tier`, because the two pages differ only in their
// video, their group and their copy.
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { btn } from "@/components/king/ui";
import {
  KingCalendarButtons, KingCountdown, KingEyebrow, KingShell, KingVideo, KingWhen,
} from "@/components/king/shared";
import { readKingRegistration, saveKingRegistration } from "@/components/king/storage";
import {
  KING_EVENT, KING_PATHS, KING_TITLE, KING_VIDEOS, KING_VIP_REQUIRE_PAID,
  KING_WHATSAPP, KING_WHOP, kingWhopCheckoutUrl, type KingTier,
} from "@shared/kingWebinar";

type Status = { tier: KingTier; paid: boolean; name?: string } | null;

/** The ?r=<id> the funnel page adds, so the page works on a fresh device too. */
function registrationIdFromUrl(): string | null {
  try {
    const r = new URLSearchParams(window.location.search).get("r");
    return r && /^[0-9a-f-]{36}$/i.test(r) ? r : null;
  } catch {
    return null;
  }
}

export default function KingWebinarConfirm({ tier }: { tier: KingTier }) {
  const isVip = tier === "vip";
  const group = isVip ? KING_WHATSAPP.vip : KING_WHATSAPP.general;
  const video = isVip ? KING_VIDEOS.vip : KING_VIDEOS.general;

  // Seeded from the device so the greeting and tier are right on first paint
  // (no flash of "You're in" before the name arrives); the fetch below then
  // confirms the tier and whether Whop has reported the payment.
  const [status, setStatus] = useState<Status>(() => {
    const s = readKingRegistration();
    return s?.tier ? { tier: s.tier, paid: false, name: s.name } : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `${isVip ? "VIP access" : "You're registered"} — ${KING_TITLE}`;
  }, [isVip]);

  // Confirm against the server so the VIP page can show whether Whop has
  // reported the payment yet. Falls back to what's on the device.
  useEffect(() => {
    const stored = readKingRegistration();
    const id = registrationIdFromUrl() || stored?.registrationId || null;
    if (!id) {
      setStatus(stored?.tier ? { tier: stored.tier, paid: false, name: stored.name } : null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/king/registration/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error("not found");
        const data = await res.json();
        if (cancelled) return;
        const next: Status = {
          tier: data.tier === "vip" ? "vip" : "general",
          paid: !!data.paid,
          name: typeof data.name === "string" ? data.name : undefined,
        };
        setStatus(next);
        // Keep the device in step (e.g. after the Whop round trip upgraded them).
        saveKingRegistration({ registrationId: id, name: next.name, email: stored?.email, tier: next.tier });
      } catch {
        if (!cancelled) setStatus(stored?.tier ? { tier: stored.tier, paid: false, name: stored.name } : null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const paymentConfirmed = !!status?.paid;
  // Access is granted on arrival; KING_VIP_REQUIRE_PAID (shared/kingWebinar.ts)
  // flips this to wait for Whop once the webhook secret is in place.
  const groupUnlocked = !isVip || !KING_VIP_REQUIRE_PAID || paymentConfirmed;

  const details = `${KING_TITLE} — ${KING_EVENT.dateLine} at ${KING_EVENT.label}. Your ${isVip ? "VIP" : "General"} WhatsApp group: ${group}`;

  return (
    <KingShell width="max-w-3xl">
      <KingEyebrow>{isVip ? "VIP access confirmed" : "You're registered"}</KingEyebrow>

      <h1 className="text-[28px] leading-[1.15] sm:text-4xl sm:leading-[1.1] font-semibold text-white tracking-tight break-words"
        data-testid="king-confirm-title">
        {status?.name ? `You're in, ${status.name.split(" ")[0]}` : "You're in"}
        {isVip ? " — VIP" : ""}
      </h1>
      <p className="mt-3 text-[15px] text-zinc-400 leading-relaxed">
        {isVip
          ? "Your VIP seat is reserved. Watch the VIP walkthrough below, then join the VIP WhatsApp group — that's where the live link and your pre-webinar material land."
          : "Your seat is reserved. Watch the walkthrough below, then join the General WhatsApp group — that's where the live link and reminders land."}
      </p>

      {/* ── Payment state (VIP only) ── */}
      {isVip && (
        <div className="mt-5" data-testid="king-payment-state">
          {loading ? (
            <p className="inline-flex items-center gap-2 text-[13px] text-zinc-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking your payment...
            </p>
          ) : paymentConfirmed ? (
            <p className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-2 text-[13px] font-medium text-emerald-300"
              data-testid="king-paid-badge">
              <CheckCircle2 className="w-4 h-4" /> Payment confirmed · {KING_WHOP.price}
            </p>
          ) : (
            <p className="rounded-lg border border-white/[0.1] bg-white/[0.025] px-3 py-2 text-[13px] text-zinc-400"
              data-testid="king-paid-pending">
              Payment is still settling with Whop. Your access below is already open — the receipt comes by email.
            </p>
          )}
        </div>
      )}

      {/* ── Countdown ── */}
      <div className="mt-8 rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <KingCountdown joinHref={group} />
        <div className="mt-5 pt-5 border-t border-white/[0.06]">
          <KingWhen compact />
        </div>
      </div>

      {/* ── Join the group ── */}
      <section className="mt-8" aria-labelledby="king-group-heading">
        <h2 id="king-group-heading" className="text-sm font-semibold text-white mb-1">
          {isVip ? "Step 1 — join the VIP WhatsApp group" : "Step 1 — join the WhatsApp group"}
        </h2>
        <p className="text-[13px] text-zinc-500 mb-3">
          The live link, reminders and replays are posted here. It's the only place you need.
        </p>
        {groupUnlocked ? (
          <a href={group} target="_blank" rel="noopener noreferrer" data-testid={`king-whatsapp-${tier}`}
            className={`${btn("primary", "lg")} w-full h-auto min-h-12 whitespace-normal text-center`}>
            <MessageCircle className="w-4 h-4 flex-shrink-0" />
            <span className="min-w-0 break-words">
              Join the {isVip ? "VIP" : "General"} WhatsApp group
            </span>
            <ArrowRight className="w-4 h-4 flex-shrink-0" />
          </a>
        ) : (
          <p className="rounded-lg border border-white/[0.1] bg-white/[0.025] px-4 py-3 text-[13px] text-zinc-400">
            The VIP group link opens as soon as Whop confirms your {KING_WHOP.price} payment. Refresh this page in a moment.
          </p>
        )}
      </section>

      {/* ── The section video ── */}
      <section className="mt-10" aria-labelledby="king-section-video-heading">
        <h2 id="king-section-video-heading" className="text-sm font-semibold text-white mb-1">
          {isVip ? "Step 2 — your VIP walkthrough" : "Step 2 — watch this before the webinar"}
        </h2>
        <p className="text-[13px] text-zinc-500 mb-4">
          {isVip
            ? "What VIP gets you on the day, and how to get the most out of it."
            : "What we'll cover on the day, and how to come prepared."}
        </p>
        <KingVideo src={video} testid={`king-video-${tier}`}
          label={isVip ? "VIP section" : "General section"} />
      </section>

      {/* ── Calendar ── */}
      <section className="mt-10 rounded-xl border border-white/[0.07] bg-white/[0.02] p-5" aria-labelledby="king-cal-heading">
        <h2 id="king-cal-heading" className="sr-only">Add to calendar</h2>
        <KingCalendarButtons details={details} />
      </section>

      {/* ── VIP upsell on the General page. Plain $15, nothing else around it. ── */}
      {!isVip && (
        <section className="mt-8 rounded-xl border border-[#d4b461]/25 bg-[#d4b461]/[0.05] p-5" data-testid="king-vip-upsell">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="w-4 h-4 text-[#d4b461]" /> Want the VIP room too?
          </h2>
          <p className="text-[13px] text-zinc-400 mt-1.5 leading-relaxed">
            The VIP WhatsApp group and priority on your questions in the live Q&amp;A.
            <span className="text-white font-medium"> {KING_WHOP.price} one-time.</span>
          </p>
          <a href={kingWhopCheckoutUrl(readKingRegistration()?.email)} data-testid="king-upsell-vip"
            className={`${btn("primary", "lg")} w-full mt-4`}>
            Join VIP, {KING_WHOP.price}
          </a>
        </section>
      )}

      <p className="mt-8 text-center text-[13px] text-zinc-600">
        <a href={KING_PATHS.funnel} className="underline underline-offset-2 hover:text-zinc-400">
          Back to the webinar page
        </a>
      </p>
    </KingShell>
  );
}
