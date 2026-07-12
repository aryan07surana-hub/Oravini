'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Circle, Clock, AlertCircle, Calendar,
  X, Zap, Target, Palette, Users, Settings, TrendingUp,
  Mail, Cpu, BarChart3, Play, Megaphone, ShoppingBag,
  Layers, Video, ExternalLink,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────── */
type Owner = 'us' | 'you' | 'both';
type TaskStatus = 'completed' | 'in-progress' | 'upcoming' | 'blocked';

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  owner: Owner;
  timeline: string;
  calendlyType?: string;
}

interface BoxData {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: React.FC<any>;
  title: string;
  subtitle: string;
  timeline: string;
  color: string;
  tasks: Task[];
}

/* ─── Constants ─────────────────────────────────────────── */
const CALENDLY_BASE = 'https://calendly.com/brandversee';

const CALENDLY: Record<string, string> = {
  kickoff:        `${CALENDLY_BASE}/kickoff-call`,
  strategy:       `${CALENDLY_BASE}/strategy-session`,
  review:         `${CALENDLY_BASE}/weekly-review`,
  emergency:      `${CALENDLY_BASE}/emergency-support`,
  webinar_review: `${CALENDLY_BASE}/webinar-review`,
  launch_prep:    `${CALENDLY_BASE}/launch-prep`,
  '30min':        `${CALENDLY_BASE}/30min`,
};

const OWNER_CFG = {
  us:   { label: 'We Handle',  color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  you:  { label: 'You Handle', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  both: { label: 'Together',   color: '#818cf8', bg: 'rgba(129,140,248,0.1)' },
} as const;

const STATUS_CFG: Record<TaskStatus, { color: string }> = {
  completed:     { color: '#10b981' },
  'in-progress': { color: '#3b82f6' },
  upcoming:      { color: '#374151' },
  blocked:       { color: '#ef4444' },
};

const STATUS_ORDER: TaskStatus[] = ['upcoming', 'in-progress', 'completed', 'blocked'];

const QUICK_ACTIONS = [
  { label: 'Weekly Review',     url: CALENDLY.review,    color: '#6366f1' },
  { label: 'Strategy Session',  url: CALENDLY.strategy,  color: '#3b82f6' },
  { label: 'Emergency Support', url: CALENDLY.emergency, color: '#ef4444' },
];

/* ─── Box Data ───────────────────────────────────────────── */
const BOXES: BoxData[] = [
  {
    id: 'onboarding',
    Icon: Zap,
    title: 'Onboarding',
    subtitle: 'Signing → Kickoff',
    timeline: 'Day 0–2',
    color: '#f59e0b',
    tasks: [
      {
        id: 'ob-1',
        title: 'Welcome email + portal access',
        description: 'You receive your portal login, onboarding form link, and full access request list. Everything you need is in one place from day one.',
        status: 'completed',
        owner: 'us',
        timeline: 'Immediate',
      },
      {
        id: 'ob-2',
        title: 'Fill out onboarding form',
        description: '15-minute form covering your audience, offer direction, goals, existing assets, and brand positioning. Fills the gaps before the kickoff call.',
        status: 'completed',
        owner: 'you',
        timeline: 'Day 0–1',
      },
      {
        id: 'ob-3',
        title: 'Share all logins & assets',
        description: 'Provide access to existing content, email lists, social accounts, ad accounts, CRM, and any tools already in use. The faster we have these, the faster we move.',
        status: 'in-progress',
        owner: 'you',
        timeline: 'Day 0–1',
      },
      {
        id: 'ob-4',
        title: 'Kickoff call',
        description: '90-minute full situation audit — goals, offer direction, Phase 1 deliverables, and timeline locked in. Usually within 48 hours of signing.',
        status: 'upcoming',
        owner: 'both',
        timeline: 'Day 1–2',
        calendlyType: 'kickoff',
      },
      {
        id: 'ob-5',
        title: 'Full situation audit completed',
        description: 'Current state documented. Audience mapped. Gaps identified. We know exactly what we\'re working with and where to begin.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Day 1–2',
      },
      {
        id: 'ob-6',
        title: 'Work begins immediately',
        description: 'No waiting. No delays. We start executing from the moment the kickoff call ends.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Day 2',
      },
    ],
  },
  {
    id: 'market-offer',
    Icon: Target,
    title: 'Market & Offer',
    subtitle: 'Positioning, Pricing & Angle',
    timeline: 'Week 1',
    color: '#6366f1',
    tasks: [
      {
        id: 'mo-1',
        title: 'ICP document finalised',
        description: 'Exact buyer persona defined: demographics, pain points, desires, current frustrations, what they\'ve tried before, and where they spend time online.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Day 2–3',
      },
      {
        id: 'mo-2',
        title: 'Offer structure locked in',
        description: 'What you\'re selling, what\'s included, how it\'s delivered, the transformation promised, and what makes it undeniable for the right buyer.',
        status: 'upcoming',
        owner: 'both',
        timeline: 'Day 3–4',
      },
      {
        id: 'mo-3',
        title: 'Pricing strategy confirmed',
        description: 'Price point, payment plans, and guarantee structure. Positioned to convert without undercharging or scaring off serious buyers.',
        status: 'upcoming',
        owner: 'both',
        timeline: 'Day 3–4',
      },
      {
        id: 'mo-4',
        title: 'Guarantee structure decided',
        description: 'Risk reversal that removes buying hesitation. Worded to protect you legally while giving buyers confidence to say yes.',
        status: 'upcoming',
        owner: 'both',
        timeline: 'Day 4',
      },
      {
        id: 'mo-5',
        title: 'Webinar topic & hook angle locked',
        description: 'The one-line premise that makes your audience stop and register. Positioned against what they\'ve already tried that hasn\'t worked.',
        status: 'upcoming',
        owner: 'both',
        timeline: 'Day 4–5',
      },
      {
        id: 'mo-6',
        title: 'Funnel type chosen',
        description: 'VSL, live webinar, application call, or challenge funnel — chosen based on your price point, audience temperature, and volume.',
        status: 'upcoming',
        owner: 'both',
        timeline: 'Day 4–5',
      },
      {
        id: 'mo-7',
        title: 'Hook angles mapped (7+)',
        description: '7+ angles tested across content and ads. The highest-converting hook becomes the primary driver across all traffic sources.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 1',
      },
    ],
  },
  {
    id: 'brand',
    Icon: Palette,
    title: 'Brand Identity',
    subtitle: 'Voice, Visuals & Authority',
    timeline: 'Week 1',
    color: '#ec4899',
    tasks: [
      {
        id: 'br-1',
        title: 'Brand voice & tone document',
        description: 'How you speak, what you stand for, what you\'re against. Every piece of copy and content sounds distinctly like you — not generic.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 1',
      },
      {
        id: 'br-2',
        title: 'Visual identity direction',
        description: 'Color palette, fonts, template style, and Instagram aesthetic locked in. Consistent across all touchpoints — content, pages, ads.',
        status: 'upcoming',
        owner: 'both',
        timeline: 'Week 1',
      },
      {
        id: 'br-3',
        title: 'Instagram bio & profile optimised',
        description: 'Bio rewritten to clearly communicate who you help, what result they get, and exactly what to do next. First impression matters.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 1',
      },
      {
        id: 'br-4',
        title: 'Positioning statement written',
        description: 'One sentence that defines your unique angle. Used across all sales copy, content hooks, and ad creative to make you instantly distinct.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 1',
      },
      {
        id: 'br-5',
        title: 'Social proof & authority assets gathered',
        description: 'Testimonials, screenshots, revenue proof, client results, credentials, and case study material collected and organised for use.',
        status: 'upcoming',
        owner: 'both',
        timeline: 'Week 1',
      },
      {
        id: 'br-6',
        title: 'Origin story written',
        description: 'Your credibility narrative: why you, why this method, and why it works. Used in the webinar, content, and email sequences.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 1',
      },
    ],
  },
  {
    id: 'content',
    Icon: Megaphone,
    title: 'Content & Community',
    subtitle: 'Instagram, YouTube & Whop',
    timeline: 'Week 1–2',
    color: '#f97316',
    tasks: [
      {
        id: 'cc-1',
        title: 'Content pillars defined (3–4)',
        description: 'Authority, education, social proof, and personal story. Every piece of content maps to one of these pillars — no more wondering what to post.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 1',
      },
      {
        id: 'cc-2',
        title: '30-day content calendar delivered',
        description: 'Daily posting schedule with topics, formats, and hook directions planned. Handed over as a ready-to-execute document.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 1',
      },
      {
        id: 'cc-3',
        title: 'Reels, Story & Carousel frameworks',
        description: 'Fill-in-the-blank templates for each format. You record or hand us the raw content — we handle scripting, editing direction, and captions.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 1',
      },
      {
        id: 'cc-4',
        title: 'Instagram DM strategy mapped',
        description: 'How to convert followers to leads through DMs. Conversation starters, qualification questions, and soft pitches all scripted.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 1–2',
      },
      {
        id: 'cc-5',
        title: 'Whop community created & configured',
        description: 'Channel structure, free vs paid tier separation, and community onboarding experience all built out from scratch.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 1',
      },
      {
        id: 'cc-6',
        title: 'Community onboarding flow',
        description: 'New members get a structured welcome experience: pinned resources, quick wins, and calls to action that drive early engagement.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 1–2',
      },
      {
        id: 'cc-7',
        title: 'Engagement cadence set up',
        description: 'Posting rhythm, weekly Q&As, challenges, and polls to keep the community active and buyers progressing.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 2',
      },
      {
        id: 'cc-8',
        title: 'YouTube strategy activated',
        description: '10+ video ideas mapped to your offer, SEO configured, first videos scripted and uploaded. Long-form trust-building running in parallel.',
        status: 'upcoming',
        owner: 'both',
        timeline: 'Week 8+',
      },
    ],
  },
  {
    id: 'tech',
    Icon: Settings,
    title: 'Tech Stack',
    subtitle: 'CRM, Domains & Infrastructure',
    timeline: 'Week 1–2',
    color: '#64748b',
    tasks: [
      {
        id: 'ts-1',
        title: 'CRM set up (GoHighLevel)',
        description: 'Pipeline stages, deal views, and contact properties built. Lead flow: new → contacted → booked → showed → closed → fulfilled.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 1',
      },
      {
        id: 'ts-2',
        title: 'Domain & DNS fully configured',
        description: 'Primary domain, subdomains for pages, and all DNS records pointing correctly. Everything resolves before launch.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 1',
      },
      {
        id: 'ts-3',
        title: 'Email sending domain warmed up',
        description: 'Dedicated sending domain configured, SPF, DKIM, and DMARC verified. Deliverability tested across Gmail, Outlook, and Apple Mail.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 1–2',
      },
      {
        id: 'ts-4',
        title: 'Payment processor connected',
        description: 'Stripe or Razorpay integrated. Test transactions run. Webhooks firing and triggering correct CRM actions on payment.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 2',
      },
      {
        id: 'ts-5',
        title: 'Meta Pixel installed & events firing',
        description: 'Domain verified, standard events configured, and custom conversions built. Every key action tracked for ad optimisation.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 2',
      },
      {
        id: 'ts-6',
        title: 'Google Analytics 4 configured',
        description: 'Property set up, conversion goals created, and key events tracked. Connected to reporting dashboard.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 2',
      },
      {
        id: 'ts-7',
        title: 'KPI dashboard built',
        description: 'Real-time visibility on revenue, registrations, show rates, booking rates, and close rates. One place, always up to date.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 2',
      },
      {
        id: 'ts-8',
        title: 'Full end-to-end integration test',
        description: 'Every system is verified to communicate correctly. Form → CRM → Email → Pixel → Payment. Nothing breaks on launch day.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 2',
      },
    ],
  },
  {
    id: 'funnel',
    Icon: BarChart3,
    title: 'Sales Funnel',
    subtitle: 'Webinar, Pages & Sequences',
    timeline: 'Week 3–4',
    color: '#3b82f6',
    tasks: [
      {
        id: 'sf-1',
        title: 'Webinar registration page live',
        description: 'High-converting opt-in page with benefit-led copy. Mobile-optimised, A/B test ready, and connected to email list and CRM.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 3',
      },
      {
        id: 'sf-2',
        title: 'Webinar slides built (33-slide deck)',
        description: 'Hook → content delivery → case studies → pitch → close. Every slide has a job. Designed to hold attention for the full 60–90 minutes.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 3',
      },
      {
        id: 'sf-3',
        title: 'Full webinar script written & reviewed',
        description: 'Word-for-word script covering every phase of the presentation. Educate, build authority, handle objections, make the pitch.',
        status: 'upcoming',
        owner: 'both',
        timeline: 'Week 3',
        calendlyType: 'webinar_review',
      },
      {
        id: 'sf-4',
        title: 'Pre-webinar nurture sequence (3–5 emails)',
        description: 'Automated email sequence sent between registration and go-live. Builds trust, creates anticipation, and pre-sells the outcome.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 3',
      },
      {
        id: 'sf-5',
        title: 'WhatsApp & SMS reminder sequence',
        description: 'Automated show-up reminders sent at 24h, 1h, and 10 minutes before the webinar starts. Boosts show rates significantly.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 3',
      },
      {
        id: 'sf-6',
        title: 'Sales page / VSL page live',
        description: 'Full-length sales page or video sales letter with complete offer presentation, social proof, FAQs, and clear CTA.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 4',
      },
      {
        id: 'sf-7',
        title: 'Thank-you & booking page live',
        description: 'Post-registration and post-purchase confirmation pages. Clear next step after every conversion point in the funnel.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 4',
      },
      {
        id: 'sf-8',
        title: 'Checkout page optimised',
        description: 'Payment page copy, trust badges, testimonials, and urgency elements configured to reduce drop-off at the final step.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 4',
      },
      {
        id: 'sf-9',
        title: 'Post-webinar follow-up sequence (7–10 emails)',
        description: 'Email and DM sequence for non-buyers who attended. Objection handling, urgency, and social proof — typically recovers 20–30% of revenue.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 4',
      },
      {
        id: 'sf-10',
        title: 'No-show recovery flow',
        description: 'Separate automated sequence for registrants who didn\'t attend. Sends replay access, rebuilds urgency, drives to sales page.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 4',
      },
      {
        id: 'sf-11',
        title: 'Abandoned checkout automation',
        description: 'Catches people who reached checkout but didn\'t complete payment. Email + DM sequence. Typically recovers 10–20% of abandons.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 4',
      },
    ],
  },
  {
    id: 'email',
    Icon: Mail,
    title: 'Email Marketing',
    subtitle: 'List, Sequences & Broadcasts',
    timeline: 'Week 2–5',
    color: '#06b6d4',
    tasks: [
      {
        id: 'em-1',
        title: 'Lead magnet created',
        description: 'High-value freebie (PDF guide, checklist, or mini training) that attracts your exact buyer and demonstrates your expertise immediately.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 2',
      },
      {
        id: 'em-2',
        title: 'Welcome sequence live (5–7 emails)',
        description: 'Automated sequence triggered on every new subscriber. Builds trust, delivers value, introduces the offer, and warms them to buy.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 2–3',
      },
      {
        id: 'em-3',
        title: 'Broadcast schedule set',
        description: 'Weekly or bi-weekly email topics, angles, and CTAs mapped for 90 days. Consistent presence in your list\'s inbox without burning them out.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 3',
      },
      {
        id: 'em-4',
        title: 'List segmentation configured',
        description: 'Buyers vs non-buyers. Webinar attendees vs no-shows. Engaged vs cold. Each segment receives a message matched to where they are.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 3',
      },
      {
        id: 'em-5',
        title: 'Cold list re-engagement campaign',
        description: 'If you have an existing list, we reactivate it with a 5-email sequence designed to separate active buyers from dead contacts.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 3–4',
      },
      {
        id: 'em-6',
        title: 'Newsletter framework delivered',
        description: 'Repeatable weekly email structure: hook, story, insight, offer. Runs indefinitely. Long-term relationship and revenue engine.',
        status: 'upcoming',
        owner: 'both',
        timeline: 'Week 4',
      },
      {
        id: 'em-7',
        title: 'Deliverability & spam testing done',
        description: 'Emails tested across all major clients. Open rates benchmarked. Subject line formulas validated. List hygiene protocols in place.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 4–5',
      },
    ],
  },
  {
    id: 'automation',
    Icon: Cpu,
    title: 'Automation',
    subtitle: 'DMs, Bots & Smart Sequences',
    timeline: 'Week 4–5',
    color: '#8b5cf6',
    tasks: [
      {
        id: 'au-1',
        title: 'Instagram DM automation live (ManyChat)',
        description: 'Comment triggers and story reply flows active. Every hand-raiser gets an instant, personalised DM response — no lead slips through.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 4–5',
      },
      {
        id: 'au-2',
        title: 'Comment trigger flows',
        description: 'Post a Reel with a keyword CTA → comments trigger DM sequence → leads captured and entered into your funnel automatically.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 5',
      },
      {
        id: 'au-3',
        title: 'Story reply sequences',
        description: 'Followers who reply to stories enter a qualifying DM flow. Interested leads pushed toward booking or registration.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 5',
      },
      {
        id: 'au-4',
        title: 'WhatsApp broadcast lists built',
        description: 'Warm leads segmented into WhatsApp lists. Used for webinar reminders, launch announcements, and follow-up after no-contact.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 4',
      },
      {
        id: 'au-5',
        title: 'SMS reminder sequences active',
        description: 'Text message reminders tied to webinar registrations. Show-up reminders at 24h, 1h, and 10 min before go-live.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 4–5',
      },
      {
        id: 'au-6',
        title: 'Post-purchase onboarding automation',
        description: 'New buyers automatically added to community, sent onboarding email sequence, and prompted to book their first coaching call.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 5',
      },
      {
        id: 'au-7',
        title: 'Referral trigger automation',
        description: 'Happy buyers prompted to refer at the exact right moment (30 days in, after a win). Automated follow-up tracks referral status.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 6+',
      },
    ],
  },
  {
    id: 'sales-team',
    Icon: Users,
    title: 'Sales Team',
    subtitle: 'Setters, Closers & Pipeline',
    timeline: 'Week 2–5',
    color: '#10b981',
    tasks: [
      {
        id: 'st-1',
        title: 'Sales team structure confirmed',
        description: 'Decision made: our network of vetted setters and closers, training your existing team, or a hybrid approach based on your situation.',
        status: 'upcoming',
        owner: 'both',
        timeline: 'Week 2',
      },
      {
        id: 'st-2',
        title: 'Setter qualification script written',
        description: 'DM and call script for setters. Designed to book the right people and filter out unqualified leads before they reach a closer.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 2',
      },
      {
        id: 'st-3',
        title: 'Closer script & pitch deck',
        description: 'Full sales call script: situation questions, pain amplification, solution positioning, and close. Plus objection handling for every scenario.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 2–3',
      },
      {
        id: 'st-4',
        title: 'Objection handling guide',
        description: 'Price, time, trust, spouse, past failures — every objection mapped with 2–3 specific responses. No call gets lost for lack of a good answer.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 3',
      },
      {
        id: 'st-5',
        title: 'Sales team CRM pipeline built',
        description: 'Separate setter and closer views in CRM. Deal stages, follow-up reminders, call notes, and reporting all configured.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 3',
      },
      {
        id: 'st-6',
        title: 'Speed-to-contact protocol enforced',
        description: 'First contact with every new lead within 1 hour. CRM notifications and task assignments make this automatic.',
        status: 'upcoming',
        owner: 'both',
        timeline: 'Week 3',
      },
      {
        id: 'st-7',
        title: 'Setters onboarded & active',
        description: 'First leads flowing to setters. Target: 30%+ booking rate on qualified inbound leads. Pipeline visibility live.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 5',
      },
      {
        id: 'st-8',
        title: 'Closers trained & taking calls',
        description: 'Closers trained on your offer, objections, and ideal buyer. Target close rate: 60–70% on fully qualified calls.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 5',
      },
      {
        id: 'st-9',
        title: 'Weekly performance reviews running',
        description: 'KPIs reviewed each week: show rate, close rate, speed to contact. Scripts iterated. Underperformers coached or replaced.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Ongoing',
      },
    ],
  },
  {
    id: 'launch',
    Icon: Play,
    title: 'Launch',
    subtitle: 'QA, Go-Live & First Revenue',
    timeline: 'Week 6',
    color: '#ef4444',
    tasks: [
      {
        id: 'la-1',
        title: 'Organic content driving registrations',
        description: 'Content calendar executing daily. Every post, Story, and Reel is driving traffic to the registration page.',
        status: 'upcoming',
        owner: 'both',
        timeline: 'Week 5–6',
      },
      {
        id: 'la-2',
        title: 'Full QA pass — everything tested',
        description: 'Every link, form, payment flow, email sequence, automation, and tracking pixel verified. Nothing fails on launch day.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 6',
        calendlyType: 'launch_prep',
      },
      {
        id: 'la-3',
        title: 'Launch announcement email sent',
        description: 'Email blast to your existing list announcing the webinar. Segmented by relationship level for maximum response.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 6',
      },
      {
        id: 'la-4',
        title: 'Setter pipeline active before go-live',
        description: 'Qualified leads already booked for sales calls before the webinar happens. Revenue in pipeline on day one.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 6',
      },
      {
        id: 'la-5',
        title: '🚀 First live webinar — GO LIVE',
        description: 'You present the webinar. We handle everything behind the scenes: tech support, live chat moderation, DM responses, and follow-up launch.',
        status: 'upcoming',
        owner: 'both',
        timeline: 'Week 6',
        calendlyType: 'launch_prep',
      },
      {
        id: 'la-6',
        title: 'Post-webinar debrief call',
        description: 'Same-day or next-day review: what worked, what to adjust, immediate optimisations before the follow-up sequence runs.',
        status: 'upcoming',
        owner: 'both',
        timeline: 'Day after launch',
        calendlyType: 'review',
      },
      {
        id: 'la-7',
        title: 'First revenue booked',
        description: 'Closers on calls. Payments processed. First clients signed and onboarded. The system has proven it works.',
        status: 'upcoming',
        owner: 'both',
        timeline: 'Week 6–7',
      },
    ],
  },
  {
    id: 'paid-traffic',
    Icon: TrendingUp,
    title: 'Paid Traffic',
    subtitle: 'Meta, TikTok & Retargeting',
    timeline: 'Week 7+',
    color: '#d4b461',
    tasks: [
      {
        id: 'pt-1',
        title: 'Ad account setup & verified',
        description: 'Business Manager, ad account, and pixel fully verified. Payment method added. Account health checked before first spend.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 7',
      },
      {
        id: 'pt-2',
        title: 'First creative batch (3–5 hooks)',
        description: 'Multiple angles tested simultaneously. Video scripts written. UGC-style and polished variants both tested for performance.',
        status: 'upcoming',
        owner: 'both',
        timeline: 'Week 7',
      },
      {
        id: 'pt-3',
        title: 'Campaign structure built',
        description: 'Campaign → Ad Set → Ad hierarchy configured. Audience targeting, placement, bidding strategy, and budget set conservatively to start.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 7',
      },
      {
        id: 'pt-4',
        title: 'Cold & warm audiences defined',
        description: 'Interest-based targeting, lookalike audiences from buyer list, and custom audiences built from email list, website visitors, and IG engagers.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 7',
      },
      {
        id: 'pt-5',
        title: 'First campaigns launched',
        description: 'Go live on Meta. Budget starts conservative. Data collection phase begins — 7–14 days before making optimisation decisions.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 7–8',
      },
      {
        id: 'pt-6',
        title: 'Retargeting audiences built',
        description: 'Website visitors, video viewers (25%+), and IG engagers retargeted with direct-to-offer ads. Warm traffic converts at a fraction of cold CPL.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 8',
      },
      {
        id: 'pt-7',
        title: 'Winning creative identified & scaled',
        description: 'Best performing creative and audience gets budget increased. ROAS confirmed and consistent before scaling. No guessing.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 9+',
      },
      {
        id: 'pt-8',
        title: 'TikTok ads launched (if applicable)',
        description: 'Second platform activated once Meta ROAS is proven and profitable. New creative format — short-form, native, high-energy hooks.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Month 2+',
      },
    ],
  },
  {
    id: 'scale',
    Icon: ShoppingBag,
    title: 'Scale & Backend',
    subtitle: 'Evergreen, Products & Upsells',
    timeline: 'Month 2+',
    color: '#14b8a6',
    tasks: [
      {
        id: 'sc-1',
        title: 'Webinar analytics reviewed in full',
        description: 'Show rate, registration-to-show %, pitch-to-close %, and drop-off moments all identified. Every number on the table.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 7+',
      },
      {
        id: 'sc-2',
        title: 'Webinar hook & pitch optimised',
        description: 'Based on real data from the first run. Hook tightened, content pacing adjusted, pitch refined to close a higher percentage.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 8+',
      },
      {
        id: 'sc-3',
        title: 'Evergreen (automated) webinar created',
        description: 'Automated version of the proven live webinar runs 24/7 without you being present. Passive revenue engine built on a tested script.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Week 8–10',
      },
      {
        id: 'sc-4',
        title: 'Course / digital product built & live',
        description: 'Curriculum structured, recorded, and published on Kajabi, Skool, Whop, or your preferred platform. Delivery automated.',
        status: 'upcoming',
        owner: 'both',
        timeline: 'Week 9+',
      },
      {
        id: 'sc-5',
        title: 'Backend upsell offer introduced',
        description: 'Higher-ticket or done-for-you tier added. Presented to buyers after they\'ve had their first win. Maximises LTV per client.',
        status: 'upcoming',
        owner: 'both',
        timeline: 'Month 2+',
      },
      {
        id: 'sc-6',
        title: 'Downsell offer created',
        description: 'Lower-ticket option for non-buyers who wanted the main offer but couldn\'t commit. Captures revenue from people who said not yet.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Month 2+',
      },
      {
        id: 'sc-7',
        title: 'Affiliate & referral programme',
        description: 'Buyers become promoters. Trackable referral system with commissions incentivises word-of-mouth at scale.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Month 2+',
      },
      {
        id: 'sc-8',
        title: 'Monthly content calendar refreshed',
        description: 'New angles, trending formats, seasonal hooks added each month. Content stays fresh, relevant, and converting.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Ongoing',
      },
      {
        id: 'sc-9',
        title: 'Second offer & ascension path planned',
        description: 'What happens after buyers complete your programme? Next tier mapped, priced, and in development. Revenue compounds.',
        status: 'upcoming',
        owner: 'both',
        timeline: 'Month 3+',
      },
      {
        id: 'sc-10',
        title: 'Full reporting & analytics handover',
        description: 'Total visibility on every number: pipeline value, revenue, conversion rates, LTV, and CAC. Accessible in real time.',
        status: 'upcoming',
        owner: 'us',
        timeline: 'Month 3+',
      },
    ],
  },
];

/* ─── Status Icon ────────────────────────────────────────── */
function StatusIcon({ status, size = 16 }: { status: TaskStatus; size?: number }) {
  if (status === 'completed')    return <CheckCircle2 size={size} />;
  if (status === 'in-progress')  return <Clock size={size} />;
  if (status === 'blocked')      return <AlertCircle size={size} />;
  return <Circle size={size} />;
}

/* ─── Main Component ─────────────────────────────────────── */
export default function ClientPartnershipTracker() {
  const [activeBoxId, setActiveBoxId] = useState<string | null>('onboarding');
  const [statuses, setStatuses] = useState<Record<string, TaskStatus>>(() => {
    const init: Record<string, TaskStatus> = {};
    BOXES.forEach(b => b.tasks.forEach(t => { init[t.id] = t.status; }));
    return init;
  });

  const cycleStatus = useCallback((taskId: string) => {
    setStatuses(prev => {
      const cur = prev[taskId] ?? 'upcoming';
      const next = STATUS_ORDER[(STATUS_ORDER.indexOf(cur) + 1) % STATUS_ORDER.length];
      return { ...prev, [taskId]: next };
    });
  }, []);

  const getBoxMeta = (box: BoxData) => {
    const done   = box.tasks.filter(t => statuses[t.id] === 'completed').length;
    const active = box.tasks.filter(t => statuses[t.id] === 'in-progress').length;
    const pct    = Math.round((done / box.tasks.length) * 100);
    const state  = done === box.tasks.length ? 'complete' : active > 0 || done > 0 ? 'active' : 'locked';
    return { done, active, pct, state };
  };

  const allTasks    = BOXES.flatMap(b => b.tasks);
  const totalDone   = allTasks.filter(t => statuses[t.id] === 'completed').length;
  const totalActive = allTasks.filter(t => statuses[t.id] === 'in-progress').length;
  const totalTasks  = allTasks.length;
  const overallPct  = Math.round((totalDone / totalTasks) * 100);
  const selectedBox = BOXES.find(b => b.id === activeBoxId) ?? null;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07070f',
      color: '#fff',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>

      {/* ── Header ── */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '24px 40px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(7,7,15,0.92)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>

          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #d4b461, #f0c84b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Layers size={17} color="#000" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>Client Partnership Tracker</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Audience → Revenue · A to Z</div>
            </div>
          </div>

          {/* Stats + progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
              <span>
                <strong style={{ color: '#10b981' }}>{totalDone}</strong>
                <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>done</span>
              </span>
              <span>
                <strong style={{ color: '#3b82f6' }}>{totalActive}</strong>
                <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>active</span>
              </span>
              <span>
                <strong style={{ color: 'rgba(255,255,255,0.25)' }}>{totalTasks - totalDone - totalActive}</strong>
                <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>remaining</span>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 140, height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${overallPct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, #d4b461, #10b981)', borderRadius: 99 }}
                />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#d4b461', minWidth: 34 }}>{overallPct}%</span>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: 6 }}>
              {QUICK_ACTIONS.map(a => (
                <button
                  key={a.label}
                  onClick={() => window.open(a.url, '_blank')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 8,
                    background: `${a.color}12`,
                    border: `1px solid ${a.color}28`,
                    color: a.color, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Video size={11} />
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '36px 40px' }}>

        {/* Box Grid — 4 columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
          marginBottom: 12,
        }}>
          {BOXES.map(box => {
            const { done, pct, state } = getBoxMeta(box);
            const isSelected = activeBoxId === box.id;
            const { Icon } = box;

            return (
              <motion.button
                key={box.id}
                onClick={() => setActiveBoxId(isSelected ? null : box.id)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
                style={{
                  padding: '18px',
                  borderRadius: 14,
                  border: isSelected
                    ? `1px solid ${box.color}45`
                    : `1px solid rgba(255,255,255,${state === 'locked' ? '0.04' : '0.07'})`,
                  background: isSelected
                    ? `${box.color}0b`
                    : `rgba(255,255,255,${state === 'locked' ? '0.015' : '0.025'})`,
                  cursor: 'pointer',
                  textAlign: 'left',
                  opacity: state === 'locked' ? 0.5 : 1,
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
              >
                {/* top accent line on selected */}
                {isSelected && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg, transparent, ${box.color}cc, transparent)`,
                  }} />
                )}

                {/* Icon + completion badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: `${box.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: box.color,
                  }}>
                    <Icon size={15} />
                  </div>
                  {state === 'complete' && <CheckCircle2 size={13} color="#10b981" />}
                  {state === 'active'   && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 6px #3b82f688' }} />}
                </div>

                {/* Title */}
                <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? '#fff' : 'rgba(255,255,255,0.85)', marginBottom: 2 }}>
                  {box.title}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>
                  {box.timeline}
                </div>

                {/* Task dots */}
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 8 }}>
                  {box.tasks.map(t => {
                    const s = statuses[t.id] ?? t.status;
                    return (
                      <div key={t.id} style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: s === 'completed'
                          ? '#10b981'
                          : s === 'in-progress'
                          ? '#3b82f6'
                          : 'rgba(255,255,255,0.1)',
                      }} />
                    );
                  })}
                </div>

                {/* Progress bar + count */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: box.color,
                      borderRadius: 99,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>
                    {done}/{box.tasks.length}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* ── Detail Panel ── */}
        <AnimatePresence mode="wait">
          {selectedBox && (
            <motion.div
              key={selectedBox.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{
                borderRadius: 16,
                border: `1px solid ${selectedBox.color}20`,
                background: 'rgba(255,255,255,0.018)',
                overflow: 'hidden',
              }}
            >
              {/* Panel header */}
              <div style={{
                padding: '18px 28px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: `${selectedBox.color}07`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${selectedBox.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: selectedBox.color,
                  }}>
                    <selectedBox.Icon size={18} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{selectedBox.title}</h2>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: '2px 0 0' }}>
                      {selectedBox.subtitle}
                      <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
                      <span style={{ color: selectedBox.color }}>{selectedBox.timeline}</span>
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Phase progress */}
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                    {getBoxMeta(selectedBox).done}/{selectedBox.tasks.length} complete
                  </div>
                  <button
                    onClick={() => setActiveBoxId(null)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, borderRadius: 7,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.4)',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Task list */}
              <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedBox.tasks.map((task, idx) => {
                  const status = statuses[task.id] ?? task.status;
                  const sCfg   = STATUS_CFG[status];
                  const oCfg   = OWNER_CFG[task.owner];
                  const isDone = status === 'completed';

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.15 }}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '26px 20px 1fr auto',
                        gap: 12,
                        alignItems: 'flex-start',
                        padding: '13px 16px',
                        borderRadius: 10,
                        background: isDone
                          ? 'rgba(16,185,129,0.03)'
                          : status === 'in-progress'
                          ? 'rgba(59,130,246,0.04)'
                          : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${
                          isDone
                            ? 'rgba(16,185,129,0.1)'
                            : status === 'in-progress'
                            ? 'rgba(59,130,246,0.15)'
                            : 'rgba(255,255,255,0.05)'
                        }`,
                      }}
                    >
                      {/* Step number */}
                      <div style={{
                        fontSize: 10, fontWeight: 700,
                        color: 'rgba(255,255,255,0.18)',
                        paddingTop: 3, textAlign: 'right',
                      }}>
                        {String(idx + 1).padStart(2, '0')}
                      </div>

                      {/* Status icon — click to cycle */}
                      <button
                        onClick={() => cycleStatus(task.id)}
                        title="Click to update status"
                        style={{
                          color: sCfg.color,
                          cursor: 'pointer',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          paddingTop: 2,
                          display: 'flex',
                          alignItems: 'flex-start',
                          flexShrink: 0,
                        }}
                      >
                        <StatusIcon status={status} size={15} />
                      </button>

                      {/* Content */}
                      <div>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: isDone ? 'rgba(255,255,255,0.3)' : '#fff',
                          textDecoration: isDone ? 'line-through' : 'none',
                          lineHeight: 1.4,
                          marginBottom: 4,
                        }}>
                          {task.title}
                        </div>
                        <div style={{
                          fontSize: 12,
                          color: 'rgba(255,255,255,0.35)',
                          lineHeight: 1.65,
                        }}>
                          {task.description}
                        </div>
                      </div>

                      {/* Meta */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 5,
                        minWidth: 90,
                        flexShrink: 0,
                      }}>
                        <span style={{
                          fontSize: 10, padding: '3px 7px', borderRadius: 5,
                          background: oCfg.bg, color: oCfg.color,
                          fontWeight: 600, whiteSpace: 'nowrap',
                        }}>
                          {oCfg.label}
                        </span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', whiteSpace: 'nowrap' }}>
                          {task.timeline}
                        </span>
                        {task.calendlyType && (
                          <button
                            onClick={() => window.open(CALENDLY[task.calendlyType!] ?? CALENDLY['30min'], '_blank')}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              padding: '3px 8px', borderRadius: 5,
                              background: 'rgba(99,102,241,0.08)',
                              border: '1px solid rgba(99,102,241,0.2)',
                              color: '#818cf8', fontSize: 10, fontWeight: 500,
                              cursor: 'pointer', whiteSpace: 'nowrap',
                            }}
                          >
                            <Calendar size={9} />
                            Book call
                            <ExternalLink size={9} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
