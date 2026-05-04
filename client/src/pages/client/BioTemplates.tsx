import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import GeneratingScreen from "@/components/ui/GeneratingScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, FileText, Copy, Check, Dumbbell, Briefcase, DollarSign,
  TrendingUp, Heart, Home, ShoppingCart, Video, Cpu, Apple, Brain, Share2,
  Instagram, Linkedin, Twitter
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  category: string;
  icon: any;
  color: string;
  structure: string;
  fields: { key: string; label: string; placeholder: string }[];
  example: string;
}

const TEMPLATES: Template[] = [
  {
    id: "fitness-coach",
    name: "Fitness Coach",
    category: "Health & Fitness",
    icon: Dumbbell,
    color: "#ef4444",
    structure: "Helping {audience} {transformation} in {timeframe}\n{socialProof}\n{cta}\n{link}",
    fields: [
      { key: "audience", label: "Who you help", placeholder: "busy professionals" },
      { key: "transformation", label: "Transformation", placeholder: "lose 20lbs without giving up favorite foods" },
      { key: "timeframe", label: "Timeframe", placeholder: "90 days" },
      { key: "socialProof", label: "Social proof", placeholder: "500+ transformations | Featured in Men's Health" },
      { key: "cta", label: "Call to action", placeholder: "Get my free workout plan below" },
      { key: "link", label: "Link", placeholder: "linktr.ee/yourname" },
    ],
    example: "Helping busy professionals lose 20lbs in 90 days\n500+ transformations | Featured in Men's Health\nGet my free workout plan below\nlinktr.ee/fitcoach"
  },
  {
    id: "business-coach",
    name: "Business Coach",
    category: "Business",
    icon: Briefcase,
    color: "#3b82f6",
    structure: "I help {audience} {outcome} without {pain}\n{socialProof}\n{cta}\n{link}",
    fields: [
      { key: "audience", label: "Target audience", placeholder: "coaches & consultants" },
      { key: "outcome", label: "Outcome", placeholder: "scale to $10K/mo" },
      { key: "pain", label: "Pain point avoided", placeholder: "paid ads or cold DMs" },
      { key: "socialProof", label: "Social proof", placeholder: "Helped 200+ entrepreneurs | $5M+ generated" },
      { key: "cta", label: "Call to action", placeholder: "Book your free strategy call" },
      { key: "link", label: "Link", placeholder: "calendly.com/yourname" },
    ],
    example: "I help coaches scale to $10K/mo without paid ads\nHelped 200+ entrepreneurs | $5M+ generated\nBook your free strategy call\ncalendly.com/coach"
  },
  {
    id: "finance-expert",
    name: "Finance Expert",
    category: "Finance",
    icon: DollarSign,
    color: "#22c55e",
    structure: "{expertise} | Helping {audience} {goal}\n{socialProof}\n{cta}\n{link}",
    fields: [
      { key: "expertise", label: "Your expertise", placeholder: "CFP® | Wealth Advisor" },
      { key: "audience", label: "Who you serve", placeholder: "tech professionals" },
      { key: "goal", label: "Their goal", placeholder: "build $1M+ portfolios" },
      { key: "socialProof", label: "Social proof", placeholder: "$50M+ managed | 15 years experience" },
      { key: "cta", label: "Call to action", placeholder: "Download my free investment guide" },
      { key: "link", label: "Link", placeholder: "yoursite.com/guide" },
    ],
    example: "CFP® | Wealth Advisor\nHelping tech professionals build $1M+ portfolios\n$50M+ managed | 15 years experience\nDownload my free investment guide\nyoursite.com/guide"
  },
  {
    id: "content-creator",
    name: "Content Creator",
    category: "Creator",
    icon: Video,
    color: "#a855f7",
    structure: "{niche} content creator\n{stats}\n{mission}\n{link}",
    fields: [
      { key: "niche", label: "Your niche", placeholder: "Tech reviews & tutorials" },
      { key: "stats", label: "Stats", placeholder: "500K+ followers | 10M+ views" },
      { key: "mission", label: "Mission/tagline", placeholder: "Making tech simple for everyone" },
      { key: "link", label: "Link", placeholder: "youtube.com/@yourname" },
    ],
    example: "Tech reviews & tutorials\n500K+ followers | 10M+ views\nMaking tech simple for everyone\nyoutube.com/@creator"
  },
  {
    id: "ecommerce",
    name: "E-Commerce Brand",
    category: "Business",
    icon: ShoppingCart,
    color: "#f59e0b",
    structure: "{productCategory} | {uniqueValue}\n{socialProof}\n{cta}\n{link}",
    fields: [
      { key: "productCategory", label: "Product category", placeholder: "Premium leather goods" },
      { key: "uniqueValue", label: "Unique value", placeholder: "Handcrafted in Italy" },
      { key: "socialProof", label: "Social proof", placeholder: "10K+ happy customers | ⭐️ 4.9/5" },
      { key: "cta", label: "Call to action", placeholder: "Shop the collection" },
      { key: "link", label: "Link", placeholder: "yourstore.com" },
    ],
    example: "Premium leather goods | Handcrafted in Italy\n10K+ happy customers | ⭐️ 4.9/5\nShop the collection\nyourstore.com"
  },
  {
    id: "real-estate",
    name: "Real Estate Agent",
    category: "Real Estate",
    icon: Home,
    color: "#06b6d4",
    structure: "{title} | {location}\n{specialty}\n{socialProof}\n{link}",
    fields: [
      { key: "title", label: "Title", placeholder: "Licensed Realtor®" },
      { key: "location", label: "Location", placeholder: "Miami, FL" },
      { key: "specialty", label: "Specialty", placeholder: "Luxury waterfront properties" },
      { key: "socialProof", label: "Social proof", placeholder: "$100M+ in sales | Top 1% agent" },
      { key: "link", label: "Link", placeholder: "yoursite.com" },
    ],
    example: "Licensed Realtor® | Miami, FL\nLuxury waterfront properties\n$100M+ in sales | Top 1% agent\nyoursite.com"
  },
  {
    id: "nutrition",
    name: "Nutritionist",
    category: "Health & Fitness",
    icon: Apple,
    color: "#84cc16",
    structure: "{credentials} | Helping {audience} {outcome}\n{socialProof}\n{cta}\n{link}",
    fields: [
      { key: "credentials", label: "Credentials", placeholder: "Registered Dietitian" },
      { key: "audience", label: "Target audience", placeholder: "women 30+" },
      { key: "outcome", label: "Outcome", placeholder: "balance hormones naturally" },
      { key: "socialProof", label: "Social proof", placeholder: "1000+ clients helped | Featured in Vogue" },
      { key: "cta", label: "Call to action", placeholder: "Get my free meal plan" },
      { key: "link", label: "Link", placeholder: "yoursite.com/freebie" },
    ],
    example: "Registered Dietitian\nHelping women 30+ balance hormones naturally\n1000+ clients helped | Featured in Vogue\nGet my free meal plan\nyoursite.com/freebie"
  },
  {
    id: "tech-founder",
    name: "Tech Founder",
    category: "Tech",
    icon: Cpu,
    color: "#6366f1",
    structure: "Founder @ {company} | {mission}\n{achievement}\n{cta}\n{link}",
    fields: [
      { key: "company", label: "Company name", placeholder: "YourStartup" },
      { key: "mission", label: "Mission", placeholder: "AI tools for creators" },
      { key: "achievement", label: "Achievement", placeholder: "Backed by Y Combinator | 50K+ users" },
      { key: "cta", label: "Call to action", placeholder: "Join the waitlist" },
      { key: "link", label: "Link", placeholder: "yourstartup.com" },
    ],
    example: "Founder @ YourStartup | AI tools for creators\nBacked by Y Combinator | 50K+ users\nJoin the waitlist\nyourstartup.com"
  },
  {
    id: "mindset-coach",
    name: "Mindset Coach",
    category: "Personal Development",
    icon: Brain,
    color: "#ec4899",
    structure: "Helping {audience} {transformation}\n{socialProof}\n{cta}\n{link}",
    fields: [
      { key: "audience", label: "Who you help", placeholder: "high-achievers" },
      { key: "transformation", label: "Transformation", placeholder: "overcome burnout & find purpose" },
      { key: "socialProof", label: "Social proof", placeholder: "500+ lives changed | TEDx speaker" },
      { key: "cta", label: "Call to action", placeholder: "Start your transformation" },
      { key: "link", label: "Link", placeholder: "linktr.ee/yourname" },
    ],
    example: "Helping high-achievers overcome burnout & find purpose\n500+ lives changed | TEDx speaker\nStart your transformation\nlinktr.ee/coach"
  },
  {
    id: "social-media-manager",
    name: "Social Media Manager",
    category: "Marketing",
    icon: Share2,
    color: "#14b8a6",
    structure: "Social Media Strategist | {specialty}\n{socialProof}\n{cta}\n{link}",
    fields: [
      { key: "specialty", label: "Specialty", placeholder: "Growing brands on Instagram & TikTok" },
      { key: "socialProof", label: "Social proof", placeholder: "100M+ views generated | Worked with 50+ brands" },
      { key: "cta", label: "Call to action", placeholder: "DM me 'GROW' to get started" },
      { key: "link", label: "Link", placeholder: "yoursite.com" },
    ],
    example: "Social Media Strategist | Growing brands on Instagram & TikTok\n100M+ views generated | Worked with 50+ brands\nDM me 'GROW' to get started\nyoursite.com"
  },
];

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram, limit: 150, color: "#E1306C" },
  { id: "twitter", label: "Twitter/X", icon: Twitter, limit: 160, color: "#1DA1F2" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, limit: 220, color: "#0A66C2" },
] as const;

export default function BioTemplates() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"select" | "customize" | "results">("select");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [platform, setPlatform] = useState<"instagram" | "twitter" | "linkedin">("instagram");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [polishing, setPolishing] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [polishedBios, setPolishedBios] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState(0);

  const selectedPlatform = PLATFORMS.find(p => p.id === platform) || PLATFORMS[0];

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    const initialValues: Record<string, string> = {};
    template.fields.forEach(field => {
      initialValues[field.key] = "";
    });
    setFieldValues(initialValues);
    setStep("customize");
  };

  const handlePolish = async () => {
    if (!selectedTemplate) return;

    const allFilled = selectedTemplate.fields.every(field => fieldValues[field.key]?.trim());
    if (!allFilled) {
      toast({ title: "Fill all fields", description: "Complete all fields to continue", variant: "destructive" });
      return;
    }

    setPolishing(true);
    setApiDone(false);

    try {
      let filledBio = selectedTemplate.structure;
      Object.entries(fieldValues).forEach(([key, value]) => {
        filledBio = filledBio.replace(`{${key}}`, value);
      });

      const data = await apiRequest("POST", "/api/tools/bio-generator/polish-template", {
        filledBio,
        platform,
        templateName: selectedTemplate.name,
      });
      setPolishedBios(data.polishedVersions);
      setApiDone(true);
      setSelectedVersion(0);
    } catch (err: any) {
      toast({ title: "Polish failed", description: err.message, variant: "destructive" });
      setPolishing(false);
      setApiDone(false);
    }
  };

  const handleDone = () => {
    setPolishing(false);
    setStep("results");
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied to clipboard!" });
  };

  if (polishing) {
    return (
      <GeneratingScreen
        label="your polished bio"
        minMs={8000}
        isComplete={apiDone}
        onReady={handleDone}
        steps={[
          "Analyzing template structure",
          "Optimizing for platform",
          "Polishing language",
          "Generating variations",
        ]}
      />
    );
  }

  if (step === "select") {
    const categories = Array.from(new Set(TEMPLATES.map(t => t.category)));

    return (
      <ClientLayout>
        <div className="max-w-6xl mx-auto px-5 py-8">
          <div className="flex items-center gap-3 mb-7">
            <button
              onClick={() => navigate("/tools/bio-generator")}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mr-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />Back
            </button>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <FileText className="w-4 h-4" style={{ color: "#6366f1" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Template Selector</h1>
              <p className="text-xs text-muted-foreground">Choose a proven template and customize it</p>
            </div>
          </div>

          {categories.map(category => (
            <div key={category} className="mb-8">
              <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {TEMPLATES.filter(t => t.category === category).map(template => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className="group text-left p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-all hover:scale-[1.02]"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${template.color}15`, border: `1px solid ${template.color}30` }}>
                          <Icon className="w-5 h-5" style={{ color: template.color }} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{template.name}</h3>
                          <p className="text-[10px] text-zinc-500">{template.fields.length} fields</p>
                        </div>
                      </div>
                      <div className="bg-zinc-950 rounded-lg p-3 mb-3">
                        <p className="text-[10px] text-zinc-500 leading-relaxed whitespace-pre-line">{template.example}</p>
                      </div>
                      <span className="text-xs font-semibold group-hover:translate-x-1 transition-transform" style={{ color: template.color }}>
                        Use Template →
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ClientLayout>
    );
  }

  if (step === "customize" && selectedTemplate) {
    const Icon = selectedTemplate.icon;

    return (
      <ClientLayout>
        <div className="max-w-4xl mx-auto px-5 py-8">
          <div className="flex items-center gap-3 mb-7">
            <button
              onClick={() => setStep("select")}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mr-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />Templates
            </button>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${selectedTemplate.color}15`, border: `1px solid ${selectedTemplate.color}30` }}>
              <Icon className="w-4 h-4" style={{ color: selectedTemplate.color }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{selectedTemplate.name}</h1>
              <p className="text-xs text-muted-foreground">Fill in the blanks to customize your bio</p>
            </div>
          </div>

          {/* Platform selector */}
          <div className="mb-6">
            <label className="text-xs text-muted-foreground mb-2 block font-medium">Platform</label>
            <div className="flex gap-2">
              {PLATFORMS.map(p => {
                const PIcon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                      platform === p.id
                        ? "border-indigo-500/60 bg-indigo-500/10"
                        : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <PIcon className="w-4 h-4" style={{ color: platform === p.id ? p.color : "#71717a" }} />
                    <span className={`text-sm font-semibold ${platform === p.id ? "text-white" : "text-zinc-500"}`}>
                      {p.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Form */}
            <div className="rounded-2xl p-6 space-y-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {selectedTemplate.fields.map(field => (
                <div key={field.key}>
                  <label className="text-xs text-zinc-400 mb-1.5 block font-medium">{field.label}</label>
                  <Input
                    value={fieldValues[field.key] || ""}
                    onChange={e => setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 text-sm"
                  />
                </div>
              ))}
            </div>

            {/* Right: Preview */}
            <div>
              <div className="rounded-2xl p-5 sticky top-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Preview</p>
                <div className="bg-zinc-950 rounded-xl p-4">
                  <p className="text-sm text-white leading-relaxed whitespace-pre-line">
                    {selectedTemplate.structure.split('\n').map((line, i) => {
                      let processedLine = line;
                      Object.entries(fieldValues).forEach(([key, value]) => {
                        processedLine = processedLine.replace(`{${key}}`, value || `{${key}}`);
                      });
                      return <span key={i}>{processedLine}{i < selectedTemplate.structure.split('\n').length - 1 && <br />}</span>;
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handlePolish}
            disabled={!selectedTemplate.fields.every(field => fieldValues[field.key]?.trim())}
            className="w-full h-12 font-bold text-base gap-3 text-black mt-6"
            style={{ background: "#6366f1" }}
          >
            <FileText className="w-5 h-5" />
            Polish My Bio
          </Button>
          <p className="text-center text-xs text-zinc-500 mt-2">
            AI will optimize and create 3 polished variations
          </p>
        </div>
      </ClientLayout>
    );
  }

  if (step === "results" && selectedTemplate) {
    return (
      <ClientLayout>
        <div className="max-w-4xl mx-auto px-5 py-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setStep("customize")}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />Edit Fields
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-bold text-white mb-3">Polished Versions</p>
            {polishedBios.map((bio, i) => (
              <div
                key={i}
                className="rounded-xl p-5 border border-zinc-800 bg-zinc-900/40"
              >
                <div className="flex items-start justify-between mb-3">
                  <Badge className="bg-zinc-800 text-zinc-300 border-0 text-[10px]">
                    Version {i + 1}
                  </Badge>
                  <button
                    onClick={() => copyText(bio, `bio-${i}`)}
                    className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-indigo-400 transition-colors"
                  >
                    {copied === `bio-${i}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied === `bio-${i}` ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-sm text-white leading-relaxed whitespace-pre-line">{bio}</p>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-zinc-800">
                  <span className="text-xs text-zinc-500">{bio.length} characters</span>
                  {bio.length <= selectedPlatform.limit ? (
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">
                      Within limit
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">
                      Over by {bio.length - selectedPlatform.limit}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ClientLayout>
    );
  }

  return null;
}
