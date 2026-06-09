import type { GraphNode, GraphLink } from '../types'

export const SEED_NODES: GraphNode[] = [
  {
    id: 'brain-1',
    label: 'My Second Brain',
    type: 'brain',
    size: 18,
    body: '# My Second Brain\n\nThis is your knowledge universe. Every node is a thought, a niche, a piece of content, or an insight. Connect them. Discover patterns.',
  },
  {
    id: 'niche-1',
    label: 'AI Productivity',
    type: 'niche',
    size: 14,
    body: '# AI Productivity Niche\n\nExploring tools and workflows that use AI to 10x creator and founder output.',
    intelligence: {
      nicheScore: 87,
      growthTrend: 34,
      saturation: 42,
      audienceSize: '8.4M monthly searches',
      subNiches: ['AI note-taking', 'AI writing tools', 'Agentic workflows', 'AI for solopreneurs'],
      opportunities: [
        'Comparison content (tool stacks) performs 3x avg engagement',
        'Video workflow tutorials massively underproduced vs demand',
        'Newsletter monetization angle almost untouched',
      ],
      threats: [
        'Big media moving into this space (The Verge, Wired)',
        'Tool landscape shifting fast — content ages quickly',
      ],
      contentGaps: [
        { topic: 'AI + Obsidian workflows', demand: 91, supply: 22, opportunity: 'high' },
        { topic: 'Solopreneur AI stack 2025', demand: 85, supply: 18, opportunity: 'high' },
        { topic: 'AI meeting notes comparison', demand: 78, supply: 65, opportunity: 'medium' },
        { topic: 'Prompt engineering for creators', demand: 70, supply: 55, opportunity: 'medium' },
        { topic: 'AI SEO content risks', demand: 60, supply: 80, opportunity: 'low' },
      ],
      keywords: [
        { term: 'AI productivity tools', volume: '90K/mo', difficulty: 54, trend: 'up' },
        { term: 'best AI apps 2025', volume: '74K/mo', difficulty: 61, trend: 'up' },
        { term: 'AI note taking app', volume: '49K/mo', difficulty: 38, trend: 'up' },
        { term: 'obsidian ai plugin', volume: '22K/mo', difficulty: 29, trend: 'up' },
        { term: 'ai second brain', volume: '18K/mo', difficulty: 24, trend: 'stable' },
      ],
      competitors: [
        { name: 'Dan Shipper / Every.to', strength: 88, weakness: 'Too academic, slow output cadence' },
        { name: 'Matt Wolfe', strength: 92, weakness: 'Video-first, SEO coverage thin' },
        { name: 'Lenny Rachitsky', strength: 78, weakness: 'Product focus, not workflow-level' },
      ],
      aiAngles: [
        '"The AI Stack That Runs My Entire Business (Under $100/mo)"',
        '"Why I Deleted Notion and Built My Second Brain in 2 Hours with AI"',
        '"The Solopreneur\'s AI OS — Every Tool, Every Flow"',
        '"AI Is Making Me Dumber (And How I Fixed It)"',
      ],
    },
  },
  {
    id: 'niche-2',
    label: 'SaaS Founders',
    type: 'niche',
    size: 13,
    body: '# SaaS Founders Niche\n\nTargeting early-stage and bootstrapped SaaS builders who need distribution and growth.',
    intelligence: {
      nicheScore: 74,
      growthTrend: 18,
      saturation: 68,
      audienceSize: '3.1M monthly searches',
      subNiches: ['Bootstrapped SaaS', 'PLG growth', 'SaaS SEO', 'Indie hackers'],
      opportunities: [
        'Case studies of $0 → $10K MRR still get massive traction',
        'Founder interviews with specific numbers outperform generic advice',
      ],
      threats: [
        'Indiehackers.com saturates many story formats',
        'VC-backed blogs drowning organic reach',
      ],
      contentGaps: [
        { topic: 'SaaS founder AI workflows', demand: 82, supply: 20, opportunity: 'high' },
        { topic: 'Bootstrapped to $50K MRR stories', demand: 88, supply: 40, opportunity: 'high' },
        { topic: 'SaaS pricing strategy 2025', demand: 72, supply: 68, opportunity: 'medium' },
      ],
      keywords: [
        { term: 'saas founder advice', volume: '12K/mo', difficulty: 45, trend: 'stable' },
        { term: 'bootstrapped saas', volume: '28K/mo', difficulty: 52, trend: 'up' },
        { term: 'saas growth strategies', volume: '41K/mo', difficulty: 67, trend: 'stable' },
      ],
      aiAngles: [
        '"From Idea to $10K MRR in 90 Days (No Funding, No Team)"',
        '"The Exact Cold Email Sequence That Got Me 200 Paying Customers"',
      ],
    },
  },
  {
    id: 'content-1',
    label: 'AI Tool Stack Guide',
    type: 'content',
    size: 11,
    body: '# AI Tool Stack Guide\n\nThe definitive breakdown of AI tools for solopreneurs in 2025.\n\n## Outline\n- Research & intelligence\n- Writing & content\n- Automation & ops\n- Second brain setup',
    intelligence: {
      contentScore: 82,
      seoScore: 78,
      engagementScore: 91,
      depthScore: 75,
      aiAngles: [
        'Add cost breakdown table — missing from competitors',
        'Include video walkthrough — demand signal is high',
        'Add "what I dropped" section for credibility',
      ],
    },
  },
  {
    id: 'content-2',
    label: 'Second Brain Setup',
    type: 'content',
    size: 11,
    body: '# Second Brain Setup in 2025\n\nStep-by-step guide to building a personal knowledge system using AI.\n\n## Key sections\n- Why traditional notes fail\n- The capture → process → connect loop\n- Tool selection\n- AI augmentation layer',
    intelligence: {
      contentScore: 91,
      seoScore: 86,
      engagementScore: 88,
      depthScore: 94,
      aiAngles: [
        'This is your strongest piece — publish first',
        'Add comparison table vs Roam, Notion, Logseq',
        'Reddit r/productivity will amplify if you post there',
      ],
    },
  },
  {
    id: 'content-3',
    label: 'Notion vs Obsidian',
    type: 'content',
    size: 10,
    body: '# Notion vs Obsidian: Which Wins for Creators?\n\nA real-world breakdown for content creators and founders.',
    intelligence: {
      contentScore: 68,
      seoScore: 72,
      engagementScore: 85,
      depthScore: 55,
      aiAngles: [
        'Needs a stronger POV — too balanced right now',
        'Add a "verdict by persona" section',
        'Missing: Obsidian AI plugins angle which is trending',
      ],
    },
  },
  {
    id: 'insight-1',
    label: 'Market Research: PKM',
    type: 'insight',
    size: 9,
    body: '# PKM Market Research\n\nPersonal Knowledge Management is a $2B+ market growing at 28% YoY.\n\n## Key findings\n- Obsidian: 1M+ users, growing 40% YoY\n- Notion: 30M users but creator churn increasing\n- AI-native PKM tools entering market (Mem, Reflect, Capacities)',
  },
  {
    id: 'insight-2',
    label: 'Audience Research',
    type: 'insight',
    size: 9,
    body: '# Audience Research Notes\n\n## Who they are\n- Founders, creators, freelancers age 25–40\n- Already use Notion/Obsidian but feel overwhelmed\n- Want less friction, more signal\n\n## Pain points\n1. Too many tools, no system\n2. Can\'t find what they saved\n3. Never "use" their notes',
  },
  {
    id: 'competitor-1',
    label: 'Competitor: Roam Research',
    type: 'competitor',
    size: 8,
    body: '# Roam Research Analysis\n\nStrong bi-directional linking, loyal cult following. Weak on mobile, onboarding is rough.',
    intelligence: {
      marketPosition: 'Hardcore power users, academic/researcher segment',
      competitors: [
        { name: 'Roam Research', strength: 82, weakness: 'Terrible onboarding, mobile unusable, $165/yr price tag alienates casual users' },
      ],
    },
  },
  {
    id: 'competitor-2',
    label: 'Competitor: Mem.ai',
    type: 'competitor',
    size: 8,
    body: '# Mem.ai Analysis\n\nAI-native notes, auto-organization. Raised $23.5M. Struggling with product direction.',
    intelligence: {
      marketPosition: 'AI-first note-takers, early adopter segment',
      competitors: [
        { name: 'Mem.ai', strength: 71, weakness: 'Product identity crisis, slow iteration, pricing confusion after pivot' },
      ],
    },
  },
  {
    id: 'kw-1',
    label: 'second brain',
    type: 'keyword',
    size: 6,
  },
  {
    id: 'kw-2',
    label: 'pkm tools',
    type: 'keyword',
    size: 6,
  },
  {
    id: 'kw-3',
    label: 'ai note taking',
    type: 'keyword',
    size: 6,
  },
  {
    id: 'kw-4',
    label: 'obsidian workflow',
    type: 'keyword',
    size: 6,
  },
  {
    id: 'kw-5',
    label: 'solopreneur tools',
    type: 'keyword',
    size: 6,
  },
]

export const SEED_LINKS: GraphLink[] = [
  { source: 'brain-1', target: 'niche-1', strength: 1 },
  { source: 'brain-1', target: 'niche-2', strength: 1 },
  { source: 'brain-1', target: 'insight-1', strength: 0.7 },
  { source: 'niche-1', target: 'content-1', strength: 0.9 },
  { source: 'niche-1', target: 'content-2', strength: 0.9 },
  { source: 'niche-1', target: 'content-3', strength: 0.8 },
  { source: 'niche-2', target: 'content-1', strength: 0.7 },
  { source: 'niche-1', target: 'insight-1', strength: 0.8 },
  { source: 'niche-1', target: 'insight-2', strength: 0.8 },
  { source: 'niche-2', target: 'insight-2', strength: 0.7 },
  { source: 'niche-1', target: 'competitor-1', strength: 0.6 },
  { source: 'niche-1', target: 'competitor-2', strength: 0.6 },
  { source: 'content-2', target: 'competitor-1', strength: 0.5 },
  { source: 'content-2', target: 'kw-1', strength: 0.7 },
  { source: 'content-1', target: 'kw-5', strength: 0.7 },
  { source: 'niche-1', target: 'kw-3', strength: 0.8 },
  { source: 'content-3', target: 'kw-4', strength: 0.7 },
  { source: 'insight-1', target: 'kw-2', strength: 0.6 },
  { source: 'niche-1', target: 'kw-4', strength: 0.7 },
]

export const NODE_COLORS: Record<string, string> = {
  brain: '#8b5cf6',
  niche: '#7c3aed',
  content: '#06b6d4',
  insight: '#f59e0b',
  competitor: '#ef4444',
  keyword: '#10b981',
}

export const NODE_LABELS: Record<string, string> = {
  brain: 'Brain',
  niche: 'Niche',
  content: 'Content',
  insight: 'Insight',
  competitor: 'Competitor',
  keyword: 'Keyword',
}

export const NODE_BADGE_COLORS: Record<string, string> = {
  brain: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  niche: 'bg-violet-600/20 text-violet-400 border border-violet-600/30',
  content: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
  insight: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  competitor: 'bg-red-500/20 text-red-400 border border-red-500/30',
  keyword: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
}
