// Ready-made page templates for the unified builder (funnel steps + AI Page Studio).
// Each template is a full page document (theme + sections) in the shared page-engine schema.
import { THEME_PRESETS, type PageSection, type PageTheme } from "./pageEngine";

export type TemplateCategory = "landing" | "webinar" | "optin" | "sales" | "vsl" | "waitlist";

export type PageTemplate = {
  id: string;
  name: string;
  category: TemplateCategory;
  /** funnel step type this template fits best */
  stepType: string;
  description: string;
  theme: PageTheme;
  sections: PageSection[];
};

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: "landing", label: "Landing pages" },
  { id: "webinar", label: "Webinar registration" },
  { id: "optin", label: "Opt-in / lead magnet" },
  { id: "sales", label: "Sales pages" },
  { id: "vsl", label: "VSL pages" },
  { id: "waitlist", label: "Waitlist" },
];

let n = 0;
const s = (type: string, data: Record<string, any>): PageSection => ({ id: `t${(n++).toString(36)}`, type, data });
const inDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString();
const T = THEME_PRESETS;

export const PAGE_TEMPLATES: PageTemplate[] = [
  // ── Landing pages ──────────────────────────────────────────────────────────
  {
    id: "landing-authority", name: "Authority Coach", category: "landing", stepType: "landing",
    description: "Dark premium hero, proof bar, outcomes grid, bio and a single strong CTA.",
    theme: T.midnight_gold,
    sections: [
      s("hero", { badge: "For coaches & consultants", headline: "Turn your expertise into a $10k/month offer — without posting every day", subheadline: "A proven 90-day system to package what you know, price it with confidence and fill your calendar with qualified calls.", ctaText: "Book a free strategy call", layout: "split", image: "business" }),
      s("press", { label: "As featured in", logos: ["Forbes", "Entrepreneur", "Inc.", "Business Insider"] }),
      s("benefits", { title: "What changes in 90 days", items: ["A signature offer — one clear promise your ideal client says yes to", "Premium pricing — charge for outcomes, not hours", "Predictable leads — a content engine that books calls on autopilot", "A sales script that converts — close without feeling pushy", "Systems that scale — onboarding and delivery that run without you", "Freedom back — work 25 focused hours a week"], layout: "grid" }),
      s("stats", { label: "Results from our clients", stats: [{ number: "430+", desc: "Coaches launched" }, { number: "$11.2k", desc: "Avg. monthly revenue" }, { number: "37 days", desc: "Avg. to first sale" }, { number: "4.9★", desc: "Client rating" }] }),
      s("testimonials", { title: "In their words", testimonials: [{ name: "Priya Sharma", role: "Leadership coach", quote: "I went from $2k months to my first $14k month in week 9. The offer framework alone was worth it.", avatar: "portrait_f" }, { name: "Marcus Lee", role: "Fitness consultant", quote: "I stopped chasing clients on DMs. Now calls book themselves from two posts a week.", avatar: "portrait_m" }, { name: "Elena Ruiz", role: "Brand strategist", quote: "Doubled my prices and closed more. I wish I had done this two years ago.", avatar: "portrait_f" }] }),
      s("bio", { title: "Your guide", name: "Aryan Mehta", role: "Founder, Oravini Growth", bio: "I've helped 400+ experts turn their knowledge into premium offers. Before that I built and sold two service businesses. My approach is simple: one offer, one audience, one system — executed well.", avatar: "portrait_m" }),
      s("cta", { headline: "Ready to build your $10k offer?", subtext: "Book a free 30-minute strategy call. We'll map your offer, pricing and first 90 days.", ctaText: "Book my free call" }),
    ],
  },
  {
    id: "landing-saas-light", name: "Clean Product", category: "landing", stepType: "landing",
    description: "Bright, airy SaaS-style page with feature grid, comparison table and FAQ.",
    theme: T.clean_light,
    sections: [
      s("hero", { badge: "New · Free 14-day trial", headline: "Your content calendar, planned by AI in 5 minutes", subheadline: "Plan, write and schedule a month of on-brand posts for Instagram, LinkedIn and YouTube — from one dashboard.", ctaText: "Start free trial", layout: "centered" }),
      s("image", { src: "laptop", alt: "Dashboard preview", caption: "" }),
      s("benefits", { title: "Everything you need to stay consistent", subtitle: "Built for solo creators and small teams.", items: ["AI planner — a month of ideas tailored to your niche", "Brand voice — every caption sounds like you", "One-click scheduling — 6 platforms, one calendar", "Analytics — see which posts drive leads, not just likes", "Team approvals — comment and approve in one place", "Templates — 200+ proven post formats"], layout: "grid" }),
      s("comparison", { title: "Why teams switch", headers: ["", "Us", "Spreadsheets"], rows: [["AI-generated content plan", "✅", "❌"], ["Auto-scheduling", "✅", "❌"], ["Lead tracking per post", "✅", "❌"], ["Setup time", "5 min", "Days"]] }),
      s("faq", { title: "Questions, answered", faqs: [{ question: "Do I need a credit card for the trial?", answer: "No. You get 14 days of full access, no card required." }, { question: "Which platforms are supported?", answer: "Instagram, LinkedIn, YouTube, TikTok, X and Facebook." }, { question: "Can I cancel anytime?", answer: "Yes — cancel in one click from your settings. No contracts." }] }),
      s("cta", { headline: "Stop staring at a blank calendar", subtext: "Join 12,000 creators planning smarter.", ctaText: "Start my free trial" }),
    ],
  },
  {
    id: "landing-editorial", name: "Editorial Story", category: "landing", stepType: "landing",
    description: "Serif, magazine-style layout for personal brands and long-form storytelling.",
    theme: T.editorial,
    sections: [
      s("hero", { badge: "A 6-week writing program", headline: "Write the book you keep talking about", subheadline: "A calm, structured path from scattered notes to a finished manuscript — with weekly feedback from published authors.", ctaText: "Apply for the next cohort", layout: "centered" }),
      s("bio", { title: "Why I created this", name: "Maya Fernandes", role: "Author of three bestsellers", bio: "For years I believed books were written in bursts of inspiration. They're not. They're written in small, protected hours. This program gives you those hours, a structure, and people who won't let you quit.", avatar: "portrait_f" }),
      s("benefits", { title: "Inside the program", items: ["Weekly chapters — a 6-week roadmap with clear word-count targets", "Live editing — every draft reviewed by a published author", "Writing rooms — 3 focused sessions a week, cameras on", "Publishing path — agents, self-publishing or hybrid, explained"], layout: "list" }),
      s("testimonials", { title: "From past writers", testimonials: [{ name: "Daniel K.", role: "First-time author", quote: "I finished a 60,000-word draft. Six weeks. I still can't quite believe it.", avatar: "portrait_m" }, { name: "Aisha N.", role: "Memoirist", quote: "The structure gave me permission to write badly — and then make it good.", avatar: "portrait_f" }] }),
      s("cta", { headline: "The next cohort starts soon", subtext: "Twelve seats. Applications take 5 minutes.", ctaText: "Apply now" }),
    ],
  },

  // ── Webinar registration ───────────────────────────────────────────────────
  {
    id: "webinar-live-masterclass", name: "Live Masterclass", category: "webinar", stepType: "landing",
    description: "Countdown-first registration page with learning points and host bio.",
    theme: T.lavender,
    sections: [
      s("urgency_bar", { text: "🔴 Free live masterclass", subtext: "Seats are limited to 500 live attendees" }),
      s("hero", { badge: "Free live training", headline: "How to get your first 1,000 email subscribers in 30 days", subheadline: "A 60-minute live masterclass. No fluff — the exact lead magnet, page and content plan we use.", showForm: true, fields: ["name", "email"], ctaText: "Save my free seat", layout: "centered" }),
      s("countdown", { countdownTitle: "We go live in", targetDate: inDays(5) }),
      s("benefits", { title: "In this masterclass you'll learn", items: ["The 1-page lead magnet that converts at 40%+", "Where to post so the right people see it", "The 3-email welcome sequence that builds trust fast", "Live Q&A — bring your questions"], layout: "list" }),
      s("bio", { title: "Your host", name: "Rohan Kapoor", role: "Grew 3 newsletters past 50k", bio: "Rohan has built audiences for creators and startups for 8 years. He'll walk you through the exact playbook, live.", avatar: "portrait_m" }),
      s("form", { formTitle: "Reserve your free seat", formSubtext: "We'll email you the link and a reminder before we start.", buttonText: "Register free", fields: ["name", "email"] }),
    ],
  },
  {
    id: "webinar-workshop-light", name: "Workshop (Light)", category: "webinar", stepType: "landing",
    description: "Bright workshop page with agenda, stats and a split hero.",
    theme: T.sunset,
    sections: [
      s("hero", { badge: "Live workshop · 90 minutes", headline: "Build a content system that runs without you", subheadline: "Bring your laptop. Leave with a 30-day content plan, templates and a repurposing workflow you can use tomorrow.", showForm: true, fields: ["name", "email"], ctaText: "Join the workshop", layout: "split", image: "event" }),
      s("stats", { label: "Past workshops", stats: [{ number: "8,400", desc: "Attendees" }, { number: "92%", desc: "Would recommend" }, { number: "30", desc: "Days of content, built live" }] }),
      s("benefits", { title: "Agenda", items: ["0–20 min — Find the 3 pillars your audience cares about", "20–50 min — Turn one idea into 10 posts", "50–75 min — Build your batching and scheduling workflow", "75–90 min — Live Q&A and plan review"], layout: "list" }),
      s("faq", { title: "Good to know", faqs: [{ question: "Is there a replay?", answer: "Yes — everyone who registers gets the replay for 72 hours." }, { question: "Is it really free?", answer: "Yes. At the end we'll mention our program, but the workshop stands on its own." }] }),
      s("form", { formTitle: "Save your seat", formSubtext: "Free. Replay included.", buttonText: "Count me in", fields: ["name", "email"] }),
    ],
  },
  {
    id: "webinar-evergreen", name: "Evergreen Training", category: "webinar", stepType: "landing",
    description: "Ocean-dark on-demand training with proof bar and testimonials.",
    theme: T.ocean,
    sections: [
      s("hero", { badge: "On-demand training · Watch now", headline: "The 3-step ad system that lowers your cost per lead by 40%", subheadline: "A 45-minute training for coaches and service businesses running Meta ads.", showForm: true, fields: ["name", "email"], ctaText: "Watch the free training", layout: "image-bg", image: "marketing" }),
      s("press", { label: "Trusted by teams at", logos: ["Shopify", "HubSpot", "Notion", "Canva"] }),
      s("benefits", { title: "You'll discover", items: ["Why most ads fail before anyone sees them", "The creative formula that scales past $100/day", "How to read 3 numbers and know exactly what to fix"], layout: "grid" }),
      s("testimonials", { title: "What viewers say", testimonials: [{ name: "Sara O.", role: "Agency owner", quote: "Cut our CPL from $18 to $9 in two weeks using step 2 alone.", avatar: "portrait_f" }, { name: "James P.", role: "Business coach", quote: "Finally understand what to change when ads stop working.", avatar: "portrait_m" }] }),
      s("form", { formTitle: "Get instant access", formSubtext: "Starts immediately after you register.", buttonText: "Watch now", fields: ["name", "email"] }),
    ],
  },

  // ── Opt-in ─────────────────────────────────────────────────────────────────
  {
    id: "optin-lead-magnet", name: "Lead Magnet", category: "optin", stepType: "landing",
    description: "Short, focused opt-in for a free guide or checklist.",
    theme: T.forest,
    sections: [
      s("hero", { badge: "Free download", headline: "The 21-Day Gut Reset Meal Plan", subheadline: "Simple recipes, a shopping list and a day-by-day plan — designed by a registered nutritionist.", showForm: true, fields: ["name", "email"], ctaText: "Send me the plan", layout: "split", image: "food" }),
      s("benefits", { title: "Inside the guide", items: ["21 days of easy meals (15 minutes or less)", "A printable shopping list for each week", "The 5 foods to pause — and what to eat instead"], layout: "list" }),
      s("testimonials", { title: "", testimonials: [{ name: "Neha R.", role: "Busy mum of two", quote: "Less bloating in a week, and the kids actually ate the food.", avatar: "portrait_f" }] }),
    ],
  },
  {
    id: "optin-checklist-minimal", name: "Minimal Checklist", category: "optin", stepType: "landing",
    description: "Monochrome, ultra-minimal opt-in that puts the offer first.",
    theme: T.mono,
    sections: [
      s("hero", { badge: "Free checklist", headline: "The pre-launch checklist we use for every product launch", subheadline: "47 steps across positioning, pages, email and ads — so nothing slips through the cracks.", showForm: true, fields: ["email"], ctaText: "Get the checklist", layout: "centered" }),
      s("stats", { label: "", stats: [{ number: "47", desc: "Steps" }, { number: "6", desc: "Launch phases" }, { number: "$3M+", desc: "In launches using it" }] }),
    ],
  },

  // ── Sales ──────────────────────────────────────────────────────────────────
  {
    id: "sales-program", name: "Program Sales Page", category: "sales", stepType: "sales",
    description: "Long-form sales page: problem, outcomes, pricing, guarantee, FAQ.",
    theme: T.midnight_gold,
    sections: [
      s("hero", { badge: "Enrollment open", headline: "The Creator Accelerator: from 0 to your first 100 paying customers", subheadline: "A 12-week program with weekly coaching, templates and a community of creators building alongside you.", ctaText: "Join the Accelerator", layout: "centered" }),
      s("benefits", { title: "By the end of 12 weeks you will have", items: ["A validated offer people have already paid for", "A content engine that brings 3–5 leads a day", "A simple sales process you can run in 30 minutes a day", "Your first 100 customers — or we keep working with you"], layout: "grid" }),
      s("testimonials", { title: "Accelerator graduates", testimonials: [{ name: "Kabir S.", role: "Design educator", quote: "Hit 112 customers in week 11. The weekly calls kept me honest.", avatar: "portrait_m" }, { name: "Lina M.", role: "Language coach", quote: "I launched, sold out, and raised my price. All in one quarter.", avatar: "portrait_f" }, { name: "Tom B.", role: "Productivity creator", quote: "Worth 10x what I paid. The templates saved me months.", avatar: "portrait_m" }] }),
      s("pricing", { pricingTitle: "One payment. Lifetime access.", price: "$997", originalPrice: "$1,997", pricingFeatures: ["12 weekly live coaching calls", "Full course library + templates", "Private community", "Offer & pricing review", "Lifetime updates"], ctaText: "Enroll now" }),
      s("guarantee", { title: "100-customer guarantee", body: "Do the work, and if you don't reach 100 customers in 12 weeks, we'll keep coaching you for free until you do.", badgeText: "Risk-free" }),
      s("faq", { title: "FAQ", faqs: [{ question: "How much time do I need?", answer: "Plan for 5–7 hours a week, including the live call." }, { question: "What if I miss a call?", answer: "Every call is recorded and posted within 24 hours." }, { question: "Is there a payment plan?", answer: "Yes — 3 monthly payments of $349." }] }),
    ],
  },
  {
    id: "sales-product-light", name: "Product Launch", category: "sales", stepType: "sales",
    description: "Bright product sales page with stats, comparison and pricing card.",
    theme: T.sunset,
    sections: [
      s("hero", { badge: "Launch week · 40% off", headline: "Notion templates that run your entire creator business", subheadline: "Content planner, CRM, finance tracker and launch board — connected, ready in 10 minutes.", ctaText: "Get the bundle", layout: "split", image: "laptop" }),
      s("stats", { label: "", stats: [{ number: "18,000+", desc: "Creators using it" }, { number: "4.8★", desc: "Average rating" }, { number: "10 min", desc: "Setup time" }] }),
      s("comparison", { title: "What's included", headers: ["", "Bundle", "Starter"], rows: [["Content planner", "✅", "✅"], ["Client CRM", "✅", "❌"], ["Finance tracker", "✅", "❌"], ["Launch board", "✅", "❌"]] }),
      s("pricing", { pricingTitle: "Launch price", price: "$59", originalPrice: "$99", pricingFeatures: ["All 4 templates", "Video walkthroughs", "Free updates forever"], ctaText: "Buy now" }),
      s("guarantee", { title: "Love it or it's free", body: "If it doesn't save you time in 14 days, email us for a full refund.", badgeText: "14-day refund" }),
    ],
  },

  // ── VSL ────────────────────────────────────────────────────────────────────
  {
    id: "vsl-classic", name: "Classic VSL", category: "vsl", stepType: "sales",
    description: "Video-first page: headline, video, CTA, proof and FAQ.",
    theme: T.midnight_gold,
    sections: [
      s("hero", { badge: "Watch this first", headline: "How 3 coaches added $30k/month with one simple funnel", subheadline: "Watch the 12-minute breakdown below — then book a call if it's a fit.", ctaText: "", layout: "centered" }),
      s("video", { videoUrl: "", caption: "12-minute breakdown · sound on" }),
      s("cta", { headline: "Want us to build this for you?", subtext: "Book a call and we'll show you what this looks like for your business.", ctaText: "Book my call" }),
      s("testimonials", { title: "Client results", testimonials: [{ name: "Ana G.", role: "Business coach", quote: "From 4 to 22 calls a week in a month.", avatar: "portrait_f" }, { name: "Vik R.", role: "Consultant", quote: "Paid for itself in 9 days.", avatar: "portrait_m" }] }),
      s("faq", { title: "Common questions", faqs: [{ question: "Who is this for?", answer: "Coaches and consultants already doing at least $5k/month." }, { question: "How fast is setup?", answer: "Most funnels are live in 14 days." }] }),
    ],
  },
  {
    id: "vsl-minimal", name: "Minimal VSL", category: "vsl", stepType: "sales",
    description: "Distraction-free light VSL with one CTA under the video.",
    theme: T.clean_light,
    sections: [
      s("hero", { badge: "", headline: "Stop losing leads between the ad and the call", subheadline: "A short video on the 3 leaks we fix in every funnel.", ctaText: "", layout: "centered" }),
      s("video", { videoUrl: "", caption: "" }),
      s("cta", { headline: "", subtext: "Ready to plug the leaks?", ctaText: "Get my funnel audit" }),
    ],
  },

  // ── Waitlist ───────────────────────────────────────────────────────────────
  {
    id: "waitlist-launch", name: "Product Waitlist", category: "waitlist", stepType: "landing",
    description: "Glowing dark waitlist with stats and early-bird perks.",
    theme: T.lavender,
    sections: [
      s("hero", { badge: "Coming soon", headline: "The AI studio for short-form video", subheadline: "Turn one long video into 20 scroll-stopping clips — captions, hooks and b-roll included. Join the waitlist for early access.", showForm: true, fields: ["email"], ctaText: "Join the waitlist", layout: "centered" }),
      s("stats", { label: "", stats: [{ number: "6,200", desc: "On the waitlist" }, { number: "20x", desc: "Faster editing" }, { number: "Spring", desc: "Launch" }] }),
      s("benefits", { title: "Early-bird perks", items: ["50% off for life — locked in at launch", "Private beta invite before the public", "Shape the roadmap in the founders' Discord"], layout: "grid" }),
    ],
  },
  {
    id: "waitlist-cohort", name: "Cohort Waitlist", category: "waitlist", stepType: "landing",
    description: "Editorial waitlist for the next cohort, with FAQ.",
    theme: T.editorial,
    sections: [
      s("hero", { badge: "Next cohort · waitlist open", headline: "Design Leadership Circle", subheadline: "A small, invite-only group for design leads stepping into their first leadership role. Waitlist members hear first when seats open.", showForm: true, fields: ["name", "email"], ctaText: "Join the waitlist", layout: "centered" }),
      s("faq", { title: "", faqs: [{ question: "When does the next cohort start?", answer: "We run two cohorts a year. Waitlist members get 72 hours of early access." }, { question: "How big is each cohort?", answer: "Twenty people, so everyone gets real attention." }] }),
    ],
  },
];

export function getTemplate(id: string): PageTemplate | undefined {
  return PAGE_TEMPLATES.find(t => t.id === id);
}

/** Fresh copy with new section ids (so applying twice never shares ids). */
export function instantiateTemplate(t: PageTemplate): { theme: PageTheme; sections: PageSection[] } {
  return {
    theme: JSON.parse(JSON.stringify(t.theme)),
    sections: t.sections.map(sec => ({ id: Math.random().toString(36).slice(2, 10), type: sec.type, data: JSON.parse(JSON.stringify(sec.data)) })),
  };
}
