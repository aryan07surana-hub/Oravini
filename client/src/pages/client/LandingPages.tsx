import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import ClientLayout from "@/components/layout/ClientLayout";
import {
  Plus, Globe, Eye, Users, Trash2, Edit3, Copy, Check,
  ExternalLink, LayoutTemplate, Loader2, Zap, FileText,
  MonitorPlay, Megaphone, Timer, Gift, Link2, X,
  BookOpen, GraduationCap, Headphones, Target, ShoppingCart,
  HelpCircle, Award, Star, Heart, Flame, FlaskConical,
  Search, ChevronRight, BarChart2,
} from "lucide-react";

const GOLD = "#d4b461";
const BG = "#040406";
const CARD = "#0c0c10";

const ACCENT_MAP: Record<string, string> = {
  gold: "#d4b461", purple: "#a855f7", blue: "#3b82f6",
  green: "#22c55e", red: "#ef4444", orange: "#f97316", cyan: "#06b6d4",
};

const SECTION_DISPLAY: Record<string, { label: string; color: string }> = {
  hero:         { label: "Hero",         color: "#d4b461" },
  video:        { label: "Video",        color: "#a855f7" },
  benefits:     { label: "Benefits",     color: "#3b82f6" },
  testimonials: { label: "Reviews",      color: "#22c55e" },
  cta:          { label: "CTA",          color: "#f97316" },
  form:         { label: "Opt-in Form",  color: "#06b6d4" },
  countdown:    { label: "Countdown",    color: "#ef4444" },
  pricing:      { label: "Pricing",      color: "#8b5cf6" },
  faq:          { label: "FAQ",          color: "#64748b" },
  bio:          { label: "Bio",          color: "#ec4899" },
  divider:      { label: "Divider",      color: "#374151" },
};

const CATEGORIES = [
  { id: "all",     label: "All" },
  { id: "leads",   label: "Capture Leads" },
  { id: "sell",    label: "Sell" },
  { id: "events",  label: "Events" },
  { id: "service", label: "Services" },
  { id: "content", label: "Content" },
];

const TEMPLATE_META: Record<string, { label: string; icon: any; desc: string; color: string }> = {
  vsl:         { label: "Video Sales Letter",        icon: MonitorPlay,   desc: "Hero + VSL video + benefits + CTA",            color: "#d4b461" },
  webinar:     { label: "Webinar Registration",      icon: Megaphone,     desc: "Hero + countdown + form",                      color: "#3b82f6" },
  launch:      { label: "Product Launch",            icon: Zap,           desc: "Hero + video + pricing + testimonials",         color: "#a855f7" },
  lead_magnet: { label: "Lead Magnet",               icon: Gift,          desc: "Hero + benefits + opt-in form",                 color: "#22c55e" },
  waitlist:    { label: "Waitlist",                  icon: Timer,         desc: "Coming soon + countdown + form",               color: "#f97316" },
  link_bio:    { label: "Link in Bio",               icon: Link2,         desc: "Bio + links + social proof",                   color: "#06b6d4" },
  coaching:    { label: "Coaching Sales Page",       icon: Target,        desc: "Application-based high-ticket coaching offer",  color: "#d4b461" },
  challenge:   { label: "5-Day Challenge",           icon: Flame,         desc: "Free challenge opt-in with countdown",          color: "#ef4444" },
  saas_trial:  { label: "SaaS Free Trial",           icon: FlaskConical,  desc: "Product hero + features + social proof",        color: "#06b6d4" },
  affiliate:   { label: "Affiliate Review Page",     icon: Star,          desc: "Honest review + demo + strong CTA",             color: "#f97316" },
  podcast:     { label: "Podcast Opt-in",            icon: Headphones,    desc: "Show intro + episode opt-in + subscribe",       color: "#8b5cf6" },
  course:      { label: "Online Course Sales",       icon: GraduationCap, desc: "Curriculum + testimonials + pricing",           color: "#a855f7" },
  upsell:      { label: "Upsell / OTO Page",         icon: ShoppingCart,  desc: "One-time offer with urgency timer",             color: "#ef4444" },
  thankyou:    { label: "Thank You Page",            icon: Heart,         desc: "Confirmation + next steps + upsell",            color: "#22c55e" },
  book:        { label: "Book Funnel",               icon: BookOpen,      desc: "Free + shipping book offer",                    color: "#d4b461" },
  quiz:        { label: "Quiz Opt-in",               icon: HelpCircle,    desc: "Quiz hook + email capture for results",         color: "#3b82f6" },
  tripwire:    { label: "Tripwire Offer",            icon: Zap,           desc: "Low-ticket irresistible offer page",            color: "#f97316" },
  community:   { label: "Community Invite",          icon: Users,         desc: "Membership + benefits + testimonials",          color: "#22c55e" },
  masterclass: { label: "Masterclass Registration",  icon: Award,         desc: "Free class registration + urgency",             color: "#d4b461" },
  case_study:  { label: "Case Study",                icon: BarChart2,     desc: "Client story + strategy + CTA",                 color: "#06b6d4" },
};

const TEMPLATES_LIST = [
  {
    id: "vsl",
    label: "Video Sales Letter",
    desc: "Sell your offer with a compelling video + benefits",
    icon: MonitorPlay,
    color: "#d4b461",
    category: "sell",
    tags: ["Coaches", "Course Creators", "Service Providers"],
    guidance: "Best for coaches, course creators, and service providers with a proven video pitch. Add your VSL link in the Video section, swap out placeholder benefits with your real ones, and customize the CTA to match your offer. Works great when paired with a Facebook or YouTube ad.",
    sections: [
      { id: "s1", type: "hero", data: { badge: "Limited Spots Available", headline: "Transform Your Results in 30 Days", subheadline: "Without the guesswork. Even if you're starting from zero.", ctaText: "Watch the Video" } },
      { id: "s2", type: "video", data: { videoUrl: "", caption: "Watch this short video to see how it works" } },
      { id: "s3", type: "benefits", data: { title: "Here's What You'll Discover", items: ["How to get results fast without complicated strategies", "The exact system used by top creators", "Why most people fail and how to avoid it"] } },
      { id: "s4", type: "cta", data: { headline: "Ready to Get Started?", subtext: "Join hundreds of clients who've already transformed their results.", ctaText: "Yes, I'm Ready!" } },
    ],
  },
  {
    id: "webinar",
    label: "Webinar Registration",
    desc: "Drive registrations for your live or recorded webinar",
    icon: Megaphone,
    color: "#3b82f6",
    category: "events",
    tags: ["Education", "Lead Generation", "B2B"],
    guidance: "Use this when you're running a live or recorded webinar. Set the countdown to your event date, customize the 'What You'll Learn' bullets for your presentation, and add your face/bio so attendees trust you before signing up. Works well for weekly webinars with evergreen replay.",
    sections: [
      { id: "s1", type: "hero", data: { badge: "Free Live Training", headline: "Master [Topic] in One Session", subheadline: "Join us live and discover the exact strategies top creators use.", showForm: true, ctaText: "Reserve My Seat", fields: ["name", "email"] } },
      { id: "s2", type: "countdown", data: { countdownTitle: "Event Starts In", targetDate: new Date(Date.now() + 7 * 86400000).toISOString() } },
      { id: "s3", type: "benefits", data: { title: "What You'll Learn", items: ["Strategy #1: How to grow fast", "Strategy #2: How to monetize", "Strategy #3: How to scale"] } },
      { id: "s4", type: "bio", data: { name: "Your Name", role: "Expert & Founder", bio: "Brief description of your background and why you're the right person to teach this." } },
    ],
  },
  {
    id: "launch",
    label: "Product Launch",
    desc: "Build hype and drive sales for your product",
    icon: Zap,
    color: "#a855f7",
    category: "sell",
    tags: ["Product Launch", "Creators", "Info Products"],
    guidance: "Built for new product launches with an existing audience. Swap in your product name and VSL, set the real price and bonuses in the pricing section, and add genuine testimonials from beta testers. The countdown on a separate upsell page works great with this.",
    sections: [
      { id: "s1", type: "hero", data: { badge: "Now Available", headline: "Introducing [Product Name]", subheadline: "The all-in-one solution for [target audience] who want [outcome].", ctaText: "Get Instant Access" } },
      { id: "s2", type: "video", data: { videoUrl: "", caption: "See it in action" } },
      { id: "s3", type: "pricing", data: { pricingTitle: "One Simple Price", price: "$97", originalPrice: "$197", pricingFeatures: ["Lifetime access", "All future updates", "Private community", "30-day guarantee"], ctaText: "Get Instant Access" } },
      { id: "s4", type: "testimonials", data: { testimonials: [{ name: "Sarah K.", role: "Entrepreneur", quote: "This changed everything for my business. Results in the first week!" }, { name: "Marcus T.", role: "Creator", quote: "The best investment I've made. Highly recommend." }, { name: "Lisa M.", role: "Coach", quote: "Finally, something that actually delivers what it promises." }] } },
      { id: "s5", type: "cta", data: { headline: "Don't Miss Your Chance", subtext: "This offer won't last forever. Lock in your price now.", ctaText: "Join Now" } },
    ],
  },
  {
    id: "lead_magnet",
    label: "Lead Magnet",
    desc: "Capture leads with a free resource or guide",
    icon: Gift,
    color: "#22c55e",
    category: "leads",
    tags: ["List Building", "Any Niche", "Beginner-Friendly"],
    guidance: "Perfect for growing your email list with a free guide, checklist, or template. Keep the hero headline benefit-focused (outcome, not topic), list 3–5 specific things they'll get inside, and make sure your welcome email delivers the resource instantly. Works with any niche.",
    sections: [
      { id: "s1", type: "hero", data: { badge: "Free Download", headline: "Get the Free [Resource Name]", subheadline: "The step-by-step guide to [outcome] in [timeframe].", showForm: true, ctaText: "Send Me the Guide", fields: ["name", "email"] } },
      { id: "s2", type: "benefits", data: { title: "Inside You'll Discover", items: ["Secret #1 that most people overlook", "The exact framework we use with clients", "Templates and worksheets included"] } },
      { id: "s3", type: "bio", data: { name: "Your Name", role: "Founder & Expert", bio: "I've helped hundreds of people achieve [result]. This guide distills everything into a simple system." } },
    ],
  },
  {
    id: "waitlist",
    label: "Waitlist",
    desc: "Build buzz and collect leads before you launch",
    icon: Timer,
    color: "#f97316",
    category: "leads",
    tags: ["Pre-Launch", "Products", "SaaS"],
    guidance: "Use this before a launch when you're not quite ready to sell. The countdown creates urgency and the benefits section builds anticipation. Connect your email provider to tag waitlist subscribers for early access. Update the countdown date to match your actual launch.",
    sections: [
      { id: "s1", type: "hero", data: { badge: "Coming Soon", headline: "Something Big is Coming", subheadline: "We're building the [product/service] that will change the way you [outcome]. Be the first to know.", showForm: true, ctaText: "Join the Waitlist", fields: ["name", "email"] } },
      { id: "s2", type: "countdown", data: { countdownTitle: "Launching In", targetDate: new Date(Date.now() + 30 * 86400000).toISOString() } },
      { id: "s3", type: "benefits", data: { title: "What Waitlist Members Get", items: ["Early bird pricing (save 40%)", "Priority access before public launch", "Exclusive founding member bonus"] } },
    ],
  },
  {
    id: "link_bio",
    label: "Link in Bio",
    desc: "Your personal hub with links and social proof",
    icon: Link2,
    color: "#06b6d4",
    category: "content",
    tags: ["Content Creators", "Instagram", "TikTok"],
    guidance: "Designed for Instagram, TikTok, or YouTube bios. Replace each CTA card with your top 3–4 offers or resources. Keep each one ultra-clear with a single action. Update your name and bio with keywords your audience searches for.",
    sections: [
      { id: "s1", type: "bio", data: { name: "Your Name", role: "Creator & Entrepreneur", bio: "I help [audience] achieve [outcome]. Follow along for tips, strategies, and free resources." } },
      { id: "s2", type: "cta", data: { headline: "Free Training", subtext: "Learn my #1 strategy for [outcome] in 60 minutes.", ctaText: "Watch Free Training" } },
      { id: "s3", type: "cta", data: { headline: "Work With Me", subtext: "Apply for 1:1 coaching or my group program.", ctaText: "Apply Now" } },
      { id: "s4", type: "cta", data: { headline: "Free Resource", subtext: "Download my step-by-step guide to [topic].", ctaText: "Get the Guide" } },
    ],
  },
  {
    id: "coaching",
    label: "Coaching Sales Page",
    desc: "High-ticket coaching application page",
    icon: Target,
    color: "#d4b461",
    category: "service",
    tags: ["High Ticket", "Application-Based", "Service Providers"],
    guidance: "Built specifically for high-ticket coaching applications. Use the bio section to establish authority, let testimonials show results (not just praise), and make the pricing section reference 'investment' rather than 'cost' to reframe the conversation. The FAQ handles common objections.",
    sections: [
      { id: "s1", type: "hero", data: { badge: "Limited Spots — Applications Open", headline: "Work With Me 1:1 and Transform Your [Outcome]", subheadline: "This is an application-only program. Only [X] spots available each month.", ctaText: "Apply Now" } },
      { id: "s2", type: "bio", data: { name: "Your Name", role: "Business Coach & Mentor", bio: "I've spent [X] years helping [audience] achieve [result]. My clients have [specific achievements]. Here's why I'm the right coach for you." } },
      { id: "s3", type: "testimonials", data: { testimonials: [{ name: "James R.", role: "Entrepreneur", quote: "In 90 days I went from [before] to [after]. The investment paid for itself 10x over." }, { name: "Priya S.", role: "Coach", quote: "The strategies we implemented together tripled my revenue in 6 months." }, { name: "Tom W.", role: "Founder", quote: "Best coaching experience I've ever had. Clear, direct, and results-driven." }] } },
      { id: "s4", type: "benefits", data: { title: "What We Work On Together", items: ["Nail your positioning and messaging so clients come to you", "Build systems that generate consistent leads without burnout", "Price your offers so they reflect your true value", "Weekly 1:1 calls + Slack access between sessions"] } },
      { id: "s5", type: "pricing", data: { pricingTitle: "Your Investment", price: "$2,997/mo", originalPrice: "$4,500/mo", pricingFeatures: ["2 x 60-min 1:1 calls per month", "Unlimited Slack access", "Custom strategy roadmap", "Resource library access", "3-month minimum commitment"], ctaText: "Apply to Work Together" } },
      { id: "s6", type: "faq", data: { faqs: [{ q: "Who is this coaching for?", a: "This is for [audience] who are serious about [outcome] and ready to invest in their growth." }, { q: "How do I know if this is right for me?", a: "If you're stuck at [stage] and want to reach [goal], this program is designed exactly for you." }, { q: "What's your refund policy?", a: "Due to the nature of personalized coaching, all sales are final. However, I'm committed to your results." }] } },
    ],
  },
  {
    id: "challenge",
    label: "5-Day Challenge",
    desc: "Free challenge opt-in with countdown timer",
    icon: Flame,
    color: "#ef4444",
    category: "events",
    tags: ["List Building", "Community", "Engagement"],
    guidance: "Free challenges build email lists and warm up audiences fast. Set the countdown to 3–7 days out, structure the benefits as daily outcomes ('Day 1: You'll have X done'), and make your bio section human and relatable. Add the paid offer as a natural next step after Day 5.",
    sections: [
      { id: "s1", type: "hero", data: { badge: "Free 5-Day Challenge", headline: "Join the Free 5-Day [Topic] Challenge", subheadline: "Build [skill/result] in just 20 minutes a day — starting [date].", showForm: true, ctaText: "Join the Challenge", fields: ["name", "email"] } },
      { id: "s2", type: "countdown", data: { countdownTitle: "Challenge Kicks Off In", targetDate: new Date(Date.now() + 5 * 86400000).toISOString() } },
      { id: "s3", type: "benefits", data: { title: "What You'll Accomplish Each Day", items: ["Day 1: [Quick win — something tangible you build/do]", "Day 2: [Next step that builds on Day 1]", "Day 3: [Midpoint breakthrough moment]", "Day 4: [Advanced application of skills learned]", "Day 5: [Final outcome — ready to launch/use/implement]"] } },
      { id: "s4", type: "bio", data: { name: "Your Name", role: "Your Credentials", bio: "I created this challenge because I've seen too many [audience] struggle with [problem]. In 5 days we're going to change that — together." } },
    ],
  },
  {
    id: "saas_trial",
    label: "SaaS Free Trial",
    desc: "Software product page with trial CTA",
    icon: FlaskConical,
    color: "#06b6d4",
    category: "leads",
    tags: ["SaaS", "Software", "B2B"],
    guidance: "Best for SaaS tools, apps, or software with a free trial. Lead with a pain-focused headline (not your product name), use the benefits section to show 3–5 specific use cases, and keep pricing clear with a highlighted recommended plan. Add social proof logos above the fold if you have them.",
    sections: [
      { id: "s1", type: "hero", data: { badge: "No Credit Card Required", headline: "[Product Name] Makes [Pain Point] Effortless", subheadline: "Start your 14-day free trial. Set up in 5 minutes. Cancel anytime.", ctaText: "Start Free Trial" } },
      { id: "s2", type: "benefits", data: { title: "Everything You Need to [Core Outcome]", items: ["Feature 1: [What it does + benefit]", "Feature 2: [What it does + benefit]", "Feature 3: [What it does + benefit]", "Feature 4: [What it does + benefit]", "Integrates with 100+ tools you already use"] } },
      { id: "s3", type: "testimonials", data: { testimonials: [{ name: "Alicia M.", role: "Marketing Director", quote: "We replaced 3 tools with this one. Saved $400/month and the team loves it." }, { name: "Dev P.", role: "Founder", quote: "Set up in under an hour, saw results by day 3. Wish I'd found this sooner." }, { name: "Rachel K.", role: "Operations Lead", quote: "The automation alone saves us 10 hours a week. Completely worth it." }] } },
      { id: "s4", type: "pricing", data: { pricingTitle: "Simple, Transparent Pricing", price: "$49/mo", originalPrice: "$79/mo", pricingFeatures: ["Unlimited projects", "Up to 10 team members", "All integrations included", "Priority support", "14-day free trial"], ctaText: "Start Free Trial" } },
      { id: "s5", type: "faq", data: { faqs: [{ q: "Is there really no credit card required?", a: "Correct — start your free trial with just your email. Add a card only when you're ready to upgrade." }, { q: "Can I cancel anytime?", a: "Yes, cancel anytime from your dashboard. No fees, no questions asked." }, { q: "What happens after my trial ends?", a: "You'll be prompted to choose a plan. If you don't, your account pauses (data is saved for 30 days)." }] } },
    ],
  },
  {
    id: "affiliate",
    label: "Affiliate Review Page",
    desc: "Honest product review with affiliate CTA",
    icon: Star,
    color: "#f97316",
    category: "sell",
    tags: ["Affiliates", "Review Sites", "Content Creators"],
    guidance: "Use this when promoting someone else's product as an affiliate. Be genuinely honest in the hero (review framing converts better than pure hype), demonstrate real usage in the video, and stack your affiliate bonuses in the benefits section to give buyers a reason to purchase through your link.",
    sections: [
      { id: "s1", type: "hero", data: { badge: "Honest Review", headline: "Is [Product Name] Worth It? My Honest Review", subheadline: "I tested it for [X] days — here's exactly what I found, the good and the bad.", ctaText: "See My Verdict" } },
      { id: "s2", type: "video", data: { videoUrl: "", caption: "My full walkthrough and review — watch before you buy" } },
      { id: "s3", type: "benefits", data: { title: "What's Inside [Product Name]", items: ["Module 1: [What it covers + your honest take]", "Module 2: [What it covers + your honest take]", "Bonus: [Affiliate bonus you're adding]", "Bonus: [Second bonus to sweeten the deal]", "The one thing I'd change if I could"] } },
      { id: "s4", type: "testimonials", data: { testimonials: [{ name: "My Result", role: "After [X] days of testing", quote: "Here's the specific outcome I got: [result]. Here's what I liked most and what I'd warn you about." }, { name: "Community Member", role: "Independent buyer", quote: "I bought this without the review and got [result]. Would buy again." }] } },
      { id: "s5", type: "cta", data: { headline: "Ready to Try [Product Name]?", subtext: "Use my link below and you'll also get [your exclusive bonus]. Not available anywhere else.", ctaText: "Get [Product] + My Bonuses →" } },
    ],
  },
  {
    id: "podcast",
    label: "Podcast Opt-in",
    desc: "Podcast show page with email capture",
    icon: Headphones,
    color: "#8b5cf6",
    category: "content",
    tags: ["Podcasters", "Audio Content", "Audience Growth"],
    guidance: "Great for podcast show pages and episode opt-ins. Put your most episode-converting hook in the hero, use the benefits section to list what makes your show unique (not generic), and offer a specific 'starter episode' download to capture emails from casual visitors.",
    sections: [
      { id: "s1", type: "hero", data: { badge: "Top-Rated Podcast", headline: "[Podcast Name] — [Tagline]", subheadline: "Weekly insights for [audience] who want [outcome]. No fluff, just what works.", ctaText: "Listen Now" } },
      { id: "s2", type: "bio", data: { name: "Your Name", role: "Host of [Podcast Name]", bio: "I started this podcast because [reason]. Every week I interview [guests] and share [what makes it unique]. [X]+ episodes, [X]+ listeners." } },
      { id: "s3", type: "benefits", data: { title: "What You'll Get from Every Episode", items: ["One actionable strategy you can implement same-day", "Honest conversations with [type of guests]", "Zero ads — just pure, high-signal content", "New episodes every [day] at [time]"] } },
      { id: "s4", type: "form", data: { formTitle: "Get My Top Episode Free", formSubtext: "Enter your email and I'll send you the #1 episode to start with.", ctaText: "Send Me the Episode", fields: ["email"] } },
      { id: "s5", type: "testimonials", data: { testimonials: [{ name: "Listener Review", role: "Apple Podcasts ⭐⭐⭐⭐⭐", quote: "This podcast changed how I think about [topic]. Mandatory listening for anyone in [niche]." }, { name: "Another Listener", role: "Spotify ⭐⭐⭐⭐⭐", quote: "Every episode is packed. I take notes on every single one. Best podcast in [category]." }] } },
    ],
  },
  {
    id: "course",
    label: "Online Course Sales",
    desc: "Full course sales page with curriculum + pricing",
    icon: GraduationCap,
    color: "#a855f7",
    category: "sell",
    tags: ["Course Creators", "Educators", "$47–$2000 Offers"],
    guidance: "Optimized for online courses from $47 to $2,000+. Open with a transformation promise in the hero, show the full curriculum in benefits (students buy outcomes, not lessons), place your strongest testimonial directly above the pricing section, and use the FAQ to neutralize common doubts before checkout.",
    sections: [
      { id: "s1", type: "hero", data: { badge: "Enrollment Now Open", headline: "Master [Topic] in [Timeframe] — Even If You're Starting From Scratch", subheadline: "[X]+ students already enrolled. Learn at your own pace with lifetime access.", ctaText: "Enroll Now" } },
      { id: "s2", type: "video", data: { videoUrl: "", caption: "Watch the full course preview" } },
      { id: "s3", type: "benefits", data: { title: "What You'll Learn (Curriculum Overview)", items: ["Module 1: Foundation — [Core concept and outcome]", "Module 2: Strategy — [Second key outcome]", "Module 3: Execution — [Third key outcome]", "Module 4: Advanced — [Advanced concept]", "Module 5: Scale — [How to grow from here]", "Bonus: [Extra bonus module or resource]"] } },
      { id: "s4", type: "testimonials", data: { testimonials: [{ name: "Student 1", role: "Course Graduate", quote: "I finished Module 3 and immediately got [result]. The course paid for itself within [timeframe]." }, { name: "Student 2", role: "Course Graduate", quote: "Clear, practical, and actually works. I went from [before] to [after] in just [timeframe]." }, { name: "Student 3", role: "Course Graduate", quote: "I've taken 10 courses on [topic]. This is the only one that actually got me [result]." }] } },
      { id: "s5", type: "pricing", data: { pricingTitle: "Enroll Today", price: "$497", originalPrice: "$997", pricingFeatures: ["Lifetime access to all modules", "All future updates included", "Private student community", "Bonus resource library", "30-day satisfaction guarantee"], ctaText: "Enroll Now — $497" } },
      { id: "s6", type: "faq", data: { faqs: [{ q: "How long do I have access?", a: "Lifetime. Buy once, access forever including all future updates." }, { q: "Is there a refund policy?", a: "Yes — if you complete the first two modules and aren't satisfied, email us within 30 days for a full refund." }, { q: "How long does the course take?", a: "Most students complete the core modules in [X] weeks at [X] hours/week. You set your own pace." }] } },
      { id: "s7", type: "cta", data: { headline: "Ready to Transform Your [Skill/Career]?", subtext: "Join [X]+ students. Enrollment closes [date or 'when spots fill'].", ctaText: "Yes, I'm Ready to Enroll" } },
    ],
  },
  {
    id: "upsell",
    label: "Upsell / OTO Page",
    desc: "One-time offer page shown post-purchase",
    icon: ShoppingCart,
    color: "#ef4444",
    category: "sell",
    tags: ["Upsell Flow", "OTO", "Existing Customers"],
    guidance: "Place this page immediately after a purchase confirmation. The headline must acknowledge the completed purchase before making the offer. Keep the video short (under 3 minutes), make the countdown real (15 minutes works well with a cookie-based timer), and make 'Yes' easier than 'No' in your CTA.",
    sections: [
      { id: "s1", type: "hero", data: { badge: "Special One-Time Offer — Do Not Close This Page", headline: "Wait! Your Order Is Not Complete", subheadline: "Upgrade now and unlock [benefit]. This offer disappears when you leave this page and is never offered again.", ctaText: "Yes! Upgrade My Order →" } },
      { id: "s2", type: "video", data: { videoUrl: "", caption: "Watch this 2-minute video before you decide (it's worth it)" } },
      { id: "s3", type: "benefits", data: { title: "Add This and You Also Get:", items: ["[Bonus 1] — normally $[value], yours free today", "[Bonus 2] — the fastest path to [outcome]", "[Bonus 3] — exclusive to upgrade customers only", "Priority support and implementation help"] } },
      { id: "s4", type: "countdown", data: { countdownTitle: "This Offer Expires In", targetDate: new Date(Date.now() + 15 * 60000).toISOString() } },
      { id: "s5", type: "cta", data: { headline: "Add to My Order — Yes!", subtext: "No, I don't want this upgrade. I understand this offer goes away forever when I click no.", ctaText: "Yes! Add This for $[price] →" } },
    ],
  },
  {
    id: "thankyou",
    label: "Thank You Page",
    desc: "Post-purchase confirmation with next steps",
    icon: Heart,
    color: "#22c55e",
    category: "content",
    tags: ["Post-Purchase", "Welcome", "Onboarding"],
    guidance: "This page loads right after opt-in or purchase. Thank the user warmly, confirm what happens next, and immediately present your logical next offer. If you're building a list, use this page to set expectations for your email sequence. Add a community invite to reduce churn.",
    sections: [
      { id: "s1", type: "hero", data: { badge: "You're In!", headline: "Welcome to [Program/Community]! You Made It.", subheadline: "Check your inbox — we've sent your confirmation and everything you need to get started.", ctaText: "Join the Community" } },
      { id: "s2", type: "bio", data: { name: "Your Name", role: "Founder", bio: "A personal note: I'm so glad you're here. I've seen what happens when people take action and I can't wait to see your results. Here's exactly what to do next." } },
      { id: "s3", type: "benefits", data: { title: "Your Next 3 Steps", items: ["Step 1: Check your inbox — your login details / download link is there now", "Step 2: Join our private community and introduce yourself", "Step 3: Complete Module 1 / Day 1 before [timeframe] — it takes 20 minutes"] } },
      { id: "s4", type: "cta", data: { headline: "Want to Get Results Faster?", subtext: "Customers who add [upgrade] see results in half the time. One-time offer, not available anywhere else.", ctaText: "Yes, I Want to Fast-Track My Results" } },
    ],
  },
  {
    id: "book",
    label: "Book Funnel",
    desc: "Free + shipping book offer page",
    icon: BookOpen,
    color: "#d4b461",
    category: "sell",
    tags: ["Authors", "Physical + Digital", "List Building"],
    guidance: "The classic 'free + shipping' funnel works best for authors with a physical book. Lead with the transformation the book delivers (not the book title), show the real content highlights in benefits, and price shipping at cost ($7.95 for US is standard). This template converts well to a digital download variant too.",
    sections: [
      { id: "s1", type: "hero", data: { badge: "FREE + Shipping", headline: "Get Your FREE Copy of '[Book Title]'", subheadline: "Discover [core transformation] in [X] chapters. Just cover the $7.95 shipping — I'll pay for the book.", ctaText: "Claim My Free Book" } },
      { id: "s2", type: "benefits", data: { title: "Inside the Book You'll Discover", items: ["Chapter 1: [Core insight and what changes after reading it]", "Chapter 3: [Breakthrough concept most people never figure out]", "Chapter 5: [The strategy that produced [result]]", "Chapter 7: [The framework for [outcome]]", "Plus: [Bonus worksheet / resource included]"] } },
      { id: "s3", type: "bio", data: { name: "Author Name", role: "Author & [Title]", bio: "I wrote this book after [story]. In [X] years I've helped [X] people [result]. Everything I learned is in these pages — and I want you to have it free." } },
      { id: "s4", type: "testimonials", data: { testimonials: [{ name: "Reader 1", role: "Amazon ⭐⭐⭐⭐⭐", quote: "I read this in one sitting. By page 40 I already had [result]. This book is worth 100x what you pay for it." }, { name: "Reader 2", role: "Verified Buyer", quote: "Gave this to my entire team. The [key insight] chapter alone changed how we operate." }, { name: "Reader 3", role: "Amazon ⭐⭐⭐⭐⭐", quote: "Clear, actionable, and zero fluff. The [chapter] chapter alone is worth the price of shipping." }] } },
      { id: "s5", type: "pricing", data: { pricingTitle: "Claim Your Free Book", price: "$0", originalPrice: "$24.99", pricingFeatures: ["Physical book shipped to your door", "Free digital PDF included", "Bonus: [Extra resource]", "Just pay $7.95 shipping"], ctaText: "Yes! Send Me the Free Book" } },
    ],
  },
  {
    id: "quiz",
    label: "Quiz Opt-in",
    desc: "Quiz hook with email capture for personalized results",
    icon: HelpCircle,
    color: "#3b82f6",
    category: "leads",
    tags: ["High Opt-in Rate", "Personalization", "Lead Gen"],
    guidance: "Quizzes are one of the highest-converting opt-in formats. Write your quiz title as a question your audience is dying to know the answer to, gate the results behind an email opt-in, and deliver a genuinely useful personalized result. Use the bio section to explain why you built the quiz.",
    sections: [
      { id: "s1", type: "hero", data: { badge: "Free 2-Minute Quiz", headline: "What's Your [Topic] Type?", subheadline: "Answer 7 quick questions and discover [personalized insight + what to do about it].", ctaText: "Take the Quiz Now" } },
      { id: "s2", type: "benefits", data: { title: "After Taking the Quiz, You'll Know:", items: ["Your #1 [topic] block and exactly how to overcome it", "The specific strategy that matches your personality and situation", "A custom action plan tailored to your results", "Why generic advice doesn't work for your type"] } },
      { id: "s3", type: "form", data: { formTitle: "Enter Your Email to See Your Results", formSubtext: "We'll email you your personalized breakdown and a custom resource based on your quiz type.", ctaText: "Get My Results", fields: ["name", "email"] } },
      { id: "s4", type: "bio", data: { name: "Your Name", role: "Creator of This Quiz", bio: "I built this quiz because after working with [X] clients I noticed [insight]. Now I want to help you figure out your specific type in 2 minutes flat." } },
    ],
  },
  {
    id: "tripwire",
    label: "Tripwire Offer",
    desc: "Irresistible low-ticket offer page",
    icon: Zap,
    color: "#f97316",
    category: "sell",
    tags: ["Low-Ticket", "List Monetization", "Warm Leads"],
    guidance: "A tripwire is a $7–$27 irresistible offer shown to someone who just opted in. The key is making it feel like a no-brainer: price it so low it would be silly to say no, stack bonuses generously in benefits, and use a real countdown timer. This funds your ads and moves leads closer to your main offer.",
    sections: [
      { id: "s1", type: "hero", data: { badge: "Wait — Special One-Time Offer", headline: "WAIT! Before You Go — Get [Product Name] for Just $[price]", subheadline: "This offer is only available right now. Once you leave, it's gone forever.", ctaText: "Yes! I Want This for $[price]" } },
      { id: "s2", type: "benefits", data: { title: "Here's Everything You're Getting:", items: ["[Core product] — normally $[value]", "Bonus #1: [name] — normally $[value]", "Bonus #2: [name] — normally $[value]", "Bonus #3: [name] — normally $[value]", "Total value: $[X]. Yours today for $[price]"] } },
      { id: "s3", type: "countdown", data: { countdownTitle: "This Offer Expires In", targetDate: new Date(Date.now() + 15 * 60000).toISOString() } },
      { id: "s4", type: "pricing", data: { pricingTitle: "Today Only", price: "$7", originalPrice: "$47", pricingFeatures: ["[Product name]", "Bonus #1", "Bonus #2", "Instant digital access", "30-day money-back guarantee"], ctaText: "Claim My $7 Access Now" } },
      { id: "s5", type: "cta", data: { headline: "This Disappears When the Timer Hits Zero", subtext: "No, thank you. I don't want this deal and understand it won't be offered again.", ctaText: "Yes! Add This to My Order for $7 →" } },
    ],
  },
  {
    id: "community",
    label: "Community Invite",
    desc: "Membership community page with social proof",
    icon: Users,
    color: "#22c55e",
    category: "content",
    tags: ["Membership", "Recurring Revenue", "Community"],
    guidance: "Community pages work best when you lead with who the community is for, not what it includes. Add member testimonials that highlight belonging and results, make pricing feel like access (not a subscription), and be specific about what makes your community different from free Facebook groups.",
    sections: [
      { id: "s1", type: "hero", data: { badge: "Join [X]+ Members", headline: "Join [Community Name] — The #1 Community for [Audience]", subheadline: "The place where [audience] come to [outcome], get feedback, and stop feeling alone in this journey.", ctaText: "Join the Community" } },
      { id: "s2", type: "benefits", data: { title: "Members Get Access To:", items: ["Weekly live calls with Q&A (not recorded webinars — real calls)", "Private library: [X]+ templates, workflows, and frameworks", "Direct access to [founder] via community chat", "Monthly hot-seat sessions — get your work critiqued live", "Job board + referral network for [niche]"] } },
      { id: "s3", type: "testimonials", data: { testimonials: [{ name: "Member 1", role: "Member since [date]", quote: "I've been in [X] communities. This is the only one where I actually log in every day. The quality of conversations is unreal." }, { name: "Member 2", role: "Active member", quote: "Made back my membership fee in the first week just from one connection I made here." }, { name: "Member 3", role: "Charter member", quote: "What separates this community: real conversations, real accountability, real results. No fluff." }] } },
      { id: "s4", type: "pricing", data: { pricingTitle: "Join Today", price: "$49/mo", originalPrice: "$97/mo", pricingFeatures: ["All live calls + recordings", "Full resource library", "Community access", "Networking events", "Cancel anytime"], ctaText: "Join [Community Name]" } },
      { id: "s5", type: "cta", data: { headline: "The Best Time to Join Was [X] Months Ago. The Second Best Time Is Now.", subtext: "Every day you wait is another day without the community, connections, and resources inside.", ctaText: "Join Now →" } },
    ],
  },
  {
    id: "masterclass",
    label: "Masterclass Registration",
    desc: "Free masterclass with urgency and countdown",
    icon: Award,
    color: "#d4b461",
    category: "events",
    tags: ["Events", "Authority Building", "Lead Gen"],
    guidance: "A masterclass is essentially a webinar with more perceived value. Set the countdown to 48–72 hours out for best conversions, write your instructor bio to highlight credibility around the specific masterclass topic (not general expertise), and use past attendee quotes that reference specific wins from the session.",
    sections: [
      { id: "s1", type: "hero", data: { badge: "Free Live Masterclass", headline: "Register for the Free '[Masterclass Title]' Masterclass", subheadline: "[Date] at [Time]. [Duration]. Live with Q&A. Limited spots — register now to secure yours.", showForm: true, ctaText: "Save My Spot", fields: ["name", "email"] } },
      { id: "s2", type: "countdown", data: { countdownTitle: "Masterclass Starts In", targetDate: new Date(Date.now() + 3 * 86400000).toISOString() } },
      { id: "s3", type: "bio", data: { name: "Your Name", role: "Expert in [Specific Topic]", bio: "In [X] years I've [specific credential related to masterclass topic]. I've [achievement]. In this masterclass I'm sharing everything I know about [topic] — no upsell, just pure value." } },
      { id: "s4", type: "benefits", data: { title: "In This Masterclass You'll Learn:", items: ["The [X]-step framework I use to [result]", "Why [common approach] doesn't work and what to do instead", "Live case study: how I helped [client] achieve [specific result]", "Q&A: get your specific situation answered live", "Exclusive resource only available to live attendees"] } },
      { id: "s5", type: "testimonials", data: { testimonials: [{ name: "Past Attendee", role: "Last masterclass", quote: "I've attended [X] of these and each one gives me at least 3 things to implement immediately. This is the real deal." }, { name: "Past Attendee", role: "Last masterclass", quote: "The Q&A alone was worth 2 hours of my time. [Name] answered my specific question and it changed my approach completely." }] } },
      { id: "s6", type: "faq", data: { faqs: [{ q: "Will there be a replay?", a: "Yes — registered attendees get a 48-hour replay window. After that, the replay goes away." }, { q: "Is there a cost?", a: "Completely free. This is my way of delivering value before asking for anything." }, { q: "Will you sell something at the end?", a: "I'll mention how to work with me more deeply at the end, but there's no pressure. The content stands alone." }] } },
    ],
  },
  {
    id: "case_study",
    label: "Case Study",
    desc: "Client results story to convert skeptics",
    icon: BarChart2,
    color: "#06b6d4",
    category: "service",
    tags: ["Proof", "Skeptic Conversion", "B2B + B2C"],
    guidance: "Case studies convert skeptics. Lead with the exact result in the headline (be specific: '327% revenue increase in 8 weeks' beats 'amazing results'), walk through the strategy in benefits, and use the CTA to offer to replicate the result for the reader. Add more client results in testimonials to show this isn't a one-off.",
    sections: [
      { id: "s1", type: "hero", data: { badge: "Real Client Results — Case Study", headline: "How [Client Name] Got [Specific Result] in [Specific Timeframe]", subheadline: "A transparent breakdown of the exact strategy we used — and how you can replicate it.", ctaText: "Read the Full Story" } },
      { id: "s2", type: "benefits", data: { title: "The Strategy That Worked (Step by Step)", items: ["Step 1: [What we did first and why]", "Step 2: [The key change that made the difference]", "Step 3: [How we scaled/compounded the results]", "The one tool/framework that made this possible", "What NOT to do (what we tried that failed)"] } },
      { id: "s3", type: "testimonials", data: { testimonials: [{ name: "[Client Name]", role: "[Title / Company]", quote: "Working with [expert] was the best business decision I made this year. [Specific result] in [specific timeframe]." }, { name: "[Another Client]", role: "[Title]", quote: "I was skeptical at first — I'd tried [X] other approaches. This actually worked. [Specific result]." }, { name: "[Third Client]", role: "[Title]", quote: "[Result], then [next result]. The system works if you actually follow it." }] } },
      { id: "s4", type: "bio", data: { name: "Your Name", role: "Your Title", bio: "I'm [Name]. I help [audience] achieve [outcome] using [methodology]. I've worked with [X] clients across [industries] to deliver [category of results]." } },
      { id: "s5", type: "cta", data: { headline: "Want Results Like [Client Name]?", subtext: "Book a free strategy call and we'll map out exactly how to replicate this for your situation.", ctaText: "Book My Free Strategy Call" } },
    ],
  },
];

// ── Template Picker Modal ──────────────────────────────────────────────────────

function TemplatePickerModal({ onClose, onCreate }: { onClose: () => void; onCreate: (template: any, colorScheme: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [colorScheme, setColorScheme] = useState("gold");
  const [creating, setCreating] = useState(false);

  const filtered = TEMPLATES_LIST.filter(t => {
    if (category !== "all" && t.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.label.toLowerCase().includes(q) && !t.desc.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const tpl = TEMPLATES_LIST.find(t => t.id === selected);

  const handleCreate = async () => {
    if (!tpl) return;
    setCreating(true);
    await onCreate(tpl, colorScheme);
  };

  const colors = [
    { id: "gold",   hex: "#d4b461", name: "Gold" },
    { id: "purple", hex: "#a855f7", name: "Purple" },
    { id: "blue",   hex: "#3b82f6", name: "Blue" },
    { id: "green",  hex: "#22c55e", name: "Green" },
    { id: "red",    hex: "#ef4444", name: "Red" },
    { id: "orange", hex: "#f97316", name: "Orange" },
    { id: "cyan",   hex: "#06b6d4", name: "Cyan" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)" }}>
      <div className="w-full max-w-5xl rounded-2xl overflow-hidden flex flex-col" style={{ background: "#07070e", border: `1px solid ${GOLD}22`, boxShadow: `0 0 100px ${GOLD}10`, maxHeight: "90vh" }}>

        {/* ── Header ── */}
        <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)", background: `${GOLD}06` }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: `${GOLD}60` }}>New Landing Page</p>
              <h2 className="text-xl font-black text-white mt-0.5">Choose a Template</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white transition-all" style={{ background: "rgba(255,255,255,0.04)" }}>
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Category tabs + search */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setCategory(cat.id)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{ background: category === cat.id ? `${GOLD}18` : "rgba(255,255,255,0.04)", color: category === cat.id ? GOLD : "#71717a", border: `1px solid ${category === cat.id ? GOLD + "35" : "rgba(255,255,255,0.07)"}` }}>
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="pl-8 pr-3 py-1.5 rounded-lg text-xs text-white placeholder:text-zinc-600 outline-none w-36"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0">

          {/* Left: template list */}
          <div className="w-56 flex-shrink-0 border-r overflow-y-auto" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-zinc-600 text-xs mt-6">No templates match</div>
            ) : (
              <div className="p-2 space-y-0.5">
                {filtered.map(t => {
                  const Icon = t.icon;
                  const active = selected === t.id;
                  return (
                    <button key={t.id} onClick={() => setSelected(t.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all"
                      style={{ background: active ? `${t.color}14` : "transparent", border: `1px solid ${active ? t.color + "35" : "transparent"}` }}>
                      <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: `${t.color}18` }}>
                        <Icon style={{ color: t.color, width: 13, height: 13 }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold leading-tight truncate" style={{ color: active ? "#fff" : "#a1a1aa" }}>{t.label}</p>
                        <p className="text-[10px] text-zinc-700 leading-tight mt-0.5">{t.sections.length} sections</p>
                      </div>
                      {active && <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: t.color }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: template detail */}
          <div className="flex-1 overflow-y-auto">
            {!tpl ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-10 gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}20` }}>
                  <LayoutTemplate className="w-7 h-7" style={{ color: `${GOLD}50` }} />
                </div>
                <div>
                  <p className="text-zinc-400 text-sm font-semibold">Select a template to preview it</p>
                  <p className="text-zinc-700 text-xs max-w-xs mt-1">Browse {TEMPLATES_LIST.length} professionally designed templates — each with pre-built sections and copy guidance</p>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 w-full max-w-sm">
                  {TEMPLATES_LIST.slice(0, 6).map(t => {
                    const Icon = t.icon;
                    return (
                      <button key={t.id} onClick={() => setSelected(t.id)}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all hover:scale-105"
                        style={{ background: `${t.color}08`, border: `1px solid ${t.color}18` }}>
                        <Icon style={{ color: t.color, width: 18, height: 18 }} />
                        <p className="text-[10px] text-zinc-500 text-center leading-tight">{t.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Template hero */}
                <div className="flex items-start gap-4 p-4 rounded-2xl" style={{ background: `${tpl.color}08`, border: `1px solid ${tpl.color}18` }}>
                  <div className="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center" style={{ background: `${tpl.color}20`, border: `1px solid ${tpl.color}40` }}>
                    <tpl.icon style={{ color: tpl.color, width: 24, height: 24 }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-black text-lg leading-tight">{tpl.label}</h3>
                    <p className="text-zinc-400 text-sm mt-1 leading-relaxed">{tpl.desc}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {tpl.tags.map((tag: string) => (
                        <span key={tag} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${tpl.color}14`, color: tpl.color, border: `1px solid ${tpl.color}28` }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section flow */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2.5">Page Structure ({tpl.sections.length} sections)</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {tpl.sections.map((s: any, i: number) => {
                      const display = SECTION_DISPLAY[s.type] || { label: s.type, color: "#71717a" };
                      return (
                        <div key={s.id} className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg" style={{ background: `${display.color}14`, color: display.color, border: `1px solid ${display.color}22` }}>{display.label}</span>
                          {i < tpl.sections.length - 1 && <ChevronRight className="w-3 h-3 flex-shrink-0 text-zinc-700" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

                {/* Guidance */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2.5" style={{ color: `${tpl.color}70` }}>How to Use This Template</p>
                  <p className="text-zinc-300 text-sm leading-relaxed">{tpl.guidance}</p>
                </div>

                <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

                {/* Color scheme */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-3">Accent Color</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {colors.map(c => (
                      <button key={c.id} onClick={() => setColorScheme(c.id)} title={c.name}
                        className="w-8 h-8 rounded-full transition-all"
                        style={{ background: c.hex, transform: colorScheme === c.id ? "scale(1.3)" : "scale(1)", boxShadow: colorScheme === c.id ? `0 0 14px ${c.hex}70` : "none", outline: colorScheme === c.id ? `2px solid ${c.hex}` : "none", outlineOffset: 2 }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.25)" }}>
          <p className="text-zinc-700 text-xs">{TEMPLATES_LIST.length} templates · {CATEGORIES.length - 1} categories</p>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={!selected || creating}
              className="px-6 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition-all disabled:opacity-30 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD}cc 100%)`, color: BG, boxShadow: selected ? `0 4px 24px ${GOLD}30` : "none" }}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><LayoutTemplate className="w-4 h-4" />Create Page</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Landing Pages Content ──────────────────────────────────────────────────────

export function LandingPagesContent() {
  const { user } = useAuth();
  const [, nav] = useLocation();
  const qc = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const { data: pages = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/marketing-landing-pages"] });

  const createMutation = useMutation({
    mutationFn: async ({ title, template, colorScheme, sections }: any) => {
      const r = await fetch("/api/marketing-landing-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, template, colorScheme, sections }),
      });
      if (!r.ok) throw new Error("Failed to create");
      return r.json();
    },
    onSuccess: (page: any) => {
      qc.invalidateQueries({ queryKey: ["/api/marketing-landing-pages"] });
      setShowPicker(false);
      nav(`/landing-pages/${page.id}/edit`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/marketing-landing-pages/${id}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/marketing-landing-pages"] }),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const r = await fetch(`/api/marketing-landing-pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ published }),
      });
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/marketing-landing-pages"] }),
  });

  const handleCreate = async (template: any, colorScheme: string) => {
    await createMutation.mutateAsync({
      title: template.label,
      template: template.id,
      colorScheme,
      sections: template.sections,
    });
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/lp/${slug}`);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="border-b px-6 py-5 flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: `${GOLD}60` }}>Marketing</p>
          <h1 className="text-2xl font-black text-white mt-0.5">Landing Pages</h1>
        </div>
        <button onClick={() => setShowPicker(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-opacity hover:opacity-90" style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD}cc 100%)`, color: BG }}>
          <Plus className="w-4 h-4" />New Page
        </button>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-5" style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}25` }}>
              <LayoutTemplate className="w-9 h-9" style={{ color: GOLD }} />
            </div>
            <h2 className="text-xl font-black text-white mb-2">No pages yet</h2>
            <p className="text-zinc-500 text-sm mb-6 max-w-xs mx-auto">Create your first landing page from one of {TEMPLATES_LIST.length} professional templates.</p>
            <button onClick={() => setShowPicker(true)} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black" style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD}cc 100%)`, color: BG }}>
              <Plus className="w-4 h-4" />Browse Templates
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(pages as any[]).map((page: any) => {
              const accent = ACCENT_MAP[page.color_scheme] || GOLD;
              const meta = TEMPLATE_META[page.template];
              const Icon = meta?.icon || FileText;
              return (
                <div key={page.id} className="group rounded-2xl overflow-hidden transition-all hover:translate-y-[-2px]" style={{ background: CARD, border: `1px solid rgba(255,255,255,0.07)` }}>
                  <div className="h-28 relative flex items-center justify-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${accent}10 0%, rgba(0,0,0,0) 60%)`, borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                    <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${accent}18 0%, transparent 70%)` }} />
                    <div className="relative z-10 text-center px-4">
                      <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: `${accent}20`, border: `1px solid ${accent}35` }}>
                        <Icon className="w-5 h-5" style={{ color: accent }} />
                      </div>
                      <p className="text-white font-black text-sm truncate max-w-[160px]">{page.title}</p>
                      {meta && <p className="text-xs mt-0.5" style={{ color: `${accent}70` }}>{meta.label}</p>}
                    </div>
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider" style={{ background: page.published ? `${accent}20` : "rgba(255,255,255,0.08)", color: page.published ? accent : "#71717a", border: `1px solid ${page.published ? accent + "35" : "rgba(255,255,255,0.1)"}` }}>
                      {page.published ? "Live" : "Draft"}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-white/5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="px-4 py-3 flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5" style={{ color: `${accent}60` }} />
                      <div><p className="text-white font-bold text-sm">{page.views ?? 0}</p><p className="text-[10px] text-zinc-600">Views</p></div>
                    </div>
                    <div className="px-4 py-3 flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" style={{ color: `${accent}60` }} />
                      <div><p className="text-white font-bold text-sm">{page.leads ?? 0}</p><p className="text-[10px] text-zinc-600">Leads</p></div>
                    </div>
                  </div>
                  <div className="px-4 py-3 flex items-center gap-2">
                    <button onClick={() => nav(`/landing-pages/${page.id}/edit`)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors hover:bg-white/10" style={{ color: accent }}>
                      <Edit3 className="w-3.5 h-3.5" />Edit
                    </button>
                    {page.published && (
                      <>
                        <button onClick={() => copyLink(page.slug)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors hover:bg-white/10 text-zinc-400">
                          {copied === page.slug ? <><Check className="w-3.5 h-3.5 text-green-400" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy Link</>}
                        </button>
                        <a href={`/lp/${page.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors hover:bg-white/10 text-zinc-400">
                          <ExternalLink className="w-3.5 h-3.5" />View
                        </a>
                      </>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                      <button onClick={() => togglePublish.mutate({ id: page.id, published: !page.published })} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors" style={{ background: page.published ? "rgba(255,255,255,0.06)" : `${accent}18`, color: page.published ? "#71717a" : accent, border: `1px solid ${page.published ? "rgba(255,255,255,0.08)" : accent + "30"}` }}>
                        {page.published ? "Unpublish" : "Publish"}
                      </button>
                      <button onClick={() => { if (confirm("Delete this page?")) deleteMutation.mutate(page.id); }} className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 text-zinc-600 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <button onClick={() => setShowPicker(true)} className="rounded-2xl flex flex-col items-center justify-center gap-3 h-48 transition-all hover:border-white/20" style={{ background: "transparent", border: `1.5px dashed rgba(255,255,255,0.1)` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}25` }}>
                <Plus className="w-5 h-5" style={{ color: GOLD }} />
              </div>
              <p className="text-zinc-400 text-sm font-semibold">New Page</p>
            </button>
          </div>
        )}
      </div>
    </div>
    {showPicker && <TemplatePickerModal onClose={() => setShowPicker(false)} onCreate={handleCreate} />}
    </>
  );
}

export default function LandingPages() {
  return (
    <ClientLayout>
      <LandingPagesContent />
    </ClientLayout>
  );
}
