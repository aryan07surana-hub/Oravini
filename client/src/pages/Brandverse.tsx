import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
const oraviniLogoPath = "/oravini-logo.png";

const GOLD = "#d4b461";
const GOLD_BRIGHT = "#f0c84b";
const CALENDLY = "https://calendly.com/brandversee/30min";

/* ───────────────────────────────────────────────────────────
   Scroll-in animation util
─────────────────────────────────────────────────────────── */
function useScrollAnim() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-bv-anim]");
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

function Anim({ children, delay = 0, from = "translateY(36px)", style = {} }: { children: React.ReactNode; delay?: number; from?: string; style?: React.CSSProperties }) {
  return (
    <div data-bv-anim="1" style={{ opacity: 0, transform: from, transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`, ...style }}>
      {children}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────
   Strategy "test" modal (qualification quiz)
─────────────────────────────────────────────────────────── */
const CALL_QS = [
  { q: "What's your biggest content challenge right now?", opts: ["Low engagement", "Inconsistent posting", "No clear strategy", "Growing too slowly", "Content ideas dry up"] },
  { q: "What platform are you primarily on?", opts: ["Instagram", "YouTube", "TikTok", "LinkedIn", "X (Twitter)"] },
  { q: "What's your current following size?", opts: ["Under 1,000", "1K–10K", "10K–50K", "50K–100K", "100K+"] },
  { q: "What's your primary goal in the next 90 days?", opts: ["Monetize audience", "Hit follower milestone", "Launch a product", "Get brand deals", "Build consistent content machine"] },
  { q: "Interested in building your own branded software platform?", opts: ["Yes — definitely", "Maybe — tell me more", "Not right now", "Just here for mentorship"] },
];

function StrategyModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const done = step >= CALL_QS.length;
  const pick = (opt: string) => { setAnswers(a => [...a, opt]); setStep(s => s + 1); };
  const softwareInterest = answers[4]?.startsWith("Yes") || answers[4]?.startsWith("Maybe");

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 8000, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#080808", border: `1px solid ${GOLD}33`, borderRadius: 24, padding: "44px 40px", maxWidth: 540, width: "100%", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 22, cursor: "pointer" }}>✕</button>
        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 42, marginBottom: 16 }}>🚀</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: GOLD, marginBottom: 10 }}>
              {softwareInterest ? "You're pre-qualified for Scale Your Software!" : "You're pre-qualified!"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
              {softwareInterest
                ? "You're exactly the type of creator we build custom platforms for. Book your free 30-min call — we'll sketch your platform and custom growth plan live."
                : "You're exactly the type of creator we work with. Book your free 30-min strategy call now — our team will build a custom growth plan for you."}
            </div>
            <a href={CALENDLY} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 16, borderRadius: 12, padding: "15px 36px", textDecoration: "none" }}>
              Book My Free Strategy Call →
            </a>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
              {CALL_QS.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= step ? GOLD : "rgba(255,255,255,0.1)", transition: "background 0.3s" }} />
              ))}
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", marginBottom: 10 }}>Question {step + 1} of {CALL_QS.length}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 24, lineHeight: 1.4 }}>{CALL_QS[step].q}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {CALL_QS[step].opts.map(opt => (
                <button key={opt} onClick={() => pick(opt)}
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "13px 18px", color: "rgba(255,255,255,0.8)", fontSize: 14, cursor: "pointer", textAlign: "left", fontWeight: 500, transition: "all 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget).style.border = `1px solid ${GOLD}88`; (e.currentTarget).style.color = GOLD; }}
                  onMouseLeave={e => { (e.currentTarget).style.border = "1px solid rgba(255,255,255,0.1)"; (e.currentTarget).style.color = "rgba(255,255,255,0.8)"; }}>
                  {opt}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────
   Chatbot knowledge base + smart matcher
─────────────────────────────────────────────────────────── */
type BotTopic = {
  id: string;
  keywords: string[];
  weight?: number;
  answer: string;
  suggest?: string[];
  cta?: "strategy" | "calendly" | null;
};

// Synonyms / stem map — each normalized token becomes its canonical form
const SYNONYMS: Record<string, string> = {
  priced: "price", pricing: "price", prices: "price", costs: "cost",
  costing: "cost", afford: "price", affordable: "price", affordability: "price",
  invest: "price", investment: "price", rates: "rate", charging: "charge",
  charged: "charge", fees: "fee", paying: "pay", pay: "price",
  includes: "include", included: "include", including: "include",
  inclusion: "include", features: "feature", offering: "offer",
  offers: "offer", deliverables: "deliverable", delivers: "deliver",
  platforms: "platform", platfom: "platform", platfrom: "platform",
  apps: "app", webapp: "app", saas: "saas",
  automations: "automation", automate: "automation", automated: "automation",
  automating: "automation", workers: "worker", bots: "bot", ai: "ai",
  ais: "ai", agent: "bot", agents: "bot",
  timelines: "timeline", duration: "timeline", length: "timeline",
  long: "timeline", months: "timeline", month: "timeline", days: "timeline",
  weeks: "timeline", week: "timeline", start: "start", starting: "start",
  started: "start", begin: "start", beginning: "start",
  call: "call", calls: "call", meeting: "call", meetings: "call",
  book: "book", booking: "book", booked: "book", schedule: "book",
  scheduling: "book", appointment: "book",
  contracts: "contract", contracted: "contract", commitments: "commit",
  committing: "commit", committed: "commit", cancel: "cancel",
  cancellation: "cancel", cancelling: "cancel", exit: "exit", exiting: "exit",
  refunds: "refund", refunded: "refund", guarantees: "guarantee",
  guaranteed: "guarantee", money: "money", back: "back",
  supported: "support", supports: "support", supporting: "support",
  sla: "sla", help: "support", helping: "support", helps: "support",
  niches: "niche", industries: "niche", industry: "niche", verticals: "niche",
  vertical: "niche", fields: "niche", categories: "niche", category: "niche",
  creators: "creator", influencers: "influencer", coach: "coach",
  coaches: "coach", coaching: "coach", consultants: "consultant",
  consulting: "consultant",
  instagram: "ig", insta: "ig", youtube: "yt", tiktok: "tt",
  twitter: "x", linkedin: "li",
  monetizing: "monetize", monetized: "monetize", revenue: "revenue",
  income: "revenue", earnings: "revenue", sales: "sale",
  selling: "sell", sold: "sell", products: "product", courses: "course",
  community: "community", communities: "community", membership: "membership",
  memberships: "membership",
  hooks: "hook", hooked: "hook", posting: "post", posts: "post",
  scripts: "script", scripting: "script", reels: "reel", shorts: "short",
  content: "content",
  integrations: "integration", integrating: "integration",
  integrated: "integration", connects: "connect", connecting: "connect",
  connected: "connect",
  results: "result", cases: "case", testimonials: "testimonial",
  proofs: "proof", portfolios: "portfolio",
  team: "team", teams: "team", founders: "founder", founded: "founder",
  owning: "own", owned: "own", ownership: "own", ip: "ip", rights: "own",
  assets: "asset", reselling: "sell",
  stack: "stack", tech: "tech", technology: "tech", framework: "tech",
  frameworks: "tech", hosting: "hosting", hosted: "hosting",
  infra: "infra", infrastructure: "infra", database: "db", databases: "db",
  agency: "agency", agencies: "agency", freelancer: "freelancer",
  freelancers: "freelancer", smm: "agency",
  diy: "diy", myself: "diy", alone: "diy",
  reports: "report", reporting: "report", analytics: "report",
  dashboards: "report", metrics: "metric",
  audiences: "audience", followers: "follower", followings: "follower",
  subscribers: "subscriber", fans: "audience",
  beginners: "beginner", newbie: "beginner",
  languages: "language", country: "country", countries: "country",
  international: "country", global: "country", remote: "remote",
  equity: "equity", partnership: "partnership", partnerships: "partnership",
  partners: "partner", collaborate: "partnership",
  data: "data", privacy: "privacy", gdpr: "privacy", secure: "security",
  security: "security",
  weekend: "weekend", weekends: "weekend", hours: "hours",
  timezone: "timezone", timezones: "timezone", tz: "timezone",
  measure: "measure", measuring: "measure", kpi: "kpi", kpis: "kpi",
  success: "success",
  firstclient: "firstclient", onboarding: "onboard", onboarded: "onboard",
};

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "am", "was", "were", "be", "been", "being",
  "do", "does", "did", "doing", "have", "has", "had", "having", "i", "you",
  "he", "she", "it", "we", "they", "my", "your", "our", "of", "to", "in",
  "on", "for", "with", "at", "by", "from", "as", "and", "or", "but", "if",
  "so", "what", "when", "where", "who", "how", "why", "this", "that", "these",
  "those", "can", "could", "would", "should", "will", "won", "t", "s", "m",
  "re", "ll", "d", "ve", "there", "here", "me", "us", "also", "any", "some",
  "much", "more", "less",
]);

// Levenshtein for typo tolerance (short distance only)
function lev(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp: number[] = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) dp[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = tmp;
    }
  }
  return dp[b.length];
}

function tokenize(raw: string): string[] {
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  return tokens
    .map(t => SYNONYMS[t] ?? t)
    .filter(t => !STOP_WORDS.has(t) && t.length > 1);
}

const BOT_TOPICS: BotTopic[] = [
  {
    id: "greeting",
    keywords: ["hi", "hello", "hey", "yo", "sup", "howdy", "morning", "evening"],
    answer: "Hey — I'm the Oravini Tier 5 assistant. Ask me anything about the program, pricing, Scale Your Software, our 90-day process, or how we work with creators.",
    suggest: ["What's included?", "Pricing", "Scale Your Software", "Who is Tier 5 for?"],
  },
  {
    id: "pricing",
    keywords: ["price", "cost", "fee", "pay", "expensive", "budget", "rate", "charge"],
    weight: 1.3,
    answer: "Tier 5 is application-only with custom pricing tailored to your goals and the scope you need. We don't publish a number because every creator we take on is built a different system. Pricing (and the Scale Your Software add-on) is walked through transparently on your free 30-min strategy call.",
    suggest: ["Book a call", "What's included?", "Is there a contract?"],
    cta: "strategy",
  },
  {
    id: "features",
    keywords: ["include", "feature", "get", "offer", "deliverable", "deliver"],
    answer: "Tier 5 includes: a custom 90-day growth strategy, done-with-you execution weekly, 1-on-1 strategist calls, offer & funnel design, unlimited access to all 9 Oravini AI tools, and direct team access through your dashboard. Scale Your Software is an optional premium track that adds a custom-built platform + AI workers on top.",
    suggest: ["Scale Your Software", "90-day timeline", "Who is it for?"],
  },
  {
    id: "scale_software",
    keywords: ["software", "platform", "app", "build", "custom", "branded", "saas", "moat", "proprietary"],
    weight: 1.5,
    answer: "Scale Your Software is our premium program where we build and scale a custom web app for your brand alongside the mentorship. You get a platform that's 100% yours — your branding, your domain, your logic. AI workers are trained on your voice and methodology, automations are custom-built around how YOU operate, and development keeps going based on YOUR roadmap, not a generic SaaS roadmap. It's a long-term program — we discuss scope, timeline, and pricing on your strategy call.",
    suggest: ["What do I own?", "How long does it take?", "Tech stack", "Book a call"],
    cta: "strategy",
  },
  {
    id: "ownership",
    keywords: ["own", "ip", "mine", "rights", "sell", "exit", "asset"],
    answer: "You own the platform, the brand, and the data. Scale Your Software builds YOU an asset — not a license to something we own. That means you can scale it, raise on it, or sell it later. It's real equity, not a rented tool.",
    suggest: ["Tech stack", "Scale Your Software", "Can I sell it later?"],
  },
  {
    id: "tech_stack",
    keywords: ["stack", "tech", "hosting", "infra", "db"],
    answer: "We build on a modern web stack (React, Node, Postgres, cloud hosting) and pick the exact setup based on what your platform needs to do — community, courses, coaching portal, content hub, or a hybrid. We'll walk through the right architecture on your strategy call.",
    suggest: ["Scale Your Software", "Ownership", "Security"],
  },
  {
    id: "who_for",
    keywords: ["fit", "qualify", "qualification", "target"],
    answer: "Tier 5 is for creators, influencers, consultants, and info-product sellers who are past the 'random posting' phase and want a real growth system. You're a fit if you have an audience (even a small one), a clear offer direction, and want to scale without burning out juggling 10 tools. Scale Your Software is for the serious scalers who want their own branded platform as a moat.",
    suggest: ["Audience size needed?", "Niches", "Scale Your Software"],
  },
  {
    id: "audience",
    keywords: ["follower", "audience", "subscriber", "beginner", "small"],
    answer: "There's no hard follower minimum. We've worked with creators from under 5K to 500K+. What matters more is: do you know your niche, do you have a direction for an offer, and are you willing to execute weekly. If you're a total beginner with no posts, we'd usually steer you to Tier 3 or 4 first.",
    suggest: ["Who is Tier 5 for?", "Pricing", "Book a call"],
  },
  {
    id: "niches",
    keywords: ["niche"],
    answer: "We work across creator niches: fitness, finance, business, mindset, productivity, coaching, tech, design, lifestyle, health, real estate, e-commerce, agency, and more. If your content is built around an audience and a monetizable offer, we can scale it.",
    suggest: ["Who is Tier 5 for?", "Platforms", "Book a call"],
  },
  {
    id: "platforms",
    keywords: ["ig", "yt", "tt", "li", "x", "threads", "reddit"],
    answer: "Primary platforms: Instagram, YouTube (long-form + Shorts), TikTok, LinkedIn, and X. We build content pillars and distribution flows around wherever your audience actually converts — usually multi-platform with one 'home base.'",
    suggest: ["Content strategy", "Monetization", "90-day timeline"],
  },
  {
    id: "timeline",
    keywords: ["timeline", "fast", "quick", "soon"],
    weight: 1.1,
    answer: "First 30 days: onboarding, audit, strategy build, team training, go-live. Days 31–60: data-driven scaling — 3x content output, conversion optimization. Days 61–90: advanced monetization, automation, and turning your content into a real revenue machine. Scale Your Software runs longer as a multi-phase program — we map it on the call.",
    suggest: ["What's in Week 1?", "Scale Your Software", "Book a call"],
  },
  {
    id: "onboarding",
    keywords: ["onboard", "kickoff", "start"],
    answer: "Week 1 is onboarding + discovery: we audit your current content, map your audience, and lock in your core offer. Week 2 is system integration (tools, workflows, AI workers). Week 3 is team training and content pillar build. Week 4 is go-live — your content machine is running.",
    suggest: ["90-day timeline", "What's included?", "Book a call"],
  },
  {
    id: "strategy_call",
    keywords: ["call", "book", "discovery", "consultation", "chat", "demo"],
    answer: "The strategy call is a free 30-min 1-on-1 with our team. We do a live diagnosis of your content, audience, and offer, then sketch a custom plan — including Scale Your Software if it fits. Zero pitch. You leave with a roadmap either way.",
    suggest: ["Book now", "Who is Tier 5 for?", "Pricing"],
    cta: "strategy",
  },
  {
    id: "contract",
    keywords: ["contract", "commit", "terms", "cancel"],
    answer: "Tier 5 engagements are structured for real results, not month-to-month. We'll walk through the specific agreement length on your strategy call — it depends on whether you're on Tier 5 alone or the Scale Your Software track.",
    suggest: ["Pricing", "Refund policy", "Book a call"],
  },
  {
    id: "refund",
    keywords: ["refund", "guarantee", "risk", "trial"],
    answer: "We don't sell a money-back gimmick — we sell execution. What we guarantee is weekly work, direct team access, and a strategy that adjusts to data. Our commitment is spelled out in the agreement we walk through on the call.",
    suggest: ["Contract", "Support", "Results"],
  },
  {
    id: "support",
    keywords: ["support", "sla", "response", "manager", "dedicated"],
    answer: "You get a dedicated strategist, weekly 1-on-1 calls, and direct team access through your Oravini dashboard — real humans, not a ticket queue. Scale Your Software clients also get an assigned build team and ongoing dev support.",
    suggest: ["Weekend support?", "Response time", "Book a call"],
  },
  {
    id: "monetization",
    keywords: ["monetize", "sell", "course", "coach", "sponsor", "brand", "product", "launch", "revenue", "sale"],
    answer: "Monetization tracks we build: digital products (courses, templates), coaching/consulting offers, community/membership, brand partnerships, and affiliate. We don't pick one for you — we pick what fits YOUR audience psychology and positioning. Most clients stack 2–3.",
    suggest: ["Content strategy", "Who is Tier 5 for?", "Book a call"],
  },
  {
    id: "content",
    keywords: ["content", "hook", "viral", "post", "reel", "short", "script"],
    answer: "Content system: we lock in 3–5 content pillars, build a hooks library tailored to your niche, set a sustainable posting rhythm, and train AI workers to draft in your voice. You approve, post, iterate. The goal is consistent reach compounding into leads, not chasing trends.",
    suggest: ["90-day timeline", "AI workers", "Platforms"],
  },
  {
    id: "ai",
    keywords: ["ai", "automation", "worker", "bot", "gpt", "llm"],
    answer: "Our AI workers handle ~80% of the repetitive grind: content ideation, hook drafting, caption generation, competitor monitoring, audience segmentation, and scheduled posting. In Scale Your Software, we train those workers specifically on YOUR voice, offers, and methodology so the output feels native to your brand.",
    suggest: ["Scale Your Software", "What's included?", "Content strategy"],
  },
  {
    id: "integrations",
    keywords: ["integration", "connect", "zapier", "workflow", "tool", "api", "compatible"],
    answer: "We integrate with your existing stack — email (Mailchimp, ConvertKit, Beehiiv), scheduling (Calendly, Savvycal), payments (Stripe, Whop), CRM, and the social APIs. In Scale Your Software we can build native integrations directly into your platform.",
    suggest: ["Scale Your Software", "Tech stack", "What's included?"],
  },
  {
    id: "results",
    keywords: ["result", "case", "proof", "testimonial", "portfolio"],
    answer: "We share specific case studies on the strategy call — picked from creators in a niche close to yours so the benchmarks are actually useful. We avoid public shotgun screenshots because Tier 5 is high-touch and private.",
    suggest: ["Who is Tier 5 for?", "Book a call", "90-day timeline"],
  },
  {
    id: "team",
    keywords: ["team", "founder", "behind"],
    answer: "Oravini is built by operators who've scaled their own content + offers, plus engineers, content strategists, and designers. You'll meet the exact humans working on your account on the strategy call — no middle-manager shuffle.",
    suggest: ["Support", "Book a call", "Results"],
  },
  {
    id: "vs_tier4",
    keywords: ["tier", "pro", "upgrade", "difference"],
    answer: "Tier 4 (Pro) gives you the Oravini platform + tools to execute yourself. Tier 5 gives you the team executing WITH you — strategy, weekly calls, direct access, and done-with-you content. Scale Your Software is another level on top: we build you a custom platform.",
    suggest: ["What's included?", "Scale Your Software", "Pricing"],
  },
  {
    id: "vs_agency",
    keywords: ["agency", "freelancer"],
    answer: "Agencies post content FOR you and disappear. We build the system WITH you so you own the engine. Plus you get the Oravini AI stack, your own platform option, and a team that actually understands creator monetization — not just posting schedules.",
    suggest: ["What's included?", "Scale Your Software", "Book a call"],
  },
  {
    id: "vs_diy",
    keywords: ["diy", "self"],
    answer: "You can absolutely DIY. The question is how long it takes to figure out positioning, hooks, monetization, and automation — and how much revenue you leave on the table while learning. Tier 5 compresses 12–18 months of trial and error into 90 days of executed strategy.",
    suggest: ["Results", "Pricing", "Book a call"],
  },
  {
    id: "human",
    keywords: ["human", "real", "talk", "speak", "someone", "representative"],
    answer: "Easy — book a 30-min strategy call with the actual team. No bots, no pitch, just a direct conversation about your growth.",
    suggest: ["Book now"],
    cta: "strategy",
  },
  {
    id: "measure",
    keywords: ["measure", "kpi", "metric", "track", "report"],
    answer: "We track what moves revenue: reach/impressions, profile visits, qualified leads, email opt-ins, sales conversion, and revenue per content pillar. You get a weekly snapshot plus a monthly strategic review — no vanity metrics buried in a dashboard.",
    suggest: ["90-day timeline", "Results", "Book a call"],
  },
  {
    id: "reporting",
    keywords: ["report", "dashboard", "visibility"],
    answer: "Reporting is lightweight and actionable: a weekly performance snapshot, a monthly strategic review, and always-on dashboards inside your Oravini workspace. In Scale Your Software you can bake the dashboards directly into your own platform.",
    suggest: ["Measure success", "What's included?", "Book a call"],
  },
  {
    id: "privacy",
    keywords: ["privacy", "data", "gdpr"],
    answer: "Your data, audience contacts, and platform content are yours — not shared, not resold. Scale Your Software clients own the database end-to-end. Standard data handling practices for any platform integration; we sign NDAs on request.",
    suggest: ["Security", "Ownership", "Book a call"],
  },
  {
    id: "security",
    keywords: ["security", "secure", "encryption"],
    answer: "Platforms we build use industry-standard security: encrypted transit + at-rest, hashed credentials, role-based access, and cloud infra with 99.9%+ uptime. Specifics are matched to what your platform does on the strategy call.",
    suggest: ["Privacy", "Tech stack", "Scale Your Software"],
  },
  {
    id: "country",
    keywords: ["country", "international", "remote", "language"],
    answer: "We work with clients globally — remote-first, async-friendly. Primary operating language is English but we can run in a client's native language for their audience-facing work. Time zones handled through async Looms + weekly scheduled calls.",
    suggest: ["Support", "Book a call", "Weekend support"],
  },
  {
    id: "hours",
    keywords: ["weekend", "hours", "timezone", "available", "24"],
    answer: "Weekly calls during business hours in your time zone; async support through your dashboard 7 days a week. Scale Your Software build teams can run urgent work outside hours when needed — we're not a 9-to-5 shop.",
    suggest: ["Support", "Response time", "Country"],
  },
  {
    id: "partnership",
    keywords: ["partnership", "partner", "equity", "collaborate"],
    answer: "Rare cases we'll take equity or rev-share instead of flat fees — usually when the creator has a strong brand but wants to conserve cash to scale faster. It's a conversation, not a default. Bring it up on the strategy call.",
    suggest: ["Pricing", "Contract", "Book a call"],
  },
  {
    id: "thanks",
    keywords: ["thanks", "thank", "appreciate", "cheers", "ty"],
    answer: "Anytime. If you want to go deep, the strategy call is the fastest path.",
    suggest: ["Book a call", "What's included?", "Scale Your Software"],
  },
  {
    id: "bye",
    keywords: ["bye", "goodbye", "later", "catch"],
    answer: "Later. Hit the Book a Call button whenever you're ready to move.",
    suggest: ["Book a call"],
  },
];

// Build index: canonical keyword -> topic
type MatchResult = { topic: BotTopic; score: number };

function matchTopics(input: string): MatchResult[] {
  const tokens = tokenize(input);
  if (!tokens.length) return [];

  // Score every topic
  const scores = new Map<string, number>();
  for (const topic of BOT_TOPICS) {
    let score = 0;
    const matchedKeywords = new Set<string>();
    for (const tok of tokens) {
      for (const kw of topic.keywords) {
        if (matchedKeywords.has(kw)) continue;
        // Exact match
        if (tok === kw) {
          score += 3 * (topic.weight ?? 1);
          matchedKeywords.add(kw);
          continue;
        }
        // Typo tolerance on keywords length >= 5
        if (kw.length >= 5 && tok.length >= 4) {
          const dist = lev(tok, kw);
          if (dist === 1) {
            score += 2 * (topic.weight ?? 1);
            matchedKeywords.add(kw);
          } else if (dist === 2 && kw.length >= 7) {
            score += 1 * (topic.weight ?? 1);
            matchedKeywords.add(kw);
          }
        }
      }
    }
    if (score > 0) scores.set(topic.id, score);
  }

  const sorted = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, score]) => ({ topic: BOT_TOPICS.find(t => t.id === id)!, score }));

  return sorted;
}

const FALLBACK_TOPIC: BotTopic = {
  id: "fallback",
  keywords: [],
  answer: "Great question — that one's best answered live. Book a free 30-min strategy call and the team will walk you through it. Or pick a topic below and I'll dig in.",
  suggest: ["Pricing", "What's included?", "Scale Your Software", "90-day timeline", "Book a call"],
  cta: "strategy",
};


/* ───────────────────────────────────────────────────────────
   Chatbot UI
─────────────────────────────────────────────────────────── */
type Msg = { from: "bot" | "user"; text: string; suggest?: string[]; cta?: "strategy" | "calendly" | null };

function Chatbot({ onBookStrategy }: { onBookStrategy: () => void }) {
  const [open, setOpen] = useState(false);
  const [showBadge, setShowBadge] = useState(true);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      from: "bot",
      text: "Hey 👋 I'm your Tier 5 assistant. Ask me anything — pricing, what's included, Scale Your Software, timelines, anything.",
      suggest: ["What's included?", "Pricing", "Scale Your Software", "Who is this for?"],
    },
  ]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lastTopicRef = useRef<string | null>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
  }, [msgs, typing, open]);

  useEffect(() => {
    const t = setTimeout(() => setShowBadge(false), 12000);
    return () => clearTimeout(t);
  }, []);

  const respond = (text: string): { answer: string; suggest?: string[]; cta?: "strategy" | "calendly" | null } => {
    const textLower = text.toLowerCase();

    // Follow-up resolution — "what about that", "tell me more", etc.
    const isFollowUp =
      /^(and |so |but |what about|tell me more|more about|for (that|it|those)|about (that|it)|more|expand|elaborate|details?\??)/i.test(text.trim()) ||
      textLower.length < 14;
    const topics = matchTopics(text);
    let primary: BotTopic | null = null;

    if (topics.length === 0 && isFollowUp && lastTopicRef.current) {
      primary = BOT_TOPICS.find(t => t.id === lastTopicRef.current) || null;
    } else if (topics.length > 0) {
      primary = topics[0].topic;
    }

    if (!primary) return { answer: FALLBACK_TOPIC.answer, suggest: FALLBACK_TOPIC.suggest, cta: FALLBACK_TOPIC.cta };

    // Multi-topic handling: if two topics scored close enough, merge both
    let answer = primary.answer;
    let suggest = primary.suggest;
    let cta = primary.cta ?? null;

    if (topics.length >= 2 && topics[1].score >= topics[0].score * 0.6 && topics[0].topic.id !== topics[1].topic.id) {
      const second = topics[1].topic;
      answer = `${primary.answer}\n\nAlso on ${second.id.replace(/_/g, " ")}: ${second.answer}`;
      suggest = Array.from(new Set([...(primary.suggest || []), ...(second.suggest || [])])).slice(0, 4);
      cta = primary.cta ?? second.cta ?? null;
    }

    lastTopicRef.current = primary.id;
    return { answer, suggest, cta };
  };

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    setMsgs(m => [...m, { from: "user", text }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const r = respond(text);
      setTyping(false);
      setMsgs(m => [...m, { from: "bot", text: r.answer, suggest: r.suggest, cta: r.cta ?? null }]);
    }, 520 + Math.min(text.length * 12, 700));
  };

  return (
    <>
      {/* Toggle button */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 7000, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
        {showBadge && !open && (
          <div style={{ background: "#080808", border: `1px solid ${GOLD}33`, borderRadius: 12, padding: "10px 14px", fontSize: 12.5, color: "rgba(255,255,255,0.8)", boxShadow: "0 12px 40px rgba(0,0,0,0.6)", maxWidth: 230, animation: "bvFadeIn 0.5s ease" }}>
            Ask me anything about Tier 5 👋
          </div>
        )}
        <button
          onClick={() => { setOpen(o => !o); setShowBadge(false); }}
          aria-label="Open chat"
          style={{
            width: 58, height: 58, borderRadius: 999, border: "none", cursor: "pointer",
            background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`,
            color: "#000", fontSize: 24, fontWeight: 900,
            boxShadow: "0 12px 40px rgba(212,180,97,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform 0.25s",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          {open ? "×" : "💬"}
        </button>
      </div>

      {/* Panel */}
      {open && (
        <div
          className="bv-chatbot-panel"
          style={{
            position: "fixed", bottom: 96, right: 24, zIndex: 7001,
            width: "min(380px, calc(100vw - 32px))", height: "min(560px, calc(100vh - 140px))",
            background: "#080808", border: `1px solid ${GOLD}33`, borderRadius: 20,
            display: "flex", flexDirection: "column", overflow: "hidden",
            boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,180,97,0.06)",
            animation: "bvFadeIn 0.25s ease",
          }}
        >
          {/* Header */}
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${GOLD}18`, display: "flex", alignItems: "center", gap: 12, background: "linear-gradient(180deg, rgba(212,180,97,0.06), transparent)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: 900, fontSize: 16 }}>O</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Oravini Assistant</div>
              <div style={{ fontSize: 11, color: GOLD, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
                Online — trained on Tier 5
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", fontSize: 20, cursor: "pointer" }}>×</button>
          </div>

          {/* Messages */}
          <div ref={scrollerRef} style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.from === "user" ? "flex-end" : "flex-start", gap: 8 }}>
                <div
                  style={{
                    maxWidth: "88%",
                    background: m.from === "user" ? `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})` : "rgba(255,255,255,0.04)",
                    color: m.from === "user" ? "#000" : "rgba(255,255,255,0.9)",
                    border: m.from === "user" ? "none" : `1px solid ${GOLD}18`,
                    borderRadius: 14,
                    padding: "10px 13px",
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    fontWeight: m.from === "user" ? 700 : 500,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.text}
                </div>
                {m.from === "bot" && m.cta === "strategy" && (
                  <button
                    onClick={onBookStrategy}
                    style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}55`, color: GOLD, fontSize: 12, fontWeight: 700, borderRadius: 10, padding: "8px 14px", cursor: "pointer" }}
                  >
                    Book a Strategy Call →
                  </button>
                )}
                {m.from === "bot" && m.suggest && m.suggest.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {m.suggest.map(s => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}22`, color: "rgba(255,255,255,0.7)", fontSize: 11.5, fontWeight: 600, borderRadius: 99, padding: "6px 12px", cursor: "pointer", transition: "all 0.2s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${GOLD}12`; e.currentTarget.style.color = GOLD; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}18`, borderRadius: 14, padding: "10px 14px", display: "flex", gap: 4 }}>
                <span className="bv-typing-dot" />
                <span className="bv-typing-dot" style={{ animationDelay: "0.15s" }} />
                <span className="bv-typing-dot" style={{ animationDelay: "0.3s" }} />
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={e => { e.preventDefault(); send(input); }}
            style={{ padding: "12px 14px", borderTop: `1px solid ${GOLD}18`, display: "flex", gap: 8, background: "rgba(0,0,0,0.4)" }}
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything about Tier 5..."
              style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}22`, borderRadius: 10, padding: "10px 13px", color: "#fff", fontSize: 13, outline: "none" }}
              onFocus={e => (e.currentTarget.style.borderColor = `${GOLD}66`)}
              onBlur={e => (e.currentTarget.style.borderColor = `${GOLD}22`)}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              style={{ background: input.trim() ? `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})` : "rgba(255,255,255,0.06)", color: input.trim() ? "#000" : "rgba(255,255,255,0.3)", border: "none", borderRadius: 10, padding: "0 14px", fontSize: 13, fontWeight: 800, cursor: input.trim() ? "pointer" : "default", transition: "all 0.2s" }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}


/* ───────────────────────────────────────────────────────────
   ROI Calculator
─────────────────────────────────────────────────────────── */
function formatMoney(n: number) {
  if (!isFinite(n) || n < 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${Math.round(n / 1000)}K`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function Slider({
  label, value, onChange, min, max, step, prefix = "", suffix = "",
}: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; prefix?: string; suffix?: string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: GOLD, fontVariantNumeric: "tabular-nums" }}>
          {prefix}{value.toLocaleString()}{suffix}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="bv-slider"
        style={{ width: "100%", background: `linear-gradient(to right, ${GOLD} 0%, ${GOLD} ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)` }}
      />
    </div>
  );
}

function ROICalculator({ onBookStrategy }: { onBookStrategy: () => void }) {
  const [revenue, setRevenue] = useState(15000);
  const [hours, setHours] = useState(30);
  const [rate, setRate] = useState(150);
  const [leads, setLeads] = useState(40);
  const [closeRate, setCloseRate] = useState(12);

  // Creator-focused assumptions:
  //   AI workers + automation save ~80% of manual hours
  //   Better content & funnel adds ~30% more qualified leads
  //   Positioning + offer work lifts close rate by ~25% relative
  const timeSavedValue = hours * 0.8 * 4.33 * rate;
  const extraLeads = leads * 0.3;
  const currentDeals = leads * (closeRate / 100);
  const newDeals = (leads + extraLeads) * ((closeRate * 1.25) / 100);
  const extraDeals = Math.max(0, newDeals - currentDeals);
  const avgDealValue = currentDeals > 0 ? revenue / currentDeals : revenue / 2;
  const extraRevenue = extraDeals * avgDealValue;
  const total = timeSavedValue + extraRevenue;
  const roiMultiplier = revenue > 0 ? total / (revenue * 0.1) : 0;

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}22`, borderRadius: 20, padding: "36px 32px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 44, alignItems: "start" }} className="bv-roi-grid">
        {/* Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: GOLD, fontWeight: 700 }}>Your Numbers</div>
          <Slider label="💰 Monthly revenue" value={revenue} onChange={setRevenue} min={0} max={200000} step={1000} prefix="$" />
          <Slider label="⏰ Hours/week on manual tasks" value={hours} onChange={setHours} min={0} max={80} step={1} suffix=" hrs" />
          <Slider label="💵 Your hourly rate" value={rate} onChange={setRate} min={25} max={1000} step={5} prefix="$" />
          <Slider label="📊 Monthly qualified leads" value={leads} onChange={setLeads} min={0} max={500} step={5} />
          <Slider label="📈 Current close rate" value={closeRate} onChange={setCloseRate} min={0} max={60} step={1} suffix="%" />
        </div>

        {/* Outputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, background: `linear-gradient(180deg, ${GOLD}12, transparent)`, border: `1px solid ${GOLD}33`, borderRadius: 16, padding: "28px 26px" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: GOLD, fontWeight: 700 }}>Projected Monthly Lift</div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>⏱ Time saved value</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{formatMoney(timeSavedValue)}</div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>📈 Extra revenue from leads + close rate</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{formatMoney(extraRevenue)}</div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "18px 0 6px" }}>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>Total monthly value</div>
            <div style={{ fontSize: 34, fontWeight: 900, color: GOLD, lineHeight: 1 }}>{formatMoney(total)}</div>
          </div>

          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
            Based on Tier 5 clients offloading ~80% of manual work, lifting qualified leads ~30%, and improving close rates ~25% via positioning + offer work. Real numbers depend on your niche and execution.
          </div>

          <button
            onClick={onBookStrategy}
            style={{ marginTop: 8, background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 14, border: "none", borderRadius: 12, padding: "13px 22px", cursor: "pointer" }}
          >
            Unlock This Lift — Book a Call →
          </button>
        </div>
      </div>
      <style>{`
        .bv-slider { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 99px; outline: none; }
        .bv-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 99px; background: ${GOLD_BRIGHT}; border: 2px solid #000; cursor: pointer; box-shadow: 0 0 12px ${GOLD}66; }
        .bv-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 99px; background: ${GOLD_BRIGHT}; border: 2px solid #000; cursor: pointer; box-shadow: 0 0 12px ${GOLD}66; }
        @media(max-width: 800px) { .bv-roi-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────
   90-Day Timeline with tabs
─────────────────────────────────────────────────────────── */
const TIMELINE: Record<"30" | "60" | "90", { heading: string; subhead: string; weeks: { label: string; title: string; body: string }[]; goals: string[] }> = {
  "30": {
    heading: "First 30 Days",
    subhead: "Foundation. Onboarding, audit, strategy locked, content machine live.",
    weeks: [
      { label: "Week 1", title: "Onboarding & Discovery", body: "Deep audit of your content, audience, and current offers. We map niche psychology, competitors, and revenue potential." },
      { label: "Week 2", title: "System Integration", body: "Platform access, AI workers tuned to your voice, integrations connected (email, scheduling, payments, social)." },
      { label: "Week 3", title: "Strategy Build & Training", body: "Content pillars locked in, hooks library built, posting cadence set. Team + tools trained on your playbook." },
      { label: "Week 4", title: "Go Live", body: "Content machine launches. Weekly calls kick off. Your feedback loop with the Oravini team is running." },
    ],
    goals: ["Niche positioning locked", "3–5 content pillars shipped", "First-month content machine live"],
  },
  "60": {
    heading: "Days 31–60",
    subhead: "Scale. Double down on what's working, kill what isn't, optimize conversion.",
    weeks: [
      { label: "Week 5–6", title: "Data Collection & Analysis", body: "Performance review across posts, profiles, and funnels. We isolate hook patterns, top content types, and conversion drop-offs." },
      { label: "Week 7–8", title: "Scale & Optimize", body: "3x content output via AI workers, funnel tightening, offer A/B testing, and audience segmentation for targeted messaging." },
    ],
    goals: ["3x content output", "~20% conversion lift", "Audience segmented & retargeted"],
  },
  "90": {
    heading: "Days 61–90",
    subhead: "Monetization. Stack revenue streams and turn content into a real business.",
    weeks: [
      { label: "Week 9–12", title: "Advanced Monetization", body: "Offer stacking (courses, coaching, community, brand deals), advanced automation for lead nurture and sales, and launch campaigns." },
      { label: "Week 13+", title: "Continuous Growth", body: "Repeatable monthly growth cadence. New offers, new distribution channels, new automation loops. This is where compounding kicks in." },
    ],
    goals: ["5x content throughput", "~30% more qualified leads", "~25% better close rate"],
  },
};

function Timeline() {
  const [tab, setTab] = useState<"30" | "60" | "90">("30");
  const data = TIMELINE[tab];
  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 36, flexWrap: "wrap" }}>
        {(["30", "60", "90"] as const).map(t => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: active ? `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})` : "rgba(255,255,255,0.03)",
                color: active ? "#000" : "rgba(255,255,255,0.7)",
                border: active ? "none" : `1px solid ${GOLD}22`,
                borderRadius: 99,
                padding: "10px 22px",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.2s",
                letterSpacing: "0.04em",
              }}
            >
              {t === "30" ? "First 30 Days" : t === "60" ? "Days 31–60" : "Days 61–90"}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div key={tab} style={{ animation: "bvFadeIn 0.35s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>{data.heading}</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>{data.subhead}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${data.weeks.length}, minmax(0, 1fr))`, gap: 16, marginBottom: 28 }} className="bv-timeline-grid">
          {data.weeks.map(w => (
            <div key={w.label} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}18`, borderRadius: 16, padding: "22px 22px", transition: "transform 0.3s, border-color 0.3s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.borderColor = `${GOLD}44`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.borderColor = `${GOLD}18`; }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: GOLD, background: `${GOLD}18`, display: "inline-block", padding: "3px 10px", borderRadius: 99, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>{w.label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 10 }}>{w.title}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{w.body}</div>
            </div>
          ))}
        </div>

        <div style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}33`, borderRadius: 14, padding: "18px 22px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase" }}>Milestones</div>
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
            {data.goals.map(g => (
              <div key={g} style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: GOLD }}>✦</span>{g}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width: 700px) { .bv-timeline-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────
   FAQ Accordion
─────────────────────────────────────────────────────────── */
const FAQS: { q: string; a: string }[] = [
  { q: "Who is Tier 5 for?", a: "Creators, influencers, consultants, and info-product sellers who already have some audience or clear direction and want a real growth system — not another course. If you're serious about scaling your offer and content engine, you're our person." },
  { q: "How is this different from the Pro plan (Tier 4)?", a: "Pro gives you the Oravini platform to execute yourself. Tier 5 gives you the team — strategy, weekly 1-on-1 calls, done-with-you content, and direct access. Scale Your Software adds a custom-built branded platform on top of that." },
  { q: "What happens on the strategy call?", a: "30 minutes, 1-on-1 with the team. We diagnose your content, audience, and offer live, then sketch a 90-day plan (and map Scale Your Software if it fits). Zero pitch — you leave with a roadmap either way." },
  { q: "Can I migrate from another platform or agency?", a: "Yes. Most Tier 5 clients come off an agency or a tangle of SaaS tools. We map the transition so nothing drops — content, audience data, integrations all move cleanly." },
  { q: "What integrations do you support?", a: "Email (Mailchimp, ConvertKit, Beehiiv), scheduling (Calendly, Savvycal), payments (Stripe, Whop), CRMs, and the social APIs. In Scale Your Software we build native integrations directly into your own platform." },
  { q: "Is there a contract?", a: "Tier 5 engagements are built for real results, not month-to-month churn. Exact length depends on whether you're on Tier 5 alone or the Scale Your Software track — we walk through the agreement transparently on the call." },
  { q: "How quickly can I get started?", a: "Fast. If we're a fit, onboarding starts within a week of the strategy call. Your 90-day plan kicks off Week 1 and your content machine is live by Week 4." },
  { q: "What kind of support do I get?", a: "A dedicated strategist, weekly calls, and direct team access through your Oravini dashboard — real humans, not tickets. Scale Your Software clients also get an assigned build team and ongoing dev support." },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${isOpen ? GOLD + "44" : GOLD + "14"}`, borderRadius: 14, overflow: "hidden", transition: "border-color 0.3s" }}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              style={{ width: "100%", background: "none", border: "none", color: "#fff", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontSize: 15, fontWeight: 700, textAlign: "left" }}
            >
              <span>{f.q}</span>
              <span style={{ color: GOLD, fontSize: 20, transform: isOpen ? "rotate(45deg)" : "none", transition: "transform 0.25s" }}>+</span>
            </button>
            <div style={{ maxHeight: isOpen ? 400 : 0, transition: "max-height 0.35s ease", overflow: "hidden" }}>
              <div style={{ padding: "0 22px 20px", fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.8 }}>{f.a}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function Brandverse() {
  const [, nav] = useLocation();
  const [showStrategy, setShowStrategy] = useState(false);
  useScrollAnim();
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const openStrategy = () => setShowStrategy(true);

  return (
    <div style={{ background: "#000", color: "#fff", fontFamily: "'Inter', system-ui, sans-serif", overflowX: "hidden", position: "relative", zIndex: 1 }}>
      <style>{`
        @keyframes bvPulse { 0%,100%{ box-shadow:0 0 0 0 rgba(212,180,97,0.3); } 70%{ box-shadow:0 0 0 18px rgba(212,180,97,0); } }
        @keyframes bvOrb1 { 0%,100%{ transform:translate(0,0); } 50%{ transform:translate(40px,-50px) scale(1.1); } }
        @keyframes bvOrb2 { 0%,100%{ transform:translate(0,0); } 60%{ transform:translate(-60px,40px) scale(0.9); } }
        @keyframes bvFadeIn { from{ opacity:0; transform:translateY(20px); } to{ opacity:1; transform:none; } }
        @keyframes bvTypingDot { 0%,80%,100%{ opacity:0.3; transform:translateY(0); } 40%{ opacity:1; transform:translateY(-3px); } }
        .bv-typing-dot { width:6px; height:6px; border-radius:99px; background:${GOLD}; display:inline-block; animation: bvTypingDot 1.1s infinite ease-in-out; }
      `}</style>

      {showStrategy && <StrategyModal onClose={() => setShowStrategy(false)} />}

      {/* Navbar */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(212,180,97,0.08)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => nav("/")} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer" }}>
            <img src={oraviniLogoPath} alt="Oravini" style={{ height: 38, width: 38, objectFit: "cover", objectPosition: "50% 32%", borderRadius: 7 }} />
          </button>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => nav("/login")} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, padding: "8px 18px", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}55`; e.currentTarget.style.color = GOLD; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}>
              Members Login
            </button>
            <button onClick={() => nav("/login?tab=register")} style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, border: "none", borderRadius: 8, color: "#000", fontSize: 13, fontWeight: 800, padding: "9px 20px", cursor: "pointer" }}>
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────── */}
      <section style={{ padding: "100px 24px 80px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,180,97,0.07) 0%, transparent 70%)", top: "-20%", left: "50%", transform: "translateX(-50%)", animation: "bvOrb1 14s ease-in-out infinite" }} />
          <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,180,97,0.05) 0%, transparent 70%)", bottom: "-10%", right: "-10%", animation: "bvOrb2 18s ease-in-out infinite" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(212,180,97,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(212,180,97,0.025) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />
        </div>
        <div style={{ position: "relative", zIndex: 1, animation: "bvFadeIn 0.8s ease 0.2s both" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.35em", color: GOLD, textTransform: "uppercase", marginBottom: 18 }}>The Team Behind Oravini</div>
          <h1 style={{ fontSize: "clamp(42px, 7vw, 88px)", fontWeight: 900, letterSpacing: "0.04em", background: `linear-gradient(135deg, ${GOLD_BRIGHT} 0%, ${GOLD} 50%, #b8962e 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 20, lineHeight: 0.95 }}>
            ORAVINI
          </h1>
          <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "rgba(255,255,255,0.5)", maxWidth: 640, margin: "0 auto 40px", lineHeight: 1.8 }}>
            We build complete growth ecosystems for influencers, consultants, and info product creators — content strategy, offer design, audience monetization, all done with you.
          </p>
          <button onClick={openStrategy} style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 16, border: "none", borderRadius: 12, padding: "16px 40px", cursor: "pointer", animation: "bvPulse 2.5s ease 2s infinite" }}>
            Book a Free Strategy Call →
          </button>
        </div>
      </section>

      {/* ── BEFORE / AFTER ─────────────────────────── */}
      <section style={{ padding: "80px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Anim style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>The Shift</div>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 46px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              From creator chaos to <span style={{ color: GOLD }}>a real content machine</span>
            </h2>
          </Anim>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }} className="bv-ba-grid">
            <Anim>
              <div style={{ background: "rgba(255,80,80,0.04)", border: "1px solid rgba(255,80,80,0.18)", borderRadius: 18, padding: "28px 28px", height: "100%" }}>
                <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#ff7777", fontWeight: 700, marginBottom: 14 }}>Before · Creator chaos</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 18 }}>Duct-taping SaaS tools together</div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    "Juggling Canva + CapCut + Later + ChatGPT + Notion every week",
                    "30+ hours/week on editing, scheduling, captions, and DMs",
                    "Generic hooks that don't match your audience psychology",
                    "Your content looks like everyone else's — no moat",
                    "Stuck inside whatever features the SaaS gave you",
                    "$500–$2,000/mo leaking to overlapping subscriptions",
                    "Can't scale without hiring a full team",
                    "Audience senses you're using off-the-shelf tools",
                  ].map(t => (
                    <li key={t} style={{ display: "flex", gap: 10, color: "rgba(255,255,255,0.7)", fontSize: 13.5, lineHeight: 1.6 }}>
                      <span style={{ color: "#ff7777", flexShrink: 0 }}>✕</span>{t}
                    </li>
                  ))}
                </ul>
              </div>
            </Anim>
            <Anim delay={120}>
              <div style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}33`, borderRadius: 18, padding: "28px 28px", height: "100%", boxShadow: `0 0 60px ${GOLD}10` }}>
                <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: GOLD, fontWeight: 700, marginBottom: 14 }}>After · With Oravini</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 18 }}>One system built around YOUR brand</div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    "One unified creator OS — all 9 Oravini AI tools in one place",
                    "AI workers run ~80% of content, scheduling, and analytics",
                    "Custom hooks + pillars mapped to your niche and voice",
                    "Content system + offer positioning = a real competitive moat",
                    "Unlimited scope — we build what your strategy needs",
                    "One clean integrated platform replaces the SaaS stack",
                    "Scale output 10x without hiring an in-house team",
                    "Scale Your Software: your own branded platform on top",
                  ].map(t => (
                    <li key={t} style={{ display: "flex", gap: 10, color: "rgba(255,255,255,0.85)", fontSize: 13.5, lineHeight: 1.6 }}>
                      <span style={{ color: GOLD, flexShrink: 0 }}>✓</span>{t}
                    </li>
                  ))}
                </ul>
              </div>
            </Anim>
          </div>
          <style>{`@media(max-width:800px){ .bv-ba-grid{ grid-template-columns:1fr !important; } }`}</style>
        </div>
      </section>

      {/* ── WHAT IS ORAVINI ─────────────────────────── */}
      <section style={{ padding: "80px 24px", maxWidth: 900, margin: "0 auto" }}>
        <Anim style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>Our Mission</div>
          <h2 style={{ fontSize: "clamp(28px, 4.5vw, 50px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            We scale <span style={{ color: GOLD }}>info products, consulting & coaching offers.</span>
          </h2>
        </Anim>
        <Anim delay={100}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }} className="bv-mission-grid">
            <div>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", lineHeight: 1.85, marginBottom: 20 }}>
                Oravini is the growth partner for influencers, consultants, and info product creators who are serious about turning their audience into a real business. We built Oravini — a suite of AI-powered tools — so every client we work with has an unfair advantage.
              </p>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", lineHeight: 1.85 }}>
                Whether you're launching a coaching offer, selling a course, or scaling a consulting brand — we combine content strategy, offer positioning, and audience psychology into one done-with-you system that actually moves numbers.
              </p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(212,180,97,0.12)", borderRadius: 20, padding: "36px 32px" }}>
              {[
                { icon: "🎯", label: "Full-Stack Growth", desc: "Content + Offer + Monetization — built together, not in isolation" },
                { icon: "🤝", label: "Done With You", desc: "Not courses or PDFs — we execute alongside you every step" },
                { icon: "📱", label: "Platform-First", desc: "Built for where your audience actually lives and converts" },
              ].map(({ icon, label, desc }) => (
                <div key={label} style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 22 }}>
                  <div style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: GOLD, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <style>{`@media(max-width:700px){ .bv-mission-grid{ grid-template-columns:1fr !important; } }`}</style>
        </Anim>
      </section>

      {/* ── VSL ─────────────────────────── */}
      <section style={{ padding: "40px 24px 80px" }}>
        <Anim>
          <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}22`, borderRadius: 24, overflow: "hidden", aspectRatio: "16/9", maxWidth: 860, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(212,180,97,0.08) 0%, transparent 60%)" }} />
            <div style={{ textAlign: "center", zIndex: 1 }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: `${GOLD}22`, border: `2px solid ${GOLD}55`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 30, cursor: "pointer", animation: "bvPulse 2.5s ease-in-out infinite" }}>▶</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>The Oravini Story</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>Video coming soon</div>
            </div>
          </div>
        </Anim>
      </section>

      {/* ── STATS ─────────────────────────── */}
      <section style={{ padding: "60px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(212,180,97,0.02)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 28, textAlign: "center" }}>
          {[
            { v: "10×", l: "Content output without hiring" },
            { v: "80%", l: "Tasks automated by AI workers" },
            { v: "90 days", l: "From discovery to live machine" },
            { v: "100%", l: "Your brand, your platform" },
          ].map((s, i) => (
            <Anim key={s.l} delay={i * 80}>
              <div style={{ padding: "14px 10px" }}>
                <div style={{ fontSize: "clamp(32px, 5vw, 54px)", fontWeight: 900, color: GOLD, lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 10 }}>{s.v}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>{s.l}</div>
              </div>
            </Anim>
          ))}
        </div>
      </section>


      {/* ── WHAT YOU GET (6 features) ─────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "rgba(212,180,97,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Anim style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-block", fontSize: 10, fontWeight: 800, color: "#000", background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, borderRadius: 99, padding: "4px 14px", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Tier 5 — Done With You</div>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 48px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              What you get when you<br /><span style={{ color: GOLD }}>work with Oravini</span>
            </h2>
          </Anim>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
            {[
              { icon: "🎯", title: "Custom Growth Strategy", desc: "We audit your current presence, map your audience psychology, and build a 90-day content roadmap designed around your specific niche and revenue goals.", tag: "Week 1" },
              { icon: "🤝", title: "Done-With-You Execution", desc: "You're not handed a PDF and left alone. We work alongside you every step of the way — from scripting hooks to reviewing your content calendar weekly.", tag: "Ongoing" },
              { icon: "📞", title: "Weekly Strategy Calls", desc: "Dedicated 1-on-1 calls with your Oravini strategist to review performance, adjust the plan, and keep momentum going.", tag: "Weekly" },
              { icon: "🛡️", title: "Offer & Funnel Strategy", desc: "We help you design and position your core offer — whether it's a course, coaching program, or consulting package — for maximum conversion.", tag: "Strategy" },
              { icon: "⚡", title: "Full Platform Access", desc: "Unlimited access to all 9 AI tools in Oravini — content ideas, competitor intelligence, design studio, audience mapping, auto-posting, and more.", tag: "Unlimited" },
              { icon: "📱", title: "Direct Team Access", desc: "Message the Oravini team directly through your Oravini dashboard. Real people, real answers — not a ticket system.", tag: "Always On" },
            ].map(({ icon, title, desc, tag }, i) => (
              <Anim key={title} delay={i * 70}>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(212,180,97,0.12)", borderRadius: 18, padding: "30px 26px", height: "100%", transition: "transform 0.3s, border-color 0.3s", position: "relative" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.borderColor = `${GOLD}33`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(212,180,97,0.12)"; }}>
                  <div style={{ position: "absolute", top: 16, right: 16, fontSize: 9, fontWeight: 700, color: GOLD, background: `${GOLD}18`, border: `1px solid ${GOLD}33`, borderRadius: 99, padding: "2px 8px", letterSpacing: "0.08em", textTransform: "uppercase" }}>{tag}</div>
                  <div style={{ fontSize: 30, marginBottom: 14 }}>{icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{title}</div>
                  <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.75 }}>{desc}</div>
                </div>
              </Anim>
            ))}
          </div>
        </div>
      </section>

      {/* ── 90 DAY TIMELINE ─────────────────────────── */}
      <section style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Anim style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>Roadmap</div>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 46px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              Your first <span style={{ color: GOLD }}>90 days</span>, mapped
            </h2>
          </Anim>
          <Anim delay={120}>
            <Timeline />
          </Anim>
        </div>
      </section>

      {/* ── PROCESS ─────────────────────────── */}
      <section style={{ padding: "100px 24px", maxWidth: 900, margin: "0 auto" }}>
        <Anim style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>How It Works</div>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 46px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            From call to <span style={{ color: GOLD }}>content machine</span>
          </h2>
        </Anim>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            { step: "01", title: "Free Strategy Call", desc: "We start with a 30-minute deep dive into your niche, audience, and goals. No pitch — just a real diagnosis of where you are and where you can go." },
            { step: "02", title: "Growth Audit & Mapping", desc: "We analyse your existing content, competitor landscape, and audience psychology to identify the fastest path to growth." },
            { step: "03", title: "System Build", desc: "We build your custom content system: hooks library, content pillars, posting schedule, and monetisation roadmap." },
            { step: "04", title: "Execute & Optimise", desc: "We work with you weekly — reviewing content, adjusting the strategy based on data, and pushing for consistent improvement." },
          ].map(({ step, title, desc }, i) => (
            <Anim key={step} delay={i * 80}>
              <div style={{ display: "flex", gap: 28, padding: "36px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: `${GOLD}30`, fontVariantNumeric: "tabular-nums", flexShrink: 0, lineHeight: 1.2 }}>{step}</div>
                <div>
                  <div style={{ fontSize: 19, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{title}</div>
                  <div style={{ fontSize: 14.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.8 }}>{desc}</div>
                </div>
              </div>
            </Anim>
          ))}
        </div>
      </section>

      {/* ── SCALE YOUR SOFTWARE ─────────────────────────── */}
      <section style={{ padding: "100px 24px", position: "relative", overflow: "hidden", background: `radial-gradient(ellipse 70% 60% at 50% 0%, ${GOLD}08 0%, transparent 70%)`, borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${GOLD}06 1px, transparent 1px), linear-gradient(90deg, ${GOLD}06 1px, transparent 1px)`, backgroundSize: "40px 40px", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <Anim style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ display: "inline-block", fontSize: 10, fontWeight: 800, color: "#000", background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, borderRadius: 99, padding: "4px 14px", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 18 }}>Premium Program · Tier 5 Add-On</div>
            <h2 style={{ fontSize: "clamp(30px, 5vw, 56px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.02em", marginBottom: 18 }}>
              Scale <span style={{ color: GOLD }}>Your Software</span>
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", maxWidth: 720, margin: "0 auto", lineHeight: 1.8 }}>
              For serious scalers. We build and scale a custom web app for your brand alongside the mentorship — your own platform, your own moat. 100% your branding, your domain, your logic. AI workers trained on your voice. Ongoing development driven by YOUR roadmap.
            </p>
          </Anim>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18, marginBottom: 44 }}>
            {[
              { icon: "🏗️", title: "Custom-Built Platform", desc: "Your community, course hub, coaching portal, or content OS — shipped under your brand, not ours." },
              { icon: "🤖", title: "AI Workers", desc: "Trained on your voice, offers, and methodology. Not a generic chatbot — your workforce." },
              { icon: "⚡", title: "Ongoing Development", desc: "Dedicated build team. Your roadmap, your priorities. Never stuck waiting on a SaaS release cycle." },
              { icon: "🎯", title: "Mentorship Attached", desc: "Weekly strategy calls run in lockstep with the build. Strategy and software scale together." },
            ].map((f, i) => (
              <Anim key={f.title} delay={i * 80}>
                <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}22`, borderRadius: 18, padding: "28px 24px", height: "100%", transition: "transform 0.3s, border-color 0.3s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.borderColor = `${GOLD}55`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.borderColor = `${GOLD}22`; }}>
                  <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 10 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{f.desc}</div>
                </div>
              </Anim>
            ))}
          </div>

          <Anim>
            <div style={{ background: `${GOLD}0a`, border: `1px solid ${GOLD}33`, borderRadius: 20, padding: "30px 36px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
              <div style={{ maxWidth: 560 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>Application Only</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Want us to build your platform?</div>
                <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>
                  Scope, timeline, and investment are custom. We discuss it transparently on your strategy call — no pitch, just scoping.
                </div>
              </div>
              <button onClick={openStrategy} style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 15, border: "none", borderRadius: 12, padding: "15px 32px", cursor: "pointer", whiteSpace: "nowrap" }}>
                Bring It Up On Your Call →
              </button>
            </div>
          </Anim>
        </div>
      </section>

      {/* ── COMPARISON TABLE ─────────────────────────── */}
      <section style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Anim style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>Generic SaaS vs Your Custom Platform</div>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 46px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              Why creators switch to <span style={{ color: GOLD }}>Oravini</span>
            </h2>
          </Anim>
          <Anim delay={120}>
            <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}22`, borderRadius: 20, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", background: `${GOLD}10`, borderBottom: `1px solid ${GOLD}22` }}>
                <div style={{ padding: "18px 22px", fontSize: 12, fontWeight: 800, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase" }}> </div>
                <div style={{ padding: "18px 22px", fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Generic Creator SaaS</div>
                <div style={{ padding: "18px 22px", fontSize: 12, fontWeight: 800, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase" }}>Oravini + Scale Your Software</div>
              </div>
              {[
                ["Platform type", "Shared SaaS for everyone", "Built for YOU"],
                ["Branding", "Their brand, their logo", "100% your brand"],
                ["Features", "What they decided to ship", "What YOU actually need"],
                ["AI workers", "Generic chatbot", "Trained on your voice + offers"],
                ["Automation", "Pre-built templates", "Custom to your processes"],
                ["Scalability", "Limited by their roadmap", "Unlimited — you own the roadmap"],
                ["Competitive advantage", "None — everyone uses it", "Proprietary tech = real moat"],
                ["Ongoing development", "Their release cycle", "YOUR roadmap, your priorities"],
                ["Audience perception", "Using off-the-shelf tools", "YOU built this — premium signal"],
                ["Best for", "Getting started", "Serious scaling + exit-ready asset"],
              ].map((row, i) => (
                <div key={row[0]} style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", borderBottom: i < 9 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div style={{ padding: "16px 22px", fontSize: 13.5, color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>{row[0]}</div>
                  <div style={{ padding: "16px 22px", fontSize: 13, color: "rgba(255,255,255,0.45)" }}>{row[1]}</div>
                  <div style={{ padding: "16px 22px", fontSize: 13, color: GOLD, fontWeight: 600 }}>{row[2]}</div>
                </div>
              ))}
            </div>
            <style>{`
              @media(max-width:800px) {
                .bv-compare-row, .bv-compare-header { grid-template-columns: 1fr !important; }
              }
            `}</style>
          </Anim>
        </div>
      </section>

      {/* ── ROI CALCULATOR ─────────────────────────── */}
      <section style={{ padding: "100px 24px", background: "rgba(212,180,97,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Anim style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>ROI Calculator</div>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 46px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 14 }}>
              See your <span style={{ color: GOLD }}>monthly lift</span>
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
              Drop in your real numbers. We'll show the realistic monthly value of automating manual work, lifting leads, and closing at a higher rate.
            </p>
          </Anim>
          <Anim delay={120}>
            <ROICalculator onBookStrategy={openStrategy} />
          </Anim>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────── */}
      <section style={{ padding: "100px 24px", maxWidth: 820, margin: "0 auto" }}>
        <Anim style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>FAQ</div>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 46px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            The <span style={{ color: GOLD }}>real questions</span>, answered
          </h2>
        </Anim>
        <Anim delay={100}>
          <FAQ />
        </Anim>
      </section>

      {/* ── CTA ─────────────────────────── */}
      <section style={{ padding: "100px 24px", textAlign: "center", background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(212,180,97,0.06) 0%, transparent 70%)" }}>
        <Anim>
          <div style={{ fontSize: 11, letterSpacing: "0.35em", color: GOLD, textTransform: "uppercase", marginBottom: 16 }}>Limited Spots Available</div>
        </Anim>
        <Anim delay={100}>
          <h2 style={{ fontSize: "clamp(30px, 5vw, 60px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 18 }}>
            Ready to build your<br /><span style={{ color: GOLD }}>content empire?</span>
          </h2>
        </Anim>
        <Anim delay={200}>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", marginBottom: 40, maxWidth: 480, margin: "0 auto 40px", lineHeight: 1.7 }}>
            We only take a limited number of Tier 5 clients per month. If you're serious about growth, book a call and let's see if we're a fit.
          </p>
        </Anim>
        <Anim delay={300}>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={openStrategy} style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 16, border: "none", borderRadius: 12, padding: "17px 44px", cursor: "pointer", boxShadow: `0 0 60px rgba(212,180,97,0.2)` }}>
              Book a Free Strategy Call →
            </button>
            <button onClick={() => nav("/login?tab=register&redirect=audit")} style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)", fontWeight: 600, fontSize: 15, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "17px 32px", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}55`; e.currentTarget.style.color = GOLD; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}>
              Get My Free Audit First →
            </button>
          </div>
        </Anim>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "36px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={oraviniLogoPath} alt="Oravini" style={{ height: 28, width: 28, objectFit: "cover", objectPosition: "50% 32%", borderRadius: 5 }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Powered by Oravini</span>
          </div>
          <button onClick={() => nav("/")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 13, cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
            ← Back to Oravini
          </button>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>© 2026 Oravini. All rights reserved.</div>
        </div>
      </footer>

      {/* Floating Chatbot */}
      <Chatbot onBookStrategy={openStrategy} />
    </div>
  );
}
