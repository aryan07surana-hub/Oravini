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
  {
    slug: "how-to-make-money-with-webinars",
    title: "How to Make Money with Webinars: A Practical Guide for Creators | Oravini Blog",
    description:
      "How creators and coaches make money with webinars: pick the right offer, fill the room, pitch without pressure and follow up. A step-by-step guide with no hype.",
    h1: "How to Make Money with Webinars",
    datePublished: "2026-11-27",
    readingTime: "6 min read",
    intro:
      "Webinars make money in one way: they put a clear offer in front of people who already want what you teach, for long enough that they trust you. The tools matter less than that. Here is how creators and coaches turn a one-hour session into revenue, in the order the work actually happens.",
    sections: [
      {
        heading: "Start with the offer, not the topic",
        paragraphs: [
          "Most failed webinars begin with a topic the host likes. Profitable ones begin with an offer that already sells in smaller conversations, such as a coaching program, a course, a done-with-you service or a paid community. Write the offer in one sentence and the buyer it is for. Then pick the webinar topic that makes that buyer say, I need the thing you are about to sell me.",
          "A good test: if a viewer finished the webinar and bought nothing, would they still have learned something real? If yes, you have a topic. If the webinar only works as a pitch, people can tell.",
        ],
      },
      {
        heading: "Pick a format that fits how you sell",
        paragraphs: [
          "A live session lets you answer questions and read the room, and it adds urgency because the pitch happens once. A recorded or evergreen session lets you reuse your best performance every week, but loses the live back-and-forth. Many creators run it live until the pitch is working, then keep the replay running behind a registration page.",
          "Do not rebuild your whole business around a format. Run the live version four or five times, note which questions come up, and fix the slides before you record anything.",
        ],
      },
      {
        heading: "Get the right people into the room",
        paragraphs: [
          "Ten warm people beat a hundred cold ones. Your best sources are the places where people already raise their hand: comments on posts, DMs, your email list and a clear link in your bio. A comment-to-DM trigger that sends the registration link to everyone who comments a keyword is one of the simplest ways to turn attention into signups.",
          "Keep the registration page short. A name, an email, the date and one line on what they will walk away with is enough. Tag each signup with where it came from so you learn which post filled the room.",
        ],
      },
      {
        heading: "Pitch once, clearly, and tell them what happens next",
        paragraphs: [
          "People do not mind being sold to. They mind being surprised by it. Say at the start that you will share how you work with clients at the end, then teach properly and make the pitch when you said you would. Cover who the offer is for, who it is not for, what they get and how to join.",
          "Put the buy or booking link where viewers can click it the moment you finish speaking. A link they have to type from memory loses most of the room.",
        ],
      },
      {
        heading: "Follow up like the session never ended",
        paragraphs: [
          "Most sales from a webinar do not happen in the room. They happen in the next two days. Send the replay to people who missed it, send the offer again to people who stayed but did not buy, and reach out personally to anyone who clicked the offer. Treat these as three different groups.",
          "This is where tracking pays off. If your platform records who registered, how long they watched and who clicked, you can follow up with the people who showed interest and skip the rest. Oravini keeps the webinar, the replay and the CRM together for exactly this reason.",
        ],
      },
      {
        heading: "Measure four numbers and fix one at a time",
        paragraphs: [
          "Track registration rate on your page, show rate, how long people stay and how many click the offer. When sales are low, one of those is the leak. Low show rate points to reminders and timing. A drop-off in the first fifteen minutes points to your opening. Plenty of clicks with few sales points to the offer or the checkout page.",
        ],
      },
    ],
    related: [
      { href: "/blog/how-to-structure-a-webinar-that-sells", label: "How to structure a webinar that sells" },
      { href: "/blog/how-to-increase-webinar-attendance", label: "How to increase webinar attendance" },
      { href: "/webinar-platform", label: "Oravini's webinar platform" },
    ],
  },
  {
    slug: "how-to-structure-a-webinar-that-sells",
    title: "How to Structure a Webinar That Sells: A Section-by-Section Outline | Oravini Blog",
    description:
      "A section-by-section structure for a webinar that sells: the opening, the teaching, the transition, the offer and the Q&A, with timing for a 60 to 75 minute session.",
    h1: "How to Structure a Webinar That Sells",
    datePublished: "2026-11-27",
    readingTime: "6 min read",
    intro:
      "A webinar that sells has a simple shape: earn attention, teach something useful, show how your offer is the next step, then make it easy to say yes. The details change by niche, but the order rarely does. Below is a structure you can adapt for a 60 to 75 minute session, with rough timing for each part.",
    sections: [
      {
        heading: "The opening (first 5 minutes)",
        paragraphs: [
          "Say who the session is for and what they will leave with. Then tell them what will happen: you will teach for most of the hour, take questions and, near the end, explain how people can work with you. Saying this out loud removes the surprise from the pitch.",
          "Skip long introductions about yourself. One or two sentences of credibility that match the problem are enough. Viewers decide whether to stay in the first few minutes, so get to the point.",
        ],
      },
      {
        heading: "The teaching (about 30 minutes)",
        paragraphs: [
          "Teach three ideas, not ten. Each one should change how the viewer thinks about the problem and point at the thing your offer fixes. A framework with names and steps is easier to remember and easier to refer back to in the pitch.",
          "Use one real example per idea, ideally from a client or from your own work. Show the before, what changed and the result. If you cannot share results, share the process and what you would do in their position.",
        ],
      },
      {
        heading: "The transition (about 5 minutes)",
        paragraphs: [
          "This is the part most hosts skip. Summarize what the viewer now knows, then say the honest next problem: knowing the framework is not the same as doing it well. Some people will implement it alone. Some will want help. That sets up the offer without pressure.",
        ],
      },
      {
        heading: "The offer (10 to 15 minutes)",
        paragraphs: [
          "Explain what is included, who it is for, who should not join, what the first month looks like and how to start. Include proof that matches the buyer, such as a short client story or a result with context. Be specific about outcomes you can stand behind and do not invent urgency you cannot honor.",
          "If you use a timed offer button in the live room, show it when you start this section so viewers can click while you are still talking.",
        ],
      },
      {
        heading: "Q&A and the second ask (10 to 15 minutes)",
        paragraphs: [
          "Take questions from chat. Many of them are buying questions in disguise, such as whether the offer fits a specific situation. Answer honestly, including when the answer is that it is not a fit. Finish by repeating the next step and where the link is.",
        ],
      },
      {
        heading: "What to prepare around the session",
        paragraphs: [
          "The structure only works if the rest is in place: a registration page that matches the topic, reminders so people show up, a replay page that carries the same offer, and a CRM view of who watched and who clicked. Running those in one place, as Oravini does, means you spend the week after the session following up instead of exporting spreadsheets.",
        ],
      },
    ],
    related: [
      { href: "/blog/how-to-make-money-with-webinars", label: "How to make money with webinars" },
      { href: "/blog/how-to-increase-webinar-attendance", label: "How to increase webinar attendance" },
      { href: "/automated-webinar-platform", label: "Run an evergreen webinar funnel" },
    ],
  },
  {
    slug: "how-to-increase-webinar-attendance",
    title: "How to Increase Webinar Attendance: 9 Fixes for Low Show Rates | Oravini Blog",
    description:
      "Low webinar attendance usually comes from a few fixable problems: timing, reminders, a weak registration promise and no replay plan. Nine practical fixes for creators and coaches.",
    h1: "How to Increase Webinar Attendance",
    datePublished: "2026-11-27",
    readingTime: "5 min read",
    intro:
      "It is normal for a good share of registrants not to show up. People sign up with good intentions and then life gets in the way. You cannot get everyone, but most hosts leave a lot on the table. These nine fixes cover the usual causes, from the registration page to what you do after the session.",
    sections: [
      {
        heading: "Make the promise specific",
        paragraphs: [
          "People attend things that solve a concrete problem. Replace a vague title such as Grow your business with a specific outcome and audience, such as how coaches book five discovery calls a week from Instagram. A specific promise gives registrants a reason to protect the time.",
        ],
      },
      {
        heading: "Register people close to the date",
        paragraphs: [
          "The longer the gap between signing up and the session, the more registrants forget. For most creator audiences, a few days to a week works well. If you run recurring sessions, point new signups at the next one instead of one three weeks away.",
        ],
      },
      {
        heading: "Pick a time your audience can actually attend",
        paragraphs: [
          "Look at when your audience is online and choose a time that suits most of them. If your followers sit across time zones, show the start time in each person's own time zone on the registration page and in reminders, so nobody does the maths wrong.",
        ],
      },
      {
        heading: "Send reminders that add something",
        paragraphs: [
          "A reminder that only repeats the time is easy to ignore. Add a reason to come: a preview of one thing you will cover, a template they will get or a question you will answer. Remind people shortly before the start as well, since the final nudge is what gets people to click the link.",
          "Add a one-click calendar link right after registration. A calendar entry is the best reminder because it sits where people already look.",
        ],
      },
      {
        heading: "Use the channels where your audience already talks to you",
        paragraphs: [
          "Email is the baseline. If your audience lives on Instagram, a DM that sends the join link just before you start can reach people who skipped the email. Keep it short, personal in tone and sent only to people who registered or asked for it.",
        ],
      },
      {
        heading: "Make joining effortless",
        paragraphs: [
          "Every step between a reminder and the live room loses people. A single link that opens in the browser, with no app to install and no extra sign-in, helps a lot. Test it on a phone, since many viewers will join from one.",
        ],
      },
      {
        heading: "Start on time and give people a reason to stay",
        paragraphs: [
          "Open with the promise and one early win, so people who joined late or on a phone get value fast. Use chat questions and polls in the first ten minutes. People who take part in the opening tend to stay for the pitch.",
        ],
      },
      {
        heading: "Have a replay plan",
        paragraphs: [
          "Even with good habits, some registrants will miss it. Send the replay soon after the session ends and set a clear window to watch it. A replay page that carries the same offer means a missed session is a delayed sale instead of a lost one.",
        ],
      },
      {
        heading: "Track attendance by source",
        paragraphs: [
          "Not all signups are equal. Registrants from a DM or a personal invite often attend more than people from a cold ad. If your platform tags each registrant with their source and shows who attended, you can put more effort into the sources that fill the room. Oravini records the source and UTM tags for every registration and shows show rate and stay rate for each webinar.",
        ],
      },
    ],
    related: [
      { href: "/blog/how-to-make-money-with-webinars", label: "How to make money with webinars" },
      { href: "/blog/how-to-structure-a-webinar-that-sells", label: "How to structure a webinar that sells" },
      { href: "/comment-to-dm-automation", label: "Send your webinar link by comment-to-DM" },
    ],
  },
];
