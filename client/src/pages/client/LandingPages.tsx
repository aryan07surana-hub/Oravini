import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import ClientLayout from "@/components/layout/ClientLayout";
import {
  Plus, Globe, Eye, Users, Trash2, Edit3, Copy, Check,
  ExternalLink, LayoutTemplate, Loader2, Zap, FileText,
  MonitorPlay, Megaphone, Timer, Gift, Link2,
} from "lucide-react";

const GOLD = "#d4b461";
const BG = "#040406";
const CARD = "#0c0c10";

const ACCENT_MAP: Record<string, string> = {
  gold: "#d4b461", purple: "#a855f7", blue: "#3b82f6",
  green: "#22c55e", red: "#ef4444", orange: "#f97316", cyan: "#06b6d4",
};

const TEMPLATE_META: Record<string, { label: string; icon: any; desc: string; color: string }> = {
  vsl:        { label: "Video Sales Letter", icon: MonitorPlay, desc: "Hero + VSL video + benefits + CTA", color: "#d4b461" },
  webinar:    { label: "Webinar Registration", icon: Megaphone, desc: "Hero + countdown + form", color: "#3b82f6" },
  launch:     { label: "Product Launch", icon: Zap, desc: "Hero + video + pricing + testimonials", color: "#a855f7" },
  lead_magnet:{ label: "Lead Magnet", icon: Gift, desc: "Hero + benefits + opt-in form", color: "#22c55e" },
  waitlist:   { label: "Waitlist", icon: Timer, desc: "Coming soon + countdown + form", color: "#f97316" },
  link_bio:   { label: "Link in Bio", icon: Link2, desc: "Bio + links + social proof", color: "#06b6d4" },
};

const TEMPLATES_LIST = [
  {
    id: "vsl",
    label: "Video Sales Letter",
    desc: "Sell your offer with a compelling video + benefits",
    icon: MonitorPlay,
    color: "#d4b461",
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
    sections: [
      { id: "s1", type: "bio", data: { name: "Your Name", role: "Creator & Entrepreneur", bio: "I help [audience] achieve [outcome]. Follow along for tips, strategies, and free resources." } },
      { id: "s2", type: "cta", data: { headline: "Free Training", subtext: "Learn my #1 strategy for [outcome] in 60 minutes.", ctaText: "Watch Free Training" } },
      { id: "s3", type: "cta", data: { headline: "Work With Me", subtext: "Apply for 1:1 coaching or my group program.", ctaText: "Apply Now" } },
      { id: "s4", type: "cta", data: { headline: "Free Resource", subtext: "Download my step-by-step guide to [topic].", ctaText: "Get the Guide" } },
    ],
  },
];

function TemplatePickerModal({ onClose, onCreate }: { onClose: () => void; onCreate: (template: any, colorScheme: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [colorScheme, setColorScheme] = useState("gold");
  const [creating, setCreating] = useState(false);

  const colors = [
    { id: "gold", hex: "#d4b461" }, { id: "purple", hex: "#a855f7" }, { id: "blue", hex: "#3b82f6" },
    { id: "green", hex: "#22c55e" }, { id: "red", hex: "#ef4444" }, { id: "orange", hex: "#f97316" },
  ];

  const handleCreate = async () => {
    if (!selected) return;
    const tpl = TEMPLATES_LIST.find(t => t.id === selected);
    if (!tpl) return;
    setCreating(true);
    await onCreate(tpl, colorScheme);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-3xl rounded-2xl overflow-hidden" style={{ background: "#08080e", border: `1px solid ${GOLD}20` }}>
        <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <p className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: `${GOLD}60` }}>New Landing Page</p>
          <h2 className="text-xl font-black text-white mt-1">Choose a template</h2>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {TEMPLATES_LIST.map(t => {
              const Icon = t.icon;
              const active = selected === t.id;
              return (
                <button key={t.id} onClick={() => setSelected(t.id)} className="p-4 rounded-xl text-left transition-all" style={{ background: active ? `${t.color}12` : CARD, border: `1.5px solid ${active ? t.color + "50" : "rgba(255,255,255,0.06)"}`, boxShadow: active ? `0 0 20px ${t.color}18` : "none" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${t.color}18`, border: `1px solid ${t.color}30` }}>
                    <Icon className="w-4.5 h-4.5" style={{ color: t.color, width: 18, height: 18 }} />
                  </div>
                  <p className="text-white font-bold text-sm leading-tight">{t.label}</p>
                  <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{t.desc}</p>
                </button>
              );
            })}
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-400 mb-3">Accent Color</p>
            <div className="flex gap-2">
              {colors.map(c => (
                <button key={c.id} onClick={() => setColorScheme(c.id)} className="w-7 h-7 rounded-full transition-transform" style={{ background: c.hex, transform: colorScheme === c.id ? "scale(1.25)" : "scale(1)", boxShadow: colorScheme === c.id ? `0 0 12px ${c.hex}60` : "none", outline: colorScheme === c.id ? `2px solid ${c.hex}` : "none", outlineOffset: 2 }} />
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleCreate} disabled={!selected || creating} className="px-6 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition-opacity disabled:opacity-40" style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD}cc 100%)`, color: BG }}>
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><LayoutTemplate className="w-4 h-4" />Create Page</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LandingPages() {
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
    <ClientLayout>
      <div className="min-h-screen" style={{ background: BG }}>
        {/* Header */}
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
            <div className="text-center py-24">
              <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-5" style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}25` }}>
                <LayoutTemplate className="w-9 h-9" style={{ color: GOLD }} />
              </div>
              <h2 className="text-xl font-black text-white mb-2">No pages yet</h2>
              <p className="text-zinc-500 text-sm mb-6 max-w-xs mx-auto">Create your first landing page to capture leads and drive conversions.</p>
              <button onClick={() => setShowPicker(true)} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black" style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD}cc 100%)`, color: BG }}>
                <Plus className="w-4 h-4" />Create Your First Page
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
                    {/* Preview strip */}
                    <div className="h-28 relative flex items-center justify-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${accent}10 0%, rgba(0,0,0,0) 60%)`, borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${accent}18 0%, transparent 70%)` }} />
                      <div className="relative z-10 text-center px-4">
                        <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: `${accent}20`, border: `1px solid ${accent}35` }}>
                          <Icon className="w-5 h-5" style={{ color: accent }} />
                        </div>
                        <p className="text-white font-black text-sm truncate max-w-[160px]">{page.title}</p>
                        {meta && <p className="text-xs mt-0.5" style={{ color: `${accent}70` }}>{meta.label}</p>}
                      </div>
                      <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${page.published ? "" : ""}`} style={{ background: page.published ? `${accent}20` : "rgba(255,255,255,0.08)", color: page.published ? accent : "#71717a", border: `1px solid ${page.published ? accent + "35" : "rgba(255,255,255,0.1)"}` }}>
                        {page.published ? "Live" : "Draft"}
                      </div>
                    </div>
                    {/* Stats */}
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
                    {/* Actions */}
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
              {/* New page card */}
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
    </ClientLayout>
  );
}
