import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import ClientLayout from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Plus, BookOpen, Users, FileText, Presentation,
  Trash2, ChevronRight, Sparkles, Clock, FileUp
} from "lucide-react";

const PRODUCT_TYPES: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  course: { label: "Online Course", icon: BookOpen, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  mentorship: { label: "Mentorship Program", icon: Users, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  ebook: { label: "Ebook / Guide", icon: FileText, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  workshop: { label: "Workshop / Masterclass", icon: Presentation, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function MentorKit() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["/api/mentor-kit/products"],
    queryFn: () => apiRequest("GET", "/api/mentor-kit/products"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/mentor-kit/product/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/mentor-kit/products"] });
      toast({ title: "Product deleted" });
    },
  });

  return (
    <ClientLayout>
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        {/* Header */}
        <div className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-blue-900/10 pointer-events-none" />
          <div className="relative px-6 py-10 max-w-6xl mx-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white/40 text-sm font-medium tracking-wider uppercase">MentorKit</span>
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Digital Product Builder</h1>
                <p className="text-white/50 mt-1 text-sm">Turn your expertise into fully-structured digital products — courses, programs, ebooks, workshops.</p>
              </div>
              <Button
                onClick={() => setLocation("/mentor-kit/new")}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-lg shadow-purple-500/20 shrink-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Product
              </Button>
            </div>
          </div>
        </div>

        <div className="px-6 py-8 max-w-6xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-44 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-600/20 border border-white/10 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">No products yet</h2>
              <p className="text-white/40 text-sm mb-6 max-w-xs">Build your first digital product in minutes. Upload a PDF or just describe your idea.</p>
              <Button
                onClick={() => setLocation("/mentor-kit/new")}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Product
              </Button>
            </motion.div>
          ) : (
            <>
              <p className="text-white/30 text-xs mb-5 uppercase tracking-wider">{products.length} product{products.length !== 1 ? "s" : ""}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {products.map((product: any, i: number) => {
                    const type = PRODUCT_TYPES[product.product_type] || PRODUCT_TYPES.course;
                    const Icon = type.icon;
                    const niche = product.input_data?.niche || "—";
                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ delay: i * 0.05 }}
                        className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 rounded-xl p-5 cursor-pointer transition-all duration-200"
                        onClick={() => setLocation(`/mentor-kit/product/${product.id}`)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${type.bg}`}>
                            <Icon className={`w-5 h-5 ${type.color}`} />
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(product.id); }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <Badge className={`text-xs font-normal border mb-3 ${type.bg} ${type.color}`}>
                          {type.label}
                        </Badge>

                        <h3 className="text-white font-semibold text-sm leading-snug mb-1 line-clamp-2">
                          {product.title || niche}
                        </h3>
                        <p className="text-white/30 text-xs truncate">{niche}</p>

                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                          <div className="flex items-center gap-1.5 text-white/25 text-xs">
                            <Clock className="w-3 h-3" />
                            {timeAgo(product.created_at)}
                          </div>
                          <div className="flex items-center gap-2">
                            {product.pdf_context_used && (
                              <div className="flex items-center gap-1 text-white/30 text-xs">
                                <FileUp className="w-3 h-3" />
                                PDF
                              </div>
                            )}
                            <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
