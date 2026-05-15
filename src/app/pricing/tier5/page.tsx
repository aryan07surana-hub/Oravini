"use client";
// Force deployment: Complete Enterprise landing with ROI Calculator & Chatbot

import { useState } from "react";
import styles from "./tier5.module.css";

export default function Tier5Page() {
  const [activeTab, setActiveTab] = useState<"30" | "60" | "90">("30");
  
  // ROI Calculator State
  const [monthlyRevenue, setMonthlyRevenue] = useState(50000);
  const [hoursOnContent, setHoursOnContent] = useState(20);
  const [hourlyRate, setHourlyRate] = useState(250);
  const [monthlyLeads, setMonthlyLeads] = useState(100);
  const [closeRate, setCloseRate] = useState(10);
  const [showROI, setShowROI] = useState(true);
  
  // Chatbot State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'bot' | 'user', text: string}>>([{
    role: 'bot',
    text: "Let me ask you something — you're here because you KNOW generic tools are bleeding you dry. Am I wrong?\n\nYou're patching together 10 subscriptions, burning 30+ hours a week on manual garbage, watching competitors lap you while you're locked in someone else's software prison.\n\nI help guys like you build proprietary platforms that 10x output and run on autopilot. Ask me anything:\n\n💰 \"How much?\" → Real ROI math\n⚙️ \"What do I get?\" → Full breakdown\n⏱️ \"How fast?\" → 90-day roadmap\n🔬 \"Vs [tool]?\" → Why off-the-shelf is killing you\n\nOr just tell me where it hurts. Let's talk."
  }]);
  const [userInput, setUserInput] = useState("");
  
  // ROI Calculations
  const timeSaved = hoursOnContent * 0.75;
  const timeSavedValue = (timeSaved * 4 * hourlyRate);
  const currentSales = (monthlyLeads * closeRate) / 100;
  const improvedCloseRate = closeRate * 1.3;
  const newSales = (monthlyLeads * improvedCloseRate) / 100;
  const extraSales = newSales - currentSales;
  const avgDealSize = monthlyRevenue / currentSales || 5000;
  const extraRevenue = extraSales * avgDealSize;
  const totalValue = timeSavedValue + extraRevenue;
  
  const calculateROI = () => {
    setShowROI(true);
  };

  // Chatbot Logic
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    
    const newMessages = [...chatMessages, { role: 'user' as const, text: userInput }];
    setChatMessages(newMessages);
    
    const response = getBotResponse(userInput.toLowerCase(), chatMessages);
    
    setTimeout(() => {
      setChatMessages([...newMessages, { role: 'bot' as const, text: response }]);
    }, 500);
    
    setUserInput("");
  };
  
  // =====================================================
  // SALES ENGINE — SCORING-BASED INTENT SYSTEM
  // =====================================================
  
  type IntentScore = { id: string; score: number; matchedKeyword: string };
  
  type Intent = {
    id: string;
    keywords: [string, number][];
    priority: number;
    handler: (ctx: { input: string; stage: 'early' | 'mid' | 'late'; prevBotMsg?: string }) => string;
  };

  const getConvStage = (history: Array<{role: string, text: string}>): 'early' | 'mid' | 'late' => {
    const userCount = history.filter(m => m.role === 'user').length;
    if (userCount <= 1) return 'early';
    if (userCount <= 3) return 'mid';
    return 'late';
  };

  const lastBotMessage = (history: Array<{role: string, text: string}>): string | undefined => {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'bot') return history[i].text;
    }
    return undefined;
  };

  const intents: Intent[] = [
    {
      id: 'price',
      priority: 10,
      keywords: [
        ['how much', 10], ['cost', 8], ['price', 8], ['pricing', 8], ['expensive', 9],
        ['afford', 8], ['budget', 7], ['investment', 7], ['how much does', 10],
        ['whats the cost', 10], ['what does it cost', 10], ['fee', 6], ['billing', 5],
        ['monthly', 5], ['pay', 4], ['dollar', 4], ['pricin', 6], ['spend', 4], ['dont have money', 8],
      ],
      handler: ({ stage }) => {
        if (stage === 'early') {
          return "Stop right there. You're asking the wrong question.\n\nThe real question isn't \"how much does a platform cost?\" — it's \"how much is your CURRENT setup costing you?\"\n\nLet me show you. Go to the ROI calculator above this chat. Punch in your numbers — revenue, hours, leads.\n\nSee that number at the bottom? That's $20K, $50K, $100K+ a month you're leaving on the table because you're running on generic training wheels.\n\nA custom platform? Costs a fraction of that. One month's ROI usually covers the entire build.\n\nHere's the truth, and I need you to hear me: if you're doing $10K+/mo and you DON'T build this, YOU are the expensive one. You're paying in wasted hours, lost deals, and equity you'll never get back.\n\nBook the discovery call. I'll show you the exact math for YOUR business. No fluff. No B.S.";
        }
        return "I hear you circling back on price. Let me make this even simpler.\n\nWhat you're really asking is: \"Is this going to pay for itself?\"\n\nAnswer: yes. Usually in the first 30 days.\n\nGo to the ROI calculator. Put in your numbers. The monthly value you see is what you gain. The platform investment is a fraction of that.\n\nEvery month you delay, you're subsidizing SaaS companies instead of building YOUR asset. That's the real cost.\n\nCall it a bet. I'm betting you can't afford NOT to do this. Take the call and let the math prove it.";
      },
    },
    {
      id: 'features',
      priority: 9,
      keywords: [
        ['whats included', 10], ['what do i get', 10], ['what comes with', 10],
        ['features', 8], ['feature', 8], ['include', 7], ['deliverable', 9],
        ['contents', 7], ['package', 6], ['offer', 5], ['stack', 5], ['tech stack', 7],
        ['what does it do', 7], ['capabilities', 7], ['capability', 6],
        ['what can it do', 7], ['modules', 6], ['module', 6], ['components', 5],
      ],
      handler: () => {
        return "Here's exactly what a custom platform gets you — and listen closely, because this is probably the first time someone's shown you what's ACTUALLY possible:\n\n🚀 YOUR proprietary platform — 100% your brand, your IP, your rules. We write actual code. Zero templates. Zero white-label garbage.\n\n🤖 AI workers trained on YOUR methodology — not ChatGPT wrappers. Real agents that handle onboarding, content ops, follow-ups, reporting. The grunt work eating your week? Gone.\n\n⚡ Custom CRM — not Salesforce, not HubSpot. A CRM that mirrors YOUR sales process. Lead capture, scoring, nurturing, closing — automated exactly how YOU sell.\n\n📦 Course delivery — drip content, community, assessments. All under YOUR brand. Stop paying Kajabi $500/mo for what should be one feature in YOUR ecosystem.\n\n📊 Marketing automation — funnels, email sequences, retargeting. Tuned to YOUR audience. Not generic templates converting at 2%.\n\n🔧 Ongoing development — we don't ship and ghost. Your platform evolves as your business grows.\n\nThis isn't a features list. This is your entire business operating on a system designed for YOU.\n\nWhich one of these hits home hardest?";
      },
    },
    {
      id: 'custom_build',
      priority: 8,
      keywords: [
        ['build', 5], ['custom', 7], ['platform', 6], ['develop', 6], ['create', 5],
        ['tech', 5], ['technology', 5], ['code', 6], ['software', 6], ['from scratch', 8],
        ['proprietary', 8], ['system', 4], ['built', 5], ['building', 5], ['how you build', 7],
        ['architecture', 6], ['infrastructure', 6], ['what do you build', 7],
      ],
      handler: () => {
        return "Let me demystify this for you.\n\nWe are NOT reselling ClickFunnels. NOT white-labeling Kajabi. NOT dragging-and-dropping templates and calling it innovation.\n\nWe write proprietary code. From the ground up. Built around YOUR business model, YOUR sales psychology, YOUR client journey.\n\nHere's why that distinction matters:\n\n→ Generic tools force YOUR business into THEIR box. Your differentiation gets flattened. You become like every other tom, dick, and harry using the same template.\n\n→ A custom platform means YOUR exact sales sequence, automated. YOUR client journey, systematized. AI workers trained on YOUR playbook, converting leads while you sleep.\n\n→ YOU own it. No more $2K/mo in SaaS subscriptions. It's an asset on your books, not a recurring liability.\n\nDoes Apple outsource their operating system? Does Tesla use off-the-shelf software? No. Because proprietary infrastructure IS the competitive moat.\n\nEvery 7-figure operator you admire runs on proprietary infrastructure. Every. Single. One.\n\nThe discovery call is where we map out YOUR architecture. 30 minutes and you'll see the blueprint.";
      },
    },
    {
      id: 'qualification',
      priority: 7,
      keywords: [
        ['who is this for', 10], ['right for me', 9], ['is this for me', 9], ['qualify', 7],
        ['qualified', 6], ['coach', 6], ['consultant', 6], ['course creator', 7],
        ['course', 5], ['service provider', 6], ['agency', 6], ['fit', 5],
        ['type of business', 7], ['niche', 5], ['industry', 5], ['biz', 4],
        ['small business', 6], ['startup', 5], ['beginner', 5], ['new business', 5],
        ['new to this', 5], ['i do', 3], ['my business', 3], ['we do', 3],
      ],
      handler: ({ input }) => {
        if (input.includes('coach') || input.includes('consultant') || input.includes('course') || input.includes('agency')) {
          return `So you're a${input.includes('agency') ? 'n agency' : input.includes('coach') ? ' coach' : input.includes('consultant') ? ' consultant' : ' course creator'} — perfect. Here's the deal:\n\nYou've got a methodology that works. You've got clients who pay you. And you're probably hitting a ceiling where you can't scale without either:\nA) Hiring more people\nB) Working more hours\n\nBoth suck. A custom platform is option C.\n\nWe take YOUR intellectual property and build software around it. AI workers that deliver your methodology. Automation that runs your ops. A system that works while you sleep.\n\nThat's the play. Want to see what it looks like for YOUR specific business? Book the call.`;
        }
        return "Great question. Here's who this is a no-brainer for:\n\n✅ Coaches & consultants doing $10K+/mo who need proprietary delivery to break the time-for-money trap\n✅ Course creators done paying platform taxes — you want your infrastructure, your brand, your data\n✅ Info entrepreneurs scaling past 6 figures who need AI workers handling what 3-5 employees would do\n✅ Agencies ready to productize their methodology into software and build real equity\n\nHere's who it's NOT for:\n❌ Side hustles doing $2K/mo. Respect, but you're not ready yet.\n❌ People who think Kajabi templates are \"good enough.\" (If they were, you wouldn't be reading this.)\n❌ Anyone not willing to invest in their own infrastructure.\n\nSweet spot: $10K-$100K+/mo, proven methodology, choking on manual processes.\n\nWhich camp are you in?";
      },
    },
    {
      id: 'booking',
      priority: 10,
      keywords: [
        ['book', 8], ['schedule', 8], ['call', 7], ['demo', 8], ['meeting', 7],
        ['discovery', 8], ['talk', 5], ['jump on', 7], ['hop on', 7], ['calendar', 7],
        ['appointment', 7], ['connect', 5], ['consult', 7], ['sit down', 6],
        ['let\'s talk', 7], ['lets talk', 7], ['strategy session', 8],
      ],
      handler: () => {
        return "Now you're talking. Here's exactly what happens on the Platform Discovery Call:\n\n1️⃣ I grill you on your current operation — tools, processes, bottlenecks. I need to know what's broken before I can design the fix.\n\n2️⃣ We sketch YOUR custom platform architecture in real time. You'll literally see your business systemized.\n\n3️⃣ Transparent investment range — no games, no \"let me check with my manager.\" Real numbers based on YOUR scope.\n\n4️⃣ Realistic timeline. I'll tell you how fast we can build and what each phase looks like.\n\nYou walk away with a crystal-clear picture of what's possible. Value of this session alone? $1K+ if you paid for it.\n\nIt's free. 30 minutes. Zero pressure.\n\nThe 'Book Your Strategy Call' button is right there. Click it. Let's build something that actually moves the needle.";
      },
    },
    {
      id: 'timeline',
      priority: 8,
      keywords: [
        ['how long', 10], ['timeline', 9], ['when', 5], ['delivery', 7], ['launch', 6],
        ['ready', 4], ['eta', 7], ['timeframe', 8], ['deadline', 7], ['weeks', 5],
        ['months', 5], ['speed', 6], ['how fast', 9], ['quick', 6], ['fast', 5],
        ['how quick', 8], ['how soon', 8], ['turnaround', 7], ['completion', 6],
      ],
      handler: ({ stage }) => {
        const main = "Standard build: 90 days. Here's the breakdown:\n\n📐 DAYS 1-30: Discovery & Architecture — we dissect your business, design the system, set up infrastructure. You see wireframes before Day 30.\n\n🛠️ DAYS 31-60: Development Sprint — frontend, backend, AI workers, automations, integrations. You see progress every week.\n\n🚀 DAYS 61-90: Testing, Launch, Optimize — you're using it, we're polishing. By Day 90, you're live.\n\nPost-launch? We're still there. Ongoing development, new features — you're not stuck with a static product.\n\nNow let me give you the real talk:";
        if (stage === 'early') {
          return `${main}\n\n90 days sounds like a lot until you realize every month you wait is a month you're running on someone else's platform, paying their fees, losing leads that better infrastructure would close.\n\nA year from now, you'll either have a proprietary asset generating wealth, or you'll be in the exact same chair with the exact same ceiling.\n\nWhat's 90 days of building compared to a lifetime of upside?`;
        }
        return `${main}\n\nI've shown you the roadmap. The question isn't \"how fast can you build it\" — it's \"how fast do you want to stop leaving money on the table?\"\n\nLet's lock in that discovery call and get your start date on the calendar.`;
      },
    },
    {
      id: 'differentiation',
      priority: 9,
      keywords: [
        ['different', 7], ['competitor', 6], ['vs ', 5], ['versus', 6], ['compare', 6],
        ['other', 5], ['better than', 8], ['why you', 7], ['unique', 6], ['another', 5],
        ['similar', 6], ['alternative', 7], ['what makes', 7], ['how are you different', 10],
        ['whats different', 8], ['distinguish', 6], ['stand out', 6],
      ],
      handler: () => {
        return "This is the most important question you can ask. Here's the unfiltered truth:\n\nGeneric tools = generic business. Custom platform = market leader. Period.\n\nClickFunnels, Kajabi, Teachable, Kartra, GoHighLevel — they ALL do the same thing: templates, gated features, monthly fees, zero differentiation. Every single one of your competitors has access to the exact same crap.\n\nHere's what we build that they literally CANNOT:\n\n🔹 AI workers trained on YOUR intellectual property — not generic chatbots every dummy has access to\n🔹 Automation mirroring YOUR exact sales psychology and delivery methodology\n🔹 A proprietary asset YOU OWN — not rent until they raise prices again\n🔹 Zero constraints — if you can dream it, we code it. No \"this feature is only on Enterprise\" nonsense\n🔹 Your brand, your data, your competitive moat\n\nThe difference between generic SaaS and a custom platform is the difference between renting an apartment and building a skyscraper. Both give you space. Only one builds generational wealth.\n\nWant proof? Every 7-figure business you admire runs on proprietary infrastructure. Every. One.\n\nLet's build yours.";
      },
    },
    {
      id: 'specific_tool',
      priority: 9,
      keywords: [
        ['clickfunnels', 10], ['kajabi', 10], ['teachable', 10], ['kartra', 10],
        ['hubspot', 9], ['salesforce', 9], ['gohighlevel', 10], ['go high level', 10],
        ['gohigh', 8], ['member', 6], ['thinkific', 9], ['convertkit', 8],
        ['activecampaign', 8], ['zapier', 8], ['make.com', 7], ['integromat', 7],
        ['streak', 7], ['pipedrive', 8], ['keap', 8], ['infusionsoft', 8],
        ['ontraport', 8], ['wordpress', 7], ['shopify', 7], ['wix', 6],
        ['squarespace', 6], ['mailchimp', 7], ['aweber', 6], ['getresponse', 6],
        ['wishpond', 5], ['unbounce', 6], ['leadpages', 6], ['samcart', 7],
        ['thrivecart', 7], ['stripe', 5], ['calendly', 5],
      ],
      handler: ({ input }) => {
        const tool = input.match(/[a-z0-9]+/g)?.find(t =>
          ['clickfunnels','kajabi','teachable','kartra','hubspot','salesforce','gohighlevel','thinkific','convertkit','activecampaign','zapier','pipedrive','keap','infusionsoft','ontraport','wordpress','shopify','wix','squarespace','mailchimp','samcart','thrivecart'].includes(t));
        return `You mentioned ${tool || 'a specific tool'}. Let me tell you why adding one more subscription isn't the answer:\n\nThat tool was built for THEIR bottom line, not yours. They template-ize everything because it's cheaper for THEM. You get what every other user gets. And you pay forever.\n\nHere's what we build:\n→ Custom CRM matching YOUR sales process — not ${tool || 'that tool'}'s idea of a sales process\n→ AI workers executing YOUR methodology — not pre-built sequences every competitor has\n→ Course delivery reflecting YOUR brand — not a template you pray converts\n→ ONE unified system — not 10+ subscriptions that don't talk\n\nHere's the litmus test: if ${tool || 'that tool'} could do everything you needed, you wouldn't be on this page. You've outgrown the training wheels.\n\nStop adding tools. Start building infrastructure.\n\nWhat's the ONE thing ${tool || 'that tool'} can't do that's driving you crazy?`;
      },
    },
    {
      id: 'procrastination',
      priority: 9,
      keywords: [
        ['think about it', 10], ['need to think', 10], ['get back', 8], ['maybe later', 9],
        ['not now', 8], ['not ready', 8], ['let me think', 9], ['i\'ll think', 9],
        ['ill think', 8], ['sleep on it', 9], ['ponder', 7], ['not sure', 6],
        ['i don\'t know', 5], ['consider', 6], ['decide', 5], ['give me some time', 8],
        ['need time', 7], ['let me get back', 8], ['ill get back', 7],
        ['thinking about it', 9], ['still thinking', 8],
      ],
      handler: () => {
        return "Let me tell you something you probably don't want to hear, but NEED to hear:\n\n\"Let me think about it\" is the single most expensive phrase in business.\n\nHere's what happens while you're \"thinking\":\n❌ You burn $500-$2K/month on SaaS tools you don't own\n❌ Your team wastes 30+ hours a week on manual work automation would kill\n❌ You lose real leads with real money because your funnel has holes\n❌ Your competitors are moving forward\n\nI'm not asking you to sign a check. I'm asking you to invest 30 minutes in a free call.\n\nWorst case: you get a consultant-grade breakdown of your business ops. For free.\nBest case: you change the trajectory of your entire business.\n\nWhat's the real hesitation? Tell me. I've heard it all, and I promise you — the pain of staying stuck is worse than the pain of starting.";
      },
    },
    {
      id: 'risk_proof',
      priority: 8,
      keywords: [
        ['guarantee', 8], ['risk', 7], ['proof', 8], ['case study', 9], ['testimonial', 8],
        ['result', 6], ['proven', 7], ['scared', 7], ['nervous', 7], ['hesitant', 7],
        ['doubts', 7], ['evidence', 7], ['example', 6], ['previous', 6], ['past client', 8],
        ['success', 5], ['working', 5], ['legit', 6], ['show me', 5], ['prove it', 7],
        ['can you show', 6], ['what proof', 7], ['client results', 8],
        ['before and after', 7], ['guaranteed', 7], ['skeptical', 7],
      ],
      handler: () => {
        return "I'll give it to you straight — anyone who guarantees you'll make a million dollars is lying. I don't do that.\n\nWhat I CAN guarantee:\n✅ A proprietary platform built to YOUR specs — not templates\n✅ AI workers trained on YOUR processes — not generic prompts\n✅ A unified system replacing 10+ tools\n✅ Ongoing dev and support — you're never stuck\n\nLook at the ROI calculator above. Punch in your numbers. Our clients see $20K-$100K+/mo in time savings and extra revenue. That's not theory — that's YOUR data telling you what's possible.\n\nHere's the question nobody asks: what's the risk of staying EXACTLY where you are?\n\nBecause the real risk is waking up 12 months from now. Same chair. Same problems. Same 60-hour weeks. Same \"I should've done this.\"\n\nTHAT is a risk I wouldn't take.\n\n30-minute call. Free. If you don't see the value, you walk. What do you have to lose?";
      },
    },
    {
      id: 'trust',
      priority: 7,
      keywords: [
        ['trust', 7], ['scam', 8], ['legit', 7], ['credible', 7], ['who are you', 8],
        ['who is', 6], ['about you', 6], ['background', 7], ['experience', 6],
        ['track record', 8], ['portfolio', 7], ['review', 6], ['rating', 6],
        ['reliable', 6], ['company', 5], ['who you', 5], ['how do i know', 7],
        ['can you prove', 6], ['real company', 6],
      ],
      handler: () => {
        return "You should ask. If you didn't, I'd be worried.\n\nHere's the truth: we build proprietary platforms for info entrepreneurs, coaches, consultants, and course creators who've outgrown off-the-shelf tools. Our clients come in at $10K-$50K/mo and leave with infrastructure built to scale to 7 figures.\n\nBut honestly? Don't take my word for it.\n\nBook the discovery call. We'll show you:\n→ Previous builds and architectures\n→ Our dev process and team\n→ Case studies of similar businesses\n\nBy the end of that 30-minute call, you won't need a testimonial page. You'll have talked to the people who'd build your platform and seen the work.\n\nThat's worth more than a 5-star rating, wouldn't you say?\n\nZero commitment. Just a conversation. What do you have to lose?";
      },
    },
    {
      id: 'greeting',
      priority: 5,
      keywords: [
        ['hello', 6], ['hey', 5], ['hi ', 5], ['sup', 5], ['yo', 5],
        ['good morning', 6], ['good afternoon', 6], ['whats up', 5], ['howdy', 5],
        ['heyy', 5], ['hey there', 5], ['what\'s up', 5], ['how are you', 4],
      ],
      handler: ({ stage, prevBotMsg }) => {
        if (stage !== 'early') {
          return "Yo! Let's keep this rolling. What's on your mind? Still thinking about that custom platform, or is there something specific I can break down for you?\n\n💰 Pricing? ⚙️ Features? ⏱️ Timeline? 🎯 Who it's for?\n\nJust fire away.";
        }
        return "Yo! Glad you're here.\n\nLet me ask you something — be honest: what's the ONE thing about your current setup that drives you absolutely insane?\n\nThe tool that doesn't integrate? The manual work eating your week? The leads falling through cracks? The fees that keep going up?\n\nWhere does it hurt? Tell me, and I'll show you exactly how a custom platform fixes it.";
      },
    },
    {
      id: 'ai',
      priority: 8,
      keywords: [
        ['ai', 5], ['automation', 7], ['ai worker', 9], ['ai agent', 8],
        ['artificial', 6], ['machine learning', 7], ['automat', 7], ['robot', 5],
        ['gpt', 7], ['chatgpt', 7], ['llm', 7], ['neural', 6], ['intelligence', 5],
        ['bot', 4], ['openai', 6], ['claude', 5], ['model', 4], ['automated', 6],
        ['workflow', 5], ['workflows', 5],
      ],
      handler: () => {
        return "Every man and his dog is slapping 'AI' on their landing page. Let me tell you what we ACTUALLY do:\n\n🤖 AI workers trained on YOUR intellectual property — not generic wrappers. These agents know YOUR methodology, YOUR voice, YOUR sales psychology. They don't sound like a bot — they sound like YOU.\n\n⚡ Workflows mirroring YOUR exact operations — client onboarding, content repurposing, follow-up sequences, reporting. We code the logic based on how YOU run your business.\n\n📊 Analytics that learn from YOUR data — the AI gets smarter over time because it trains on YOUR audience, YOUR conversions, YOUR feedback loops. Not aggregate garbage.\n\n🧠 Multi-agent orchestration — one bot qualifies leads, another handles onboarding, another manages content ops. They talk to each other. You manage from one dashboard.\n\nThe difference between what we build and a ChatGPT wrapper? Custom suit vs off-the-rack. Both cover you. One makes you look like a million bucks.\n\nWant to see what YOUR AI workers could look like?";
      },
    },
    {
      id: 'support',
      priority: 6,
      keywords: [
        ['support', 7], ['maintenance', 7], ['upkeep', 6], ['ongoing', 7],
        ['update', 6], ['after launch', 8], ['what happens after', 8], ['post launch', 7],
        ['bug', 5], ['break', 5], ['fix', 5], ['help', 4], ['assist', 4],
        ['maintain', 6], ['long term', 7], ['what about after', 7], ['who do i call', 6],
        ['customer service', 6], ['priority', 5],
      ],
      handler: () => {
        return "We don't build and ghost. That's amateur hour.\n\nHere's what ongoing looks like:\n\n🔧 Continuous Development — new features, improvements, iterations. Your platform evolves with your business.\n\n📞 Priority Support — you get direct access to the team building your platform. No Level 1 support in another country.\n\n🔄 Optimization Cycles — we monitor performance, identify bottlenecks, push improvements. Your platform gets better every month.\n\n🧠 AI Retraining — as your business grows and your methodology refines, your AI workers get retrained. They scale WITH you.\n\nThis is a partnership, not a project. We win when your platform prints money for you.\n\nPeriod.";
      },
    },
    {
      id: 'scaling',
      priority: 7,
      keywords: [
        ['scale', 7], ['grow', 6], ['growth', 6], ['expand', 6], ['bigger', 5],
        ['10x', 8], ['multiple', 5], ['revenue', 6], ['income', 5], ['money', 4],
        ['profit', 6], ['exit', 7], ['sell', 6], ['valuation', 7], ['empire', 6],
        ['hustle', 5], ['mrr', 6], ['monthly recurring', 6], ['growth', 5],
      ],
      handler: () => {
        return "Now you're speaking my language. Scaling is EXACTLY what this machine is built for.\n\nHere's the ceiling every info entrepreneur hits:\n\nYou start trading time for money. You hit $20K, $50K, $100K/mo — then you're stuck. Every new dollar costs more of YOUR time. You hire. You train. You're still the bottleneck.\n\nA custom platform destroys that ceiling:\n\n📈 AI workers handle delivery — serve 3x clients without hiring 3x people\n⚡ Automation runs operations — focus on strategy, not spreadsheets\n🔐 Proprietary tech builds equity — your business is worth 5-10x more as a tech asset vs a service business\n\nThe goal isn't just making more money. The goal is building a business that runs WITHOUT you. An asset. Something you own that works while you sleep.\n\nThat's what we build.\n\nWant to see the math? ROI calculator above. Then the discovery call. Let's go.";
      },
    },
    {
      id: 'already_have',
      priority: 7,
      keywords: [
        ['already have', 8], ['already using', 8], ['already got', 8], ['no thanks', 8],
        ['not interested', 8], ['not for me', 7], ['im good', 7], ["i'm good", 7],
        ['fine as is', 7], ['happy with', 7], ['works fine', 7], ['no need', 6],
        ['pass', 6], ['no thank', 6], ['leave me alone', 8], ['stop', 6],
        ['not looking', 6], ['not right now', 6],
      ],
      handler: () => {
        return "I respect that. You've got something working, and you're not easily sold. I respect the hell out of that.\n\nBut let me ask you one thing — be brutally honest:\n\nIs your current system ACTUALLY scaling? Or is it barely keeping up while you work harder and harder to maintain it?\n\nSomething brought you to this page. A frustration. A limitation. A ceiling you can feel but can't break through with what you've got.\n\nYou don't need to buy anything. But you owe it to yourself to see what's possible.\n\n30-minute call. No pitch. Just a conversation. What do you say?";
      },
    },
    {
      id: 'too_busy',
      priority: 8,
      keywords: [
        ['too busy', 9], ['no time', 8], ['don\'t have time', 8], ['dont have time', 8],
        ['swamped', 8], ['overwhelmed', 8], ['stressed', 7], ['hectic', 7],
        ['crazy', 5], ['slammed', 7], ['workload', 7], ['full plate', 7],
        ['tons of work', 6], ['so much work', 6],
      ],
      handler: () => {
        return "That's EXACTLY why you need this. Let me connect the dots.\n\nYou're \"too busy\" because your current setup was never designed to scale. Every dollar of growth adds more work ON YOU.\n\nHere's what a custom platform does to your calendar:\n→ AI workers handle onboarding: 5+ hrs/week back\n→ Automated follow-ups: 3+ hrs/week back\n→ Content repurposing pipeline: 5+ hrs/week back\n→ Reporting & analytics: 2+ hrs/week back\n\nThat's 15+ hours a week. Back in YOUR pocket.\n\nThe irony? You're too busy to fix the thing that's making you busy. That's the trap.\n\nBreak the cycle. 30-minute call. We design a system that gives you your life back.\n\nOr keep being \"busy.\" Your call.";
      },
    },
    {
      id: 'hot_lead',
      priority: 10,
      keywords: [
        ['yes', 5], ['interested', 6], ['lets do it', 9], ["let's do it", 9],
        ['sign me', 8], ['i want in', 8], ['im ready', 8], ["i'm ready", 8],
        ['lets go', 8], ["let's go", 8], ['count me', 8], ['incredible', 5],
        ['amazing', 5], ['perfect', 5], ['lets build', 9], ["let's build", 9],
        ['tell me more', 5], ['sounds good', 5], ['im in', 7], ["i'm in", 7],
        ['lets do this', 8], ["let's do this", 8], ['where do i sign', 8],
      ],
      handler: () => {
        return "Let's f*cking go. Here's your two-step game plan:\n\n👉 Step 1: Click 'Book Your Strategy Call' button on this page (hero section or below the ROI calculator — can't miss it)\n👉 Step 2: Pick a 30-minute slot that works for you\n\nOn that call we:\n1️⃣ Diagnose your current operation — what's broken, what's leaking money\n2️⃣ Design your custom platform architecture — you'll see it mapped out\n3️⃣ Give you transparent investment and timeline — real numbers, real talk\n\nNo fluff. No pitch deck. No high-pressure close. Straight-up strategy session.\n\nSee you on the other side. Let's build something massive.";
      },
    },
    {
      id: 'process',
      priority: 7,
      keywords: [
        ['how does it work', 10], ['how it work', 8], ['process', 6], ['methodology', 6],
        ['approach', 6], ['step by step', 8], ['walk me', 7], ['explain', 5],
        ['breakdown', 7], ['behind the scenes', 7], ['technical', 5],
        ['whats the process', 8], ['what is the process', 8], ['how this works', 8],
      ],
      handler: () => {
        return "Here's the 10,000-foot view:\n\nPHASE 1: DEEP DIVE (Weeks 1-2)\nWe get inside your business. Sales, delivery, tech stack, bottlenecks, goals. We don't design until we understand everything.\n\nPHASE 2: ARCHITECTURE (Weeks 3-4)\nWe design the system — platform structure, AI logic, workflows, data model. You approve the blueprint before a line of code is written.\n\nPHASE 3: BUILD (Weeks 5-10)\nFull-stack dev. AI training. Integration setup. You see progress every week — live demos, not status updates.\n\nPHASE 4: LAUNCH (Weeks 11-12)\nTesting, stress-testing, optimization. We train your team. Then we flip the switch.\n\nPHASE 5: SCALE (Ongoing)\nNew features, optimizations, AI retraining. Your platform grows as your business grows.\n\nWant the technical deep dive? The discovery call is where we get into the weeds. Bring your questions.";
      },
    },
    {
      id: 'frustration',
      priority: 7,
      keywords: [
        ['frustrat', 7], ['annoy', 6], ['piss', 7], ['tired of', 7], ['sick of', 7],
        ['sucks', 7], ['terrible', 6], ['awful', 6], ['waste', 6], ['nightmare', 8],
        ['hate', 6], ['pain', 6], ['headache', 7], ['struggling', 7], ['difficult', 5],
        ['hard', 4], ['complicated', 6], ['mess', 6], ['broken', 6], ['useless', 5],
        ['disaster', 7], ['failing', 5], ['fed up', 7], ['done with', 5],
      ],
      handler: () => {
        return "I hear you. And you're not alone — every client came to us feeling EXACTLY this way.\n\nLet me ask: when did you first notice your setup wasn't cutting it?\n\n→ When you realized you're paying for 10 tools that don't talk to each other?\n→ When you lost a client because your system couldn't deliver?\n→ When you looked at your calendar and saw 80% ops, 20% growth?\n\nHere's the good news: you don't need to duct-tape another solution on top of the mess. You need to replace the foundation.\n\nThat's what we do. One platform. Built for YOU. No more bandaids.\n\nTell me what's frustrating you most — I want to hear it.";
      },
    },
    {
      id: 'positive_close',
      priority: 3,
      keywords: [
        ['thank', 5], ['thanks', 5], ['appreciate', 5], ['helpful', 5],
        ['great info', 6], ['good info', 5], ['useful', 5], ['valuable', 5],
        ['that helps', 6], ['clear', 4], ['got it', 4], ['makes sense', 5],
        ['that makes sense', 5], ['understood', 4], ['i see', 3],
      ],
      handler: () => {
        return "Glad it's landing. I'm here to give you the real talk, not the sales pitch.\n\nHere's what I'd suggest: take 5 minutes, punch your numbers into the ROI calculator above. That'll tell you more than I ever could.\n\nIf the math checks out, book the discovery call. 30 minutes. Let's see what's possible for YOUR business.\n\nEither way, you're now thinking about this the right way. That alone puts you ahead of 90% of people.\n\nAnything else I can answer?";
      },
    },
    {
      id: 'objection_generic',
      priority: 4,
      keywords: [
        ['but', 5], ['however', 5], ['problem is', 6], ['issue is', 6],
        ['challenge', 5], ['concern', 6], ['worry', 5], ['worried', 5],
        ['what if', 5], ['not sure if', 5], ['difficult', 4], ['tough', 4],
      ],
      handler: () => {
        return "I hear the hesitation. Let me ask you something:\n\nWhat's the WORST thing that happens if you hop on a 30-minute discovery call and it's not for you?\n\nYou lose 30 minutes. That's it.\n\nWhat's the BEST thing that happens? You find the missing piece that takes your business from grinding to growing.\n\nI've seen this play out a hundred times. The people who take the call never regret it. The people who don't? They're still in the same spot a year later.\n\nWhat's your specific concern? Lay it on me. I'll give it to you straight.";
      },
    },
    // ===========================================
    // NOT TECHNICAL — SKILL OBJECTION
    // ===========================================
    {
      id: 'not_technical',
      priority: 8,
      keywords: [
        ['not technical', 9], ['not tech savvy', 9], ['dont know tech', 8],
        ['dont understand', 6], ['too technical', 8], ['complicated', 6],
        ['over my head', 8], ['no coding', 7], ['cant code', 7], ['dont code', 6],
        ['not a developer', 8], ['not a coder', 8], ['technical skill', 6],
        ['too complex', 7], ['hard to manage', 7], ['need someone technical', 8],
        ['i dont know technology', 7], ['not computer person', 7],
        ['cant manage', 5], ['confusing', 5],
      ],
      handler: () => {
        return "Let me put your mind at ease immediately: you don't need to know a single line of code. Ever.\n\nHere's the model:\n\n→ You focus on YOUR expertise — your methodology, your sales, your clients. The stuff you're already great at.\n\n→ We handle ALL the technology. Build it, manage it, update it, secure it. You never touch the code.\n\n→ You get a simple dashboard where you manage everything. Think of it like driving a car — you don't need to know how the engine works to get where you're going.\n\n→ When you need something changed or added, you tell us. We build it. You keep running your business.\n\nSome of our most successful clients couldn't tell you the difference between HTML and a ham sandwich. Doesn't matter. That's our job.\n\nYour job is to be the expert in YOUR field. Our job is to make that expertise work at scale.\n\nStill worried about the tech side? Book the call and I'll show you exactly how little you need to know.";
      },
    },
    // ===========================================
    // TEAM ADOPTION — "MY TEAM WON'T USE IT"
    // ===========================================
    {
      id: 'adoption',
      priority: 8,
      keywords: [
        ['team wont use', 9], ['team will not use', 9], ['adoption', 7],
        ['get my team', 7], ['train my team', 7], ['team buy in', 8],
        ['team resistance', 8], ['my people', 5], ['my staff', 5],
        ['employees wont', 7], ['employees will not', 7], ['get everyone', 5],
        ['team training', 7], ['staff training', 6], ['onboard my team', 8],
        ['my team', 4], ['my employees', 5], ['my assistants', 5],
      ],
      handler: () => {
        return "You're smart to think about this. Most people focus on the tech and forget the humans. Here's how we handle it:\n\n1️⃣ WE DO THE ONBOARDING — we train YOUR team on the platform. Not you. Us. We create the training materials, run the sessions, handle the questions.\n\n2️⃣ IT'S INTUITIVE BY DESIGN — we're not building enterprise software with a 200-page manual. We build tools that feel obvious. If your team can use Instagram, they can use this.\n\n3️⃣ PHASED ROLLOUT — we don't flip a switch and chaos ensues. We roll out features gradually. Your team adopts at their pace.\n\n4️⃣ THE \"WHY\" IS OBVIOUS — when your team sees that the platform eliminates their most annoying manual tasks, they won't resist. They'll pull YOU to implement faster.\n\nHere's the reality: your team is probably drowning in the same manual garbage you are. They WANT better tools. They just don't want more complexity. We solve both.\n\nTell me about your team size and I'll be more specific about the rollout.";
      },
    },
    // ===========================================
    // BURNED BEFORE — PAST NEGATIVE EXPERIENCE
    // ===========================================
    {
      id: 'burned_before',
      priority: 9,
      keywords: [
        ['burned before', 9], ['been burned', 9], ['tried before', 8],
        ['didnt work', 8], ['didn\'t work', 8], ['previous experience', 7],
        ['past experience', 7], ['scammed before', 8], ['ripped off', 8],
        ['wasted money', 8], ['waste of money', 8], ['tried this before', 8],
        ['failed before', 7], ['tried something similar', 8], ['tried this before', 8],
        ['not the first time', 6], ['another vendor', 6], ['bad experience', 7],
        ['failed project', 7], ['gone wrong', 6], ['horror story', 7],
        ['developers ghosted', 8], ['freelancer disappeared', 8],
      ],
      handler: () => {
        return "I hear that. And I'm not going to give you some glib \"this time is different\" BS. You have every right to be skeptical.\n\nLet me tell you what probably happened last time:\n\n→ Someone over-promised and under-delivered\n→ They built something generic and tried to pass it off as custom\n→ Communication went dark after you paid\n→ You ended up with software that doesn't actually fit your business\n\nAm I close?\n\nHere's what we do differently:\n\n✅ YOU SEE PROGRESS EVERY WEEK — live demos, not status updates. You can see, touch, and use the platform as it's being built.\n\n✅ YOU APPROVE BEFORE WE BUILD — you sign off on the architecture, the designs, the workflows before a line of code is written. No surprises.\n\n✅ REAL PEOPLE — you work with the actual team building your platform. Not a sales guy who disappears after the contract is signed.\n\n✅ ONGOING RELATIONSHIP — we don't build and ghost. We're still there 6 months, 12 months, 24 months later.\n\nI can't undo your past experience. But I can show you how this one is different. 30-minute call. You'll feel the difference in the first 5 minutes.";
      },
    },
    // ===========================================
    // MIGRATION — MOVING FROM CURRENT SYSTEM
    // ===========================================
    {
      id: 'migration',
      priority: 7,
      keywords: [
        ['migrate', 8], ['migration', 8], ['move from', 7], ['switch from', 7],
        ['transfer', 6], ['import', 6], ['export', 6], ['move my data', 8],
        ['transition', 7], ['switch over', 7], ['port over', 7],
        ['move everything', 6], ['data migration', 8], ['bring my data', 7],
        ['migrating', 7], ['leave my current', 7], ['move away from', 7],
      ],
      handler: () => {
        return "Migration is one of those things that sounds terrifying but we've done it a hundred times. Here's exactly how it works:\n\n🔍 WE AUDIT FIRST — before we touch anything, we map out everything you're currently using. Every tool, every integration, every workflow.\n\n🔄 PHASED MIGRATION — we don't cut the cord on Day 1. We run parallel systems until you're comfortable. Your old tools keep working while we build the new platform.\n\n📦 DATA IMPORT — contacts, courses, content, history — we bring it all over. Your business doesn't skip a beat.\n\n🧪 YOU TEST BEFORE WE SWITCH — you get to use the platform with your real data in a staging environment. You approve before we go live.\n\n🚀 GO-LIVE SUPPORT — on launch day, we're there. Real-time. If anything hiccups, we fix it immediately.\n\nMost of our clients are fully transitioned within 2 weeks and wondering why they didn't do it sooner.\n\nThe only painful migration is the one you try to do yourself. We handle it.";
      },
    },
    // ===========================================
    // PAYMENT PLANS / FINANCING
    // ===========================================
    {
      id: 'payment_plans',
      priority: 7,
      keywords: [
        ['payment plan', 9], ['pay in installments', 8], ['financing', 8],
        ['payment options', 7], ['monthly payment', 7], ['installments', 8],
        ['pay over time', 8], ['split payment', 7], ['payment terms', 7],
        ['can i pay monthly', 8], ['how do i pay', 6], ['deposit', 5],
        ['down payment', 6], ['half now', 6], ['pay half', 6],
      ],
      handler: () => {
        return "Straight answer: we structure payments to work for serious entrepreneurs who are ready to invest in their infrastructure.\n\nHere's the thing — you're not buying a subscription. You're building an asset. The ROI calculator above shows you what this platform will generate for you monthly. Compared to that number, the investment is small.\n\nMost clients find that once they see the ROI math, the payment structure feels like a detail.\n\nBook the discovery call. We'll go through the investment options based on YOUR scope. No games, no hidden fees, just transparent numbers.";
      },
    },
    // ===========================================
    // INVOLVEMENT — HOW MUCH TIME DO I NEED
    // ===========================================
    {
      id: 'involvement',
      priority: 7,
      keywords: [
        ['how much time', 7], ['time commitment', 8], ['how involved', 8],
        ['what do i need to do', 7], ['my involvement', 8], ['hands on', 6],
        ['how many hours', 7], ['my time', 5], ['weekly commitment', 7],
        ['do i need to be', 6], ['how much do I need to participate', 8],
        ['work on my end', 6], ['busy', 3], ['dont have much time', 6],
      ],
      handler: () => {
        return "Less than you think. Here's the honest breakdown:\n\nPHASE 1 (Weeks 1-2): Higher touch — we need 4-6 hours total from you to understand your business, your processes, your methodology. We schedule these calls at YOUR convenience.\n\nPHASE 2 (Weeks 3-4): You review wireframes and approve the architecture. Maybe 2 hours total.\n\nPHASE 3 (Weeks 5-10): You check in weekly for 30-minute demos. That's it. We build while you run your business.\n\nPHASE 4 (Weeks 11-12): You test the platform, give feedback, train your team. Maybe 3-4 hours.\n\nTotal: roughly 10-12 hours over 90 days. Less than 1 hour per week.\n\nAnd after launch? Some clients check in once a month. Others talk to us weekly because they keep dreaming up new features.\n\nThe whole point is to FREE your time, not consume it.";
      },
    },
    // ===========================================
    // START SMALL — MODULAR APPROACH
    // ===========================================
    {
      id: 'start_small',
      priority: 7,
      keywords: [
        ['start small', 9], ['start with', 6], ['phase', 6], ['modular', 7],
        ['add later', 8], ['add more later', 8], ['minimum viable', 8],
        ['mvp', 8], ['basic version', 7], ['start simple', 8],
        ['build on it', 7], ['expand later', 8], ['scale up', 5],
        ['crawl before', 7], ['smaller scope', 7], ['pilot', 6],
        ['test the waters', 7], ['dip my toe', 7],
      ],
      handler: () => {
        return "Absolutely. We can scope this however you want. Here's the approach most of our clients take:\n\n🎯 CORE MODULE FIRST — we identify the ONE feature or workflow that will give you the biggest ROI. We build that first. You start seeing value immediately.\n\n➕ ADD MODULES OVER TIME — once the core is running and you're seeing results, we add the next piece. Custom CRM? AI workers? Course delivery? Marketing automation? Each one is a phase.\n\n🔄 ITERATIVE — you're not committing to the full vision on Day 1. We build, you use, we measure, we add what's working.\n\nThink of it like building a house. We start with the foundation and the most important room. Then we add wings as you're ready.\n\nThe discovery call is where we figure out what your CORE module should be — the one thing that makes the biggest impact first.\n\nLet's identify your biggest bottleneck and build from there.";
      },
    },
    // ===========================================
    // VS FREELANCER — WHY NOT HIRE A DEV
    // ===========================================
    {
      id: 'vs_freelancer',
      priority: 8,
      keywords: [
        ['freelancer', 8], ['hire a developer', 7], ['hire dev', 7],
        ['upwork', 7], ['fiverr', 7], ['hire someone', 5], ['in house', 6],
        ['hire in house', 6], ['my own developer', 7], ['build it myself', 7],
        ['hire a team', 5], ['contractor', 5], ['outsource', 5],
        ['cheaper to hire', 7], ['local developer', 6],
      ],
      handler: () => {
        return "I'm glad you asked, because this is where most people waste a LOT of money before coming to us.\n\nHere's what happens when you hire a freelancer or Upwork dev:\n\n❌ They build what you SAY, not what you NEED — you don't know what you don't know, and they don't know your business\n❌ Zero architecture — they cobble together code that works today but collapses when you try to scale\n❌ You're the project manager — congrats, you just added a new job to your plate\n❌ They ghost — when the project gets hard or a better-paying gig comes along\n❌ No long-term thinking — they build for today, not for where your business is going\n\nWhat we bring:\n✅ We design the ARCHITECTURE first — your platform is built to scale from Day 1\n✅ We know YOUR business model — coaches, consultants, course creators, agencies. This is what we do.\n✅ You're not managing anything — we project manage, we build, we test, we launch\n✅ Ongoing partnership — we're there in 6 months when you need a new feature\n✅ Full team — designers, developers, AI specialists, QA. Not one person in a coffee shop.\n\nA freelancer builds you a tool. We build you an asset. There's a difference.\n\nWant to see the difference? Jump on the call and I'll show you our architecture process. It'll change how you think about building software.";
      },
    },
    // ===========================================
    // TEAM TRAINING — DO YOU TRAIN MY STAFF
    // ===========================================
    {
      id: 'team_training',
      priority: 6,
      keywords: [
        ['train my team', 8], ['train my staff', 8], ['training', 6],
        ['teach my team', 7], ['show my team', 6], ['documentation', 6],
        ['user manual', 6], ['guide', 4], ['tutorial', 5], ['walkthrough', 6],
        ['how to use', 5], ['learning curve', 6], ['get up to speed', 6],
      ],
      handler: () => {
        return "100%. We don't just build it — we make sure your entire team knows how to use it.\n\nHere's what training looks like:\n\n📚 CUSTOM DOCUMENTATION — we write guides specific to YOUR platform, not generic manuals\n\n🎥 VIDEO WALKTHROUGHS — recorded training your team can reference anytime\n\n👨‍🏫 LIVE SESSIONS — we run hands-on training with your team. Q&A, real scenarios, their actual questions.\n\n🔄 ROLE-BASED — your sales team sees different training than your ops team. Everyone learns what THEY need.\n\n🧪 SANDBOX — your team practices in a safe environment before going live.\n\n📞 ONGOING — new hire? We train them. New feature? We train on it. It's part of the partnership.\n\nThe goal is simple: your team should be up and running within a week, confident and excited about the new system.\n\nWe've trained everyone from non-technical assistants to entire agencies. Your team will be fine.";
      },
    },
    // ===========================================
    // NEEDS CHANGE — WHAT IF SCOPE CHANGES
    // ===========================================
    {
      id: 'needs_change',
      priority: 7,
      keywords: [
        ['change my mind', 7], ['needs change', 7], ['scope change', 8],
        ['change halfway', 8], ['change direction', 7], ['pivot', 6],
        ['add more later', 7], ['change requirements', 7], ['evolve', 5],
        ['things change', 5], ['business changes', 6], ['grow out of', 5],
        ['outgrow', 6], ['what if i want', 6], ['need something different', 6],
      ],
      handler: () => {
        return "This is actually a feature, not a bug, of how we work.\n\nHere's the reality: your business WILL change in the next 90 days. You'll discover new bottlenecks, new opportunities, new ways to make money. That's a GOOD thing.\n\nOur process is built for that:\n\n🔄 AGILE, NOT WATERFALL — we don't disappear for 3 months and come back with something you've outgrown. You see progress weekly. If something needs to change, we adjust.\n\n📆 REGULAR CHECKPOINTS — every week we align. If your priorities shifted, we shift with you. No change request forms, no bureaucracy.\n\n🧱 MODULAR ARCHITECTURE — your platform is built in modules. Changing one doesn't break the others. It's designed to evolve.\n\n📈 YOUR BUSINESS GROWS, WE GROW WITH IT — the platform you have in Month 12 won't look the same as Month 1. That's by design.\n\nThink of it this way: a custom platform built by a partner who's there every week is MORE adaptable than an off-the-shelf tool you can't change at all.\n\nYou're not locked in. You're set up to evolve.";
      },
    },
    // ===========================================
    // DATA SECURITY / PRIVACY
    // ===========================================
    {
      id: 'data_security',
      priority: 7,
      keywords: [
        ['security', 7], ['secure', 6], ['data security', 8], ['privacy', 7],
        ['confidential', 6], ['nda', 6], ['non disclosure', 6],
        ['protect my data', 7], ['my data safe', 7], ['data protection', 7],
        ['gdpr', 7], ['compliance', 6], ['encryption', 7],
        ['hack', 6], ['breach', 6], ['data breach', 7],
        ['safe', 4], ['private', 4], ['my information', 4],
      ],
      handler: () => {
        return "Data security isn't an afterthought for us — it's baked into everything we build.\n\nHere's what you need to know:\n\n🔒 ENCRYPTION — all data encrypted in transit AND at rest. Industry-standard AES-256.\n\n🏢 YOUR DATA IS YOURS — we don't share, sell, or touch your client data. Ever. It's your IP, not ours.\n\n📋 COMPLIANCE — we can build to whatever compliance standards you need (GDPR, HIPAA, SOC2, etc.).\n\n🔐 ACCESS CONTROL — you control who sees what. Your team, your permissions, your rules.\n\n📁 REGULAR BACKUPS — automated backups. If something goes wrong, we restore in minutes.\n\n🛡️ INFRASTRUCTURE — enterprise-grade hosting. Not shared servers. Your platform runs on its own infrastructure.\n\nLet me be blunt: a custom platform built for you is actually MORE secure than running your business on 10 different SaaS tools, each with their own security holes and data sharing policies.\n\nWith us, there's one system, one security standard, one place where your data lives. It's simpler AND safer.\n\nHave specific compliance requirements? Tell me on the call and we'll address them directly.";
      },
    },
    // ===========================================
    // CONTRACT / COMMITMENT CONCERNS
    // ===========================================
    {
      id: 'contract',
      priority: 6,
      keywords: [
        ['contract', 7], ['commitment', 6], ['lock in', 7], ['locked in', 7],
        ['long term contract', 8], ['minimum term', 6], ['obligation', 6],
        ['cancel anytime', 6], ['month to month', 6], ['tied in', 6],
        ['stuck with', 6], ['cant get out', 7], ['can\'t get out', 7],
        ['terminate', 5], ['cancellation', 6], ['cancel', 5],
      ],
      handler: () => {
        return "Fair question. Let me be transparent.\n\nWe're not one of those companies that locks you into a 2-year contract with exit penalties. That's not how partnerships work.\n\nHere's the structure:\n\n✅ CLEAR SCOPE — the initial build is a defined project with a clear scope, timeline, and investment. You know exactly what you're getting and what it costs.\n\n✅ PHASED APPROACH — you're not committing to the whole vision up front. Start with the core module, see results, then decide on the next phase.\n\n✅ NO HIDDEN TRAPS — our agreements are straightforward. You can read them without a lawyer. (Though we encourage you to have one look.)\n\n✅ ONGOING IS OPTIONAL — the ongoing retainer for support and development is month-to-month. If it's not delivering value, you can pause or stop.\n\nI'm confident in what we build. I don't need to trap you in a contract to keep your business. If you're getting value, you'll stay. If you're not, I want to know why so we can fix it.\n\nThat's how real partnerships work.";
      },
    },
    // ===========================================
    // SEE IT FIRST — TRIAL / DEMO REQUEST
    // ===========================================
    {
      id: 'trial',
      priority: 7,
      keywords: [
        ['see it first', 8], ['see a demo', 8], ['see an example', 8],
        ['show me', 6], ['show me something', 7], ['sample', 6],
        ['prototype', 7], ['demo first', 8], ['trial', 6],
        ['test it out', 6], ['try before', 7], ['can i try', 6],
        ['see the platform', 7], ['show me what', 6], ['preview', 6],
        ['walk me through', 6], ['let me see', 5],
      ],
      handler: () => {
        return "I get it — you want to see what you're getting into before you invest. Smart.\n\nHere's the thing: because each platform is built CUSTOM for each client's business, there's no generic demo I can show you that would be meaningful. Every platform looks different because every business is different.\n\nBUT — here's what I CAN do:\n\n🎯 BOOK THE DISCOVERY CALL — I'll show you platforms we've built for similar businesses. You'll see the architecture, the features, the AI workers in action. You'll talk to the people who built them.\n\n📐 DURING THE CALL — we'll sketch what YOUR platform would look like. You'll see wireframes, workflows, and system design specific to YOUR business.\n\n🏗️ BEFORE YOU COMMIT — we can build a prototype or proof of concept for a small scope. You test it with real data. If you like it, we build the full platform.\n\nDiscovery call → see REAL examples → get YOUR blueprint → decide.\n\nThat's a lot more valuable than a generic screenshare of a demo account that has nothing to do with your business, don't you think?";
      },
    },
    // ===========================================
    // DECISION MAKER — NEED TO CONSULT OTHERS
    // ===========================================
    {
      id: 'decision_maker',
      priority: 8,
      keywords: [
        ['talk to my', 7], ['talk to my partner', 8], ['talk to my team', 7],
        ['my husband', 7], ['my wife', 7], ['my business partner', 8],
        ['check with', 7], ['run it by', 7], ['discuss with', 6],
        ['consult with', 6], ['my spouse', 7], ['my co founder', 7],
        ['partners', 5], ['other people', 4], ['my board', 5],
        ['have to ask', 6], ['need to ask', 6], ['get approval', 6],
        ['my manager', 5], ['my boss', 4],
      ],
      handler: ({ stage }) => {
        if (stage === 'early') {
          return "Smart. The best decisions aren't made in a vacuum.\n\nHere's what I'd suggest: bring them on the discovery call with you. Seriously.\n\nThe call is 30 minutes. They'll hear the same thing you hear — the architecture, the investment, the timeline. They can ask their own questions. And I'll answer them straight.\n\nIt's way easier than you trying to explain it to them second-hand. Half the time, I hear \"oh, THAT'S what this is? I thought it was something else.\"\n\nBook the call, bring your partner, and let's all get on the same page.\n\nWhat do you say?";
        }
        return "Absolutely. Bring them into the conversation.\n\nHere's the fastest path to a yes: book the discovery call and have them join. 30 minutes, no pressure, they get all their questions answered directly.\n\nIf they can't make the call, I can put together a quick overview you can share with them — the architecture, the ROI math, the timeline.\n\nWhat works best?";
      },
    },
    // ===========================================
    // CAPACITY — HOW MANY CLIENTS CAN IT HANDLE
    // ===========================================
    {
      id: 'capacity',
      priority: 6,
      keywords: [
        ['how many clients', 8], ['capacity', 6], ['handle traffic', 6],
        ['handle volume', 6], ['scale to', 7], ['thousands', 6],
        ['millions', 5], ['large number', 5], ['enterprise', 5],
        ['high volume', 6], ['how many users', 7], ['concurrent', 6],
        ['load', 4], ['traffic', 5], ['growth spurt', 5],
      ],
      handler: () => {
        return "This is where custom infrastructure crushes off-the-shelf tools.\n\nHere's the short answer: we build to YOUR scale requirements. Whether you have 50 clients or 50,000, the architecture is designed for it.\n\nHere's the longer answer:\n\n📈 CLOUD INFRASTRUCTURE — we use enterprise-grade cloud hosting (AWS, GCP, or Azure). It auto-scales. If you get a traffic spike, the platform handles it without breaking a sweat.\n\n🏗️ SCALABLE ARCHITECTURE — we don't build monolithic code that collapses under load. Modular, distributed architecture designed to grow.\n\n🔧 STRESS-TESTED — before launch, we test under load. We find the breaking point and make sure you never hit it.\n\nThe limit, honestly, is your business growth — not the platform. We've built systems that handle millions of users.\n\nWhat's your current volume? What do you expect in the next 12 months? Tell me on the call and I'll architect for it.";
      },
    },
    // ===========================================
    // SPECIFIC NICHE / INDUSTRY
    // ===========================================
    {
      id: 'specific_niche',
      priority: 6,
      keywords: [
        ['my industry', 6], ['my niche', 7], ['specific niche', 7],
        ['specialized', 5], ['unique needs', 6], ['my field', 5],
        ['health', 5], ['real estate', 5], ['fitness', 5], ['finance', 5],
        ['legal', 5], ['medical', 5], ['real estate', 5], ['realestate', 5],
        ['mlm', 5], ['network marketing', 5], ['b2b', 4], ['b2c', 4],
        ['saas', 4], ['ecommerce', 4], ['e-commerce', 4],
        ['different industry', 5], ['my specific', 5],
      ],
      handler: ({ input }) => {
        const niche = ['health','real estate','fitness','finance','legal','medical','mlm','b2b','b2c','saas','ecommerce','realestate'].find(n => input.includes(n));
        return niche
          ? `Great question. ${niche.charAt(0).toUpperCase() + niche.slice(1)} has specific needs, and our approach is designed for that.\n\nHere's the thing: we don't build generic platforms. We build for YOUR business model. Your methodology. Your client journey.\n\nIf you're in ${niche}, we study how ${niche} businesses operate — the sales cycle, the compliance requirements, the delivery model, the common bottlenecks — and we build around THAT.\n\nYour platform will have features specific to ${niche} that generic tools can't offer.\n\n→ Specific compliance needs? Built in.\n→ Specific client journey for ${niche}? Automated.\n→ Specific sales psychology for ${niche} buyers? Baked into the AI workers.\n\nNo two platforms we build are the same. Because no two businesses are the same. ${niche} is just another set of requirements we design for.\n\nTell me more about your specific business on the call. I'll show you how we'd approach it.`
          : "Every business is different, and that's exactly why custom works.\n\nWe don't have a template that we force-fit to every industry. We study YOUR business — your sales cycle, your delivery model, your compliance needs, your client journey — and we build around THAT.\n\nA coach's platform looks different from a course creator's platform, which looks different from an agency's platform. That's the whole point.\n\nWhatever your niche, we design for it. Tell me about your business and I'll show you how we'd approach it.";
      },
    },
    // ===========================================
    // EXIT STRATEGY — WHAT IF I WANT TO CANCEL
    // ===========================================
    {
      id: 'exit_strategy',
      priority: 7,
      keywords: [
        ['want to cancel', 7], ['cancel my subscription', 7], ['stop using', 6],
        ['move away', 6], ['leave the platform', 6], ['take my data', 7],
        ['get my data out', 7], ['export my data', 7], ['if i leave', 6],
        ['what if i want to stop', 7], ['discontinue', 5],
        ['sunset', 4], ['shut down', 5], ['walk away', 5],
        ['what happens if i cancel', 7], ['cancel service', 6],
      ],
      handler: () => {
        return "Another totally fair question. Here's the truth:\n\n✅ YOUR DATA IS YOURS — always. We don't hold your data hostage. If you ever want to leave, we export everything in a standard format. Contacts, content, history — it's all yours.\n\n✅ YOU OWN THE PLATFORM — depending on the agreement, you own the code and the IP. We can discuss the specifics on the call.\n\n✅ NO DATA TRAPS — we don't make it painful to leave. That's not our business model. Our business model is delivering so much value you don't WANT to leave.\n\n✅ TRANSITION SUPPORT — if you ever need to migrate away (to an in-house team, another vendor, whatever), we help with the transition. Gracefully.\n\nHere's the reality: in 5+ years of doing this, we've had clients pause, scale down, change direction — but almost never fully leave. Because once you have a platform that runs YOUR business exactly the way you want, going back to generic tools feels like stepping into a horse and buggy after driving a Ferrari.\n\nBut if you ever need to, there's no cage. You walk when you want, with everything that's yours.";
      },
    },
    // ===========================================
    // SUCCESS STORY — NARRATIVE PROOF
    // ===========================================
    {
      id: 'success_story',
      priority: 7,
      keywords: [
        ['success story', 8], ['tell me a story', 7], ['example client', 7],
        ['story of', 6], ['client story', 8], ['give me an example', 7],
        ['someone like me', 7], ['similar business', 7], ['case study', 5],
        ['real example', 6], ['walk me through', 5], ['scenario', 4],
        ['help someone', 6], ['client like me', 7],
      ],
      handler: () => {
        return "Let me paint you a picture of a client who was in your exact shoes.\n\nA coach — let's call him Mike — was doing $25K/mo. He had a solid methodology, great testimonials, clients getting results. But he was maxed out. He was spending 30+ hours a week on manual follow-ups, content repurposing, client onboarding. He had 3 different tools that didn't talk to each other, a VA who spent half her week on data entry, and he knew he was leaving money on the table.\n\nHe came to us skeptical. \"I've tried automation before,\" he said. \"Nothing ever works the way I need it to.\"\n\nWe built him a custom platform in 90 days. Here's what changed:\n\n🤖 AI workers now handle 80% of his client onboarding — automatically\n⚡ Follow-ups happen on autopilot — his leads get nurtured while he sleeps\n📊 Content repurposing pipeline — one video becomes 10 pieces of content, automatically\n📈 Results? 8 months later, he's at $85K/mo. Same team size. Same hours. Just a platform that does the heavy lifting.\n\nHe told me: \"I wasted 2 years trying to make generic tools work. I should have built this the day I hit $10K.\"\n\nThat's not a unique story. That's the story of every client who makes the leap.\n\nYour story could be next. Same 90 days. Same platform. Just YOUR business.";
      },
    },
    // ===========================================
    // TRIED AUTOMATION BEFORE — DIDN'T WORK
    // ===========================================
    {
      id: 'tried_before',
      priority: 8,
      keywords: [
        ['tried automation', 8], ['tried ai', 7], ['tried before', 7],
        ['never works', 7], ['automation never', 6], ['tried this', 6],
        [' doesnt work', 6], ['doesnt work', 6], ['waste of time', 6],
        ['tried software', 5], ['tried platforms', 5], ['nothing works', 6],
        ['every tool', 5], ['all the same', 5], ['same story', 5],
      ],
      handler: () => {
        return "I hear this more than anything. And you're right — most automation IS garbage.\n\nHere's why what you tried before failed:\n\n❌ GENERIC TOOLS — they try to do everything for everyone and do nothing well for YOU specifically\n❌ ONE-SIZE-FITS-NONE — the automation logic is pre-built for a generic business, not YOUR processes\n❌ SETUP AND PRAY — you configure it once, it kinda works, then breaks, and you can't fix it\n❌ LIMITED BY THE PLATFORM — if the tool doesn't have the feature you need, you're stuck\n\nHere's why this is different:\n\n✅ WE CODE TO YOUR PROCESS — not the other way around. Your methodology drives the automation, not some template.\n✅ YOU CONTROL IT — if something needs to change, we change it. You're not limited by what a checkbox can do.\n✅ IT ACTUALLY LEARNS — your AI workers get smarter over time because they train on YOUR data, YOUR feedback, YOUR results.\n✅ REAL SUPPORT — when something breaks, you talk to the people who built it. Not a chatbot that sends you to a knowledge base.\n\nThe automation you tried before was a generic tool trying to fit your square peg into their round hole.\n\nThis is a round hole built around YOUR peg.\n\nDifferent approach. Different results.";
      },
    },
    // ===========================================
    // LONGEVITY — WHAT IF YOU GO OUT OF BUSINESS
    // ===========================================
    {
      id: 'longevity',
      priority: 7,
      keywords: [
        ['go out of business', 8], ['out of business', 7], ['what if you', 5],
        ['you shut down', 7], ['you close', 6], ['bankrupt', 6],
        ['what happens to my platform', 8], ['if you disappear', 7],
        ['if you go under', 7], ['you fail', 5], ['your company', 5],
        ['still around', 5], ['long term viability', 7], ['stable company', 5],
        ['are you established', 5],
      ],
      handler: () => {
        return "You're thinking long-term. I respect that.\n\nHere's what I can tell you:\n\n✅ YOU OWN THE CODE — depending on the agreement structure, you own the intellectual property. We can structure it so the platform is YOUR asset, not ours.\n\n✅ SOURCE CODE ACCESS — you can have access to the source code. If anything ever happens to us, you can take it to any development team in the world.\n\n✅ STANDARD TECHNOLOGY — we don't use obscure frameworks or proprietary languages. Standard tech stack that thousands of developers can work with.\n\n✅ FULL DOCUMENTATION — architecture docs, API specs, deployment instructions. Everything another team would need to pick it up.\n\nThink of it this way: if you hire a construction company to build a skyscraper, you get the building AND the blueprints. Same here.\n\nOur business model is built on delivering value, not on locking you in. We're confident in what we build and the partnerships we create. That's how we've been in business for years and will be for years to come.\n\nBut I don't expect you to take my word for it. Ask me on the call — I'll show you how we structure ownership.";
      },
    },
  ];

  const scoreInput = (input: string): IntentScore[] => {
    const results: IntentScore[] = [];
    for (const intent of intents) {
      let score = 0;
      let matchedKeyword = '';
      for (const [keyword, weight] of intent.keywords) {
        if (input.includes(keyword.toLowerCase())) {
          score += weight;
          if (matchedKeyword.length < keyword.length) {
            matchedKeyword = keyword;
          }
        }
      }
      if (score > 0) {
        results.push({ id: intent.id, score: score + intent.priority, matchedKeyword });
      }
    }
    return results.sort((a, b) => b.score - a.score);
  };

  const getBotResponse = (input: string, conversationHistory: Array<{role: string, text: string}>): string => {
    const stage = getConvStage(conversationHistory);
    const prevBotMsg = lastBotMessage(conversationHistory);
    const scored = scoreInput(input);
    const ctx = { input, stage, prevBotMsg };

    // No intent matched — route to default
    if (scored.length === 0) {
      return "Good question. Let me help you find what you're looking for:\n\n💰 \"How much does it cost?\" → Real ROI math\n⚙️ \"What do I actually get?\" → Full platform breakdown\n📅 \"How fast can you build it?\" → 90-day roadmap\n🎯 \"Is this for me?\" → Qualification check\n🔬 \"How are you different?\" → Vs Kajabi, ClickFunnels, etc.\n🤖 \"Tell me about the AI\" → What it actually does\n📈 \"How does this help me scale?\" → Growth architecture\n\nOr just tell me what's on your mind. I'll give it to you straight.";
    }

    // Top intent is clearly ahead — use it
    const top = scored[0];
    const runnerUp = scored[1];

    // Handle compound questions: if two intents close in score AND different ids
    if (runnerUp && top.score - runnerUp.score < 4 && top.id !== runnerUp.id) {
      const topIntent = intents.find(i => i.id === top.id);
      const runnerIntent = intents.find(i => i.id === runnerUp.id);
      const r1 = topIntent ? topIntent.handler(ctx) : '';
      const r2 = runnerIntent ? runnerIntent.handler(ctx) : '';
      // Use the higher priority one, but add a bridge from the second
      const primary = topIntent && runnerIntent && topIntent.priority >= runnerIntent.priority ? topIntent : runnerIntent;
      if (primary) {
        const primaryResp = primary.handler(ctx);
        return primaryResp;
      }
    }

    const matched = intents.find(i => i.id === top.id);
    if (matched) {
      return matched.handler(ctx);
    }

    return "Good question. Let me make sure I get you the right answer.\n\nWhat's on your mind? Pricing, features, timeline, who it's for? Just fire away.";
  };

  return (
    <main className={styles.page}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Enterprise Solution</p>
          <h1>Scale Your Info Offer Without the Overwhelm</h1>
          <p className={styles.lede}>
            We help coaches, consultants, and info entrepreneurs scale to 7-figures with unlimited AI automation, sales team enablement, and white-glove support. Stop trading time for money. Start building a real business.
          </p>
          <div className={styles.heroCTA}>
            <a href="https://calendly.com/your-link" className={styles.primaryButton} target="_blank" rel="noopener noreferrer">
              📅 Book Your Strategy Call
            </a>
            <a href="#roi-calculator" className={styles.secondaryButton}>
              📊 Calculate Your ROI ↓
            </a>
            <p className={styles.ctaNote}>Free 30-minute consultation • No pressure, just value</p>
          </div>
        </div>
        <div className={styles.heroVideo}>
          <div className={styles.videoWrapper}>
            <div className={styles.videoPlaceholder}>
              <span>🎥</span>
              <p>Your VSL Video Goes Here</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive ROI Calculator */}
      <section id="roi-calculator" className={styles.roiCalculatorSection}>
        <div className={styles.sectionHeader}>
          <h2>Calculate Your Platform ROI</h2>
          <p className={styles.subtitle}>See how much value a custom platform brings to YOUR business</p>
        </div>

        <div className={styles.calculatorCard}>
          <div className={styles.calculatorInputs}>
            <h3>Tell us about your business:</h3>

            <div className={styles.inputGroup}>
              <label>
                💰 Monthly Revenue:
                <div className={styles.inputWrapper}>
                  <span className={styles.inputPrefix}>$</span>
                  <input
                    type="number"
                    value={monthlyRevenue}
                    onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                    min="0"
                  />
                </div>
              </label>
            </div>

            <div className={styles.inputGroup}>
              <label>
                ⏰ Hours/week on manual tasks:
                <div className={styles.inputWrapper}>
                  <input
                    type="number"
                    value={hoursOnContent}
                    onChange={(e) => setHoursOnContent(Number(e.target.value))}
                    min="0"
                  />
                  <span className={styles.inputSuffix}>hours</span>
                </div>
              </label>
            </div>

            <div className={styles.inputGroup}>
              <label>
                💵 Your hourly rate:
                <div className={styles.inputWrapper}>
                  <span className={styles.inputPrefix}>$</span>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    min="0"
                  />
                  <span className={styles.inputSuffix}>/hr</span>
                </div>
              </label>
            </div>

            <div className={styles.inputGroup}>
              <label>
                📊 Monthly leads:
                <div className={styles.inputWrapper}>
                  <input
                    type="number"
                    value={monthlyLeads}
                    onChange={(e) => setMonthlyLeads(Number(e.target.value))}
                    min="0"
                  />
                  <span className={styles.inputSuffix}>leads</span>
                </div>
              </label>
            </div>

            <div className={styles.inputGroup}>
              <label>
                📈 Current close rate:
                <div className={styles.inputWrapper}>
                  <input
                    type="number"
                    value={closeRate}
                    onChange={(e) => setCloseRate(Number(e.target.value))}
                    min="0"
                    max="100"
                  />
                  <span className={styles.inputSuffix}>%</span>
                </div>
              </label>
            </div>

            <button className={styles.calculateButton} onClick={calculateROI}>
              Recalculate My ROI
            </button>
          </div>

          {showROI && (
            <div className={styles.calculatorResults}>
              <h3>🎯 Your Platform ROI</h3>

              <div className={styles.resultCard}>
                <div className={styles.resultRow}>
                  <span>💰 Time Saved Value:</span>
                  <strong>${timeSavedValue.toLocaleString()}/mo</strong>
                </div>
                <p className={styles.resultDetail}>
                  Save {timeSaved.toFixed(1)} hours/week × ${hourlyRate}/hr = ${(timeSaved * hourlyRate).toLocaleString()}/week
                </p>
              </div>

              <div className={styles.resultCard}>
                <div className={styles.resultRow}>
                  <span>📈 Extra Revenue:</span>
                  <strong>${extraRevenue.toLocaleString()}/mo</strong>
                </div>
                <p className={styles.resultDetail}>
                  {extraSales.toFixed(1)} extra sales/month × ${avgDealSize.toLocaleString()} avg deal size
                </p>
              </div>

              <div className={styles.resultDivider}></div>

              <div className={styles.resultRow}>
                <span>✅ Total Monthly Value:</span>
                <strong className={styles.totalValue}>${totalValue.toLocaleString()}</strong>
              </div>

              <div className={styles.roiHighlight}>
                <p>That&apos;s massive value from automation and AI workers! 🎉</p>
                <p className={styles.roiNote}>
                  And this doesn&apos;t even count the competitive advantage of having your own proprietary platform.
                </p>
              </div>

              <a href="https://calendly.com/your-link" className={styles.primaryButton} target="_blank" rel="noopener noreferrer">
                Book My Platform Discovery Call →
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Before/After Section */}
      <section className={styles.beforeAfterSection}>
        <div className={styles.sectionHeader}>
          <h2>Before vs After: The Transformation</h2>
          <p className={styles.subtitle}>See what happens when you have your own custom-built platform</p>
        </div>
        <div className={styles.beforeAfterGrid}>
          <div className={styles.beforeCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardIcon}>😰</span>
              <h3>Before: Using Generic Tools</h3>
            </div>
            <ul className={styles.beforeAfterList}>
              <li>❌ Juggling 10+ different software tools</li>
              <li>❌ Manual processes eating 30+ hours/week</li>
              <li>❌ Generic automation that doesn't fit your methodology</li>
              <li>❌ Clients see you're using off-the-shelf software</li>
              <li>❌ Limited by what existing tools can do</li>
              <li>❌ Paying $500-2000/mo for multiple subscriptions</li>
              <li>❌ Can't scale without hiring more people</li>
              <li>❌ No competitive advantage in your niche</li>
            </ul>
          </div>
          <div className={styles.afterCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardIcon}>🚀</span>
              <h3>After: Your Custom Platform</h3>
            </div>
            <ul className={styles.beforeAfterList}>
              <li>✅ One unified platform built specifically for YOU</li>
              <li>✅ AI workers handling 80% of repetitive tasks</li>
              <li>✅ Custom automation matching your exact processes</li>
              <li>✅ Clients think YOU built this proprietary technology</li>
              <li>✅ Unlimited possibilities—we build what you need</li>
              <li>✅ One platform, one system, fully integrated</li>
              <li>✅ Scale to 10x clients without adding team members</li>
              <li>✅ Proprietary platform = unbeatable competitive moat</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Solution Overview */}
      <section className={styles.solutionSection}>
        <div className={styles.solutionContent}>
          <p className={styles.eyebrow}>The Complete Solution</p>
          <h2>Everything You Need to Scale Your Info Business</h2>
          <p className={styles.solutionLede}>
            We give you the complete infrastructure to scale your coaching, consulting, or info business—from AI-powered content creation to sales automation and white-glove support. Stop trading time for money. Start building a real business.
          </p>
          <div className={styles.solutionHighlights}>
            <div className={styles.highlight}>
              <span>♾️</span>
              <div>
                <h4>Unlimited AI Automation</h4>
                <p>Create unlimited content, automate workflows, and scale without limits</p>
              </div>
            </div>
            <div className={styles.highlight}>
              <span>👥</span>
              <div>
                <h4>Sales Team Enablement</h4>
                <p>CRM, lead management, and automated follow-ups that actually convert</p>
              </div>
            </div>
            <div className={styles.highlight}>
              <span>🎯</span>
              <div>
                <h4>White-Glove Support</h4>
                <p>Dedicated account manager, custom SLA, and priority everything</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do For You */}
      <section className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <h2>Everything We Do For You</h2>
          <p className={styles.subtitle}>The complete toolkit to scale your info business</p>
        </div>

        <div className={styles.featuresList}>
          {/* Sales Team Enablement */}
          <div className={styles.featureBlock}>
            <div className={styles.featureIcon}>📊</div>
            <div className={styles.featureContent}>
              <h3>Sales Team Enablement</h3>
              <p>Empower your sales team with enterprise-grade tools that close more deals</p>
              <ul>
                <li>✓ Full CRM integration with your existing tools</li>
                <li>✓ Automated lead scoring and qualification</li>
                <li>✓ Smart follow-up sequences that convert</li>
                <li>✓ Real-time pipeline visibility and reporting</li>
                <li>✓ Team performance analytics and coaching insights</li>
                <li>✓ Custom sales playbooks and scripts</li>
              </ul>
            </div>
          </div>

          {/* Content Production at Scale */}
          <div className={styles.featureBlock}>
            <div className={styles.featureIcon}>🚀</div>
            <div className={styles.featureContent}>
              <h3>Content Production at Scale</h3>
              <p>Create unlimited content across all platforms without the time investment</p>
              <ul>
                <li>✓ Unlimited AI credits—no caps, no limits</li>
                <li>✓ Batch content creation for weeks in advance</li>
                <li>✓ Multi-platform distribution (Instagram, LinkedIn, YouTube, TikTok)</li>
                <li>✓ AI-powered video generation and editing</li>
                <li>✓ Content calendar automation</li>
                <li>✓ Brand voice consistency across all content</li>
              </ul>
            </div>
          </div>

          {/* Info Product Management */}
          <div className={styles.featureBlock}>
            <div className={styles.featureIcon}>📚</div>
            <div className={styles.featureContent}>
              <h3>Info Product Management</h3>
              <p>Host, deliver, and manage all your digital products in one place</p>
              <ul>
                <li>✓ Course hosting with unlimited storage</li>
                <li>✓ Membership site builder with custom branding</li>
                <li>✓ Digital product delivery and licensing</li>
                <li>✓ Drip content scheduling and automation</li>
                <li>✓ Student progress tracking and engagement</li>
                <li>✓ Integrated payment processing and invoicing</li>
              </ul>
            </div>
          </div>

          {/* Mentorship & Coaching Tools */}
          <div className={styles.featureBlock}>
            <div className={styles.featureIcon}>🎓</div>
            <div className={styles.featureContent}>
              <h3>Mentorship & Coaching Tools</h3>
              <p>Manage your coaching clients and mentorship programs effortlessly</p>
              <ul>
                <li>✓ Advanced scheduling with Calendly integration</li>
                <li>✓ Client portal with progress tracking</li>
                <li>✓ Session notes and action item management</li>
                <li>✓ Automated check-ins and accountability</li>
                <li>✓ Resource library for clients</li>
                <li>✓ Group coaching and cohort management</li>
              </ul>
            </div>
          </div>

          {/* White-Glove Support */}
          <div className={styles.featureBlock}>
            <div className={styles.featureIcon}>💎</div>
            <div className={styles.featureContent}>
              <h3>White-Glove Support</h3>
              <p>You're not just a customer—you're a partner. We're invested in your success</p>
              <ul>
                <li>✓ Dedicated account manager (direct line access)</li>
                <li>✓ Custom SLA with guaranteed response times</li>
                <li>✓ Priority support across all channels</li>
                <li>✓ Quarterly strategy sessions</li>
                <li>✓ Custom feature development for your needs</li>
                <li>✓ White-glove onboarding and migration</li>
              </ul>
            </div>
          </div>

          {/* Advanced Analytics */}
          <div className={styles.featureBlock}>
            <div className={styles.featureIcon}>📈</div>
            <div className={styles.featureContent}>
              <h3>Advanced Analytics & Optimization</h3>
              <p>Data-driven insights to optimize every part of your business</p>
              <ul>
                <li>✓ Revenue tracking and forecasting</li>
                <li>✓ Conversion funnel optimization</li>
                <li>✓ Team performance dashboards</li>
                <li>✓ Content performance analytics</li>
                <li>✓ Customer lifetime value tracking</li>
                <li>✓ Custom reporting and data exports</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Build Timeline */}
      <section className={styles.expectationSection}>
        <div className={styles.sectionHeader}>
          <h2>What to Expect: Your First 90 Days</h2>
          <p className={styles.subtitle}>We set clear expectations—here's exactly what happens</p>
        </div>

        <div className={styles.tabButtons}>
          <button 
            className={`${styles.tabButton} ${activeTab === "30" ? styles.active : ""}`}
            onClick={() => setActiveTab("30")}
          >
            First 30 Days
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === "60" ? styles.active : ""}`}
            onClick={() => setActiveTab("60")}
          >
            Days 31-60
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === "90" ? styles.active : ""}`}
            onClick={() => setActiveTab("90")}
          >
            Days 61-90
          </button>
        </div>

        <div className={styles.tabContent}>
          {activeTab === "30" && (
            <div className={styles.timelineContent}>
              <h3>🚀 Foundation & Setup</h3>
              <div className={styles.timelineGrid}>
                <div className={styles.timelineItem}>
                  <span className={styles.week}>Week 1</span>
                  <h4>Onboarding & Discovery</h4>
                  <ul>
                    <li>Kickoff call with your dedicated account manager</li>
                    <li>Deep-dive into your business, goals, and challenges</li>
                    <li>Account setup and team access configuration</li>
                    <li>Integration planning (CRM, tools, platforms)</li>
                  </ul>
                </div>
                <div className={styles.timelineItem}>
                  <span className={styles.week}>Week 2</span>
                  <h4>System Integration</h4>
                  <ul>
                    <li>Connect your existing tools and platforms</li>
                    <li>Import your content, courses, and client data</li>
                    <li>Set up your sales pipeline and workflows</li>
                    <li>Configure automation rules and triggers</li>
                  </ul>
                </div>
                <div className={styles.timelineItem}>
                  <span className={styles.week}>Week 3</span>
                  <h4>Team Training</h4>
                  <ul>
                    <li>Live training sessions for you and your team</li>
                    <li>Sales team enablement workshop</li>
                    <li>Content creation workflow setup</li>
                    <li>Best practices and optimization tips</li>
                  </ul>
                </div>
                <div className={styles.timelineItem}>
                  <span className={styles.week}>Week 4</span>
                  <h4>Go Live</h4>
                  <ul>
                    <li>Launch your first automated campaigns</li>
                    <li>Start creating content at scale</li>
                    <li>Sales team begins using new tools</li>
                    <li>First check-in and optimization session</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === "60" && (
            <div className={styles.timelineContent}>
              <h3>📈 Optimization & Growth</h3>
              <div className={styles.timelineGrid}>
                <div className={styles.timelineItem}>
                  <span className={styles.week}>Week 5-6</span>
                  <h4>Data Collection & Analysis</h4>
                  <ul>
                    <li>Monitor performance across all systems</li>
                    <li>Identify bottlenecks and opportunities</li>
                    <li>A/B test content and sales approaches</li>
                    <li>Refine automation workflows</li>
                  </ul>
                </div>
                <div className={styles.timelineItem}>
                  <span className={styles.week}>Week 7-8</span>
                  <h4>Scale & Optimize</h4>
                  <ul>
                    <li>Increase content production volume</li>
                    <li>Optimize sales conversion rates</li>
                    <li>Launch new campaigns and funnels</li>
                    <li>Expand to additional platforms</li>
                  </ul>
                </div>
              </div>
              <div className={styles.milestone}>
                <h4>🎯 60-Day Milestone Goals:</h4>
                <ul>
                  <li>✓ 3x content output without additional time investment</li>
                  <li>✓ 20%+ improvement in sales conversion rates</li>
                  <li>✓ Fully automated lead nurture sequences</li>
                  <li>✓ Team operating independently with systems</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "90" && (
            <div className={styles.timelineContent}>
              <h3>🚀 Full Scale & Expansion</h3>
              <div className={styles.timelineGrid}>
                <div className={styles.timelineItem}>
                  <span className={styles.week}>Week 9-12</span>
                  <h4>Advanced Strategies</h4>
                  <ul>
                    <li>Launch advanced automation sequences</li>
                    <li>Implement predictive analytics</li>
                    <li>Scale to new markets or offerings</li>
                    <li>Custom feature development (if needed)</li>
                  </ul>
                </div>
                <div className={styles.timelineItem}>
                  <span className={styles.week}>Week 13+</span>
                  <h4>Continuous Growth</h4>
                  <ul>
                    <li>Quarterly strategy sessions</li>
                    <li>Ongoing optimization and refinement</li>
                    <li>New feature rollouts and updates</li>
                    <li>Scale support as you grow</li>
                  </ul>
                </div>
              </div>
              <div className={styles.milestone}>
                <h4>🎯 90-Day Success Metrics:</h4>
                <ul>
                  <li>✓ 5x+ content production capacity</li>
                  <li>✓ 30%+ increase in qualified leads</li>
                  <li>✓ 25%+ improvement in close rates</li>
                  <li>✓ 10+ hours/week saved on manual tasks</li>
                  <li>✓ Clear path to next revenue milestone</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className={styles.faqSection}>
        <div className={styles.sectionHeader}>
          <h2>Frequently Asked Questions</h2>
          <p className={styles.subtitle}>Everything you need to know about Enterprise</p>
        </div>

        <div className={styles.faqGrid}>
          <div className={styles.faqItem}>
            <h3>Who is Enterprise for?</h3>
            <p>
              Enterprise is designed for established info entrepreneurs, coaches, course creators, and digital product sellers who are ready to scale. If you're doing $10K+/month and feeling the growing pains of manual processes, Enterprise is for you.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3>How is this different from the Pro plan?</h3>
            <p>
              Enterprise includes unlimited AI credits (vs 500), dedicated account manager, custom SLA, white-glove onboarding, quarterly strategy sessions, and custom feature development. You also get priority access to new features and direct line to our team.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3>What happens on the strategy call?</h3>
            <p>
              We'll dive deep into your business, understand your goals and challenges, and create a custom roadmap for your success. No pressure, no sales pitch—just a genuine conversation about how we can help you scale. If it's not a fit, we'll tell you.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3>Can I migrate from another platform?</h3>
            <p>
              Absolutely! Our white-glove onboarding includes full migration support. We'll help you move your content, courses, client data, and integrations. Our team handles the heavy lifting so you can focus on your business.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3>What integrations do you support?</h3>
            <p>
              We integrate with all major platforms: Stripe, PayPal, Calendly, Zoom, Slack, HubSpot, Salesforce, Zapier, and more. Need a custom integration? We'll build it for you as part of Enterprise.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3>Is there a contract or can I cancel anytime?</h3>
            <p>
              No long-term contracts required. You can cancel anytime. We also offer a 30-day money-back guarantee—if you're not seeing value, we'll refund you, no questions asked.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3>How quickly can I get started?</h3>
            <p>
              Most clients are fully onboarded within 2-3 weeks. We move as fast as you do. Some clients prefer a slower rollout, others want to go all-in immediately. We adapt to your timeline and needs.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3>What kind of support do I get?</h3>
            <p>
              You get a dedicated account manager with direct access (email, Slack, or phone). Custom SLA with guaranteed response times. Priority support across all channels. Plus quarterly strategy sessions to ensure you're maximizing the platform.
            </p>
          </div>
        </div>
      </section>

      {/* Custom Platform Add-On Section */}
      <section className={styles.customPlatformSection}>
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>For Serious Scalers</p>
          <h2>Want Us to Build Your Own Software Platform?</h2>
          <p className={styles.subtitle}>Take it to the next level with a proprietary platform built specifically for your business</p>
        </div>

        <div className={styles.platformContent}>
          <p className={styles.platformLede}>
            Beyond our Enterprise solution, we also build custom software platforms for select clients who want to take their info business to the absolute next level. If you want proprietary technology that becomes your competitive advantage, let's talk.
          </p>

          <div className={styles.platformFeatures}>
            <div className={styles.platformFeature}>
              <span>🏗️</span>
              <div>
                <h4>Custom-Built Platform</h4>
                <p>We build you a proprietary software platform from scratch—100% your brand, designed around your methodology</p>
              </div>
            </div>
            <div className={styles.platformFeature}>
              <span>🤖</span>
              <div>
                <h4>AI Workers & Automation</h4>
                <p>Custom AI agents trained on your content and processes, automating 80% of repetitive tasks</p>
              </div>
            </div>
            <div className={styles.platformFeature}>
              <span>⚡</span>
              <div>
                <h4>Ongoing Development</h4>
                <p>We keep building and improving your platform as your business grows—you're never stuck</p>
              </div>
            </div>
          </div>

          <div className={styles.platformCTA}>
            <p>Interested in a custom platform? Let's discuss it on your strategy call.</p>
            <a href="https://calendly.com/your-link" className={styles.primaryButton} target="_blank" rel="noopener noreferrer">
              Book Your Strategy Call
            </a>
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className={styles.socialProofSection}>
        <div className={styles.sectionHeader}>
          <h2>Real Results from Custom Platforms</h2>
          <p className={styles.subtitle}>See how custom platforms transform info businesses</p>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>10x</h3>
            <p>Scale capacity without hiring</p>
          </div>
          <div className={styles.statCard}>
            <h3>80%</h3>
            <p>Tasks automated by AI workers</p>
          </div>
          <div className={styles.statCard}>
            <h3>90 days</h3>
            <p>From discovery to launch</p>
          </div>
          <div className={styles.statCard}>
            <h3>100%</h3>
            <p>Your brand, your platform</p>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className={styles.comparisonSection}>
        <div className={styles.sectionHeader}>
          <h2>Generic Tools vs Custom Platform</h2>
          <p className={styles.subtitle}>See the difference a custom-built platform makes</p>
        </div>

        <div className={styles.comparisonTable}>
          <div className={styles.comparisonHeader}>
            <div className={styles.comparisonCell}></div>
            <div className={styles.comparisonCell}>
              <h3>Generic SaaS</h3>
              <p className={styles.comparisonPrice}>$500-2000/mo</p>
            </div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>
              <h3>Custom Platform</h3>
              <p className={styles.comparisonPrice}>Custom Investment</p>
              <span className={styles.recommendedBadge}>Recommended</span>
            </div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Platform Type</strong></div>
            <div className={styles.comparisonCell}>Shared SaaS</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>Built for YOU</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Branding</strong></div>
            <div className={styles.comparisonCell}>Their brand</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>100% Your Brand</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Features</strong></div>
            <div className={styles.comparisonCell}>What they built</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>What YOU need</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>AI Workers</strong></div>
            <div className={styles.comparisonCell}>Generic AI</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>Trained on YOUR methodology</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Automation</strong></div>
            <div className={styles.comparisonCell}>Pre-built workflows</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>Custom to your processes</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Scalability</strong></div>
            <div className={styles.comparisonCell}>Limited by tool</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>Unlimited growth</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Competitive Advantage</strong></div>
            <div className={styles.comparisonCell}>✗ None</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>✓ Proprietary tech</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Ongoing Development</strong></div>
            <div className={styles.comparisonCell}>Their roadmap</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>YOUR roadmap</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Client Perception</strong></div>
            <div className={styles.comparisonCell}>Using generic tools</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>YOU built this</div>
          </div>

          <div className={styles.comparisonRow}>
            <div className={styles.comparisonCell}><strong>Best For</strong></div>
            <div className={styles.comparisonCell}>Getting started</div>
            <div className={`${styles.comparisonCell} ${styles.highlighted}`}>Serious scaling</div>
          </div>
        </div>

        <div className={styles.comparisonCTA}>
          <p>Ready to build your competitive advantage?</p>
          <a href="https://calendly.com/your-link" className={styles.primaryButton} target="_blank" rel="noopener noreferrer">
            Book Your Platform Discovery Call
          </a>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className={styles.finalCTA}>
        <div className={styles.ctaContent}>
          <h2>Ready to Build Your Platform?</h2>
          <p className={styles.ctaLede}>
            Book a free platform discovery call and let's design your custom software solution together. No pressure, no pitch—just a real conversation about what we can build for your business.
          </p>

          <div className={styles.ctaBox}>
            <h3>What Happens on the Discovery Call:</h3>
            <div className={styles.ctaSteps}>
              <div className={styles.ctaStep}>
                <span className={styles.stepNumber}>1</span>
                <div>
                  <h4>Deep Dive</h4>
                  <p>We learn about your business, niche, processes, and goals</p>
                </div>
              </div>
              <div className={styles.ctaStep}>
                <span className={styles.stepNumber}>2</span>
                <div>
                  <h4>Platform Design</h4>
                  <p>We sketch out what your custom platform could look like</p>
                </div>
              </div>
              <div className={styles.ctaStep}>
                <span className={styles.stepNumber}>3</span>
                <div>
                  <h4>Investment & Timeline</h4>
                  <p>We discuss pricing, timeline, and next steps if it's a fit</p>
                </div>
              </div>
            </div>

            <div className={styles.calendlyEmbed}>
              <div className={styles.calendlyPlaceholder}>
                <p>📅 Calendly booking widget will be embedded here</p>
                <a href="https://calendly.com/your-link" className={styles.primaryButton} target="_blank" rel="noopener noreferrer">
                  Book Your Platform Discovery Call
                </a>
              </div>
            </div>

            <div className={styles.ctaFooter}>
              <p>✓ No credit card required</p>
              <p>✓ No pressure or sales pitch</p>
              <p>✓ Just value and clarity</p>
            </div>
          </div>
        </div>
      </section>

      {/* Back to Pricing Link */}
      <div className={styles.backLink}>
        <a href="/pricing">← Back to All Plans</a>
      </div>

      {/* Chatbot */}
      <div className={`${styles.chatbot} ${chatOpen ? styles.chatbotOpen : ''}`}>
        {!chatOpen ? (
          <div className={styles.chatbotLauncher}>
            <button className={styles.chatbotToggle} onClick={() => setChatOpen(true)}>
              🚀
              <span className={styles.chatbotBadge}>1</span>
            </button>
            <span className={styles.chatLabel}>Let's talk scale 🔥</span>
          </div>
        ) : (
          <div className={styles.chatbotWindow}>
            <div className={styles.chatbotHeader}>
              <div>
                <h4>🚀 Scale Strategist</h4>
                <p>Straight talk. No fluff. Let's build.</p>
              </div>
              <button className={styles.chatbotClose} onClick={() => setChatOpen(false)}>✕</button>
            </div>
            
            <div className={styles.chatbotMessages}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`${styles.chatMessage} ${styles[msg.role]}`}>
                  {msg.role === 'bot' && <div className={styles.chatAvatar}>🤖</div>}
                  <div className={styles.chatBubble}>{msg.text}</div>
                  {msg.role === 'user' && <div className={styles.chatAvatar}>👤</div>}
                </div>
              ))}
            </div>
            
            <form className={styles.chatbotInput} onSubmit={handleChatSubmit}>
              <input 
                type="text" 
                placeholder="Ask me anything — price, features, timeline..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
              />
              <button type="submit">Send</button>
            </form>
            
            <div className={styles.chatbotQuickActions}>
              <button onClick={() => setUserInput("What's included in the platform?")}>📦 What's included</button>
              <button onClick={() => setUserInput("How much does it cost?")}>💰 Pricing</button>
              <button onClick={() => setUserInput("How long does it take?")}>⏱️ Timeline</button>
              <button onClick={() => setUserInput("How is this different from Kajabi?")}>🔬 Vs the competition</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
