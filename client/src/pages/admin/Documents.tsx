import { useState, useRef } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Search, Trash2, ExternalLink, Upload, Link2, Loader2, X } from "lucide-react";
import { format } from "date-fns";

const typeConfig: Record<string, { color: string; bg: string }> = {
  recording: { color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30" },
  summary: { color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  audit: { color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30" },
  strategy: { color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  worksheet: { color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/30" },
  contract: { color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" },
  other: { color: "text-gray-600", bg: "bg-gray-100 dark:bg-gray-900/30" },
};

const defaultForm = { clientId: "", title: "", description: "", fileUrl: "", fileType: "strategy", fileSize: "" };

export default function AdminDocuments() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterClient, setFilterClient] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [open, setOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<"device" | "link">("device");
  const [form, setForm] = useState({ ...defaultForm });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: docs, isLoading } = useQuery<any[]>({ queryKey: ["/api/documents"] });
  const { data: clients } = useQuery<any[]>({ queryKey: ["/api/clients"] });

  const addDoc = useMutation({
    mutationFn: (docData: typeof form) => apiRequest("POST", "/api/documents", docData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document uploaded!" });
      setOpen(false);
      setForm({ ...defaultForm });
      setSelectedFile(null);
      setUploadTab("device");
    },
    onError: (err: any) => toast({ title: "Upload failed", description: err.message, variant: "destructive" }),
  });

  const deleteDoc = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document deleted" });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (!form.title) setForm(p => ({ ...p, title: file.name.replace(/\.[^/.]+$/, "") }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (!form.title) setForm(p => ({ ...p, title: file.name.replace(/\.[^/.]+$/, "") }));
  };

  const handleSubmit = async () => {
    if (!form.clientId || !form.title) {
      toast({ title: "Please fill in client and title", variant: "destructive" });
      return;
    }

    if (uploadTab === "device") {
      if (!selectedFile) {
        toast({ title: "Please select a file", variant: "destructive" });
        return;
      }
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", selectedFile);
        const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
        if (!res.ok) throw new Error("Upload failed");
        const { fileUrl, fileSize } = await res.json();
        addDoc.mutate({ ...form, fileUrl, fileSize });
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      } finally {
        setUploading(false);
      }
    } else {
      if (!form.fileUrl) {
        toast({ title: "Please enter a file URL", variant: "destructive" });
        return;
      }
      addDoc.mutate(form);
    }
  };

  const clientMap = Object.fromEntries((clients || []).map((c: any) => [c.id, c]));

  const filtered = (docs || []).filter((d: any) => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase());
    const matchClient = filterClient === "all" || d.clientId === filterClient;
    const matchType = filterType === "all" || d.fileType === filterType;
    return matchSearch && matchClient && matchType;
  });

  const isSubmitting = uploading || addDoc.isPending;
  const canSubmit = form.clientId && form.title && (uploadTab === "device" ? !!selectedFile : !!form.fileUrl);

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Documents</h1>
            <p className="text-muted-foreground mt-1">{(docs || []).length} total documents across all clients</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm({ ...defaultForm }); setSelectedFile(null); setUploadTab("device"); } }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-doc-global" className="gap-2">
                <Plus className="w-4 h-4" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {/* Client */}
                <div>
                  <Label>Client</Label>
                  <Select value={form.clientId} onValueChange={(v) => setForm(p => ({ ...p, clientId: v }))}>
                    <SelectTrigger className="mt-1.5" data-testid="select-client">
                      <SelectValue placeholder="Select client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(clients || []).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div>
                  <Label>Title</Label>
                  <Input data-testid="input-doc-title" placeholder="Document title" className="mt-1.5" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} />
                </div>

                {/* Description */}
                <div>
                  <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Textarea placeholder="Brief description" className="mt-1.5" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
                </div>

                {/* Document Type */}
                <div>
                  <Label>Document Type</Label>
                  <Select value={form.fileType} onValueChange={(v) => setForm(p => ({ ...p, fileType: v }))}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["recording", "summary", "audit", "strategy", "worksheet", "contract", "other"].map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Upload method tabs */}
                <div>
                  <Label>Upload Method</Label>
                  <div className="flex mt-1.5 rounded-lg border border-border overflow-hidden">
                    <button
                      type="button"
                      data-testid="tab-device-upload"
                      onClick={() => setUploadTab("device")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${uploadTab === "device" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
                    >
                      <Upload className="w-4 h-4" /> From Device
                    </button>
                    <button
                      type="button"
                      data-testid="tab-link-upload"
                      onClick={() => setUploadTab("link")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${uploadTab === "link" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
                    >
                      <Link2 className="w-4 h-4" /> From Link
                    </button>
                  </div>

                  {uploadTab === "device" ? (
                    <div
                      className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${selectedFile ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/50"}`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      data-testid="dropzone-file"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileSelect}
                        data-testid="input-file-device"
                      />
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <FileText className="w-5 h-5 text-primary" />
                          <div className="text-left">
                            <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {selectedFile.size > 1024 * 1024
                                ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                                : `${Math.round(selectedFile.size / 1024)} KB`}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                            className="ml-2 text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm font-medium text-foreground">Click or drag & drop</p>
                          <p className="text-xs text-muted-foreground mt-1">Any file up to 50 MB</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2">
                      <Input
                        data-testid="input-file-url"
                        placeholder="https://drive.google.com/..."
                        value={form.fileUrl}
                        onChange={(e) => setForm(p => ({ ...p, fileUrl: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">Google Drive, Dropbox, or any public link</p>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  data-testid="button-save-doc-global"
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className="gap-2"
                >
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Share Document</>}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
              data-testid="input-search-admin-docs"
            />
          </div>
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="h-10 w-48" data-testid="filter-client">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {(clients || []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-10 w-40">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {["recording", "summary", "audit", "strategy", "worksheet", "contract", "other"].map((t) => (
                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No documents found</h3>
            <p className="text-sm text-muted-foreground">Upload documents for your clients</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((doc: any) => {
              const cfg = typeConfig[doc.fileType] || typeConfig.other;
              const client = clientMap[doc.clientId];
              return (
                <Card key={doc.id} data-testid={`admin-all-doc-${doc.id}`} className="border border-card-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                        <FileText className={`w-5 h-5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{doc.title}</p>
                          <Badge variant="secondary" className="text-[10px] capitalize">{doc.fileType}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {client && (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="w-4 h-4">
                                <AvatarFallback className="text-[8px] font-bold bg-primary/10 text-primary">
                                  {client.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">{client.name}</span>
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">{format(new Date(doc.createdAt), "MMM d, yyyy")}</span>
                          {doc.fileSize && <span className="text-xs text-muted-foreground">{doc.fileSize}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary p-1.5">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => deleteDoc.mutate(doc.id)}
                          className="text-muted-foreground hover:text-destructive p-1.5 transition-colors"
                          data-testid={`delete-doc-${doc.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
