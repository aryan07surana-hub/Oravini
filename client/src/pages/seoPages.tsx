// Keyword-targeted public pages for organic search. Pure presentational
// components: no hooks, no router, no auth — so they prerender to static
// HTML at build time (script/buildMarketingPages.mjs) and also render
// inside the SPA for real visitors.
import React from "react";

const GOLD = "#2e78ef";

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
    <h2 style={{ fontSize: 30, fontWeight: 900, color: "#101828", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
      Start free. <span style={{ color: GOLD }}>Scale when ready.</span>
    </h2>
    <p style={{ color: "rgba(16,24,40,0.67)", fontSize: 15, lineHeight: 1.7, margin: "14px 0 26px" }}>
      Free plan includes 100 app credits every month. No card required.
    </p>
    <a
      href="/login?tab=register"
      style={{
        display: "inline-block", background: `linear-gradient(135deg, #4f93ff, ${GOLD})`, color: "#ffffff",
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
    <main style={{ background: "#ffffff", minHeight: "100vh", color: "#101828", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "96px 24px 80px" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 16 }}>Oravini</div>
        <h1 style={{ fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1.12, margin: "0 0 22px" }}>
          {config.h1}
        </h1>
        <p style={{ fontSize: 17, color: "rgba(16,24,40,0.72)", lineHeight: 1.75, margin: "0 0 48px" }}>{config.intro}</p>

        {config.sections.map((s) => (
          <section key={s.heading} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.01em", margin: "0 0 12px" }}>{s.heading}</h2>
            <p style={{ fontSize: 15, color: "rgba(16,24,40,0.67)", lineHeight: 1.8, margin: 0 }}>{s.body}</p>
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
                      <td key={i} style={{ padding: "12px 14px", borderBottom: "1px solid rgba(16,24,40,0.07)", color: i === 0 ? "#101828" : "rgba(16,24,40,0.67)", lineHeight: 1.6, verticalAlign: "top" }}>{c}</td>
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
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#101828", margin: "0 0 6px" }}>{f.q}</h3>
              <p style={{ fontSize: 14, color: "rgba(16,24,40,0.62)", lineHeight: 1.75, margin: 0 }}>{f.a}</p>
            </div>
          ))}
        </section>

        {config.related && config.related.length > 0 && (
          <section style={{ marginBottom: 24, padding: "22px 24px", border: "1px solid rgba(16,24,40,0.08)", borderRadius: 16, background: "rgba(16,24,40,0.02)" }}>
            <div style={{ fontSize: 12, letterSpacing: "0.2em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>From the blog</div>
            {config.related.map((r) => (
              <div key={r.href} style={{ marginBottom: 10 }}>
                <a href={r.href} style={{ color: "#101828", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
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
    { href: "/automated-webinar-platform", label: "Automated and evergreen webinar platform" },
    { href: "/comment-to-dm-automation", label: "Comment-to-DM automation for Instagram" },
    { href: "/blog/how-to-increase-webinar-attendance", label: "How to increase webinar attendance" },
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
    { href: "/automated-webinar-platform", label: "Automated and evergreen webinar platform" },
    { href: "/comment-to-dm-automation", label: "Comment-to-DM automation for Instagram" },
    { href: "/blog/how-to-increase-webinar-attendance", label: "How to increase webinar attendance" },
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

export const DM_COACHES: SeoPageConfig = {
  slug: "dm-automation-for-coaches",
  title: "Instagram DM Automation for Coaches: Turn Comments into Clients | Oravini",
  description:
    "Instagram DM automation built for coaches: comment-to-DM, keyword replies and welcome messages that fill your webinars and discovery calls — every lead tracked in one CRM.",
  h1: "Instagram DM automation for coaches who sell transformation",
  intro:
    "Your content already makes people raise their hands — 'comment READY and I'll send you the link.' Oravini answers every one of those comments in seconds, delivers the link, and drops the lead into the same CRM that tracks your webinar registrations and discovery-call bookings. No more screenshots of comment sections on Sunday night.",
  sections: [
    {
      heading: "Every call-to-action becomes an automatic conversation",
      body: "Comment-to-DM on posts and reels, keyword replies for questions you get daily ('pricing', 'program', 'results'), thank-yous for story mentions, and a welcome DM for new followers. Set them once in the setup wizard and every future post carries them.",
    },
    {
      heading: "A straight line from comment to client",
      body: "The DM delivers your lead magnet, webinar registration or booking link — all built inside Oravini. Each contact is tagged with the post that brought them, so when someone becomes a client you know exactly which reel did it.",
    },
    {
      heading: "Built for a one-person coaching business",
      body: "You don't have a sales team answering DMs. Oravini is the team: instant replies while you're coaching, a CRM pipeline that moves leads from new to booked, and AI content tools that keep the top of the funnel full.",
    },
  ],
  faqs: [
    {
      q: "I coach part-time and can't answer DMs all day. Does this actually run itself?",
      a: "Yes — that's the point. Your rules reply instantly whether you're in a session or asleep. You open the CRM when you have time and see every conversation, tagged and sorted, instead of scrolling an inbox.",
    },
    {
      q: "Can the automated DM send people to my webinar or booking page?",
      a: "Yes — registration pages, funnels and booking links are built in Oravini, so the DM can link straight to them and the signup lands in your CRM automatically. No third-party page builder needed.",
    },
    {
      q: "Is this within Instagram's rules?",
      a: "Oravini uses Meta's official Instagram messaging APIs with a reviewed app. You'll need a professional (business or creator) account — the same requirement as any legitimate automation tool.",
    },
  ],
  related: [
    { href: "/instagram-dm-automation", label: "Instagram DM automation: the full feature tour" },
    { href: "/blog/instagram-dm-automation-guide", label: "Instagram DM automation: a practical setup guide" },
  ],
};

export const DM_REAL_ESTATE: SeoPageConfig = {
  slug: "dm-automation-for-real-estate-agents",
  title: "Instagram DM Automation for Real Estate Agents: Instant Listing Replies | Oravini",
  description:
    "DM automation for real estate agents on Instagram: auto-reply to listing comments, send property links in seconds and track every buyer lead in one CRM.",
  h1: "Instagram DM automation for agents who can't reply in 5 minutes",
  intro:
    "A buyer comments 'price?' on your listing reel at 9pm. By morning they've commented on three other agents' posts. Oravini replies in seconds — with the details, the brochure link or a viewing slot — and files every conversation in a CRM you can actually follow up from.",
  sections: [
    {
      heading: "Speed wins the lead",
      body: "Comment-to-DM triggers send your listing link the moment someone asks. Keyword replies handle the questions every property gets — price, location, possession — instantly, at any hour, in your voice.",
    },
    {
      heading: "Every enquiry becomes a tracked lead",
      body: "Each automated conversation lands in Oravini's CRM with the post and property it came from. Your pipeline shows who asked about which listing, so follow-up is a list, not a memory test.",
    },
    {
      heading: "Property marketing without the tool sprawl",
      body: "Build listing landing pages with the AI page studio, host walkthrough videos, and announce new properties with posts the AI content tools help you write. One login from first comment to site visit.",
    },
  ],
  faqs: [
    {
      q: "Can each listing have its own auto-reply?",
      a: "Yes — you set the keyword or comment trigger per post ('comment VILLA for the brochure'), so each property gets its own message and link, and leads are tagged by the post that brought them.",
    },
    {
      q: "Does it work for rental listings too?",
      a: "The automation doesn't care what you're selling. Sales, rentals, commercial — any post can carry a comment-to-DM trigger and any enquiry lands in the same CRM.",
    },
    {
      q: "Is this safe for my Instagram account?",
      a: "Oravini connects through Meta's official messaging APIs — the sanctioned route, not an unofficial bot. A professional Instagram account is required, same as any tool in this category.",
    },
  ],
  related: [
    { href: "/instagram-dm-automation", label: "Instagram DM automation: the full feature tour" },
    { href: "/blog/instagram-dm-automation-guide", label: "Instagram DM automation: a practical setup guide" },
  ],
};

export const DM_FITNESS: SeoPageConfig = {
  slug: "dm-automation-for-fitness-coaches",
  title: "Instagram DM Automation for Fitness Coaches: Fill Your Program from Reels | Oravini",
  description:
    "DM automation for fitness coaches: comment-to-DM for workout reels, instant program links, and every lead tracked from first comment to signed client.",
  h1: "Instagram DM automation for fitness coaches",
  intro:
    "Your transformation reels get the comments — 'send the plan', 'price?', 'how do I join.' Oravini answers all of them in seconds with your program link, and tracks every lead from first comment to paying client, while you're on the gym floor.",
  sections: [
    {
      heading: "Your reels close while you coach",
      body: "Comment-to-DM turns 'comment PLAN' posts into instant conversations. Keyword replies handle the repeat questions — pricing, online vs in-person, results timeline — so no enquiry waits until your next break between clients.",
    },
    {
      heading: "Challenge funnels without the duct tape",
      body: "Running a 21-day challenge? Build the signup page with the AI funnel studio, deliver it by DM, and watch registrations land in your CRM tagged to the reel that produced them. Host the kickoff webinar in the same platform.",
    },
    {
      heading: "Content that keeps the funnel full",
      body: "AI content ideas, hooks and competitor intelligence show you which fitness content is working in your niche — so the posts that trigger your automations keep coming.",
    },
  ],
  faqs: [
    {
      q: "Can I send different replies for different programs?",
      a: "Yes — triggers are set per post and per keyword, so 'comment SHRED' and 'comment STRENGTH' can each deliver their own link and tag leads by program.",
    },
    {
      q: "I sell both online coaching and a challenge. Can one account handle both?",
      a: "One Oravini account runs all of it: the DM automations, the challenge funnel, the webinar kickoff, and the CRM that tracks every lead across both offers.",
    },
    {
      q: "What does it cost to start?",
      a: "The free plan includes 100 app credits a month, no card required. Paid plans are prepaid — one payment for the term you pick, nothing auto-renews.",
    },
  ],
  related: [
    { href: "/dm-automation-for-coaches", label: "DM automation for coaches" },
    { href: "/blog/instagram-dm-automation-guide", label: "Instagram DM automation: a practical setup guide" },
  ],
};

export const DM_SALONS: SeoPageConfig = {
  slug: "dm-automation-for-salons",
  title: "Instagram DM Automation for Salons: Book Appointments from Comments | Oravini",
  description:
    "DM automation for salons and studios: auto-reply to price and booking comments, send your booking link instantly, and track every appointment enquiry in one place.",
  h1: "Instagram DM automation for salons that are too busy to reply",
  intro:
    "Your before-and-after posts bring the comments — 'price?', 'where are you located?', 'any slots this week?' — usually while your hands are in someone's hair. Oravini replies instantly with your price list or booking link, and every enquiry lands in one tracked list instead of a buried DM inbox.",
  sections: [
    {
      heading: "Instant answers to the questions every salon gets",
      body: "Keyword replies for pricing, location, hours and availability. Comment-to-DM on your best transformations sends the booking link while the post is still hot — not two days later when the client has booked elsewhere.",
    },
    {
      heading: "Every enquiry is a name you can follow up",
      body: "Each automated conversation is saved with the post it came from. Quiet Tuesday afternoon? Open your CRM and message everyone who asked about balayage last month.",
    },
    {
      heading: "Marketing that doesn't need a marketing person",
      body: "AI content ideas tuned to your niche keep the posts coming, and the page studio builds offer pages — festive packages, new-stylist intros — that your DMs can link straight to.",
    },
  ],
  faqs: [
    {
      q: "We're a small team. Is this hard to set up?",
      a: "The setup wizard walks you through connecting Instagram and writing your first replies — most salons are live the same day, and every reply is text you wrote, in your tone.",
    },
    {
      q: "Can the auto-reply send our booking link?",
      a: "Yes — that's the most common setup. Someone comments or DMs 'booking', Oravini sends your link instantly, and the conversation is tracked so you know the post that filled the chair.",
    },
    {
      q: "Does this work with a personal Instagram account?",
      a: "You'll need a professional (business) Instagram account — Meta's requirement for any messaging tool. Switching takes about two minutes in Instagram's settings and changes nothing for your followers.",
    },
  ],
  related: [
    { href: "/instagram-dm-automation", label: "Instagram DM automation: the full feature tour" },
    { href: "/blog/instagram-dm-automation-guide", label: "Instagram DM automation: a practical setup guide" },
  ],
};

export const WEBINAR_COACHES: SeoPageConfig = {
  slug: "webinar-platform-for-coaches",
  title: "Webinar Platform for Coaches: Fill Your Program with One Live Session | Oravini",
  description:
    "A webinar platform for coaches: registration pages, live room with offers, automatic replays and a CRM that turns attendees into discovery calls and clients.",
  h1: "The webinar platform for coaches who sell live",
  intro:
    "A free masterclass is still the fastest way for a coach to turn an audience into clients — but only if the registration, the room, the replay and the follow-up actually connect. Oravini runs all four in one place, and every attendee lands in your CRM the moment they sign up.",
  sections: [
    {
      heading: "Registration pages that write themselves",
      body: "Describe your masterclass to the funnel copilot and get a registration page with countdown and confirmation emails. Share the link in your bio, your stories, or straight from a comment-to-DM trigger.",
    },
    {
      heading: "A live room built for coaching offers",
      body: "Live chat, Q&A, polls and a timed offer button for your program. Stream via YouTube Live from your own channel, then watch the analytics: show rate, stay rate at 25/50/75%, and exactly where the room leaned in.",
    },
    {
      heading: "Follow-up that treats attendees differently",
      body: "Registrants who missed it get the replay. Attendees who stayed but didn't buy get the offer again. Everyone moves through your CRM pipeline — no exporting attendee lists into a spreadsheet at midnight.",
    },
  ],
  faqs: [
    {
      q: "I've never run a webinar. How technical is this?",
      a: "If you can go live on Instagram, you can run this. The page builds itself from a description, the room runs in the browser, and attendees join from a link — nothing to install for you or them.",
    },
    {
      q: "Can I pitch my coaching program during the session?",
      a: "That's what the offer button is for — timed to appear when you make the pitch, tracked so you see who clicked, and connected to your payment account so revenue shows on your dashboard.",
    },
    {
      q: "What does it cost?",
      a: "Webinars are included free on the Pro plan and available as an add-on to Growth. The Free plan's 100 monthly credits cover the AI content tools you'll use to fill the room.",
    },
  ],
  related: [
    { href: "/webinar-platform", label: "The full webinar platform tour" },
    { href: "/blog/webinar-platform-guide", label: "What creators should look for in a webinar platform" },
  ],
};

export const WEBINAR_COURSE_CREATORS: SeoPageConfig = {
  slug: "webinar-platform-for-course-creators",
  title: "Webinar Platform for Course Creators: Launch Funnels in One Place | Oravini",
  description:
    "Webinars for course launches: registration pages, live sessions with offers, replays, VSL hosting and one CRM tracking every lead from signup to sale.",
  h1: "The webinar platform built for course launches",
  intro:
    "A course launch is a chain: content, webinar registration, live pitch, replay window, close. When those five links live in five tools, the chain breaks in the joins. Oravini runs the whole launch in one platform — and shows you which link is leaking.",
  sections: [
    {
      heading: "The full launch arc, connected",
      body: "AI-built registration page, live room with chat and timed offer button, automatic replay library, and follow-up messages for no-shows and non-buyers. Every registrant is a CRM lead with its source from the first click.",
    },
    {
      heading: "VSLs and course videos under the same roof",
      body: "Host your video sales letter and course trailers on Oravini's video hosting instead of a separate platform, and link them from the same funnel pages your webinar attendees already know.",
    },
    {
      heading: "Numbers that tell you what to fix",
      body: "Registration conversion, show rate, stay rate at 25/50/75%, offer clicks and revenue per webinar — the launch dashboard tells you whether to fix the promise, the promotion or the pitch.",
    },
  ],
  faqs: [
    {
      q: "Can I run an evergreen (automated) webinar funnel?",
      a: "Your replay library and funnel pages stay live after launch, so an evergreen flow is: content drives registration, registrants get the replay and offer on a schedule, CRM tracks everything. You keep selling between live launches.",
    },
    {
      q: "How do I take payment for the course?",
      a: "You connect your own payment account (Stripe read-only or Whop) and keep your revenue. Oravini tracks per-webinar revenue on the dashboard.",
    },
    {
      q: "Is this overkill for a first launch?",
      a: "A first launch is exactly when the connected chain matters — you have no audience slack to absorb leaks. Start on the free plan, build the registration page and DM triggers, and add webinars when you're ready to go live.",
    },
  ],
  related: [
    { href: "/webinar-platform", label: "The full webinar platform tour" },
    { href: "/blog/webinar-platform-guide", label: "What creators should look for in a webinar platform" },
  ],
};

export const VS_CHATFUEL: SeoPageConfig = {
  slug: "vs/chatfuel",
  title: "Oravini vs Chatfuel: Honest Comparison for Creators (2026) | Oravini",
  description:
    "Oravini vs Chatfuel compared: Instagram DM automation, AI chat, webinars, funnels, video hosting, CRM and pricing model. Which fits a creator business?",
  h1: "Oravini vs Chatfuel: an honest comparison",
  intro:
    "Chatfuel and Oravini can both auto-reply to your Instagram DMs and comments. The difference is what happens next: Chatfuel is a chatbot platform, Oravini is a creator growth platform with chat automation inside it. Here is the comparison on what each actually does.",
  sections: [
    {
      heading: "What Chatfuel does well",
      body: "AI-powered chat automation for Instagram, WhatsApp, Facebook Messenger and websites, with a flow builder and templates. For businesses whose entire funnel lives inside a chat window, it's an established option.",
    },
    {
      heading: "What Oravini does differently",
      body: "Oravini starts one step earlier: AI content tools and competitor intelligence help you make the posts, comment-to-DM captures the response, and webinars, funnels, video hosting and one CRM convert it. The chat is the middle of the journey, not the whole product.",
    },
    {
      heading: "The honest trade-off",
      body: "Chatfuel covers more chat channels (WhatsApp, Messenger, website widgets) and its AI agent answers free-text questions. Oravini covers everything around the chat — content, webinars, funnels, CRM — that a chatbot platform leaves to other subscriptions.",
    },
  ],
  table: {
    head: ["Category", "Oravini", "Chatfuel"],
    rows: [
      ["Core focus", "Creator growth: content, DMs, webinars, funnels, CRM", "AI chat automation across messaging channels"],
      ["Instagram comment-to-DM", "Yes", "Yes"],
      ["WhatsApp / Messenger", "Not included", "Yes"],
      ["Free-text AI chat agent", "Keyword and trigger based", "Yes"],
      ["Webinars with registration funnel", "Built in", "No"],
      ["Video hosting & VSL pages", "Yes (video plans)", "No"],
      ["AI content & competitor research", "Built in", "No"],
      ["Pricing model", "Free plan + prepaid terms, no auto-renewal", "Subscription, scales with contacts"],
    ],
  },
  faqs: [
    {
      q: "Which should a creator pick?",
      a: "If your funnel is content → DM → webinar → sale, Oravini covers every step in one login. If you need an AI agent answering open-ended questions across WhatsApp and Messenger too, Chatfuel's channel coverage is broader — pair it with the tools it doesn't include.",
    },
    {
      q: "Which is cheaper?",
      a: "Different models: Oravini is a free plan plus prepaid terms with no auto-renewal; Chatfuel is a subscription that scales with contacts. Compare Chatfuel's price at your audience size against Oravini's flat plans — and add the cost of the webinar, funnel and CRM tools Chatfuel doesn't replace.",
    },
    {
      q: "Can I move my chat flows from Chatfuel to Oravini?",
      a: "Your Instagram audience stays on Instagram either way. Recreate your keyword and comment-to-DM rules in Oravini's setup wizard — most creators rebuild their core flows in under an hour.",
    },
  ],
  related: [
    { href: "/vs/manychat", label: "Oravini vs ManyChat" },
    { href: "/blog/how-to-choose-manychat-alternative", label: "How to choose a ManyChat alternative in 2026" },
  ],
};

export const VS_KAJABI: SeoPageConfig = {
  slug: "vs/kajabi",
  title: "Oravini vs Kajabi: Honest Comparison for Creators (2026) | Oravini",
  description:
    "Oravini vs Kajabi compared: courses, webinars, funnels, video hosting, Instagram DM automation, AI content tools and pricing. Which fits your creator business?",
  h1: "Oravini vs Kajabi: an honest comparison",
  intro:
    "Kajabi is a knowledge-commerce platform: courses, memberships, coaching products and the marketing around them. Oravini is a creator growth platform: AI content, Instagram DM automation, webinars, funnels and CRM. Some overlap, different centers of gravity.",
  sections: [
    {
      heading: "What Kajabi does well",
      body: "Hosting and selling structured online courses and memberships, with checkout, email marketing and a website builder. If your business is a catalog of paid courses, Kajabi is built around exactly that.",
    },
    {
      heading: "What Oravini does differently",
      body: "Oravini's center is audience growth: AI content ideas and competitor intelligence, Instagram DM automation that turns engagement into leads, webinars with a full registration-to-replay funnel, and a CRM tracking every contact from first comment.",
    },
    {
      heading: "The honest trade-off",
      body: "Kajabi is deeper on course delivery — student progress, assessments, memberships. Oravini is deeper on filling the top of the funnel — content and Instagram — and on live selling through webinars. Kajabi also starts at a meaningfully higher monthly price; Oravini has a free plan and prepaid terms.",
    },
  ],
  table: {
    head: ["Category", "Oravini", "Kajabi"],
    rows: [
      ["Core focus", "Audience growth: content, DMs, webinars, funnels, CRM", "Selling courses and memberships"],
      ["Course hosting & student management", "Video hosting for course content", "Full course platform (progress, assessments)"],
      ["Instagram DM automation", "Built in", "No"],
      ["AI content & competitor research", "Built in", "AI writing helpers"],
      ["Webinars / live launches", "Built in: registration, live room, replay", "Events feature, no dedicated live room"],
      ["CRM with source tracking", "Every lead tracked with source + UTMs", "Contact management"],
      ["Free plan", "Yes, 100 credits/month", "Trial only"],
      ["Pricing model", "Prepaid terms, no auto-renewal", "Monthly/annual subscription"],
    ],
  },
  faqs: [
    {
      q: "I'm a coach deciding between them. What's the short version?",
      a: "If your bottleneck is delivering a polished course catalog, look at Kajabi. If your bottleneck is getting enough leads from Instagram and converting them live, that's Oravini's home turf — at a lower starting cost.",
    },
    {
      q: "Can Oravini host my actual course videos?",
      a: "Yes, video hosting is included on video plans — VSLs, course content and replays. What Oravini doesn't do is Kajabi-style student management (quizzes, progress tracking, certificates).",
    },
    {
      q: "Do creators use both?",
      a: "Some do: Oravini for content, Instagram automation, webinars and lead tracking; a course platform for delivery. Many coaches find Oravini's video hosting plus funnels covers a lean launch on its own.",
    },
  ],
  related: [
    { href: "/webinar-platform-for-course-creators", label: "Webinars for course creators" },
    { href: "/blog/webinar-platform-guide", label: "What creators should look for in a webinar platform" },
  ],
};

export const VS_WEBINARJAM: SeoPageConfig = {
  slug: "vs/webinarjam",
  title: "Oravini vs WebinarJam: Honest Comparison for Creators (2026) | Oravini",
  description:
    "Oravini vs WebinarJam compared: live webinar features, registration funnels, replays, CRM, DM automation and pricing model. Which fits a creator launch?",
  h1: "Oravini vs WebinarJam: an honest comparison",
  intro:
    "WebinarJam is a dedicated webinar tool with a feature-rich live room. Oravini is a creator growth platform where webinars connect natively to your content, Instagram automation and CRM. If webinars are the only thing you need, both deserve a look; if the webinar is one step in a bigger funnel, the comparison shifts.",
  sections: [
    {
      heading: "What WebinarJam does well",
      body: "A mature live room: multiple presenters, attendee spotlight, panic button, extensive in-session widgets. It's been focused on the live event itself for years, and it shows.",
    },
    {
      heading: "What Oravini does differently",
      body: "Oravini's webinar room covers the selling essentials — chat, Q&A, polls, timed offer button, replay — and everything before and after is built in: the content that promotes it, the comment-to-DM that fills it, the CRM that tracks every registrant from their first click.",
    },
    {
      heading: "The honest trade-off",
      body: "WebinarJam's live room has more knobs for large productions. Oravini removes the integrations a dedicated webinar tool needs — page builder, CRM, email, DM automation — because they're the same product. Oravini also streams via YouTube Live from your own channel, which builds your YouTube presence as a side effect.",
    },
  ],
  table: {
    head: ["Category", "Oravini", "WebinarJam"],
    rows: [
      ["Core focus", "Creator growth platform with webinars built in", "Dedicated webinar software"],
      ["Live room", "Chat, Q&A, polls, timed offer button", "Larger feature set for big productions"],
      ["Registration pages", "AI-built, in-platform", "Built-in templates"],
      ["Replay handling", "Automatic replay library + segmented follow-up", "Replica replay options"],
      ["Instagram DM automation", "Built in — fills the room from comments", "No"],
      ["CRM with source tracking", "Every registrant tracked with source + UTMs", "No — integrates with external CRMs"],
      ["AI content & competitor research", "Built in", "No"],
      ["Pricing model", "Free plan + prepaid terms", "Annual subscription tiers"],
    ],
  },
  faqs: [
    {
      q: "Which is better for a first launch?",
      a: "A first launch dies in the joins: registration page here, webinar there, leads exported somewhere else. Oravini keeps the chain in one login, which matters more at small scale than live-room depth.",
    },
    {
      q: "Can Oravini handle a large live audience?",
      a: "Oravini streams via YouTube Live, which carries the audience load — your stream benefits from YouTube's infrastructure, and the chat, Q&A and offers run alongside it in Oravini's room.",
    },
    {
      q: "How do the prices compare?",
      a: "WebinarJam sells annual subscriptions at several tiers. Oravini has a free plan and prepaid terms with no auto-renewal — and its price includes the funnel, CRM, video hosting and DM automation you'd buy separately alongside a dedicated webinar tool.",
    },
  ],
  related: [
    { href: "/webinar-platform", label: "The full webinar platform tour" },
    { href: "/blog/webinar-platform-guide", label: "What creators should look for in a webinar platform" },
  ],
};

export const AUTOMATED_WEBINAR: SeoPageConfig = {
  slug: "automated-webinar-platform",
  title: "Automated & Evergreen Webinar Platform for Creators and Coaches | Oravini",
  description:
    "Run an evergreen webinar funnel: an instant-access registration page, a hosted recording, an offer button and a CRM that tracks who watched and who clicked. Built for creators and coaches.",
  h1: "An evergreen webinar platform that sells while you are offline",
  intro:
    "A live webinar sells once. An evergreen one sells every week. The idea is simple: record your best training, put it behind a registration page, and let your content and DMs send people to it. Oravini gives you the pieces in one place: the page, the hosted video, the offer and the CRM that shows who watched, how long they stayed and who clicked.",
  sections: [
    {
      heading: "Instant-access registration pages",
      body: "Start from an on-demand training template or describe your training to the funnel copilot. Visitors enter a name and email to get the training. There is no date to pick and no reminder schedule to manage, and every signup lands in your CRM with its source and UTM tags.",
    },
    {
      heading: "Your recording, hosted next to your funnel",
      body: "Upload the session to Video Hosting or keep it as the replay of a live webinar. The replay page can carry the same offer button you used live, so the pitch is part of the page and not something viewers have to remember. Run it live once, then let the replay do the repeat work.",
    },
    {
      heading: "See what the recording is doing",
      body: "Show rate, stay rate at 25, 50 and 75 percent, the drop-off curve and offer clicks are tracked per webinar. If most viewers leave at minute twelve, you know which part to re-record. That feedback loop is what separates an evergreen funnel that improves from one that just sits there.",
    },
    {
      heading: "Follow-up based on behavior",
      body: "A registrant starts as a new lead. Someone who watches ten minutes or more moves to qualified. Someone who clicks your offer moves to proposal and gets flagged as hot. Your pipeline shows where each person stands, so you follow up with the people who raised their hand and leave the rest alone.",
    },
    {
      heading: "Fill it from Instagram without lifting a finger",
      body: "Evergreen only works if people keep arriving. Comment-to-DM sends your registration link to everyone who comments a keyword on a post or reel, and the signup is tagged to the post that brought it. Content brings the audience, the DM brings the registration, the recording does the selling.",
    },
  ],
  faqs: [
    {
      q: "What is the difference between a live, an automated and an evergreen webinar?",
      a: "A live webinar happens at a set time with you in the room. An automated or evergreen webinar is recorded once and available to every new registrant on demand, so it keeps working long after you recorded it. Many creators run it live first, then reuse the recording.",
    },
    {
      q: "Does Oravini fake a live session on a schedule?",
      a: "No. Attendees get instant access to a recorded training, or you run a real live session and keep the replay up. Oravini does not present a recording as live, which keeps your audience's trust and avoids the complaints that come with fake-live setups.",
    },
    {
      q: "Can I still run live sessions?",
      a: "Yes. Live webinars stream through YouTube Live from your own channel, with chat, Q&A, polls and a timed offer button. The recording becomes your replay and can sit behind the same registration funnel afterward.",
    },
    {
      q: "How do I know the recording is converting?",
      a: "Each webinar has its own dashboard: registrations, attendance, how long people stayed, where they dropped off and who clicked the offer. Poll answers are saved as CRM tags, so you can segment who wanted what.",
    },
  ],
  related: [
    { href: "/webinar-platform", label: "The full webinar platform tour" },
    { href: "/blog/how-to-structure-a-webinar-that-sells", label: "How to structure a webinar that sells" },
    { href: "/comment-to-dm-automation", label: "Send your webinar link to everyone who comments" },
  ],
};

export const COMMENT_TO_DM: SeoPageConfig = {
  slug: "comment-to-dm-automation",
  title: "Comment-to-DM Automation for Instagram: Reply to Every Comment with a DM | Oravini",
  description:
    "Turn Instagram comments into conversations. Set a keyword on a post or reel and Oravini sends the DM with your link, then tracks the lead in your CRM. Setup wizard and logs included.",
  h1: "Comment-to-DM automation for Instagram, built into your funnel",
  intro:
    "Every creator has used the line: comment GUIDE and I will send it to you. Doing that by hand does not scale past a few dozen comments. Oravini watches the comments on the posts and reels you choose, and when someone uses your keyword it sends them a DM with your link. The lead then lands in the same CRM as your webinar registrations and funnel signups.",
  sections: [
    {
      heading: "How it works",
      body: "Pick a post or reel, choose the keyword, write the DM. When a comment contains the keyword, the commenter gets your message. You can send a lead magnet, a webinar registration page, a booking link or a short question to start a conversation. Setup takes a few minutes in the guided wizard.",
    },
    {
      heading: "More than comment triggers",
      body: "The same rules engine handles keyword replies for questions you get in DMs every day, a welcome message for new conversations, and thank-you replies when someone mentions you in a story. One tool covers the whole inbox, so you are not running a different automation for each entry point.",
    },
    {
      heading: "Every message is yours",
      body: "These are rules and templates you write. Nothing improvises on your behalf, and the wording, links and timing stay in your control. A log shows what was sent, to whom and when, so you can check that a campaign is behaving before you scale it.",
    },
    {
      heading: "Leads that do not get lost",
      body: "A DM tool that stops at the DM leaves you copying names into a spreadsheet. In Oravini the contact is saved to your CRM with its source, then moves through the pipeline as they register for a webinar, watch it and click your offer. You can see which reel brought which client.",
    },
    {
      heading: "Respects how Instagram works",
      body: "Oravini uses Instagram's official messaging connection for business and creator accounts. Replies go to people who commented or messaged you, which keeps your account in good standing. Instagram sets its own limits on automated messages, and a good setup works inside them instead of fighting them.",
    },
  ],
  faqs: [
    {
      q: "Do I need a business or creator account?",
      a: "Yes. Instagram's messaging connection is only available for professional accounts, and the account has to be linked to a Facebook Page. The setup wizard walks you through connecting it.",
    },
    {
      q: "Can one post have different keywords?",
      a: "You can set up rules per post or reel and use different keywords for different offers, for example one keyword for a free guide and another for a webinar registration.",
    },
    {
      q: "What should the automated DM say?",
      a: "Keep it short and specific: thank them, deliver exactly what the post promised, and add one clear next step. Messages that read like a person wrote them get replies. Messages that read like a blast get ignored.",
    },
    {
      q: "Is this the same as ManyChat?",
      a: "The comment-to-DM idea is the same. The difference is what sits behind it: Oravini has the webinar platform, funnels, video hosting and CRM in the same account, so the DM links straight to pages you built there.",
    },
  ],
  related: [
    { href: "/instagram-dm-automation", label: "Instagram DM automation: the full feature tour" },
    { href: "/manychat-alternative", label: "Looking at ManyChat alternatives?" },
    { href: "/blog/instagram-dm-automation-guide", label: "Instagram DM automation: a practical setup guide" },
  ],
};

export const SEO_PAGES: SeoPageConfig[] = [
  MANYCHAT_ALTERNATIVE,
  VS_MANYCHAT,
  IG_DM_AUTOMATION,
  WEBINAR_PLATFORM,
  DM_COACHES,
  DM_REAL_ESTATE,
  DM_FITNESS,
  DM_SALONS,
  WEBINAR_COACHES,
  WEBINAR_COURSE_CREATORS,
  VS_CHATFUEL,
  VS_KAJABI,
  VS_WEBINARJAM,
  AUTOMATED_WEBINAR,
  COMMENT_TO_DM,
];

export function ManyChatAlternativePage() { return <SEOPage config={MANYCHAT_ALTERNATIVE} />; }
export function VsManychatPage() { return <SEOPage config={VS_MANYCHAT} />; }
export function IgDmAutomationPage() { return <SEOPage config={IG_DM_AUTOMATION} />; }
export function WebinarPlatformPage() { return <SEOPage config={WEBINAR_PLATFORM} />; }
export function DmCoachesPage() { return <SEOPage config={DM_COACHES} />; }
export function DmRealEstatePage() { return <SEOPage config={DM_REAL_ESTATE} />; }
export function DmFitnessPage() { return <SEOPage config={DM_FITNESS} />; }
export function DmSalonsPage() { return <SEOPage config={DM_SALONS} />; }
export function WebinarCoachesPage() { return <SEOPage config={WEBINAR_COACHES} />; }
export function WebinarCourseCreatorsPage() { return <SEOPage config={WEBINAR_COURSE_CREATORS} />; }
export function VsChatfuelPage() { return <SEOPage config={VS_CHATFUEL} />; }
export function VsKajabiPage() { return <SEOPage config={VS_KAJABI} />; }
export function VsWebinarjamPage() { return <SEOPage config={VS_WEBINARJAM} />; }
export function AutomatedWebinarPage() { return <SEOPage config={AUTOMATED_WEBINAR} />; }
export function CommentToDmPage() { return <SEOPage config={COMMENT_TO_DM} />; }
