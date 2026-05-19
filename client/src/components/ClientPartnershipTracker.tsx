// Client Partnership Tracker — From Audience to Revenue
// Step-by-step onboarding & project management system
import React, { useState, useMemo } from 'react';
import {
  CheckCircle2, Circle, Clock, Calendar, ChevronRight, ChevronDown,
  Users, Zap, Target, TrendingUp, AlertCircle, MessageSquare,
  Video, Mail, BarChart3, Globe, Megaphone, ShoppingBag, Layers,
  Shield, Play, ArrowRight, ExternalLink, Star
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────── */
type Owner = 'us' | 'you' | 'both';
type TaskStatus = 'completed' | 'in-progress' | 'upcoming' | 'blocked';
type PhaseStatus = 'completed' | 'active' | 'locked';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  owner: Owner;
  timeline: string;
  calendlyType?: string;
}

interface Phase {
  id: number;
  title: string;
  subtitle: string;
  timeline: string;
  icon: React.ReactNode;
  status: PhaseStatus;
  tasks: Task[];
  color: string;
}

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  calendlyUrl: string;
  color: string;
  description: string;
}

/* ─── Constants ─────────────────────────────────────────── */
const CALENDLY_BASE = 'https://calendly.com/brandversee';
const CALENDLY_URLS: Record<string, string> = {
  kickoff: `${CALENDLY_BASE}/kickoff-call`,
  strategy: `${CALENDLY_BASE}/strategy-session`,
  review: `${CALENDLY_BASE}/weekly-review`,
  emergency: `${CALENDLY_BASE}/emergency-support`,
  webinar_review: `${CALENDLY_BASE}/webinar-review`,
  launch_prep: `${CALENDLY_BASE}/launch-prep`,
  '30min': `${CALENDLY_BASE}/30min`,
};

const OWNER_LABELS: Record<Owner, { label: string; color: string; bg: string }> = {
  us: { label: 'We Handle', color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  you: { label: 'You Handle', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  both: { label: 'Together', color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
};

const STATUS_CONFIG: Record<TaskStatus, { icon: React.ReactNode; color: string; label: string }> = {
  'completed': { icon: <CheckCircle2 size={18} />, color: '#10b981', label: 'Done' },
  'in-progress': { icon: <Clock size={18} />, color: '#3b82f6', label: 'In Progress' },
  'upcoming': { icon: <Circle size={18} />, color: '#94a3b8', label: 'Upcoming' },
  'blocked': { icon: <AlertCircle size={18} />, color: '#ef4444', label: 'Blocked' },
};

/* ─── Main Component ────────────────────────────────────── */
const ClientPartnershipTracker: React.FC = () => {
  const [activePhase, setActivePhase] = useState<number>(0);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  /* ─── Phase Data (from Client Partnership Guide) ────── */
  const phases: Phase[] = useMemo(() => [
    {
      id: 0,
      title: 'First 48 Hours',
      subtitle: 'Signing → Kickoff',
      timeline: 'Day 0–2',
      icon: <Zap size={20} />,
      status: 'active' as PhaseStatus,
      color: '#f59e0b',
      tasks: [
        { id: '0-1', title: 'Welcome email with client portal access', description: 'You receive your portal login, onboarding form link, and access request list.', status: 'completed', owner: 'us', timeline: 'Immediate' },
        { id: '0-2', title: 'Fill out onboarding form', description: '15-minute form covering your audience, offer direction, goals, and existing assets.', status: 'completed', owner: 'you', timeline: 'Day 0–1' },
        { id: '0-3', title: 'Share access & logins', description: 'Provide access to existing content, offers, email lists, social accounts, and any logins needed.', status: 'in-progress', owner: 'you', timeline: 'Day 0–1' },
        { id: '0-4', title: 'Kickoff call scheduled', description: 'Usually within 48 hours of signing. Full situation audit, offer agreement, and Phase 1 deliverables locked in.', status: 'upcoming', owner: 'both', timeline: 'Day 1–2', calendlyType: 'kickoff' },
        { id: '0-5', title: 'Work begins immediately', description: 'No waiting, no delays. We start building from the day of the kickoff call.', status: 'upcoming', owner: 'us', timeline: 'Day 2' },
      ],
    },
    {
      id: 1,
      title: 'Phase 1: Foundation',
      subtitle: 'Market, Offer & Infrastructure Setup',
      timeline: 'Week 1–2',
      icon: <Target size={20} />,
      status: 'locked' as PhaseStatus,
      color: '#6366f1',
      tasks: [
        { id: '1-1', title: 'Onboarding call — full situation audit', description: 'Deep-dive into your goals, audience, current assets, and offer direction.', status: 'upcoming', owner: 'both', timeline: 'Day 1–2', calendlyType: 'kickoff' },
        { id: '1-2', title: 'ICP document & offer structure finalised', description: 'Define exactly what you\'re selling and who it\'s for. Pain points, hook angles, positioning.', status: 'upcoming', owner: 'us', timeline: 'Day 2–3' },
        { id: '1-3', title: 'Offer pricing strategy confirmed', description: 'Price point, payment plans, and guarantee structure locked in.', status: 'upcoming', owner: 'both', timeline: 'Day 3–4' },
        { id: '1-4', title: 'Webinar topic, title & angle decided', description: 'The hook that gets your audience to register. Funnel type chosen (VSL, webinar, application, or challenge) based on price point and audience temperature.', status: 'upcoming', owner: 'both', timeline: 'Day 4–5' },
        { id: '1-5', title: 'Content pillars & Instagram strategy delivered', description: '3–4 pillars defined (authority, education, social proof, personal story). 30-day content calendar handed over. Reels/Story/Carousel frameworks included.', status: 'upcoming', owner: 'us', timeline: 'Week 1' },
        { id: '1-6', title: 'Whop community created & configured', description: 'Channel structure, free/paid tiers, onboarding flow, and engagement cadence set up.', status: 'upcoming', owner: 'us', timeline: 'Week 1' },
        { id: '1-7', title: 'CRM set up (GoHighLevel or equivalent)', description: 'Pipeline stages, deal views, and reporting built. Lead flow: new → contacted → booked → showed → closed.', status: 'upcoming', owner: 'us', timeline: 'Week 1–2' },
        { id: '1-8', title: 'Domain, DNS & email sending domain configured', description: 'All technical infrastructure tested and verified.', status: 'upcoming', owner: 'us', timeline: 'Week 1–2' },
        { id: '1-9', title: 'Sales team structure confirmed', description: 'Decide: are we providing setters/closers from our network, or training your existing team?', status: 'upcoming', owner: 'both', timeline: 'Week 2' },
        { id: '1-10', title: 'Setter & closer scripts drafted and reviewed', description: 'Qualification scripts, objection handling (price, time, trust, spouse), and CRM pipeline reporting.', status: 'upcoming', owner: 'us', timeline: 'Week 2' },
      ],
    },
    {
      id: 2,
      title: 'Phase 2: Build & Launch',
      subtitle: 'Funnel, Automation & Go-Live',
      timeline: 'Week 3–6',
      icon: <Play size={20} />,
      status: 'locked' as PhaseStatus,
      color: '#3b82f6',
      tasks: [
        { id: '2-1', title: 'Webinar slides built (33-slide deck)', description: 'All phases covered: hook, content delivery, pitch, and Q&A.', status: 'upcoming', owner: 'us', timeline: 'Week 3' },
        { id: '2-2', title: 'Full webinar script written & reviewed', description: '60–90 minute live training script. Educate, build authority, make the pitch.', status: 'upcoming', owner: 'both', timeline: 'Week 3', calendlyType: 'webinar_review' },
        { id: '2-3', title: 'Webinar registration page live', description: 'Copy written, design complete, mobile-optimised. Targeted landing page for opt-ins.', status: 'upcoming', owner: 'us', timeline: 'Week 3' },
        { id: '2-4', title: 'Pre-webinar email nurture sequence live', description: '3–5 day email + DM sequence. Builds trust, creates anticipation, pre-sells the outcome.', status: 'upcoming', owner: 'us', timeline: 'Week 3' },
        { id: '2-5', title: 'WhatsApp / SMS reminder sequence set up', description: 'Automated reminders tested and ready for registrants.', status: 'upcoming', owner: 'us', timeline: 'Week 3' },
        { id: '2-6', title: 'Sales page or VSL page built & live', description: 'Complete sales page with offer presentation — application or book-a-call depending on price point.', status: 'upcoming', owner: 'us', timeline: 'Week 4' },
        { id: '2-7', title: 'Thank-you & booking/checkout page configured', description: 'Post-registration and post-purchase flows complete.', status: 'upcoming', owner: 'us', timeline: 'Week 4' },
        { id: '2-8', title: 'Stripe / Razorpay payment integration tested', description: 'End-to-end payment flow verified.', status: 'upcoming', owner: 'us', timeline: 'Week 4' },
        { id: '2-9', title: 'Post-webinar follow-up sequence (7–10 emails)', description: 'Email + DM sequence for no-shows, non-buyers, and abandons. Recovers significant percentage.', status: 'upcoming', owner: 'us', timeline: 'Week 4' },
        { id: '2-10', title: 'No-show recovery & abandoned checkout automation', description: 'Automated flows to recapture lost leads.', status: 'upcoming', owner: 'us', timeline: 'Week 4' },
        { id: '2-11', title: 'Meta Pixel installed & conversion events firing', description: 'Domain verified, pixel configured, all conversion events tracking correctly.', status: 'upcoming', owner: 'us', timeline: 'Week 4–5' },
        { id: '2-12', title: 'Google Analytics & custom dashboards built', description: 'Key KPI dashboards configured for real-time visibility.', status: 'upcoming', owner: 'us', timeline: 'Week 4–5' },
        { id: '2-13', title: 'DM automation flows live on Instagram', description: 'ManyChat flows: comment triggers, story reply sequences. Every hand-raiser captured automatically.', status: 'upcoming', owner: 'us', timeline: 'Week 5' },
        { id: '2-14', title: 'Setter(s) onboarded & pipeline active', description: 'First leads flowing in. Booking rate target: 30%+ of leads. Speed to first contact: <1 hour.', status: 'upcoming', owner: 'us', timeline: 'Week 5' },
        { id: '2-15', title: 'Organic content system running', description: 'Posting consistently to drive registrations. Content calendar being executed.', status: 'upcoming', owner: 'both', timeline: 'Week 5' },
        { id: '2-16', title: 'Full QA pass — everything tested end-to-end', description: 'Every link, form, payment, email, and automation verified before launch.', status: 'upcoming', owner: 'us', timeline: 'Week 6' },
        { id: '2-17', title: '🚀 First live webinar — GO LIVE', description: 'Go live and start generating revenue. You present, we handle everything behind the scenes.', status: 'upcoming', owner: 'both', timeline: 'Week 6', calendlyType: 'launch_prep' },
      ],
    },
    {
      id: 3,
      title: 'Phase 3: Scale & Optimise',
      subtitle: 'Data-Driven Growth & Revenue Maximisation',
      timeline: 'Week 7+',
      icon: <TrendingUp size={20} />,
      status: 'locked' as PhaseStatus,
      color: '#10b981',
      tasks: [
        { id: '3-1', title: 'Webinar analytics reviewed', description: 'Show rate, pitch-to-close %, and drop-off points identified.', status: 'upcoming', owner: 'us', timeline: 'Week 7+' },
        { id: '3-2', title: 'Webinar optimised based on data', description: 'Hook tightened, content adjusted, pitch refined based on actual performance data.', status: 'upcoming', owner: 'us', timeline: 'Week 7+' },
        { id: '3-3', title: 'Paid ads launched (Meta or TikTok)', description: 'Creative, targeting, and budget set. 3–5 hooks tested simultaneously to find winners.', status: 'upcoming', owner: 'us', timeline: 'Week 7+' },
        { id: '3-4', title: 'Automated (evergreen) webinar version created', description: 'Runs without you being live — passive revenue engine.', status: 'upcoming', owner: 'us', timeline: 'Week 8+' },
        { id: '3-5', title: 'YouTube strategy activated', description: 'First videos scripted, SEO configured, upload live. 10+ video ideas mapped to your offer.', status: 'upcoming', owner: 'both', timeline: 'Week 8+' },
        { id: '3-6', title: 'Course / digital product built & live', description: 'Structured, built, and published on your platform (Kajabi, Skool, Whop, etc.).', status: 'upcoming', owner: 'both', timeline: 'Week 9+' },
        { id: '3-7', title: 'Sales team performance reviewed weekly', description: 'KPIs tracked, scripts iterated. Target close rate: 60–70%+ on qualified calls.', status: 'upcoming', owner: 'us', timeline: 'Ongoing' },
        { id: '3-8', title: 'Content calendar refreshed monthly', description: 'New angles, trending formats, seasonal hooks.', status: 'upcoming', owner: 'us', timeline: 'Ongoing' },
        { id: '3-9', title: 'Backend upsell offer introduced', description: 'Maximise revenue per buyer through upsells and cross-sells in your community.', status: 'upcoming', owner: 'both', timeline: 'Ongoing' },
        { id: '3-10', title: 'Ad scaling on winning creatives', description: 'Budget increased as ROAS is confirmed.', status: 'upcoming', owner: 'us', timeline: 'Ongoing' },
        { id: '3-11', title: 'Full reporting handover', description: 'Total visibility on every number in the business. Pipeline, revenue, conversion rates all accessible.', status: 'upcoming', owner: 'us', timeline: 'Month 3+' },
      ],
    },
  ], []);

  const quickActions: QuickAction[] = [
    { label: 'Weekly Review Call', icon: <Video size={18} />, calendlyUrl: CALENDLY_URLS.review, color: '#6366f1', description: '30–45 min progress check' },
    { label: 'Strategy Session', icon: <Target size={18} />, calendlyUrl: CALENDLY_URLS.strategy, color: '#3b82f6', description: 'Deep-dive on specific area' },
    { label: 'Emergency Support', icon: <AlertCircle size={18} />, calendlyUrl: CALENDLY_URLS.emergency, color: '#ef4444', description: 'Urgent issue resolution' },
  ];

  /* ─── Computed Stats ────────────────────────────────── */
  const allTasks = phases.flatMap(p => p.tasks);
  const completedCount = allTasks.filter(t => t.status === 'completed').length;
  const inProgressCount = allTasks.filter(t => t.status === 'in-progress').length;
  const totalCount = allTasks.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const currentPhase = phases[activePhase];

  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  /* ─── Render ────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '32px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #d4b461, #f0c84b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={18} color="#000" />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Client Partnership Tracker</h1>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 }}>
            From Audience to Revenue — Your complete step-by-step journey
          </p>

          {/* Progress Bar */}
          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPercent}%`, background: 'linear-gradient(90deg, #d4b461, #10b981)', borderRadius: 99, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              <span><strong style={{ color: '#10b981' }}>{completedCount}</strong> done</span>
              <span><strong style={{ color: '#3b82f6' }}>{inProgressCount}</strong> active</span>
              <span><strong style={{ color: 'rgba(255,255,255,0.3)' }}>{totalCount - completedCount - inProgressCount}</strong> remaining</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px' }}>
        {/* Phase Navigation */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, overflowX: 'auto', paddingBottom: 8 }}>
          {phases.map((phase) => {
            const isActive = phase.id === activePhase;
            const phaseCompleted = phase.tasks.every(t => t.status === 'completed');
            const phaseProgress = phase.tasks.filter(t => t.status === 'completed').length;
            return (
              <button
                key={phase.id}
                onClick={() => setActivePhase(phase.id)}
                style={{
                  flex: '1 0 auto',
                  minWidth: 200,
                  padding: '16px 20px',
                  borderRadius: 14,
                  border: isActive ? `1px solid ${phase.color}44` : '1px solid rgba(255,255,255,0.06)',
                  background: isActive ? `${phase.color}0a` : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ color: phase.color, opacity: isActive ? 1 : 0.5 }}>{phase.icon}</div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                    {phase.title}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
                  {phase.timeline}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(phaseProgress / phase.tasks.length) * 100}%`, background: phase.color, borderRadius: 99, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                    {phaseProgress}/{phase.tasks.length}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32 }}>
          {/* Main Content — Task List */}
          <div>
            {/* Phase Header */}
            <div style={{ marginBottom: 24, padding: '24px 28px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ color: currentPhase.color }}>{currentPhase.icon}</div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{currentPhase.title}</h2>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>
                    {currentPhase.subtitle} • <span style={{ color: currentPhase.color }}>{currentPhase.timeline}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Tasks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {currentPhase.tasks.map((task) => {
                const isExpanded = expandedTasks.has(task.id);
                const statusCfg = STATUS_CONFIG[task.status];
                const ownerCfg = OWNER_LABELS[task.owner];
                return (
                  <div
                    key={task.id}
                    style={{
                      padding: '16px 20px',
                      borderRadius: 12,
                      background: task.status === 'completed' ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${task.status === 'in-progress' ? '#3b82f622' : 'rgba(255,255,255,0.06)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => toggleTask(task.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {/* Status Icon */}
                      <div style={{ color: statusCfg.color, flexShrink: 0 }}>
                        {statusCfg.icon}
                      </div>

                      {/* Task Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: task.status === 'completed' ? 'rgba(255,255,255,0.4)' : '#fff',
                            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                          }}>
                            {task.title}
                          </span>
                        </div>
                        {isExpanded && task.description && (
                          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '8px 0 0', lineHeight: 1.6 }}>
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Meta */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{
                          fontSize: 11,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: ownerCfg.bg,
                          color: ownerCfg.color,
                          fontWeight: 500,
                        }}>
                          {ownerCfg.label}
                        </span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                          {task.timeline}
                        </span>
                        {task.calendlyType && (
                          <button
                            onClick={(e) => { e.stopPropagation(); window.open(CALENDLY_URLS[task.calendlyType!] || CALENDLY_URLS['30min'], '_blank'); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              padding: '4px 10px', borderRadius: 6,
                              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                              color: '#818cf8', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                            }}
                          >
                            <Calendar size={12} /> Book
                          </button>
                        )}
                        <div style={{ color: 'rgba(255,255,255,0.2)', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                          <ChevronRight size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Quick Actions */}
            <div style={{ padding: '20px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 14px', color: 'rgba(255,255,255,0.7)' }}>Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => window.open(action.calendlyUrl, '_blank')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${action.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: action.color }}>
                      {action.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{action.label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{action.description}</div>
                    </div>
                    <ExternalLink size={12} style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.2)' }} />
                  </button>
                ))}
              </div>
            </div>

            {/* What We Need From You */}
            <div style={{ padding: '20px', borderRadius: 14, background: 'rgba(245,158,11,0.03)', border: '1px solid rgba(245,158,11,0.1)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 14px', color: '#f59e0b' }}>Your Responsibilities</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { icon: <Video size={14} />, text: 'Show up live to webinars (first 8 weeks)' },
                  { icon: <Megaphone size={14} />, text: 'Post content consistently (we give the calendar)' },
                  { icon: <MessageSquare size={14} />, text: 'Weekly review calls — 30–45 min' },
                  { icon: <Mail size={14} />, text: 'Respond & approve within 24–48 hours' },
                  { icon: <ShoppingBag size={14} />, text: 'Ad spend (your budget, we manage)' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ color: '#f59e0b', marginTop: 2, flexShrink: 0 }}>{item.icon}</div>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* KPI Targets */}
            <div style={{ padding: '20px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 14px', color: 'rgba(255,255,255,0.7)' }}>Target KPIs</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Setter booking rate', value: '30%+' },
                  { label: 'Close rate (qualified)', value: '60–70%' },
                  { label: 'Speed to first contact', value: '<1 hour' },
                  { label: 'No-show rate', value: '<20%' },
                  { label: 'First revenue', value: 'Week 6–8' },
                ].map((kpi, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{kpi.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}>{kpi.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Timeline */}
            <div style={{ padding: '20px', borderRadius: 14, background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.1)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 10px', color: '#10b981' }}>Revenue Timeline</h3>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>
                Most clients see first revenue between <strong style={{ color: '#10b981' }}>Weeks 6–8</strong>. 
                The builds in Weeks 1–5 make that possible. Results compound — the system needs 3 months to show its full potential.
              </p>
            </div>

            {/* Core Deliverables Legend */}
            <div style={{ padding: '20px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 14px', color: 'rgba(255,255,255,0.7)' }}>What Gets Built</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { icon: <Target size={13} />, label: 'Market & Offer Foundation' },
                  { icon: <Layers size={13} />, label: 'Funnel Architecture' },
                  { icon: <Globe size={13} />, label: 'Landing Pages & Copy' },
                  { icon: <Zap size={13} />, label: 'Automation Systems' },
                  { icon: <Video size={13} />, label: 'Webinar Funnel' },
                  { icon: <Users size={13} />, label: 'Sales Team Setup' },
                  { icon: <Megaphone size={13} />, label: 'Instagram & YouTube Growth' },
                  { icon: <BarChart3 size={13} />, label: 'Tracking & Analytics' },
                  { icon: <ShoppingBag size={13} />, label: 'Course / Product Build' },
                  { icon: <Shield size={13} />, label: 'QA & Go-Live' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ color: 'rgba(212,180,97,0.7)' }}>{item.icon}</div>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientPartnershipTracker;
