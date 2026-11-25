// Blog content for oravini.com/blog. Pure data, no React imports, so the
// server (server/seoMeta.ts) and the prerender build can both read post
// metadata without pulling in component code. Rendering lives in
// blogPages.tsx.

export interface BlogSection {
  heading: string;
  paragraphs: string[];
}

export interface BlogLink {
  href: string;
  label: string;
}

export interface BlogPost {
  slug: string; // /blog/<slug>
  title: string; // <title> and og:title
  description: string; // meta description
  h1: string;
  datePublished: string; // ISO date
  readingTime: string;
  intro: string;
  sections: BlogSection[];
  related: BlogLink[]; // internal links shown at the end of the post
}

export const BLOG_INDEX_META = {
  title: "Oravini Blog: Instagram DM Automation, Webinars & Creator Growth",
  description:
    "Practical guides for creators and personal brands: Instagram DM automation, choosing a webinar platform, ManyChat alternatives and growing with AI tools.",
  canonical: "https://oravini.com/blog",
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-to-choose-manychat-alternative",
    title: "How to Choose a ManyChat Alternative in 2026: A Creator's Checklist | Oravini Blog",
    description:
      "A practical checklist for picking a ManyChat alternative: Instagram DM features, pricing model, extra channels and what happens to your data. Built for creators who sell with webinars and funnels.",
    h1: "How to Choose a ManyChat Alternative in 2026",
    datePublished: "2026-11-25",
    readingTime: "5 min read",
    intro:
      "ManyChat is often the first DM automation tool creators try, and plenty eventually look for an alternative. The reasons are usually the same: costs that scale with contacts, features locked behind tiers, and a tool that stops at the DM when your business runs on webinars, funnels and follow-up. Here is a checklist to evaluate any alternative before you switch.",
    sections: [
      {
        heading: "Start with the DM features you actually use",
        paragraphs: [
          "List what you rely on today: comment-to-DM triggers, keyword replies, story mention replies, welcome messages for new followers, or broadcast sequences. Any alternative worth switching to should cover your top three on day one, not on a roadmap.",
          "Check Instagram's official API limits too. Tools that promise unlimited everything usually hit the same platform caps, so judge them on reliability and deliverability instead of headline claims.",
        ],
      },
      {
        heading: "Look at how the price grows",
        paragraphs: [
          "Most DM tools price by contact count. That works until a viral post adds ten thousand contacts in a weekend and your bill jumps with it. Before switching, model the price at three times your current audience, not today's.",
          "Credit-based or flat plans are easier to predict. The question to ask: what does this cost me in my best month, not my worst?",
        ],
      },
      {
        heading: "Check what happens after the DM",
        paragraphs: [
          "A DM automation that captures a lead is step one. Step two is the webinar invite, the funnel page, the follow-up sequence and the sale. If your DM tool cannot do those, you will glue four tools together with Zapier and lose leads in the gaps.",
          "This is the main reason creators move to all-in-one platforms: the DM, the webinar registration, the replay and the CRM live in one place, so every conversation has somewhere to go.",
        ],
      },
      {
        heading: "Ask about your data before you migrate",
        paragraphs: [
          "Can you export your contacts and conversation history? Can you recreate your automations quickly, and is there migration help? A tool that makes leaving painful is betting you will stay for the wrong reason.",
        ],
      },
      {
        heading: "Where Oravini fits",
        paragraphs: [
          "Oravini combines Instagram DM automation with webinars, video hosting, funnels, CRM and AI content tools in one platform, with a free plan to test the waters. If your checklist ends at DMs, a dedicated tool may be enough. If it continues to webinars and funnels, an all-in-one will save you the glue work.",
        ],
      },
    ],
    related: [
      { href: "/manychat-alternative", label: "Oravini as a ManyChat alternative" },
      { href: "/vs/manychat", label: "Oravini vs ManyChat, feature by feature" },
      { href: "/instagram-dm-automation", label: "Instagram DM automation in Oravini" },
    ],
  },
  {
    slug: "instagram-dm-automation-guide",
    title: "Instagram DM Automation for Creators: A Practical Setup Guide | Oravini Blog",
    description:
      "Set up Instagram DM automation that converts without feeling robotic: comment-to-DM triggers, keyword replies, welcome messages and how to connect DMs to your webinar funnel.",
    h1: "Instagram DM Automation for Creators: A Practical Setup Guide",
    datePublished: "2026-11-25",
    readingTime: "6 min read",
    intro:
      "Every creator hits the same wall: a post takes off, hundreds of comments ask for the link, and manually replying means losing most of them. DM automation solves the volume problem, but done badly it feels like a bot and burns trust. This guide covers the setups that convert and the mistakes that get accounts muted.",
    sections: [
      {
        heading: "The three automations worth setting up first",
        paragraphs: [
          "Comment-to-DM: a follower comments a keyword like GUIDE or PRICE, and gets an instant DM with the link. This is the highest-converting automation most creators have, because the follower asked first.",
          "Keyword replies inside DMs: when someone messages you a word like WEBINAR, they get the registration link immediately, at 2am, without you touching the phone.",
          "Welcome messages for new followers: a short hello with one useful link. Keep it to two sentences. Anything longer reads like a pitch.",
        ],
      },
      {
        heading: "Write messages that sound like you",
        paragraphs: [
          "The difference between automation that converts and automation that annoys is voice. Write your automated messages the way you actually talk. Use the follower's first name, keep it short, and make the next step one tap.",
          "Avoid stacking questions in one message. One message, one ask. If they reply, your automation should hand the conversation to a sequence or to you, not fire another wall of text.",
        ],
      },
      {
        heading: "Connect the DM to somewhere that closes",
        paragraphs: [
          "A DM with a bare link wastes the moment. Send people to a page built for the next step: a webinar registration, a free resource with an email capture, or a booking page. Then track who clicked, who registered and who bought.",
          "In Oravini, DM automation connects directly to your webinars, funnels and CRM, so a comment on a reel can become a tracked webinar attendee without exporting a single CSV.",
        ],
      },
      {
        heading: "Stay inside Instagram's rules",
        paragraphs: [
          "Use a tool built on Instagram's official API. Browser bots and unofficial apps put your account at risk. Keep broadcasts relevant, make opting out easy, and do not message people who never engaged with you first.",
        ],
      },
    ],
    related: [
      { href: "/instagram-dm-automation", label: "Instagram DM automation in Oravini" },
      { href: "/webinar-platform", label: "The webinar platform your DMs should point to" },
      { href: "/manychat-alternative", label: "Oravini as a ManyChat alternative" },
    ],
  },
  {
    slug: "webinar-platform-guide",
    title: "What Creators Should Look For in a Webinar Platform in 2026 | Oravini Blog",
    description:
      "Registration pages, live room engagement, automatic replays and CRM tracking: the webinar platform features that actually move sales for creators and coaches, and the ones that are noise.",
    h1: "What Creators Should Look For in a Webinar Platform",
    datePublished: "2026-11-25",
    readingTime: "5 min read",
    intro:
      "For creators and coaches, a webinar is not a meeting. It is the sales floor. The platform you pick decides how many registrants show up, how long they stay and how many buy. Here is what matters, in order of impact.",
    sections: [
      {
        heading: "Registration that does not leak",
        paragraphs: [
          "Every extra field on a registration form costs you signups. Look for a platform with clean, fast registration pages you can brand, automatic confirmation and reminder emails, and one-click calendar adds. Reminders alone routinely decide whether show-up rates land at 25% or 45%.",
        ],
      },
      {
        heading: "A live room built for selling",
        paragraphs: [
          "Chat, Q&A and polls keep people watching, but the feature that pays is the timed offer: a buy button that appears when you make the pitch. If your platform cannot show an offer inside the room, you are asking viewers to remember a link until the stream ends. Most will not.",
          "Also check the basics under load: does video stay smooth with 500 attendees, and does it work on a phone browser without an app install?",
        ],
      },
      {
        heading: "Replays that keep selling",
        paragraphs: [
          "Half your audience will miss the live session. An automatic replay page, sent within an hour of the webinar ending, recovers a big share of those lost sales. Bonus points if the replay page can carry its own offer and expiry timer.",
        ],
      },
      {
        heading: "Every attendee in your CRM",
        paragraphs: [
          "The webinar is the middle of the funnel, not the end. You want every registrant, attendee, question-asker and buyer tagged in a CRM so follow-up emails and DMs go to the right people. A platform that exports a spreadsheet an hour later is already too slow; the hottest moment to follow up is right after the session.",
          "Oravini's webinar platform is built around exactly this loop: registration page, live room with chat, Q&A, polls and offers, automatic replays, and every attendee tracked in the same CRM that runs your DM automation and funnels.",
        ],
      },
    ],
    related: [
      { href: "/webinar-platform", label: "Oravini's webinar platform" },
      { href: "/instagram-dm-automation", label: "Fill your webinar room from Instagram DMs" },
      { href: "/vs/manychat", label: "Oravini vs ManyChat" },
    ],
  },
];
