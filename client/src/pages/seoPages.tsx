// Keyword-targeted public pages for organic search. Pure presentational
// components: no hooks, no router, no auth — so they prerender to static
// HTML at build time (script/buildMarketingPages.mjs) and also render
// inside the SPA for real visitors.
import React from "react";

const GOLD = "#d4b461";

export interface SeoFaq {
  q: string;
  a: string;
}

export interface SeoPageConfig {
  slug: string; // route path without leading slash
  title: string; // <title> and og:title
  description: string; // meta description
  h1: string;
  intro: string;
  sections: { heading: string; body: string }[];
  table?: { head: [string, string, string]; rows: [string, string, string][] };
  faqs: SeoFaq[];
  related?: { href: string; label: string }[]; // internal links, shown after the FAQs
}

const CTA = (
  <div style={{ textAlign: "center", margin: "72px auto 24px", maxWidth: 640 }}>
    <h2 style={{ fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
      Start free. <span style={{ color: GOLD }}>Scale when ready.</span>
    </h2>
    <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 15, lineHeight: 1.7, margin: "14px 0 26px" }}>
      Free plan includes 100 app credits every month. No card required.
    </p>
    <a
      href="/login?tab=register"
      style={{
        display: "inline-block", background: `linear-gradient(135deg, #f0c84b, ${GOLD})`, color: "#000",
        fontWeight: 800, fontSize: 15, borderRadius: 12, padding: "15px 38px", textDecoration: "none",
      }}
    >
      Create your free account
    </a>
    <p style={{ marginTop: 18, fontSize: 13 }}>
      <a href="/" style={{ color: GOLD, textDecoration: "none" }}>← Back to oravini.com</a>
    </p>
  </div>
);

export function SEOPage({ config }: { config: SeoPageConfig }) {
  return (
    <main style={{ background: "#0a0910", minHeight: "100vh", color: "#fff", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "96px 24px 80px" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 16 }}>Oravini</div>
        <h1 style={{ fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1.12, margin: "0 0 22px" }}>
          {config.h1}
        </h1>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.6)", lineHeight: 1.75, margin: "0 0 48px" }}>{config.intro}</p>

        {config.sections.map((s) => (
          <section key={s.heading} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.01em", margin: "0 0 12px" }}>{s.heading}</h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.8, margin: 0 }}>{s.body}</p>
          </section>
        ))}

        {config.table && (
          <section style={{ marginBottom: 48, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  {config.table.head.map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 14px", borderBottom: `1px solid ${GOLD}44`, color: GOLD, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {config.table.rows.map((r) => (
                  <tr key={r[0]}>
                    {r.map((c, i) => (
                      <td key={i} style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", color: i === 0 ? "#fff" : "rgba(255,255,255,0.55)", lineHeight: 1.6, verticalAlign: "top" }}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 20px" }}>Frequently asked questions</h2>
          {config.faqs.map((f) => (
            <div key={f.q} style={{ marginBottom: 22 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>{f.q}</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.75, margin: 0 }}>{f.a}</p>
            </div>
          ))}
        </section>

        {config.related && config.related.length > 0 && (
          <section style={{ marginBottom: 24, padding: "22px 24px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, background: "rgba(255,255,255,0.02)" }}>
            <div style={{ fontSize: 12, letterSpacing: "0.2em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>From the blog</div>
            {config.related.map((r) => (
              <div key={r.href} style={{ marginBottom: 10 }}>
                <a href={r.href} style={{ color: "#fff", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
                  {r.label} <span style={{ color: GOLD }}>→</span>
                </a>
              </div>
            ))}
          </section>
        )}

        {CTA}
      </div>
    </main>
  );
}

export const MANYCHAT_ALTERNATIVE: SeoPageConfig = {
  slug: "manychat-alternative",
  title: "ManyChat Alternative for Creators: Instagram DM Automation + Webinars + Funnels | Oravini",
  description:
    "Looking for a ManyChat alternative? Oravini combines Instagram DM automation with webinars, video hosting, funnels, CRM and AI content tools in one platform built for creators and personal brands.",
  h1: "The ManyChat alternative built for creators who sell with content",
  intro:
    "ManyChat is a strong DM automation tool. But if your growth engine is content, webinars and funnels, DM automation alone leaves you stitching together four other subscriptions. Oravini puts Instagram DM automation, webinars, video hosting, landing pages, a CRM and AI content tools in one place — so a comment becomes a DM, a DM becomes a webinar registration, and a registration becomes a tracked lead, without Zapier in the middle.",
  sections: [
    {
      heading: "Instagram DM automation, like you'd expect",
      body: "Keyword auto-replies, comment-to-DM triggers, story-mention replies and welcome messages for new followers. Connect your Instagram professional account, set your rules, and Oravini answers in seconds — the same core workflow creators use ManyChat for.",
    },
    {
      heading: "Where Oravini goes further",
      body: "Every DM, signup and registration lands in one CRM with its source and UTM. Your webinar funnel — registration page, live session with chat and Q&A, replay and offer — is built in, with hosting for your VSLs and course videos. And the AI layer (content ideas, hooks, competitor analysis, Content Coach) feeds the content that starts the whole flywheel.",
    },
    {
      heading: "Who should pick which",
      body: "If you only need DM flows for an established funnel, a dedicated DM tool is a fine choice. If you're a creator, coach or personal brand building the whole journey — content → DM → webinar → sale — Oravini replaces the stack: one login, one CRM, one bill.",
    },
  ],
  table: {
    head: ["", "Oravini", "ManyChat"],
    rows: [
      ["Instagram DM automation", "Keyword replies, comment-to-DM, story mentions, welcome messages", "Core product — mature flow builder"],
      ["Webinars", "Built in: registration, live room, replay, offers", "Not included"],
      ["Video hosting & VSLs", "Included on video plans", "Not included"],
      ["Funnels & landing pages", "AI page studio with share links", "Not included"],
      ["CRM", "Every signup tracked with source + UTMs", "Contacts inside DM platform only"],
      ["AI content tools", "Ideas, hooks, competitor intelligence, coach", "AI features focused on messaging"],
    ],
  },
  faqs: [
    {
      q: "Is Oravini a full replacement for ManyChat?",
      a: "For creators whose funnel is content → DM → webinar → sale, yes: the DM automation covers the common ManyChat workflows and the rest of the stack is built in. If you run complex multi-channel chatbot flows (SMS, WhatsApp, email sequences), compare the specific triggers you use before switching.",
    },
    {
      q: "Does Oravini's DM automation work with a normal Instagram account?",
      a: "You need an Instagram professional (business or creator) account connected to a Facebook Page — the same requirement as any official Instagram messaging API tool.",
    },
    {
      q: "How much does Oravini cost compared to ManyChat?",
      a: "Oravini has a free plan (100 app credits/month, no card) and prepaid plans with no auto-renewal — you pay once for 1, 3, 6 or 12 months. ManyChat's pricing scales with contact count; check their current pricing for an exact comparison for your audience size.",
    },
    {
      q: "Can I migrate my audience from ManyChat?",
      a: "Your Instagram followers stay on Instagram — switching DM tools never moves them. Rebuild your keyword and comment-to-DM rules in Oravini's setup wizard and you're live; most creators recreate their core flows in under an hour.",
    },
  ],
  related: [
    { href: "/blog/how-to-choose-manychat-alternative", label: "How to choose a ManyChat alternative in 2026" },
    { href: "/blog/instagram-dm-automation-guide", label: "Instagram DM automation: a practical setup guide" },
  ],
};

export const VS_MANYCHAT: SeoPageConfig = {
  slug: "vs/manychat",
  title: "Oravini vs ManyChat: Honest Comparison for Creators (2026) | Oravini",
  description:
    "Oravini vs ManyChat compared feature by feature: DM automation, webinars, funnels, video hosting, CRM, AI tools and pricing model. See which fits a creator business.",
  h1: "Oravini vs ManyChat: an honest comparison",
  intro:
    "Both tools can auto-reply to your Instagram comments. After that, they solve different problems. ManyChat is a messaging automation platform; Oravini is a creator growth platform that includes DM automation. This page compares them on what each actually does, so you can pick on facts.",
  sections: [
    {
      heading: "What ManyChat does well",
      body: "A visual flow builder for messaging across Instagram, Facebook Messenger, WhatsApp, SMS and email, with years of templates and a large user base. For pure multi-channel chatbot work it's one of the most established options.",
    },
    {
      heading: "What Oravini does differently",
      body: "Oravini starts from content, not chat. AI content ideas and competitor intelligence feed your posts; comment-to-DM and keyword replies capture the response; webinars, funnels, video hosting and one CRM convert it. You stop paying for four tools and stop exporting CSVs between them.",
    },
    {
      heading: "The honest trade-off",
      body: "ManyChat's messaging builder is deeper for complex chatbot logic and covers more channels (WhatsApp, SMS). Oravini is broader everywhere else and narrower inside the chatbot itself. Creators selling through webinars and content usually feel ManyChat's missing half more than its extra channels.",
    },
  ],
  table: {
    head: ["Category", "Oravini", "ManyChat"],
    rows: [
      ["Core focus", "Creator growth: content, DMs, webinars, funnels, CRM", "Messaging automation across chat channels"],
      ["Instagram comment-to-DM", "Yes", "Yes"],
      ["WhatsApp / SMS", "Not included", "Yes"],
      ["Webinars with registration funnel", "Built in", "No"],
      ["Video hosting & VSL pages", "Yes (video plans)", "No"],
      ["Landing pages / funnels", "AI page studio", "Basic landing features"],
      ["AI content & competitor research", "Built in", "Messaging-focused AI"],
      ["Pricing model", "Free plan + prepaid terms, no auto-renewal", "Subscription, scales with contacts"],
    ],
  },
  faqs: [
    {
      q: "Which is cheaper, Oravini or ManyChat?",
      a: "Different models: Oravini is a free plan plus prepaid terms (one payment, no auto-renewal); ManyChat is a monthly subscription that grows with your contact list. For small audiences both are inexpensive; compare ManyChat's price at your contact count against Oravini's flat plans.",
    },
    {
      q: "Can I use both together?",
      a: "You can, but most creators pick one DM tool — running two automation platforms on one Instagram account causes double replies. If ManyChat covers a WhatsApp flow you need, keep it for that and run Oravini for content, webinars and funnels.",
    },
    {
      q: "Is Oravini's Instagram automation safe for my account?",
      a: "Oravini uses Meta's official Instagram messaging APIs with a reviewed app — the same sanctioned route every legitimate tool uses — not scraping or unofficial workarounds.",
    },
  ],
  related: [
    { href: "/blog/how-to-choose-manychat-alternative", label: "How to choose a ManyChat alternative in 2026" },
    { href: "/blog/webinar-platform-guide", label: "What creators should look for in a webinar platform" },
  ],
};

export const IG_DM_AUTOMATION: SeoPageConfig = {
  slug: "instagram-dm-automation",
  title: "Instagram DM Automation for Creators: Comment-to-DM, Keyword Replies | Oravini",
  description:
    "Automate Instagram DMs: comment-to-DM, keyword auto-replies, story mentions and welcome messages. Oravini connects DM automation to your webinars, funnels and CRM.",
  h1: "Instagram DM automation that feeds your whole funnel",
  intro:
    "Every 'link in comments' post is a leak: people comment, you reply hours later, half never click. Instagram DM automation replies in seconds — and in Oravini, every automated conversation lands in the same CRM as your webinar registrations and funnel signups, so you see the whole journey from comment to customer.",
  sections: [
    {
      heading: "The automations creators actually use",
      body: "Comment-to-DM ('comment GUIDE and I'll send it'), keyword replies for common questions, automatic thank-yous for story mentions, and a welcome message for new followers. Set them once in the setup wizard; they run on every post.",
    },
    {
      heading: "Connected to everything else you run",
      body: "A DM that delivers a lead magnet can tag the lead in your CRM, point to a webinar registration page, and get tracked with its source post. No exports, no guessing which reel produced which signup.",
    },
    {
      heading: "Built on Meta's official APIs",
      body: "Oravini connects through Meta's reviewed Instagram messaging permissions. Your account stays within Instagram's rules — no gray-hat bots that risk a ban.",
    },
  ],
  faqs: [
    {
      q: "What is comment-to-DM automation?",
      a: "When someone comments a word you chose (like 'GUIDE') on your post or reel, Oravini instantly sends them a direct message you wrote — a link, a signup page, a video. It turns comments into conversations while the post is still hot.",
    },
    {
      q: "Will automation get my Instagram account banned?",
      a: "Tools built on Meta's official messaging API — including Oravini — operate within Instagram's rules. What gets accounts banned is unofficial bots that scrape or mimic the app. Oravini also needs your explicit connection and never posts without your say.",
    },
    {
      q: "Do I need a business account?",
      a: "Yes — a professional (business or creator) Instagram account linked to a Facebook Page. That's Meta's requirement for any messaging API, and switching a personal account takes about two minutes in Instagram's settings.",
    },
    {
      q: "What does it cost?",
      a: "DM automation is included on Oravini plans, starting with the free tier (100 app credits a month, no card). Paid plans are prepaid — one payment for the term you choose, nothing auto-renews.",
    },
  ],
  related: [
    { href: "/blog/instagram-dm-automation-guide", label: "Instagram DM automation: a practical setup guide" },
    { href: "/blog/how-to-choose-manychat-alternative", label: "How to choose a ManyChat alternative in 2026" },
  ],
};

export const WEBINAR_PLATFORM: SeoPageConfig = {
  slug: "webinar-platform",
  title: "Webinar Platform for Creators & Coaches: Registration → Live → Replay → Sale | Oravini",
  description:
    "A webinar platform built for creators: registration pages, live room with chat, Q&A, polls and offers, automatic replays, and every attendee tracked in your CRM.",
  h1: "A webinar platform where every attendee becomes a tracked lead",
  intro:
    "Most webinar tools stop at the live room. Oravini runs the whole arc: an AI-built registration page with countdown, a live session with chat, Q&A, polls and an offer button, automatic replays — and every registrant, attendee and CTA click scored and tracked in your CRM from the moment they sign up.",
  sections: [
    {
      heading: "Registration that converts",
      body: "Build the registration page with the funnel copilot — describe the webinar and the page writes itself. Countdown timer, confirmation emails, and a community link (WhatsApp or Telegram) right after signup.",
    },
    {
      heading: "A live room built to sell",
      body: "Stream via YouTube Live from your own channel, with live chat, moderated Q&A, polls, and a timed offer button. Attendee analytics show show rate, stay rate at 25/50/75%, and the drop-off curve — so you know exactly where the room cooled.",
    },
    {
      heading: "Replay and follow-up on autopilot",
      body: "Sessions auto-record to a replay library. Registrants who missed it, attended, or clicked your offer each get the right follow-up, and your CRM pipeline moves them from New Lead to Qualified to Proposal automatically.",
    },
  ],
  faqs: [
    {
      q: "Is Oravini's webinar platform free?",
      a: "Webinars are included free on the Pro plan and available as an add-on to Growth. The base Free plan (100 credits/month) covers the AI content tools so you can fill the room before you ever pay.",
    },
    {
      q: "Do attendees need to install anything?",
      a: "No. Registration pages and the live room run in the browser — attendees click your link and they're in.",
    },
    {
      q: "How is this different from Zoom webinars or a plain YouTube stream?",
      a: "Zoom gives you a meeting; a raw stream gives you a video. Oravini gives you the funnel around it: the registration page, the lead capture into a CRM, the live conversion tools, the replay, and the follow-up emails — in one system instead of four.",
    },
    {
      q: "Can I charge for my webinars?",
      a: "You connect your own payment account (Stripe read-only or Whop) and keep your revenue; Oravini shows per-webinar revenue on the dashboard.",
    },
  ],
  related: [
    { href: "/blog/webinar-platform-guide", label: "What creators should look for in a webinar platform" },
    { href: "/blog/instagram-dm-automation-guide", label: "Instagram DM automation: a practical setup guide" },
  ],
};

export const SEO_PAGES: SeoPageConfig[] = [MANYCHAT_ALTERNATIVE, VS_MANYCHAT, IG_DM_AUTOMATION, WEBINAR_PLATFORM];

export function ManyChatAlternativePage() { return <SEOPage config={MANYCHAT_ALTERNATIVE} />; }
export function VsManychatPage() { return <SEOPage config={VS_MANYCHAT} />; }
export function IgDmAutomationPage() { return <SEOPage config={IG_DM_AUTOMATION} />; }
export function WebinarPlatformPage() { return <SEOPage config={WEBINAR_PLATFORM} />; }
