import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Download, Search, FileAudio, FileSpreadsheet, FileCheck,
  BookOpen, Clipboard, File, Filter
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

const typeConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  recording: { label: "Recording", icon: FileAudio, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30" },
  summary: { label: "Summary", icon: FileText, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  audit: { label: "Audit", icon: FileSpreadsheet, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30" },
  strategy: { label: "Strategy", icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  worksheet: { label: "Worksheet", icon: Clipboard, color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/30" },
  contract: { label: "Contract", icon: FileCheck, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" },
  other: { label: "Other", icon: File, color: "text-gray-600", bg: "bg-gray-100 dark:bg-gray-900/30" },
};

const filterTypes = ["all", "recording", "summary", "audit", "strategy", "worksheet", "contract", "other"];

export default function ClientDocuments() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { data: docs, isLoading } = useQuery<any[]>({
    queryKey: ["/api/documents"],
  });

  const filtered = (docs || []).filter((d: any) => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || d.fileType === filter;
    return matchSearch && matchFilter;
  });

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground mt-1">All files shared with you by your coach</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-testid="input-search-docs"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {filterTypes.map((type) => (
              <button
                key={type}
                data-testid={`filter-${type}`}
                onClick={() => setFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                  filter === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No documents found</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {search || filter !== "all" ? "Try adjusting your search or filter" : "Your coach hasn't shared any documents yet"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((doc: any) => {
              const cfg = typeConfig[doc.fileType] || typeConfig.other;
              const Icon = cfg.icon;
              return (
                <Card
                  key={doc.id}
                  data-testid={`doc-card-${doc.id}`}
                  className="border border-card-border hover:border-primary/30 transition-all duration-200 hover:shadow-sm"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-foreground leading-tight">{doc.title}</h3>
                          <Badge variant="secondary" className="text-[10px] px-2 py-0.5 flex-shrink-0 capitalize">
                            {cfg.label}
                          </Badge>
                        </div>
                        {doc.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.description}</p>
                        )}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span>{doc.fileSize || "—"}</span>
                            <span>·</span>
                            <span>{format(new Date(doc.createdAt), "MMM d, yyyy")}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid={`download-doc-${doc.id}`}
                            onClick={() => window.open(doc.fileUrl, "_blank")}
                            className="h-7 px-3 text-xs gap-1.5"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
