import { TrendingUp, TrendingDown, Minus, Target, Zap, Users, AlertTriangle, Lightbulb, BarChart3, Search } from 'lucide-react'
import { motion } from 'motion/react'
import { scoreColor, scoreLabel, opportunityColor } from '../../lib/utils'
import type { GraphNode, ContentGap, KeywordData, CompetitorData } from '../../types'
export default function BrainPanel({ node }: { node: GraphNode }) {
  const intel = node.intelligence!
  const isNiche = node.type === 'niche'
  const isContent = node.type === 'content'
  const isCompetitor = node.type === 'competitor'

  return (
    <div className="p-5 space-y-5">
      {/* NICHE SCORES */}
      {isNiche && intel.nicheScore !== undefined && (
        <>
          <ScoresRow
            items={[
              { label: 'Opportunity', value: intel.nicheScore, color: scoreColor(intel.nicheScore) },
              { label: 'Saturation', value: intel.saturation ?? 0, color: scoreColor(100 - (intel.saturation ?? 0)) },
              { label: 'Growth', value: Math.min(100, (intel.growthTrend ?? 0) * 2), color: '#10b981', display: `+${intel.growthTrend}%` },
            ]}
          />

          {intel.audienceSize && (
            <Stat icon={<Users size={13} />} label="Audience size" value={intel.audienceSize} />
          )}
        </>
      )}

      {/* CONTENT SCORES */}
      {isContent && intel.contentScore !== undefined && (
        <ScoresRow
          items={[
            { label: 'Content', value: intel.contentScore, color: scoreColor(intel.contentScore) },
            { label: 'SEO', value: intel.seoScore ?? 0, color: scoreColor(intel.seoScore ?? 0) },
            { label: 'Engagement', value: intel.engagementScore ?? 0, color: scoreColor(intel.engagementScore ?? 0) },
            { label: 'Depth', value: intel.depthScore ?? 0, color: scoreColor(intel.depthScore ?? 0) },
          ]}
        />
      )}

      {/* COMPETITOR */}
      {isCompetitor && intel.competitors && (
        <div>
          <p className="section-label mb-3">Competitor Profile</p>
          {intel.competitors.map((c, i) => <CompetitorCard key={i} data={c} />)}
          {intel.marketPosition && (
            <p className="text-xs text-[var(--text-secondary)] mt-3 leading-relaxed">{intel.marketPosition}</p>
          )}
        </div>
      )}

      {/* CONTENT GAPS */}
      {intel.contentGaps && intel.contentGaps.length > 0 && (
        <div>
          <p className="section-label mb-3 flex items-center gap-2">
            <Target size={11} /> Content Gap Map
          </p>
          <div className="space-y-2.5">
            {intel.contentGaps.map((gap, i) => (
              <ContentGapRow key={i} gap={gap} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* KEYWORDS */}
      {intel.keywords && intel.keywords.length > 0 && (
        <div>
          <p className="section-label mb-3 flex items-center gap-2">
            <Search size={11} /> Top Keywords
          </p>
          <div className="space-y-1.5">
            {intel.keywords.map((kw, i) => <KeywordRow key={i} kw={kw} />)}
          </div>
        </div>
      )}

      {/* AI ANGLES */}
      {intel.aiAngles && intel.aiAngles.length > 0 && (
        <div>
          <p className="section-label mb-3 flex items-center gap-2">
            <Zap size={11} /> AI-Generated Angles
          </p>
          <div className="space-y-2">
            {intel.aiAngles.map((angle, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass-card p-3 cursor-pointer hover:border-purple-500/30 transition-all group"
              >
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed group-hover:text-[var(--text-primary)] transition-colors">
                  {angle}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* OPPORTUNITIES */}
      {intel.opportunities && intel.opportunities.length > 0 && (
        <div>
          <p className="section-label mb-3 flex items-center gap-2">
            <Lightbulb size={11} /> Opportunities
          </p>
          <div className="space-y-2">
            {intel.opportunities.map((opp, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{opp}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* THREATS */}
      {intel.threats && intel.threats.length > 0 && (
        <div>
          <p className="section-label mb-3 flex items-center gap-2 text-amber-500">
            <AlertTriangle size={11} /> Threats
          </p>
          <div className="space-y-2">
            {intel.threats.map((t, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{t}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB NICHES */}
      {intel.subNiches && intel.subNiches.length > 0 && (
        <div>
          <p className="section-label mb-3">Sub-niches</p>
          <div className="flex flex-wrap gap-1.5">
            {intel.subNiches.map((s, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-full text-[10px] font-medium border border-white/[0.08] text-[var(--text-secondary)] hover:border-purple-500/30 hover:text-purple-300 transition-all cursor-pointer"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* COMPETITORS LIST (for niche nodes) */}
      {isNiche && intel.competitors && intel.competitors.length > 0 && (
        <div>
          <p className="section-label mb-3 flex items-center gap-2">
            <BarChart3 size={11} /> Competitor Landscape
          </p>
          <div className="space-y-2">
            {intel.competitors.map((c, i) => <CompetitorCard key={i} data={c} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function ScoresRow({ items }: { items: { label: string; value: number; color: string; display?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[var(--text-muted)]">{item.label}</span>
            <span className="text-xs font-bold" style={{ color: item.color }}>
              {item.display ?? `${item.value}`}
            </span>
          </div>
          <div className="score-bar">
            <motion.div
              className="score-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${item.value}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              style={{ background: item.color }}
            />
          </div>
          <p className="text-[9px] text-[var(--text-muted)] mt-1">{scoreLabel(item.value)}</p>
        </motion.div>
      ))}
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass-card p-3 flex items-center gap-3">
      <div className="text-purple-400">{icon}</div>
      <div>
        <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
        <p className="text-sm font-semibold text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  )
}

function ContentGapRow({ gap, index }: { gap: ContentGap; index: number }) {
  const oppColor = opportunityColor(gap.opportunity)
  const gapScore = Math.round(gap.demand - gap.supply * 0.8)

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card p-3"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs text-[var(--text-secondary)] leading-snug flex-1">{gap.topic}</span>
        <span
          className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ color: oppColor, background: `${oppColor}18`, border: `1px solid ${oppColor}44` }}
        >
          {gap.opportunity}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex justify-between text-[9px] text-[var(--text-muted)] mb-1">
            <span>Demand</span>
            <span>{gap.demand}</span>
          </div>
          <div className="score-bar">
            <motion.div
              className="score-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${gap.demand}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              style={{ background: '#06b6d4' }}
            />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-[9px] text-[var(--text-muted)] mb-1">
            <span>Supply</span>
            <span>{gap.supply}</span>
          </div>
          <div className="score-bar">
            <motion.div
              className="score-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${gap.supply}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              style={{ background: '#ef4444' }}
            />
          </div>
        </div>
        <div className="text-center flex-shrink-0">
          <div className="text-[10px] text-[var(--text-muted)]">Gap</div>
          <div className="text-xs font-bold" style={{ color: oppColor }}>+{gapScore}</div>
        </div>
      </div>
    </motion.div>
  )
}

function KeywordRow({ kw }: { kw: KeywordData }) {
  const TrendIcon = kw.trend === 'up' ? TrendingUp : kw.trend === 'down' ? TrendingDown : Minus
  const trendColor = kw.trend === 'up' ? '#10b981' : kw.trend === 'down' ? '#ef4444' : '#8888aa'

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors group">
      <TrendIcon size={11} style={{ color: trendColor }} className="flex-shrink-0" />
      <span className="text-xs text-[var(--text-secondary)] flex-1 group-hover:text-[var(--text-primary)] transition-colors">
        {kw.term}
      </span>
      <span className="text-[10px] text-cyan-400 font-medium">{kw.volume}</span>
      <div className="flex items-center gap-1">
        <div className="score-bar w-12">
          <div className="score-bar-fill" style={{ width: `${kw.difficulty}%`, background: scoreColor(100 - kw.difficulty) }} />
        </div>
        <span className="text-[10px] text-[var(--text-muted)] w-6">{kw.difficulty}</span>
      </div>
    </div>
  )
}

function CompetitorCard({ data }: { data: CompetitorData }) {
  return (
    <div className="glass-card p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--text-primary)]">{data.name}</span>
        <div className="flex items-center gap-1.5">
          <div className="score-bar w-16">
            <div className="score-bar-fill" style={{ width: `${data.strength}%`, background: scoreColor(100 - data.strength) }} />
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">{data.strength}</span>
        </div>
      </div>
      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
        <span className="text-amber-400 font-medium">Weak: </span>{data.weakness}
      </p>
    </div>
  )
}
