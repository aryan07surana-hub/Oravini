export type TemplateSection = { type: string; data: Record<string, any> };

export type TemplateStep = {
  name: string;
  type: string;
  sections: TemplateSection[];
};

export type PageTemplate = {
  id: string;
  name: string;
  description: string;
  category: "funnel" | "page";
  subcategory: string;
  accent: string;
  emoji: string;
  stepCount: number;
  sectionCount: number;
  steps: TemplateStep[];
};

const hero = (headline: string, subheadline: string, ctaText: string, badge = ""): TemplateSection => ({
  type: "hero",
  data: { badge, headline, subheadline, ctaText },
});

const benefits = (title: string, items: string[]): TemplateSection => ({
  type: "benefits",
  data: { title, items },
});

const form = (formTitle: string, subtextOrButtonText: string, buttonTextOrFields?: string | string[], fields?: string[]): TemplateSection => {
  const hasSubtext = Array.isArray(buttonTextOrFields) || fields !== undefined;
  return {
    type: "form",
    data: {
      formTitle,
      formSubtext: hasSubtext ? subtextOrButtonText : "Enter your details for immediate access.",
      buttonText: hasSubtext ? (buttonTextOrFields as string) : subtextOrButtonText,
      fields: fields ?? (Array.isArray(buttonTextOrFields) ? buttonTextOrFields : ["name", "email"]),
    },
  };
};

const video = (caption: string, _description?: string): TemplateSection => ({
  type: "video",
  data: { videoUrl: "", caption },
});

const cta = (headline: string, ctaText: string, subtext = ""): TemplateSection => ({
  type: "cta",
  data: { headline, subtext, ctaText, ctaUrl: "" },
});

const countdown = (title = "This Offer Expires In", targetDate?: string): TemplateSection => ({
  type: "countdown",
  data: { countdownTitle: title, targetDate: targetDate ?? new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16) },
});

const pricing = (pricingTitle: string, price: string, original: string, features: string[], ctaText: string): TemplateSection => ({
  type: "pricing",
  data: { pricingTitle, price, originalPrice: original, pricingFeatures: features, ctaText },
});

const testimonials = (items: Array<{ name: string; role: string; quote: string }>): TemplateSection => ({
  type: "testimonials",
  data: { testimonials: items },
});

const bio = (name: string, role: string, bioText: string): TemplateSection => ({
  type: "bio",
  data: { name, role, bio: bioText },
});

const stats = (label: string, items: Array<{ number: string; desc: string }>): TemplateSection => ({
  type: "stats",
  data: { label, stats: items },
});

const press = (labelOrLogos: string | string[], logos?: string[]): TemplateSection => ({
  type: "press",
  data: { label: logos ? labelOrLogos as string : "AS SEEN IN", logos: logos ?? labelOrLogos as string[] },
});

const faq = (items: Array<{ question: string; answer: string }>): TemplateSection => ({
  type: "faq",
  data: { faqs: items },
});

const guarantee = (title = "30-Day Money-Back Guarantee", body = "If you're not completely satisfied within 30 days, we'll refund every penny. No questions asked.", badgeText = "100% Risk-Free"): TemplateSection => ({
  type: "guarantee",
  data: { title, body, badgeText },
});

const orderBump = (title: string, desc: string, bumpPrice: string, ctaText = "Yes! Add this to my order →"): TemplateSection => ({
  type: "order_bump",
  data: { title, description: desc, price: bumpPrice, ctaText },
});

const urgencyBar = (text: string, subtext = "Price increases when timer hits zero"): TemplateSection => ({
  type: "urgency_bar",
  data: { text, subtext },
});

const socialProof = (): TemplateSection => ({
  type: "social_proof_popup",
  data: { delay: 5, interval: 30, names: ["Sarah M.", "Mike R.", "Emma L.", "David K.", "Lisa P."], locations: ["New York", "California", "Texas", "Florida", "Ohio"], action: "just signed up" },
});

const stickyCta = (text: string, ctaText: string): TemplateSection => ({
  type: "sticky_cta",
  data: { text, ctaText, showAfterScroll: 400 },
});

const comparison = (title: string, headers: string[], rows: string[][]): TemplateSection => ({
  type: "comparison",
  data: { title, headers, rows },
});

const twoStepForm = (headline: string, buttonText = "Yes! Send Me Access →", formTitle = "Enter your details below", buttonText2 = "Get Instant Access →", fields = ["name", "email"]): TemplateSection => ({
  type: "two_step_form",
  data: { headline, buttonText, formTitle, buttonText2, fields },
});

// ── SHARED TESTIMONIAL SETS ───────────────────────────────────────────────────

const TESTIMONIALS_BUSINESS = testimonials([
  { name: "Ryan M.", role: "Online Coach", quote: "I went from $3K/month to $23K/month in 90 days. The system is incredibly simple but powerful." },
  { name: "Sarah J.", role: "Course Creator", quote: "Made back my investment 10x in the first month. I wish I'd found this 2 years ago." },
  { name: "Chris T.", role: "Agency Owner", quote: "This completely changed how I think about scaling. My team is more productive than ever." },
]);

const TESTIMONIALS_COACHING = testimonials([
  { name: "Amanda L.", role: "Life Coach", quote: "My calendar has been full for 3 months straight. I've never had so many ideal clients reaching out." },
  { name: "Jason B.", role: "Business Strategist", quote: "Booked 4 high-ticket clients in my first week after applying the framework. Unreal results." },
  { name: "Nicole R.", role: "Marketing Consultant", quote: "I finally feel confident charging what I'm worth. This approach is game-changing." },
]);

const STANDARD_FAQ = faq([
  { question: "Who is this for?", answer: "This is perfect for entrepreneurs, coaches, and business owners who want to grow their revenue without burning out." },
  { question: "What happens after I sign up?", answer: "You'll get immediate access to everything. No waiting, no delays — everything is delivered instantly." },
  { question: "Is there a guarantee?", answer: "Yes — 30-day money-back guarantee. If you're not satisfied for any reason, we'll refund every penny." },
  { question: "How fast will I see results?", answer: "Most of our members see meaningful results within the first 2–4 weeks of applying the framework." },
]);

// ── FUNNEL TEMPLATES ──────────────────────────────────────────────────────────

export const PAGE_TEMPLATES: PageTemplate[] = [

  // 1. VSL Sales Funnel
  {
    id: "vsl-sales-funnel",
    name: "VSL Sales Funnel",
    description: "Video sales letter funnel that converts cold traffic into buyers with a compelling video presentation.",
    category: "funnel",
    subcategory: "Sales",
    accent: "gold",
    emoji: "💰",
    stepCount: 5,
    sectionCount: 18,
    steps: [
      {
        name: "Opt-In Page",
        type: "landing",
        sections: [
          hero("Watch The FREE Video That Shows How To Make $10K/Month Online", "Join 12,000+ entrepreneurs who've already used this exact system to replace their 9-5 income.", "Yes! Show Me The Free Video →", "FREE TRAINING"),
          socialProof(),
          benefits("Here's What You'll Discover:", [
            "The exact 3-step system our top members use to generate consistent $10K months",
            "Why most people fail online (and the one mindset shift that fixes everything)",
            "How to attract perfect clients on autopilot — without cold outreach or paid ads",
            "The fastest path from zero to $10K/month (even if you're starting from scratch)",
          ]),
          form("Get Instant Access — 100% Free", "Send Me The Video →"),
        ],
      },
      {
        name: "Sales Page",
        type: "sales",
        sections: [
          urgencyBar("⏰ Special Launch Pricing Ends In:"),
          hero("Attention: You're Just One Decision Away From Changing Everything", "You've seen the free training. Now let me show you the full system — and how to get results 3x faster with our done-for-you templates.", "Yes! I Want The Full System →"),
          video("Watch this short presentation — it explains everything"),
          benefits("When You Join Today You Get:", [
            "The complete $10K/Month Blueprint — step by step, nothing left out",
            "12 done-for-you funnel templates you can deploy in under an hour",
            "Weekly live coaching calls with our top earners",
            "Private community of 5,000+ members who actually share what's working",
            "Lifetime access with all future updates included — no recurring fees",
          ]),
          TESTIMONIALS_BUSINESS,
          pricing("Your Investment Today", "$297", "$997", ["Full $10K Blueprint", "12 DFY Templates", "Weekly Coaching Calls", "Private Community Access", "Lifetime Updates", "30-Day Money-Back Guarantee"], "Get Instant Access Now →"),
          guarantee(),
          cta("Ready To Change Your Life?", "Yes, I'm Ready — Get Instant Access →", "Join 12,000+ members who are already seeing results"),
        ],
      },
      {
        name: "Order Page",
        type: "confirmation",
        sections: [
          hero("You're Almost In! Complete Your Order Below", "You're just seconds away from getting access to everything.", "Complete My Order →"),
          orderBump("⚡ Add The VIP Fast-Track Bundle — $47 (Save $150)", "Get our private swipe file library with 200+ proven ad copy templates, email sequences, and closing scripts. Added to your order instantly.", "$47"),
          pricing("Your Order Summary", "$297", "$997", ["Full $10K Blueprint", "12 DFY Templates", "Weekly Coaching Calls", "Private Community", "Lifetime Access"], "Complete My Order →"),
          guarantee(),
        ],
      },
      {
        name: "Upsell",
        type: "upsell",
        sections: [
          hero("Wait — Your Order Is In! But Before You Access Everything…", "For the next 10 minutes only, unlock the VIP Accelerator Program at a deeply discounted price. This offer will never be available again.", "Yes! Add The VIP Accelerator →"),
          video("Watch this 2-minute video before accessing your order"),
          benefits("The VIP Accelerator Includes:", [
            "Private 1-on-1 strategy session with one of our coaches ($500 value)",
            "Done-for-you complete business setup — we do the tech for you ($2,000 value)",
            "Access to our top 50 highest-converting funnels ($1,000 value)",
            "Priority support with 24-hour response time",
          ]),
          pricing("One-Time VIP Upgrade", "$197", "$997", ["1-on-1 Strategy Session", "Done-For-You Setup", "Top 50 Funnel Library", "Priority Support"], "Yes, Upgrade Me Now →"),
          cta("No Thanks — I'll Do It The Slow Way", "No thanks, I'll pass on this upgrade", ""),
        ],
      },
      {
        name: "Thank You",
        type: "thank_you",
        sections: [
          hero("🎉 Welcome To The Family! You're In.", "Check your email for your login details. Here's exactly what to do next to get results as fast as possible.", "Access My Account →"),
          benefits("Your Next Steps:", [
            "Step 1: Check your inbox for your login email (check spam if needed)",
            "Step 2: Watch the Quick-Start video inside your member dashboard",
            "Step 3: Join the private community and introduce yourself",
            "Step 4: Book your orientation call with your success coach",
          ]),
          bio("Your Name", "Founder", "Congratulations on making a great decision. I personally review your results and make sure you get the most out of the program. If you ever have questions, reply to any of my emails and I'll personally respond."),
        ],
      },
    ],
  },

  // 2. Webinar Funnel
  {
    id: "webinar-funnel",
    name: "Webinar Funnel",
    description: "Register, confirm, attend, and replay funnel — perfect for high-converting webinars and masterclasses.",
    category: "funnel",
    subcategory: "Webinar",
    accent: "purple",
    emoji: "🎙️",
    stepCount: 4,
    sectionCount: 14,
    steps: [
      {
        name: "Registration Page",
        type: "landing",
        sections: [
          hero("FREE Live Masterclass: How To Build A 6-Figure Business In 12 Months", "Join [Expert Name] LIVE on [Date] at [Time] as he reveals the exact framework that's helped 3,000+ entrepreneurs hit $100K+/year.", "Register For Free →", "FREE LIVE MASTERCLASS"),
          bio("Expert Name", "Business Coach & Bestselling Author", "I've helped 3,000+ entrepreneurs build 6 and 7-figure businesses from scratch. After 10+ years in the trenches, I've distilled everything into a system anyone can follow."),
          benefits("On This FREE Training You'll Discover:", [
            "The #1 reason most businesses fail in year 1 — and how to make sure you're not one of them",
            "The exact blueprint I used to go from $0 to $1M in under 18 months",
            "3 simple strategies you can implement THIS WEEK to start seeing results",
            "Live Q&A where I answer YOUR specific questions directly",
          ]),
          countdown("Masterclass Starts In:"),
          form("Save My Seat Now (Free)", "Yes, Save My Seat →"),
        ],
      },
      {
        name: "Confirmation",
        type: "confirmation",
        sections: [
          hero("🎉 You're Registered! See You On The Training.", "Check your inbox — you'll receive a confirmation email with the link and calendar invite.", "Add To Calendar →"),
          bio("Expert Name", "Business Coach", "Looking forward to seeing you on the training. Make sure you block out the full time — this is going to be incredible."),
          cta("While You Wait — Watch This Short Video", "Watch The Pre-Training Video →", "It sets up everything we'll cover on the masterclass"),
        ],
      },
      {
        name: "Webinar Room",
        type: "webinar",
        sections: [
          urgencyBar("🔴 LIVE NOW — We're Live! Click Join To Enter The Room"),
          hero("The Masterclass Is Live — Join Us Now!", "Click the button below to enter the live training room.", "Join The Live Training →"),
          video("The live training will appear here"),
          cta("Enter The Live Training", "Join Now →", "Training is live — don't miss a minute"),
        ],
      },
      {
        name: "Replay Page",
        type: "landing",
        sections: [
          urgencyBar("⚠️ Replay Available For 24 Hours Only"),
          hero("You Missed The Live Training — Watch The Replay Now", "The replay will be taken down in 24 hours. Watch now to get the exact framework before it's gone.", "Watch The Replay →"),
          video("Watch the full training replay below"),
          countdown("Replay Removed In:"),
          cta("Get The Full Program Before The Replay Disappears", "Get Instant Access →", "This offer expires when the replay comes down"),
        ],
      },
    ],
  },

  // 3. High-Ticket Application
  {
    id: "high-ticket-application",
    name: "High-Ticket Application Funnel",
    description: "Qualify and close high-ticket coaching or consulting clients with an application-based funnel.",
    category: "funnel",
    subcategory: "Coaching",
    accent: "blue",
    emoji: "🏆",
    stepCount: 3,
    sectionCount: 12,
    steps: [
      {
        name: "Application Landing Page",
        type: "landing",
        sections: [
          hero("Apply To Work With Me 1-on-1 And Build A 7-Figure Business", "I'm looking for 5 ambitious entrepreneurs to join my private mentorship program. If you're serious about reaching $1M+, apply now.", "Apply For A Strategy Call →", "LIMITED SPOTS AVAILABLE"),
          video("Watch this short video to see if you qualify"),
          stats("Results My Clients Have Achieved", [
            { number: "$2.4M", desc: "Revenue Generated" },
            { number: "127", desc: "Clients Scaled" },
            { number: "4.9★", desc: "Average Rating" },
            { number: "94%", desc: "Success Rate" },
          ]),
          bio("Mentor Name", "Business Coach & Investor", "I've spent 15 years building and selling companies. I work directly with 5 private clients per quarter to build systems that generate predictable, scalable revenue."),
          TESTIMONIALS_COACHING,
          cta("Apply Now — Only 5 Spots Available", "Submit Your Application →", "Spots are limited. Applications reviewed within 24 hours."),
        ],
      },
      {
        name: "Application Form",
        type: "landing",
        sections: [
          hero("Tell Me About Your Business", "This short application helps me understand where you are and how I can best help you. Takes 3 minutes.", ""),
          twoStepForm("Step 1: What's Your Current Monthly Revenue?"),
        ],
      },
      {
        name: "Thank You",
        type: "thank_you",
        sections: [
          hero("Application Received! Here's What Happens Next.", "I personally review every application. You'll hear back within 24–48 hours with your next steps.", ""),
          bio("Mentor Name", "Business Coach", "I've read your application and I'm excited to connect with you. Watch for an email from me personally within 24 hours."),
          cta("While You Wait — Watch My Free Training", "Watch The Training →", "Most applicants who watch this show up 3x more prepared for our call"),
        ],
      },
    ],
  },

  // 4. Lead Magnet Funnel
  {
    id: "lead-magnet-funnel",
    name: "Lead Magnet Funnel",
    description: "Capture leads with a free resource, then convert them into buyers with a low-ticket offer.",
    category: "funnel",
    subcategory: "Lead Gen",
    accent: "green",
    emoji: "🧲",
    stepCount: 3,
    sectionCount: 11,
    steps: [
      {
        name: "Free Resource Opt-In",
        type: "landing",
        sections: [
          hero("FREE: The 5-Step Blueprint To [Specific Outcome] In 30 Days", "Download this free guide and discover the exact framework our top clients use to achieve [outcome] faster than they ever thought possible.", "Send Me The Free Guide →", "FREE INSTANT DOWNLOAD"),
          socialProof(),
          benefits("Inside This Free Guide You'll Get:", [
            "Step 1: The exact mindset shift that makes [outcome] inevitable",
            "Step 2: The 3 tools that automate 80% of the work for you",
            "Step 3: How to implement in under 2 hours without overwhelm",
            "Step 4: The #1 mistake to avoid that kills most people's results",
            "Step 5: The daily habit that compounds results week over week",
          ]),
          form("Download Your Free Guide Now", "Send Me The Guide →"),
        ],
      },
      {
        name: "Thank You + One-Time Offer",
        type: "upsell",
        sections: [
          urgencyBar("⚡ Special One-Time Offer — Expires In 15 Minutes"),
          hero("Your Guide Is On Its Way! But First — A One-Time Offer", "You'll get an email with your guide in 2 minutes. But before you check your inbox, I want to make you a special offer that's ONLY available right now.", "Yes! Add This To My Order →"),
          video("Watch this 2-minute video before you check your email"),
          benefits("Get The Complete Program:", [
            "Everything in the free guide — PLUS the full implementation system",
            "12 done-for-you templates you can use immediately",
            "Video walkthroughs for every step (nothing is left to guesswork)",
            "Private community access with 500+ members sharing real results",
          ]),
          pricing("Today Only: Complete Program", "$37", "$197", ["Full Implementation System", "12 DFY Templates", "Video Walkthroughs", "Private Community", "Future Updates"], "Yes, Add This For Just $37 →"),
          guarantee(),
          cta("No Thanks — I'll Stick With Just The Free Guide", "No thanks, I'll pass", ""),
        ],
      },
      {
        name: "Download Page",
        type: "thank_you",
        sections: [
          hero("🎉 You're All Set! Access Your Guide Below.", "Your guide is ready to download. Take 30 minutes today to read through it — it will change how you approach [topic].", "Download My Guide →"),
          cta("Ready To Go Deeper?", "Get The Full Program →", "Join 500+ members who are getting accelerated results"),
        ],
      },
    ],
  },

  // 5. Free + Shipping Funnel
  {
    id: "free-plus-shipping",
    name: "Free + Shipping Funnel",
    description: "Give away a physical product for free (just pay shipping) and maximize revenue with OTOs.",
    category: "funnel",
    subcategory: "E-Commerce",
    accent: "orange",
    emoji: "📦",
    stepCount: 4,
    sectionCount: 14,
    steps: [
      {
        name: "Free Book Page",
        type: "landing",
        sections: [
          hero("FREE Book: The [Title] Method — Just Pay $7.95 Shipping", "Discover the exact strategy [number] entrepreneurs have used to [outcome]. This book retails for $27 — today it's FREE, just pay S&H.", "Send Me The Free Book →", "FREE BOOK — PAY ONLY SHIPPING"),
          benefits("What You'll Get Inside:", [
            "Chapter 1: Why everything you've been told about [topic] is wrong",
            "Chapter 2: The simple framework that changes everything",
            "Chapter 3: Real case studies from entrepreneurs who used this",
            "Chapter 4: Your 30-day implementation plan",
          ]),
          TESTIMONIALS_BUSINESS,
          guarantee(),
          cta("Claim Your Free Copy Now", "Yes! Send Me The Free Book →", "You only pay $7.95 for shipping. We cover the rest."),
        ],
      },
      {
        name: "Order Page",
        type: "confirmation",
        sections: [
          hero("Almost Done! Complete Your Shipping Details Below", "Your free book is reserved. Fill in your shipping address to lock in your copy.", "Complete My Order →"),
          orderBump("⚡ Add The Digital Version + Bonuses For Just $17", "Get the ebook instantly PLUS 3 exclusive bonus trainings that expand on the book's most powerful strategies.", "$17"),
          pricing("Order Summary", "$7.95", "$34.95", ["Physical Book (Free)", "Standard Shipping", "30-Day Money-Back Guarantee"], "Complete My Order →"),
          guarantee(),
        ],
      },
      {
        name: "OTO — Masterclass Upsell",
        type: "upsell",
        sections: [
          hero("Your Book Is Shipping! Unlock The Masterclass While You Wait", "Watch the 3-hour video masterclass that goes 10x deeper than the book — and implement everything before your book even arrives.", "Yes! Add The Masterclass →"),
          video("Preview of the masterclass content"),
          pricing("Add The Masterclass Today", "$27", "$197", ["3-Hour Video Masterclass", "Workbook & Templates", "Implementation Checklist", "Lifetime Access"], "Yes, Add For $27 →"),
          cta("No Thanks — I'll Just Read The Book", "No thanks, skip this offer", ""),
        ],
      },
      {
        name: "Thank You",
        type: "thank_you",
        sections: [
          hero("🙏 Thank You! Your Book Is On Its Way.", "You'll receive a shipping confirmation within 24 hours. In the meantime, here's your bonus digital resource.", "Access Your Bonus →"),
          cta("While Your Book Ships — Grab This One More Thing", "See The Exclusive Offer →", "Only available for new book customers"),
        ],
      },
    ],
  },

  // 6. Product Launch Funnel
  {
    id: "product-launch-funnel",
    name: "Product Launch Funnel",
    description: "Build anticipation, launch with a bang, and maximize revenue from your product launch.",
    category: "funnel",
    subcategory: "Launch",
    accent: "red",
    emoji: "🚀",
    stepCount: 4,
    sectionCount: 16,
    steps: [
      {
        name: "Pre-Launch Squeeze",
        type: "landing",
        sections: [
          urgencyBar("🔥 Launch Opens In:"),
          hero("Get On The Waitlist For [Product Name] — Launching [Date]", "Be first in line when we open the doors. Waitlist members get early access, exclusive bonuses, and the best pricing we'll ever offer.", "Add Me To The Waitlist →", "EARLY ACCESS — LIMITED SPOTS"),
          stats("By The Numbers", [
            { number: "2,400+", desc: "Beta Users" },
            { number: "4.8★", desc: "Beta Rating" },
            { number: "$127K", desc: "Revenue Generated By Beta Users" },
            { number: "3 Days", desc: "Avg. Time To First Result" },
          ]),
          form("Join The Waitlist — Free", "Reserve My Spot →", ["name", "email"]),
        ],
      },
      {
        name: "Sales Page",
        type: "sales",
        sections: [
          urgencyBar("⏰ Doors Close In: — Cart Closes Forever After Launch Week"),
          hero("[Product Name] Is Now Open — Don't Miss The Launch Pricing", "The product that helped 2,400 beta users generate real results is now available to everyone — but only at this price during launch week.", "Get Access Now →"),
          video("Watch: How [Product Name] Works"),
          benefits("Here's Everything You Get:", [
            "Core Module 1: The foundation that makes everything else work",
            "Core Module 2: The system that generates consistent results",
            "Core Module 3: The scaling framework for long-term growth",
            "Bonus 1: Done-for-you templates ($297 value)",
            "Bonus 2: Private community access ($197 value)",
            "Bonus 3: Weekly live Q&A calls ($497 value)",
          ]),
          comparison("How [Product Name] Compares", ["Feature", "[Product]", "Alternatives"], [
            ["Complete System", "✅", "❌"],
            ["Done-For-You Templates", "✅", "❌"],
            ["Live Coaching Included", "✅", "❌"],
            ["Money-Back Guarantee", "✅", "Rarely"],
            ["Lifetime Updates", "✅", "❌"],
          ]),
          TESTIMONIALS_BUSINESS,
          pricing("Launch Week Pricing — Ends [Date]", "$497", "$997", ["Full [Product Name] Access", "DFY Templates", "Private Community", "Weekly Live Q&A", "Lifetime Updates", "30-Day Guarantee"], "Get Launch Pricing Now →"),
          STANDARD_FAQ,
          stickyCta("🔥 Launch Pricing Ends Soon — Lock In Your Discount", "Get Access Now →"),
        ],
      },
      {
        name: "Order Page",
        type: "confirmation",
        sections: [
          hero("Complete Your Order Below", "You're just moments away from getting access. Fill in your details and click complete.", "Complete My Order →"),
          orderBump("⚡ VIP Add-On: Private Slack Community + Monthly Masterminds ($97/mo — Today $27)", "Get direct access to our private Slack channel with weekly expert AMAs and monthly virtual mastermind sessions.", "$27"),
          pricing("Your Order", "$497", "$997", ["Full Access", "All Bonuses", "Lifetime Updates", "30-Day Guarantee"], "Complete My Purchase →"),
          guarantee(),
          stickyCta("Secure Checkout — 256-bit SSL Encryption", "Complete Order →"),
        ],
      },
      {
        name: "Thank You",
        type: "thank_you",
        sections: [
          hero("🎉 You're In! Welcome To [Product Name].", "Your access has been granted. Check your inbox for login details and your next steps to get started.", "Access My Account →"),
          benefits("Your Next Steps:", [
            "Check your inbox for your welcome email with login details",
            "Log in and watch the Quick-Start video (10 minutes)",
            "Join the private community and introduce yourself",
            "Schedule your onboarding call with your success coach",
          ]),
          cta("Join Our Private Community", "Join The Community →", "Connect with 2,400+ members who are getting results right now"),
        ],
      },
    ],
  },

  // 7. Challenge Funnel
  {
    id: "challenge-funnel",
    name: "5-Day Challenge Funnel",
    description: "Build engagement and make a pitch on Day 5 with a free challenge that delivers real value.",
    category: "funnel",
    subcategory: "Challenge",
    accent: "cyan",
    emoji: "⚡",
    stepCount: 5,
    sectionCount: 16,
    steps: [
      {
        name: "Challenge Registration",
        type: "landing",
        sections: [
          hero("Join The FREE 5-Day [Outcome] Challenge Starting [Date]", "Each day for 5 days, I'll give you one simple action that builds toward [specific result]. Thousands of entrepreneurs have done this — it's your turn.", "Register For Free →", "FREE 5-DAY CHALLENGE"),
          stats("Past Participants Have Achieved", [
            { number: "5,000+", desc: "Challenge Alumni" },
            { number: "92%", desc: "Complete All 5 Days" },
            { number: "$8K", desc: "Avg. Revenue Increase" },
            { number: "4.9★", desc: "Rating" },
          ]),
          bio("Host Name", "Challenge Host & Business Coach", "I've run this challenge 6 times with 5,000+ participants. Every single time, people are blown away by how much they accomplish in just 5 days. I can't wait for you to experience it."),
          benefits("Here's What Happens Each Day:", [
            "Day 1: The Foundation — Build your unbreakable foundation for success",
            "Day 2: The System — Install the system that generates consistent results",
            "Day 3: The Audience — Attract the right people to your offer",
            "Day 4: The Offer — Create an irresistible offer people can't say no to",
            "Day 5: The Launch — Put everything together and make your first sales",
          ]),
          form("Join The Challenge — It's Free", "Save My Spot →"),
        ],
      },
      {
        name: "Day 1 — The Foundation",
        type: "landing",
        sections: [
          hero("Day 1: Welcome! Let's Build Your Foundation 🏗️", "Today is about getting crystal clear on where you're going. Complete today's task and share your result in the community.", "Watch Day 1 Training →"),
          video("Day 1: Your Foundation For Success"),
          benefits("Today's Action Steps:", [
            "Watch the full Day 1 training (22 minutes)",
            "Complete the Day 1 worksheet in your member area",
            "Share your 'one sentence business vision' in the community",
          ]),
          cta("Ready For Day 2?", "See You Tomorrow →", "Day 2 unlocks at 9am EST"),
        ],
      },
      {
        name: "Day 2 — The System",
        type: "landing",
        sections: [
          hero("Day 2: Install The System That Changes Everything 🔧", "Yesterday you built your foundation. Today we install the core system that makes everything run on autopilot.", "Watch Day 2 Training →"),
          video("Day 2: The System"),
          benefits("Today's Action Steps:", [
            "Watch the full Day 2 training (31 minutes)",
            "Map out your 3-step client system using the template",
            "Post your system map in the community for feedback",
          ]),
          cta("Crushed Day 2? See You Tomorrow", "See You On Day 3 →", "Day 3 unlocks at 9am EST"),
        ],
      },
      {
        name: "Day 3–4 Content",
        type: "landing",
        sections: [
          hero("Days 3 & 4: Audience + Offer 🎯", "Build your audience attraction system and craft an irresistible offer that sells itself.", "Watch Training →"),
          video("Days 3 & 4 Combined Training"),
          benefits("What You'll Complete:", [
            "Day 3: Your audience attraction system (attract dream clients automatically)",
            "Day 4: Your irresistible offer formula (that makes saying no feel impossible)",
          ]),
          cta("Almost There — Day 5 Is The Big Day!", "See You On Day 5 →", "Day 5 is where everything comes together — don't miss it"),
        ],
      },
      {
        name: "Day 5 — The Offer",
        type: "sales",
        sections: [
          hero("Day 5: You Did It — Now Let's Talk About What's Next 🚀", "You've completed 4 days of incredible action. Today I want to share how you can keep this momentum going — with our full program.", "Yes, Tell Me What's Next →"),
          video("Day 5: Putting It All Together + The Next Step"),
          TESTIMONIALS_BUSINESS,
          pricing("Continue Your Journey", "$497", "$1,997", ["Full 12-Week Program", "All Challenge Materials + Templates", "Weekly Live Coaching", "Private Community", "Lifetime Access"], "Join The Full Program →"),
          guarantee(),
          STANDARD_FAQ,
        ],
      },
    ],
  },

  // 8. Consultation Funnel
  {
    id: "consultation-funnel",
    name: "Consultation Funnel",
    description: "Drive qualified leads to book a strategy call or consultation with a pre-qualification funnel.",
    category: "funnel",
    subcategory: "Consulting",
    accent: "blue",
    emoji: "📞",
    stepCount: 3,
    sectionCount: 10,
    steps: [
      {
        name: "Landing Page",
        type: "landing",
        sections: [
          hero("Book A Free 30-Minute Strategy Call With [Name]", "On this call, we'll map out a custom action plan to help you achieve [specific outcome] in the next 90 days. No pressure. No obligation.", "Book My Free Strategy Call →", "FREE 30-MIN STRATEGY CALL"),
          stats("What Our Clients Achieve", [
            { number: "127", desc: "Clients Helped" },
            { number: "94%", desc: "Success Rate" },
            { number: "$247K", desc: "Avg. Revenue Added" },
            { number: "4.9★", desc: "Client Satisfaction" },
          ]),
          bio("Your Name", "Founder & Lead Consultant", "I've spent 10+ years helping businesses scale past $1M. On this call, I'll give you a custom action plan based on your specific situation — no cookie-cutter advice."),
          TESTIMONIALS_COACHING,
          cta("Only 5 Slots Available This Week", "Book Your Call Now →", "Book your free 30-minute strategy call before slots fill up"),
        ],
      },
      {
        name: "Book A Call",
        type: "landing",
        sections: [
          hero("Choose A Time That Works For You", "Pick the time that's most convenient and tell me a little about what you'd like help with.", ""),
          twoStepForm("Step 1: What's Your Biggest Challenge Right Now?"),
        ],
      },
      {
        name: "Confirmation",
        type: "thank_you",
        sections: [
          hero("✅ Your Call Is Confirmed! Here's What To Expect.", "You'll receive a calendar invite and Zoom link within minutes. Please arrive 2 minutes early so we make the most of our time together.", ""),
          bio("Your Name", "Founder", "I'm looking forward to our conversation. Come prepared with your biggest challenge and your #1 goal for the next 90 days — we'll build your roadmap together."),
          cta("Want To Come Prepared? Watch This First", "Watch The Prep Video →", "Clients who watch this show up 3x more prepared and get better results"),
        ],
      },
    ],
  },

  // ── PAGE TEMPLATES ──────────────────────────────────────────────────────────

  // 9. Agency Portfolio
  {
    id: "agency-portfolio",
    name: "Agency Portfolio",
    description: "Showcase your agency's work, results, and expertise to convert visitors into clients.",
    category: "page",
    subcategory: "Agency",
    accent: "gold",
    emoji: "🏢",
    stepCount: 1,
    sectionCount: 7,
    steps: [
      {
        name: "Agency Portfolio",
        type: "landing",
        sections: [
          hero("We Build Brands That Dominate Their Market", "We're a full-service digital agency specializing in conversion-focused design, paid ads, and growth marketing. Our clients average 3x ROI in 90 days.", "Get A Free Strategy Session →", "AWARD-WINNING AGENCY"),
          stats("Our Track Record", [
            { number: "200+", desc: "Clients Served" },
            { number: "$12M+", desc: "Revenue Generated" },
            { number: "4.9★", desc: "Client Rating" },
            { number: "98%", desc: "Retention Rate" },
          ]),
          benefits("Our Services", [
            "Brand Strategy & Identity — Build a brand that stands out and commands premium prices",
            "Website & Funnel Design — High-converting pages that turn visitors into buyers",
            "Paid Advertising — Profitable Meta and Google ad campaigns from day one",
            "Email Marketing — Automated sequences that nurture and convert on autopilot",
          ]),
          press(["Forbes", "Entrepreneur", "Inc. 5000", "Fast Company", "Business Insider"]),
          TESTIMONIALS_COACHING,
          bio("Agency Founder", "CEO & Creative Director", "I started this agency after 10 years working at top marketing firms. Our philosophy: every dollar you invest should return at least $3. If it doesn't, we don't charge you."),
          cta("Ready To Grow? Let's Talk.", "Book A Free Strategy Session →", "We only take on 5 new clients per month. Spots are limited."),
        ],
      },
    ],
  },

  // 10. SaaS Product
  {
    id: "saas-product",
    name: "SaaS Product Page",
    description: "Convert visitors into trial users with a compelling product landing page.",
    category: "page",
    subcategory: "Software",
    accent: "blue",
    emoji: "💻",
    stepCount: 1,
    sectionCount: 7,
    steps: [
      {
        name: "Product Page",
        type: "landing",
        sections: [
          hero("The [Category] Tool That [Outcome] In Half The Time", "Join 10,000+ teams who use [Product] to [achieve outcome] without [painful alternative]. Start your free trial — no credit card required.", "Start Free Trial →", "14-DAY FREE TRIAL"),
          video("See how [Product] works in 90 seconds"),
          benefits("Why Teams Choose [Product]", [
            "🚀 10x faster than doing it manually — save hours every week",
            "🤖 AI-powered automation handles the repetitive work for you",
            "📊 Real-time analytics so you always know what's working",
            "🔒 Enterprise-grade security with SOC2 Type II compliance",
            "🔌 Connects with 200+ tools you already use",
          ]),
          comparison("How [Product] Compares", ["Feature", "[Product]", "Competitors"], [
            ["AI Automation", "✅ Built-in", "❌ Add-on"],
            ["Real-Time Analytics", "✅ Included", "❌ Extra cost"],
            ["Integrations", "✅ 200+", "⚠️ Limited"],
            ["Customer Support", "✅ 24/7 Live", "❌ Email only"],
            ["Price", "✅ Fair", "❌ Expensive"],
          ]),
          pricing("Simple, Transparent Pricing", "$49/mo", "$149/mo", ["Unlimited projects", "AI automation", "200+ integrations", "Real-time analytics", "24/7 support", "14-day free trial"], "Start Free Trial →"),
          STANDARD_FAQ,
          cta("Start Your Free 14-Day Trial Today", "Get Started Free →", "No credit card required. Cancel anytime. Setup in 2 minutes."),
        ],
      },
    ],
  },

  // 11. Course Landing Page
  {
    id: "course-landing",
    name: "Course Landing Page",
    description: "Sell your online course with a high-converting page that addresses objections and drives enrollment.",
    category: "page",
    subcategory: "Education",
    accent: "purple",
    emoji: "🎓",
    stepCount: 1,
    sectionCount: 9,
    steps: [
      {
        name: "Course Sales Page",
        type: "sales",
        sections: [
          hero("Master [Skill] In 30 Days — Even If You're Starting From Zero", "Join 3,000+ students who've used this proven course to [achieve outcome] and [transformation] without [common obstacle].", "Enroll Now — Limited Spots →", "BESTSELLING COURSE"),
          video("Watch: Student results and what's inside the course"),
          benefits("What You'll Learn:", [
            "Module 1: The Foundation — Build the base that makes everything else work",
            "Module 2: The Core Framework — The system our top students use to get results",
            "Module 3: Advanced Strategies — Scale what's working to 10x your results",
            "Module 4: Real-World Application — Implement with done-for-you resources",
            "BONUS: Private Community — Get feedback and support from 3,000+ students",
          ]),
          comparison("This Course vs. Everything Else", ["What You Get", "This Course", "YouTube Free Stuff"], [
            ["Structured Curriculum", "✅", "❌"],
            ["Done-For-You Resources", "✅", "❌"],
            ["Expert Feedback", "✅", "❌"],
            ["Proven Results", "✅", "⚠️"],
            ["Your Time Saved", "✅ 100+ hrs", "❌"],
          ]),
          bio("Instructor Name", "Course Instructor & [Expert Title]", "I've been teaching [skill] for 10+ years and have helped 3,000+ students achieve real results. My approach is practical, step-by-step, and designed for busy people who want results fast."),
          testimonials([
            { name: "Marcus T.", role: "Student", quote: "I went from complete beginner to getting my first client in 3 weeks. The course is incredibly practical and easy to follow." },
            { name: "Rachel K.", role: "Student", quote: "I've tried 4 other courses on this topic. This is the only one that actually helped me get results. Worth every penny." },
            { name: "Tom W.", role: "Student", quote: "The community alone is worth the price of the course. So many people willing to help and share what's working." },
          ]),
          pricing("Enroll Today", "$297", "$997", ["Full Course (4 Modules)", "Done-For-You Resources", "Private Community", "Monthly Live Q&As", "Lifetime Access + Updates", "30-Day Money-Back Guarantee"], "Enroll Now →"),
          guarantee(),
          STANDARD_FAQ,
        ],
      },
    ],
  },

  // 12. Newsletter / Podcast
  {
    id: "newsletter-podcast",
    name: "Newsletter / Podcast",
    description: "Grow your newsletter or podcast audience with a clean, conversion-focused landing page.",
    category: "page",
    subcategory: "Content",
    accent: "orange",
    emoji: "🎙",
    stepCount: 1,
    sectionCount: 5,
    steps: [
      {
        name: "Subscribe Page",
        type: "landing",
        sections: [
          hero("Join 25,000+ [Professionals] Getting [Outcome] Every Week", "Every [day] I send one actionable [tip/insight/strategy] that [specific benefit]. It takes 5 minutes to read and could change how you think about [topic].", "Subscribe — It's Free →", "THE #1 NEWSLETTER FOR [AUDIENCE]"),
          stats("The Newsletter By The Numbers", [
            { number: "25,000+", desc: "Subscribers" },
            { number: "52%", desc: "Open Rate (2x industry avg)" },
            { number: "200+", desc: "Issues Published" },
            { number: "4.9★", desc: "Reader Rating" },
          ]),
          press(["Featured in Forbes", "Recommended by Entrepreneur", "Top Newsletter on Substack", "Inc. Magazine Pick", "ProductHunt #1"]),
          testimonials([
            { name: "Sarah B.", role: "Marketing Director", quote: "The only newsletter I actually read every week. Every issue gives me at least one thing I can implement immediately." },
            { name: "James L.", role: "Founder", quote: "I've learned more from this newsletter in 6 months than from 2 years of business school. Incredibly practical." },
            { name: "Anna P.", role: "Freelancer", quote: "Increased my income 40% after applying strategies I learned from just 3 issues. Subscribe immediately." },
          ]),
          form("Subscribe For Free", "Yes, Subscribe Me →", ["email"]),
        ],
      },
    ],
  },

  // 13. Personal Brand
  {
    id: "personal-brand",
    name: "Personal Brand Page",
    description: "Establish authority and convert visitors into clients, followers, or collaborators.",
    category: "page",
    subcategory: "Personal Brand",
    accent: "gold",
    emoji: "⭐",
    stepCount: 1,
    sectionCount: 6,
    steps: [
      {
        name: "Personal Brand Page",
        type: "landing",
        sections: [
          hero("Hi, I'm [Name] — I Help [Audience] Achieve [Specific Outcome]", "Speaker · Author · Coach · Entrepreneur. I've spent [X] years helping [type of people] [achieve outcome]. Here's how I can help you.", "Work With Me →"),
          bio("Your Name", "Speaker, Author & Business Coach", "I spent 15 years in the corporate world before building my first 7-figure business. Since then, I've helped 1,000+ entrepreneurs build businesses that give them freedom, income, and impact. My book '[Title]' has sold 50,000+ copies."),
          stats("By The Numbers", [
            { number: "1,000+", desc: "Clients Helped" },
            { number: "$47M", desc: "Client Revenue Generated" },
            { number: "50K+", desc: "Books Sold" },
            { number: "200+", desc: "Speaking Events" },
          ]),
          press(["TEDx Speaker", "Forbes Contributor", "WSJ Bestselling Author", "Inc. Top 50 Coach", "Entrepreneur Magazine"]),
          TESTIMONIALS_COACHING,
          cta("Ready To Work Together?", "Book A Call →", "I work with a limited number of clients each quarter. Schedule your complimentary strategy call today."),
        ],
      },
    ],
  },

  // 14. Event / Webinar Landing Page
  {
    id: "event-landing",
    name: "Event / Webinar Page",
    description: "Drive registrations for a live event, workshop, or virtual summit.",
    category: "page",
    subcategory: "Event",
    accent: "purple",
    emoji: "🎪",
    stepCount: 1,
    sectionCount: 6,
    steps: [
      {
        name: "Event Registration",
        type: "landing",
        sections: [
          hero("Join Us For [Event Name] — [Date] At [Time]", "A live [event type] where you'll learn [specific outcome] with [number] of the world's top [experts/entrepreneurs]. Registration is free.", "Register Now — It's Free →", "LIVE EVENT — [DATE]"),
          countdown("Event Starts In:"),
          bio("Event Host / Speaker", "Host & Master of Ceremonies", "I've hosted 20+ live events and summits with speakers including [names]. This event is designed to give you maximum value in minimum time — every session is actionable."),
          benefits("What You'll Experience:", [
            "Keynote presentations from [number] world-class speakers on [topic]",
            "Exclusive workshops where you actually implement, not just watch",
            "Networking sessions with [type of professionals] from [number] countries",
            "A live Q&A with all speakers — your questions answered in real time",
            "Recordings of all sessions sent to your inbox after the event",
          ]),
          faq([
            { question: "Is the event really free?", answer: "Yes — 100% free to attend live. Optional paid VIP ticket includes recordings, slides, and bonus sessions." },
            { question: "What if I can't attend live?", answer: "VIP ticket holders get access to all recordings. Free attendees can only watch live." },
            { question: "How long is the event?", answer: "The event runs from [Start Time] to [End Time] on [Date]. Total [X] hours of content." },
            { question: "What platform is the event on?", answer: "We use Zoom Webinar for the main sessions and a private community for networking." },
          ]),
          form("Register Your Free Ticket", "Register Now →", ["name", "email"]),
        ],
      },
    ],
  },

  // ── Additional 10 templates ─────────────────────────────────────────────────

  // 15. SaaS Pricing Page
  {
    id: "saas-pricing",
    name: "SaaS Pricing Page",
    description: "Convert free trial users to paid plans with a clear, trust-optimized pricing page featuring feature comparison and FAQs.",
    category: "page",
    subcategory: "SaaS",
    accent: "blue",
    emoji: "💎",
    stepCount: 1,
    sectionCount: 7,
    steps: [
      {
        name: "Pricing",
        type: "landing",
        sections: [
          hero("Stop Paying for Features You Don't Need", "One clear price. Everything included. Cancel anytime.", "Start Free Trial", "14 Days Free · No Credit Card"),
          stats("Trusted by 12,000+ businesses", [
            { number: "12,000+", desc: "Active customers" },
            { number: "4.9★", desc: "G2 rating" },
            { number: "99.9%", desc: "Uptime SLA" },
            { number: "2 min", desc: "Avg setup time" },
          ]),
          pricing("Simple, Transparent Pricing", "$97", "$197", [
            "Unlimited projects", "10 team members", "Advanced analytics", "API access (10K calls/mo)",
            "Priority email support", "Custom integrations", "Export to CSV/PDF", "30-day money-back guarantee",
          ], "Start Free Trial →"),
          comparison("How We Compare", ["Feature", "Us", "Competitor A", "Competitor B"], [
            ["Unlimited projects", "✅", "❌ (3 max)", "❌ (5 max)"],
            ["Real-time analytics", "✅", "✅", "❌"],
            ["API access", "✅", "💰 Add-on", "❌"],
            ["Team collaboration", "✅", "💰 +$29/mo", "✅"],
            ["Customer support", "24/7 live chat", "Email only", "Tickets only"],
            ["Setup time", "2 minutes", "2-3 hours", "1+ day"],
          ]),
          testimonials([
            { name: "Marcus T.", role: "CTO, ScaleHQ", quote: "Switched from [Competitor] and saved $400/month. The feature set is identical, minus the bloat." },
            { name: "Priya K.", role: "Product Manager", quote: "Setup took literally 2 minutes. We were live before our coffee got cold." },
            { name: "James W.", role: "SaaS Founder", quote: "The API alone is worth the price. We've built 3 internal tools on top of it." },
          ]),
          faq([
            { question: "Is there a free trial?", answer: "Yes — 14 days, no credit card required. Full access to all features." },
            { question: "What happens after the trial?", answer: "You'll be prompted to add a card. If you don't, your account pauses (all data saved)." },
            { question: "Can I cancel anytime?", answer: "Absolutely. One click in your dashboard. No cancellation fees, ever." },
            { question: "Do you offer annual billing?", answer: "Yes — annual billing saves you 20% vs monthly. Contact us for team/enterprise pricing." },
          ]),
          cta("Start Your Free Trial Today", "Start Free Trial →", "No credit card · Cancel anytime · Full feature access"),
        ],
      },
    ],
  },

  // 16. App Download Page
  {
    id: "app-download",
    name: "App Download Page",
    description: "Drive downloads for your mobile app with compelling screenshots, social proof, and urgency-driven CTAs.",
    category: "page",
    subcategory: "Mobile App",
    accent: "cyan",
    emoji: "📱",
    stepCount: 1,
    sectionCount: 6,
    steps: [
      {
        name: "Download",
        type: "landing",
        sections: [
          hero("The App That Changes How You [Outcome]", "Join 500,000+ people who've already downloaded. Rated #1 in its category.", "Download Free", "iOS & Android · 4.9★ · 500K+ downloads"),
          stats("By the numbers", [
            { number: "500K+", desc: "Downloads" },
            { number: "4.9★", desc: "App Store" },
            { number: "#1", desc: "In category" },
            { number: "2 min", desc: "To set up" },
          ]),
          benefits("Why 500,000 people chose us", [
            "Does [key thing] in under 60 seconds — faster than any alternative",
            "Works offline — no internet required for core features",
            "Syncs across all your devices automatically",
            "Privacy-first: your data stays on your device",
            "One-time purchase, no subscription required",
          ]),
          testimonials([
            { name: "Alex R.", role: "★★★★★ App Store", quote: "I've tried 12 apps like this. This is the only one that actually stuck. I use it every single day." },
            { name: "Samantha L.", role: "★★★★★ Play Store", quote: "Worth every penny. Replaced 3 other apps I was paying for." },
            { name: "Chris M.", role: "★★★★★ App Store", quote: "The offline mode alone is a game changer. No more dead zones ruining my workflow." },
          ]),
          faq([
            { question: "Is it really free?", answer: "The app is free to download. Premium features unlock with a one-time in-app purchase." },
            { question: "Does it work on Android too?", answer: "Yes — available on iOS 13+ and Android 8+. Perfect sync between devices." },
            { question: "Is my data private?", answer: "Your data is stored locally on your device. We never sell your information." },
            { question: "What if I don't like it?", answer: "In-app purchases come with a 30-day refund policy via the App Store/Play Store." },
          ]),
          cta("Download Free Today", "Download on App Store →", "Available on iOS and Android. 4.9 stars from 50,000+ reviews."),
        ],
      },
    ],
  },

  // 17. E-commerce Product Launch
  {
    id: "ecom-product-launch",
    name: "E-commerce Product Launch",
    description: "Launch a physical or digital product with a high-converting page featuring unboxing-style benefits, social proof, and scarcity.",
    category: "funnel",
    subcategory: "E-commerce",
    accent: "orange",
    emoji: "📦",
    stepCount: 3,
    sectionCount: 16,
    steps: [
      {
        name: "Product Page",
        type: "landing",
        sections: [
          urgencyBar("🔥 Launch Sale: 40% OFF ends in 24 hours", "Only 87 units left at this price"),
          hero("The [Product] That [Specific Outcome] in [Timeframe]", "Finally — a [product type] designed for [target audience] who want [specific result] without [pain point].", "Get 40% Off Now →", "Limited Launch Pricing · Ships in 2 Days"),
          video("", "Watch how it works in 90 seconds"),
          benefits("What makes it different", [
            "[Unique mechanism]: The only [product] that [does specific thing]",
            "Works for [audience segment] even if [common objection]",
            "Results in [specific timeframe] or full refund",
            "Premium [material/ingredient] — 3x more effective than standard versions",
            "Designed with [credentialed experts] — 3 years of R&D",
          ]),
          testimonials([
            { name: "Jordan T.", role: "Verified Buyer ★★★★★", quote: "I was skeptical. Now I'm on my 4th order. The results after just [timeframe] blew me away." },
            { name: "Lisa M.", role: "Verified Buyer ★★★★★", quote: "My [specific metric] improved by [X%] in the first week. Nothing else I've tried came close." },
            { name: "David K.", role: "Verified Buyer ★★★★★", quote: "Finally! Something that actually [does what it claims]. Shipping was faster than expected too." },
          ]),
          socialProof(),
          guarantee("60-Day Money-Back Guarantee", "Try it for 60 full days. If you don't [specific result], return it for a complete refund. No questions, no hassle.", "Risk-Free Guarantee"),
          cta("Claim Your 40% Launch Discount", "Add to Cart — Save 40% →", "Only 87 units left. Ships within 48 hours."),
        ],
      },
      {
        name: "Upsell — Bundle",
        type: "upsell",
        sections: [
          urgencyBar("Wait! You qualify for the VIP Bundle upgrade", "One-time offer — only available right now"),
          orderBump("🎁 Complete the Bundle — Save $97 More", "Most customers who get the core [product] also grab these 2 add-ons. Today, bundle all 3 for just $47 more (regular $144).", "$47", "Yes — Add the Bundle to My Order"),
          testimonials([
            { name: "Rachel S.", role: "Bundle Owner ★★★★★", quote: "The bundle is 100% the move. The [add-on #1] alone is worth more than the bundle price." },
          ]),
          cta("Keep My Original Order", "No thanks, just the original →", "I'll pass on the bundle upgrade"),
        ],
      },
      {
        name: "Order Confirmation",
        type: "thank_you",
        sections: [
          hero("Order Confirmed! 🎉 Check Your Email", "Your [product] is being prepared for shipment. Estimated delivery: 2-4 business days.", "Track My Order →", "Order #[auto-filled]"),
          benefits("What happens next", [
            "📧 Confirmation email sent to your inbox (check spam if not received)",
            "📦 Order ships within 48 hours — tracking number emailed to you",
            "🎯 Join our private customer community for tips and support",
            "📞 Questions? Live support at support@[brand].com",
          ]),
          cta("Join Our Customer Community", "Join the Community →", "Connect with 10,000+ customers for tips, results, and support."),
        ],
      },
    ],
  },

  // 18. Podcast / Newsletter Landing
  {
    id: "podcast-newsletter",
    name: "Podcast & Newsletter",
    description: "Grow your audience with a dedicated page for your podcast or newsletter that converts visitors into loyal subscribers.",
    category: "page",
    subcategory: "Media",
    accent: "purple",
    emoji: "🎙️",
    stepCount: 1,
    sectionCount: 7,
    steps: [
      {
        name: "Subscribe",
        type: "landing",
        sections: [
          hero("The [Topic] Show That [Specific Promise]", "Every [day/week], I break down [specific content] in [timeframe] or less. No fluff. Just the stuff that actually works.", "Subscribe Free →", "Join 47,000 subscribers · New episode every Tuesday"),
          stats("", [
            { number: "47K+", desc: "Subscribers" },
            { number: "312", desc: "Episodes" },
            { number: "#8", desc: "In category" },
            { number: "4.9★", desc: "Avg rating" },
          ]),
          benefits("What you'll get every week", [
            "The ONE insight from [topic] world that's actually worth your attention",
            "Real examples from [niche] leaders — not theoretical advice",
            "Under 10 minutes — designed for [audience] who are short on time",
            "Bonus: archive of 312 episodes, searchable by topic",
            "100% free. No sponsored content. No BS.",
          ]),
          press("As Heard On", ["The Tim Ferriss Show", "Morning Brew", "Product Hunt", "HackerNews", "Indie Hackers"]),
          testimonials([
            { name: "Alex P.", role: "Listener since 2021", quote: "I've recommended this to literally everyone I know. It's the only newsletter I read every single week." },
            { name: "Maya R.", role: "Subscriber", quote: "Better ROI on my attention than anything else I consume. Episode 287 alone changed how I run my business." },
            { name: "Tom B.", role: "8-year entrepreneur", quote: "This is what business education should look like. Condensed, practical, no wasted words." },
          ]),
          form("Get Your Free Subscription", "One email per week. No spam. Unsubscribe anytime.", "Subscribe →", ["name", "email"]),
          cta("Already have 47,000 readers. Join them free.", "Subscribe Now →", "No credit card. No spam. Just great [topic] content every week."),
        ],
      },
    ],
  },

  // 19. Coaching Discovery Call Funnel
  {
    id: "coaching-discovery-call",
    name: "Coaching Discovery Call",
    description: "Book high-quality discovery calls with pre-qualified prospects using a value-first landing page and application funnel.",
    category: "funnel",
    subcategory: "Coaching",
    accent: "gold",
    emoji: "🎯",
    stepCount: 3,
    sectionCount: 14,
    steps: [
      {
        name: "Value Page",
        type: "landing",
        sections: [
          urgencyBar("📅 Only 3 Spots Available This Month — Apply Now"),
          hero("I Help [Target Avatar] Go From [Problem] to [Specific Result] in [Timeframe]", "A proven system used by 200+ clients to [specific transformation] — without [common pain point].", "Apply for a Free Call →", "3 spots left this month · No commitment"),
          video("", "Watch: How I helped [client type] achieve [specific result]"),
          stats("Client results speak for themselves", [
            { number: "200+", desc: "Clients coached" },
            { number: "$2.4M", desc: "Revenue generated" },
            { number: "94%", desc: "Success rate" },
            { number: "12 weeks", desc: "Avg to results" },
          ]),
          benefits("What we'll cover on the call", [
            "Your exact situation — where you are and where you want to be",
            "The #1 thing holding you back (most clients are surprised by this)",
            "A custom roadmap for your specific goal",
            "Whether my program is a fit — and honest alternatives if it's not",
          ]),
          testimonials([
            { name: "Sarah M.", role: "Former client", quote: "I was skeptical going in. 90 days later, I'd [specific result]. The call alone gave me clarity I'd been chasing for years." },
            { name: "Michael K.", role: "Current client", quote: "I've worked with 4 coaches before. This is different. [Specific thing that's unique]. Results in the first 3 weeks." },
            { name: "Jennifer L.", role: "Alumni", quote: "Best investment I've made in my business. ROI in the first month. I only wish I'd done this sooner." },
          ]),
          guarantee("100% Valuable Call Guarantee", "If you don't leave our call with clarity and at least one actionable insight, I'll refund your time with a $100 gift card. That's how confident I am in this conversation.", "My Promise"),
          cta("Apply for Your Free Discovery Call", "Apply Now →", "3 spots available this month. Takes 2 minutes to apply."),
        ],
      },
      {
        name: "Application",
        type: "landing",
        sections: [
          hero("Tell Me About Your Situation", "Answer 5 quick questions so I can prepare for our call and make it as valuable as possible.", "", "Takes 2 minutes"),
          twoStepForm("Step 1: Quick Overview", "Tell Me More →", "Step 2: Your Goals", "Submit Application →", ["name", "email", "phone"]),
        ],
      },
      {
        name: "Booking Confirmation",
        type: "thank_you",
        sections: [
          hero("Application Received! Book Your Call Below 📅", "Pick a time that works for you. You'll get a confirmation email with Zoom link and prep questions.", "View My Calendar →", "Calls via Zoom · 45 minutes · Recorded with your permission"),
          benefits("Before our call, please", [
            "Block your calendar for 60 mins (we sometimes run long if it's valuable)",
            "Think about your #1 goal for the next 90 days",
            "Write down the 2-3 biggest obstacles currently in your way",
            "Check your email for the prep worksheet I'll send within 1 hour",
          ]),
        ],
      },
    ],
  },

  // 20. Community / Membership Page
  {
    id: "community-membership",
    name: "Community / Membership",
    description: "Launch a paid or free community with a page that shows the transformation, the people inside, and the exclusive access.",
    category: "page",
    subcategory: "Community",
    accent: "green",
    emoji: "🏆",
    stepCount: 1,
    sectionCount: 8,
    steps: [
      {
        name: "Join Community",
        type: "landing",
        sections: [
          hero("The Only [Niche] Community Where [Specific Transformation] is the Standard", "Join 2,400+ [target audience] who share strategies, hold each other accountable, and [specific outcome]. Doors open monthly.", "Join the Community →", "2,400+ members · $97/mo or $797/yr · Cancel anytime"),
          stats("", [
            { number: "2,400+", desc: "Active members" },
            { number: "47+", desc: "Countries" },
            { number: "$2.1M", desc: "Collectively earned" },
            { number: "4.9★", desc: "Member rating" },
          ]),
          benefits("What's included in your membership", [
            "Private Discord server: 24/7 access to 2,400+ members and experts",
            "Weekly live sessions: Q&A calls, hot seats, and implementation workshops",
            "Course library: 200+ hours of training on [specific topics]",
            "Member directory: find collaborators, clients, and accountability partners",
            "Monthly challenges: structured 30-day programs with prizes",
            "Job board: exclusive opportunities posted by community companies",
          ]),
          testimonials([
            { name: "Rachel T.", role: "Member since 2022", quote: "The ROI from one connection I made here paid for 4 years of membership. This community is genuinely different." },
            { name: "Marcus J.", role: "Founding member", quote: "I've been in 8 communities. This is the only one where I still show up 2 years later. The quality of people is unreal." },
            { name: "Elena K.", role: "Member", quote: "The live Q&A calls alone are worth 10x the price. Getting [expert name] to review my work in real-time is priceless." },
          ]),
          pricing("Choose Your Plan", "$97", "", [
            "Full community access", "All weekly live calls", "Course library (200+ hrs)", "Member directory", "Monthly challenges", "Job board access",
          ], "Join Monthly →"),
          faq([
            { question: "Who is this community for?", answer: "For [specific audience] who are serious about [specific outcome]. We're selective — please read our values before joining." },
            { question: "What if it's not for me?", answer: "Cancel within 7 days for a full refund. After that, cancel before your next billing cycle, no questions asked." },
            { question: "How active is the community?", answer: "Very. 200-300 messages per day. Weekly live sessions. Most members say it's the most active community they're in." },
            { question: "Is there a free trial?", answer: "No, but we have a 7-day money-back guarantee. We find that uncommitted trial users hurt community culture." },
          ]),
          guarantee("7-Day Money-Back Guarantee", "Join, explore everything, attend a live call. If it's not right for you, email us within 7 days for a full refund.", "Our Promise"),
          form("Join Now — Doors Close [Date]", "Enter your details to secure your spot:", "Complete My Application →", ["name", "email"]),
        ],
      },
    ],
  },

  // 21. Tripwire / Low-Ticket Offer
  {
    id: "tripwire-low-ticket",
    name: "Tripwire / Low-Ticket Offer",
    description: "Convert cold traffic with a $7-$47 irresistible offer that leads into your core product upsell.",
    category: "funnel",
    subcategory: "Sales",
    accent: "red",
    emoji: "🔥",
    stepCount: 4,
    sectionCount: 15,
    steps: [
      {
        name: "Tripwire Offer",
        type: "landing",
        sections: [
          urgencyBar("🔥 Special Offer: Get [Product] for Just $7 — Offer Expires in 1 Hour!", ""),
          countdown("This Offer Expires In", new Date(Date.now() + 3600000).toISOString().slice(0, 16)),
          hero("Get [High-Value Resource] for Just $7", "Everything you need to [specific outcome]. Normally $47 — get it for $7 for the next 60 minutes only.", "Yes! I Want This for $7 →", "Instant download · 100% money-back guarantee"),
          benefits("What you get for $7", [
            "[Deliverable 1]: [Specific thing they get] (Value: $27)",
            "[Deliverable 2]: [Specific thing they get] (Value: $47)",
            "[Deliverable 3]: [Specific thing they get] (Value: $97)",
            "Total value: $171. Yours today for just $7.",
          ]),
          testimonials([
            { name: "Tyler B.", role: "Customer", quote: "I've spent thousands on [topic] education. This $7 resource had more actionable stuff than courses I paid $500 for." },
          ]),
          guarantee("100% Money-Back Guarantee", "Try it for 30 days. If you don't get value, email us for a full $7 refund. No questions.", "30-Day Guarantee"),
          cta("Grab It for $7 Before It Goes Back to $47", "Yes — Get Instant Access for $7 →", "Offer expires when timer hits zero"),
        ],
      },
      {
        name: "OTO Upsell",
        type: "upsell",
        sections: [
          urgencyBar("⚡ One-Time Offer — This Page Will Not Appear Again", ""),
          orderBump("Wait — Upgrade to the Complete System for Just $37 More", "You've made a smart choice getting [tripwire]. Now let me show you how to get 10x better results, faster. Add the full [Core Product] training for just $37 (regular price: $197).", "$37", "Yes! Upgrade My Order →"),
          testimonials([
            { name: "Lisa M.", role: "Full Program Student", quote: "The upgrade was the best decision I made. The [specific module] alone changed my [specific metric] by [X%]." },
          ]),
          cta("No thanks — I'll stick with the basic version", "No thanks — I'll keep my original order only"),
        ],
      },
      {
        name: "Downsell",
        type: "downsell",
        sections: [
          hero("Okay — What About This Instead?", "I understand the full upgrade isn't for everyone. How about a 30-day trial of [Core Product] for just $17?", "Yes — Try It for $17 →", "Cancel anytime during the 30 days"),
          cta("No thanks — I don't want the trial", "No thanks, I'm good with what I have"),
        ],
      },
      {
        name: "Thank You / Delivery",
        type: "thank_you",
        sections: [
          hero("Payment Confirmed! Here's Your Instant Access 🎉", "Check your email for download links. Or click the button below to access your purchase immediately.", "Access My Purchase →", "Instant delivery · Check spam if not in inbox"),
          benefits("Your next steps", [
            "📧 Check your email for your receipt and access links",
            "📂 Download and save your [product] to your device",
            "👥 Join our private customer Facebook group for support",
            "📞 Questions? Reply to your confirmation email anytime",
          ]),
        ],
      },
    ],
  },

  // 22. Book / Author Landing Page
  {
    id: "book-author-landing",
    name: "Book Launch Page",
    description: "Launch your book with a page that drives pre-orders, free chapters, or Amazon reviews with credibility-driven design.",
    category: "page",
    subcategory: "Author",
    accent: "gold",
    emoji: "📚",
    stepCount: 1,
    sectionCount: 7,
    steps: [
      {
        name: "Book Landing",
        type: "landing",
        sections: [
          hero("[Book Title]: The [Category] Book That [Specific Promise]", "The definitive guide to [topic] — used by [audience] at [notable companies] to [specific outcome].", "Get the Book →", "#1 Bestseller in [Category] · 4.9★ from 2,400+ readers"),
          bio("[Author Name]", "Bestselling author & [Role]", "[Author Name] has [credentials and experience]. Their work has been featured in [publications] and helped [X people] [specific outcome]. [Book Title] is their [Xth] book."),
          benefits("What you'll discover inside", [
            "Chapter 3: The [counterintuitive insight] that [outcome]",
            "Chapter 7: A step-by-step framework for [specific situation]",
            "Chapter 12: How to [do hard thing] even if [common obstacle]",
            "Bonus appendix: The exact [tools/templates/scripts] used by top [professionals]",
            "Case study: How [real person] achieved [specific result] using this method",
          ]),
          press("Praise from Leaders", ["Wall Street Journal", "The Guardian", "TechCrunch", "Product Hunt", "Hacker News"]),
          testimonials([
            { name: "Oprah-style endorser", role: "Author, [Book Title]", quote: "One of the most important books written on [topic] in the last decade. Read it, then read it again." },
            { name: "Industry Leader", role: "CEO, [Company]", quote: "I've given this to my entire leadership team. The [specific framework] in chapter 9 alone changed how we operate." },
            { name: "Verified Reader", role: "★★★★★ Amazon Review", quote: "I finished it in one sitting. Haven't done that with a business book in years. Practical, specific, and actually useful." },
          ]),
          form("Download Free Chapter 1", "Get the first chapter free — no strings attached.", "Send Me Chapter 1 →", ["name", "email"]),
          cta("Order Your Copy Now", "Order on Amazon →", "Available on Amazon, Audible, and everywhere books are sold."),
        ],
      },
    ],
  },

  // 23. Real Estate / Local Service Landing
  {
    id: "real-estate-local-service",
    name: "Local Service Lead Gen",
    description: "Generate qualified local leads for real estate agents, contractors, consultants, and service businesses.",
    category: "page",
    subcategory: "Local",
    accent: "blue",
    emoji: "🏠",
    stepCount: 1,
    sectionCount: 6,
    steps: [
      {
        name: "Lead Gen",
        type: "landing",
        sections: [
          hero("Sell Your Home for [X%] More in [City] — Guaranteed", "We've helped 400+ [City] homeowners sell faster and for more than the market average. Get your free home valuation today.", "Get Free Valuation →", "No obligation · Results in 24 hours · Trusted by 400+ families"),
          stats("Our track record in [City]", [
            { number: "400+", desc: "Homes sold" },
            { number: "27%", desc: "Above asking avg" },
            { number: "18 days", desc: "Avg days to sell" },
            { number: "4.9★", desc: "Zillow rating" },
          ]),
          benefits("Why [City] homeowners choose us", [
            "Exclusive buyer network: 2,400+ pre-approved buyers in our database",
            "Professional staging included at no extra cost — avg adds $18K to sale price",
            "Marketing package: professional photography, 3D tour, and social ads",
            "Negotiation expertise: we average 27% above the asking price in this market",
            "Transparent communication: you know everything, always",
          ]),
          testimonials([
            { name: "The Johnson Family", role: "[City] Homeowner", quote: "We got 14 offers in 48 hours and sold for $47K over asking. [Agent name] knew exactly how to price and market our home." },
            { name: "Maria C.", role: "Seller, [Neighborhood]", quote: "From listing to closing in 11 days. [Agent name]'s buyer network is the real thing — she had a buyer before the MLS hit." },
            { name: "Robert & Lisa T.", role: "Relocating sellers", quote: "Moving states is stressful. [Agent] made the sale the easy part. Clear communication, no surprises, and $31K over asking." },
          ]),
          form("Get Your Free Home Valuation", "Takes 60 seconds. No obligation.", "Get My Free Valuation →", ["name", "email", "phone"]),
          cta("Free, No-Obligation Consultation", "Schedule a Free Call →", "Let's talk about your home and timeline. No pressure, just expert advice."),
        ],
      },
    ],
  },

  // 24. Digital Agency / Freelancer Portfolio
  {
    id: "digital-agency-portfolio",
    name: "Agency Service Page",
    description: "Convert visitors into agency clients with a service-focused page featuring case studies, process, and a strong CTA.",
    category: "page",
    subcategory: "Agency",
    accent: "cyan",
    emoji: "🎨",
    stepCount: 1,
    sectionCount: 7,
    steps: [
      {
        name: "Services",
        type: "landing",
        sections: [
          hero("We Build [Service] That [Specific Outcome] for [Target Client]", "A [city]-based [agency type] that's helped 80+ [client type] increase [metric] by an average of [X%] in [timeframe].", "Get a Free Audit →", "80+ clients served · $8M+ revenue generated · Results or refund"),
          stats("", [
            { number: "80+", desc: "Clients served" },
            { number: "$8M+", desc: "Revenue generated" },
            { number: "340%", desc: "Avg ROI" },
            { number: "48 hrs", desc: "To first deliverable" },
          ]),
          benefits("Our services", [
            "[Service 1]: [Specific deliverable] that [specific outcome]",
            "[Service 2]: [Specific deliverable] that [specific outcome]",
            "[Service 3]: [Specific deliverable] that [specific outcome]",
            "Strategy sprint: 90-minute session to map your exact growth plan",
            "Reporting: you always know what's working and why",
          ]),
          comparison("What sets us apart", ["", "Us", "Typical Agency", "Freelancer"], [
            ["Dedicated account manager", "✅", "Sometimes", "❌"],
            ["Data-driven reporting", "✅", "Basic", "❌"],
            ["Results guarantee", "✅ Money back", "❌", "❌"],
            ["Response time", "< 4 hours", "2-3 days", "Days to weeks"],
            ["Specialization", "Deep niche", "Generalist", "Varies"],
          ]),
          testimonials([
            { name: "Emma L.", role: "CEO, [Company Type]", quote: "They generated 340% ROI in the first 90 days. More importantly, they explained everything — I actually understood my own marketing for the first time." },
            { name: "James T.", role: "Founder, SaaS startup", quote: "Hired them after 3 failed agencies. The difference: they care about results, not just deliverables. 4.1x ROAS in month 2." },
            { name: "Sophie M.", role: "E-commerce brand owner", quote: "Went from $40K to $180K/mo revenue in 6 months. They know their stuff and they actually deliver." },
          ]),
          press("Featured In", ["Forbes", "Entrepreneur", "Marketing Week", "Business Insider", "Inc. 5000"]),
          form("Get Your Free Growth Audit", "We'll analyze your current [channel] and show you exactly where the opportunity is.", "Get My Free Audit →", ["name", "email", "phone"]),
        ],
      },
    ],
  },

];

export function getTemplateById(id: string): PageTemplate | undefined {
  return PAGE_TEMPLATES.find(t => t.id === id);
}

export function getFunnelTemplates(): PageTemplate[] {
  return PAGE_TEMPLATES.filter(t => t.category === "funnel");
}

export function getPageTemplates(): PageTemplate[] {
  return PAGE_TEMPLATES.filter(t => t.category === "page");
}
