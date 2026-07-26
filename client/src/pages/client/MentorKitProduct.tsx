import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import ClientLayout from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, Copy, Download, BookOpen, Users,
  FileText, Presentation, FileUp, Sparkles, Check
} from "lucide-react";
import { useState } from "react";

const PRODUCT_TYPES: Record<string, { label: string; icon: any; color: string; bg: string; gradient: string }> = {
  course: { label: "Online Course", icon: BookOpen, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", gradient: "from-blue-500 to-cyan-500" },
  mentorship: { label: "Mentorship Program", icon: Users, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", gradient: "from-purple-500 to-pink-500" },
  ebook: { label: "Ebook / Guide", icon: FileText, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", gradient: "from-emerald-500 to-teal-500" },
  workshop: { label: "Workshop / Masterclass", icon: Presentation, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", gradient: "from-orange-500 to-red-500" },
};

function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) { elements.push(<div key={key++} className="h-3" />); continue; }

    if (line.startsWith("### ")) {
      elements.push(<h3 key={key++} className="text-white font-semibold text-base mt-5 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={key++} className="text-white font-bold text-lg mt-8 mb-3 pb-2 border-b border-white/8">{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={key++} className="text-white font-bold text-xl mt-6 mb-3">{line.slice(2)}</h1>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={key++} className="flex gap-2 text-white/70 text-sm py-0.5">
          <span className="text-purple-400 mt-1.5 shrink-0">•</span>
          <span dangerouslySetInnerHTML={{ __html: formatInline(line.slice(2)) }} />
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/);
      if (match) {
        elements.push(
          <div key={key++} className="flex gap-2 text-white/70 text-sm py-0.5">
            <span className="text-purple-400 shrink-0 font-mono text-xs mt-0.5">{match[1]}.</span>
            <span dangerouslySetInnerHTML={{ __html: formatInline(match[2]) }} />
          </div>
        );
      }
    } else if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
      elements.push(<p key={key++} className="text-white font-semibold text-sm mt-2 mb-1">{line.slice(2, -2)}</p>);
    } else {
      elements.push(
        <p key={key++} className="text-white/65 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
      );
    }
  }
  return elements;
}

function formatInline(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-white/80">$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-white/10 text-purple-300 px-1 py-0.5 rounded text-xs font-mono">$1</code>');
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function MentorKitProduct() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: [`/api/mentor-kit/product/${id}`],
    queryFn: () => apiRequest("GET", `/api/mentor-kit/product/${id}`),
  });

  const copy = () => {
    if (!product?.generated_content) return;
    navigator.clipboard.writeText(product.generated_content);
    setCopied(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    if (!product?.generated_content) return;
    const blob = new Blob([product.generated_content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${product.title || "mentorkit-blueprint"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </ClientLayout>
    );
  }

  if (!product) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/40">Product not found</div>
      </ClientLayout>
    );
  }

  const type = PRODUCT_TYPES[product.product_type] || PRODUCT_TYPES.course;
  const Icon = type.icon;
  const inputData = product.input_data || {};

  return (
    <ClientLayout>
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        {/* Header */}
        <div className="border-b border-white/5 sticky top-0 bg-[#0a0a0f]/95 backdrop-blur-sm z-10">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
            <button onClick={() => setLocation("/mentor-kit")} className="text-white/40 hover:text-white/70 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${type.gradient} flex items-center justify-center shrink-0`}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <h1 className="text-sm font-semibold text-white truncate">{product.title || inputData.niche}</h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={copy}
                variant="outline"
                size="sm"
                className="border-white/10 text-white/60 hover:text-white bg-transparent hover:bg-white/5 h-8 text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                onClick={download}
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 h-8 text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Meta */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${type.gradient} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <Badge className={`text-xs font-normal border mb-1 ${type.bg} ${type.color}`}>{type.label}</Badge>
                    <h2 className="text-white font-bold text-base leading-tight">{product.title || inputData.niche}</h2>
                  </div>
                </div>
                <div className="text-white/25 text-xs">{timeAgo(product.created_at)}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/5">
                {inputData.niche && (
                  <div>
                    <p className="text-white/30 text-xs mb-0.5 uppercase tracking-wider">Niche</p>
                    <p className="text-white/70 text-sm">{inputData.niche}</p>
                  </div>
                )}
                {inputData.audience && (
                  <div>
                    <p className="text-white/30 text-xs mb-0.5 uppercase tracking-wider">Audience</p>
                    <p className="text-white/70 text-sm">{inputData.audience}</p>
                  </div>
                )}
                {inputData.transformation && (
                  <div>
                    <p className="text-white/30 text-xs mb-0.5 uppercase tracking-wider">Transformation</p>
                    <p className="text-white/70 text-sm">{inputData.transformation}</p>
                  </div>
                )}
              </div>

              {product.pdf_context_used && (
                <div className="flex items-center gap-1.5 mt-4 text-purple-400/70 text-xs">
                  <FileUp className="w-3 h-3" />
                  Generated with PDF knowledge base
                </div>
              )}
            </div>
          </motion.div>

          {/* Content */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-white/40 text-sm">Blueprint</span>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-6 space-y-1">
              {renderMarkdown(product.generated_content || "")}
            </div>
          </motion.div>

          {/* Bottom actions */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex gap-3 mt-8 pb-12">
            <Button
              onClick={() => setLocation("/mentor-kit/new")}
              variant="outline"
              className="border-white/10 text-white/60 hover:text-white bg-transparent hover:bg-white/5"
            >
              Build Another
            </Button>
            <Button
              onClick={download}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0"
            >
              <Download className="w-4 h-4 mr-2" /> Download Blueprint
            </Button>
          </motion.div>
        </div>
      </div>
    </ClientLayout>
  );
}
