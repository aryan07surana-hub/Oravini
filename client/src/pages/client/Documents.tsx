import { AiRefineButton } from "@/components/ui/AiRefineButton";
import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Download, Search, FileAudio, FileSpreadsheet, FileCheck,
  BookOpen, Clipboard, File, Plus, Upload, Link2, Loader2, Trash2, X, ExternalLink, Library
} from "lucide-react";
import { format } from "date-fns";
import { useState, useRef } from "react";

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
const defaultForm = { title: "", description: "", fileUrl: "", fileType: "other", fileSize: "" };

export default function ClientDocuments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"files" | "materials">("files");
  const [search, setSearch] = useState("");
  const [matSearch, setMatSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<"device" | "link">("device");
  const [form, setForm] = useState({ ...defaultForm });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: docs, isLoading } = useQuery<any[]>({ queryKey: ["/api/documents"] });
  const { data: materials, isLoading: matsLoading } = useQuery<any[]>({ queryKey: ["/api/materials"] });

  const addDoc = useMutation({
    mutationFn: (docData: any) => apiRequest("POST", "/api/documents", docData),
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/documents"] }); toast({ title: "Document removed" }); },
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
    if (!form.title) { toast({ title: "Please enter a title", variant: "destructive" }); return; }
    if (uploadTab === "device") {
      if (!selectedFile) { toast({ title: "Please select a file", variant: "destructive" }); return; }
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
      } finally { setUploading(false); }
    } else {
      if (!form.fileUrl) { toast({ title: "Please enter a file URL", variant: "destructive" }); return; }
      addDoc.mutate(form);
    }
  };

  const myDocs = (docs || []).filter((d: any) => d.fileType !== "material");
  const filtered = myDocs.filter((d: any) => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || d.fileType === filter;
    return matchSearch && matchFilter;
  });
  const filteredMats = (materials || []).filter((m: any) => m.title.toLowerCase().includes(matSearch.toLowerCase()));

  const isSubmitting = uploading || addDoc.isPending;
  const canSubmit = form.title && (uploadTab === "device" ? !!selectedFile : !!form.fileUrl);

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Documents</h1>
            <p className="text-muted-foreground mt-1">{tab === "files" ? "Files shared with you and your uploads" : "Shared resources from Oravini"}</p>
          </div>
          {tab === "files" && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm({ ...defaultForm }); setSelectedFile(null); setUploadTab("device"); } }}>
              <DialogTrigger asChild>
                <Button data-testid="button-upload-doc-client" className="gap-2" size="sm"><Plus className="w-4 h-4" />Upload File</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input data-testid="input-client-doc-title" placeholder="Document title" className="mt-1.5" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Textarea placeholder="Brief description" className="mt-1.5" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
                    <AiRefineButton text={form.description || ""} onAccept={v => setForm(p => ({ ...p, description: v }))} context="document description" />
                  </div>
                  <div>
                    <Label>Document Type</Label>
                    <Select value={form.fileType} onValueChange={(v) => setForm(p => ({ ...p, fileType: v }))}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>{["recording", "summary", "audit", "strategy", "worksheet", "contract", "other"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Upload Method</Label>
                    <div className="flex mt-1.5 rounded-lg border border-border overflow-hidden">
                      <button type="button" data-testid="client-tab-device" onClick={() => setUploadTab("device")} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${uploadTab === "device" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}><Upload className="w-4 h-4" /> From Device</button>
                      <button type="button" data-testid="client-tab-link" onClick={() => setUploadTab("link")} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${uploadTab === "link" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}><Link2 className="w-4 h-4" /> From Link</button>
                    </div>
                    {uploadTab === "device" ? (
                      <div className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${selectedFile ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/50"}`} onClick={() => fileInputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} data-testid="client-dropzone">
                        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} data-testid="client-input-file" />
                        {selectedFile ? (
                          <div className="flex items-center justify-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <div className="text-left"><p className="text-sm font-medium text-foreground">{selectedFile.name}</p><p className="text-xs text-muted-foreground">{selectedFile.size > 1024 * 1024 ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(selectedFile.size / 1024)} KB`}</p></div>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="ml-2 text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (<><Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm font-medium text-foreground">Click or drag & drop</p><p className="text-xs text-muted-foreground mt-1">Any file up to 50 MB</p></>)}
                      </div>
                    ) : (
                      <div className="mt-2">
                        <Input data-testid="client-input-url" placeholder="https://drive.google.com/..." value={form.fileUrl} onChange={(e) => setForm(p => ({ ...p, fileUrl: e.target.value }))} />
                        <p className="text-xs text-muted-foreground mt-1.5">Google Drive, Dropbox, or any public link</p>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button data-testid="button-client-submit-doc" onClick={handleSubmit} disabled={!canSubmit || isSubmitting} className="gap-2">
                    {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload</>}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6 w-fit">
          <button onClick={() => setTab("files")} data-testid="tab-my-files" className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "files" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <FileText className="w-4 h-4" /> My Files
          </button>
          <button onClick={() => setTab("materials")} data-testid="tab-materials" className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "materials" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Library className="w-4 h-4" /> Materials Library
          </button>
        </div>

        {tab === "files" ? (
          <>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input data-testid="input-search-docs" placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
              </div>
              <div className="flex gap-2 flex-wrap">
                {filterTypes.map((type) => (
                  <button key={type} data-testid={`filter-${type}`} onClick={() => setFilter(type)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${filter === type ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>{type}</button>
                ))}
              </div>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4"><FileText className="w-8 h-8 text-muted-foreground" /></div>
                <h3 className="text-base font-semibold text-foreground mb-1">No documents found</h3>
                <p className="text-sm text-muted-foreground max-w-xs">{search || filter !== "all" ? "Try adjusting your search or filter" : "No documents yet — upload one above!"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((doc: any) => {
                  const cfg = typeConfig[doc.fileType] || typeConfig.other;
                  const Icon = cfg.icon;
                  const isOwn = doc.uploadedBy === user?.id;
                  return (
                    <Card key={doc.id} data-testid={`doc-card-${doc.id}`} className="border border-card-border hover:border-primary/30 transition-all duration-200 hover:shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className={`w-11 h-11 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}><Icon className={`w-5 h-5 ${cfg.color}`} /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-sm font-semibold text-foreground leading-tight">{doc.title}</h3>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 capitalize">{cfg.label}</Badge>
                                {isOwn && <Badge variant="outline" className="text-[10px] px-2 py-0.5">Mine</Badge>}
                              </div>
                            </div>
                            {doc.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.description}</p>}
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                <span>{doc.fileSize || "—"}</span>
                                <span>·</span>
                                <span>{format(new Date(doc.createdAt), "MMM d, yyyy")}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {isOwn && (
                                  <button onClick={() => deleteDoc.mutate(doc.id)} className="text-muted-foreground hover:text-destructive p-1 transition-colors" data-testid={`delete-my-doc-${doc.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                                )}
                                <Button size="sm" variant="outline" data-testid={`download-doc-${doc.id}`} onClick={() => window.open(doc.fileUrl, "_blank")} className="h-7 px-3 text-xs gap-1.5">
                                  {doc.fileUrl.startsWith("/uploads/") ? <><Download className="w-3 h-3" /> Download</> : <><ExternalLink className="w-3 h-3" /> Open</>}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="relative max-w-xs mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input data-testid="input-search-materials" placeholder="Search materials..." value={matSearch} onChange={(e) => setMatSearch(e.target.value)} className="pl-9 h-10" />
            </div>
            {matsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}</div>
            ) : filteredMats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4"><Library className="w-8 h-8 text-primary opacity-60" /></div>
                <h3 className="text-base font-semibold text-foreground mb-1">No materials yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs">Your coach will share resources here for you to download</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMats.map((mat: any) => (
                  <Card key={mat.id} data-testid={`material-card-${mat.id}`} className="border border-card-border hover:border-primary/30 transition-all duration-200 hover:shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><Library className="w-5 h-5 text-primary" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-semibold text-foreground leading-tight">{mat.title}</h3>
                            <Badge className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary border-0 flex-shrink-0">Resource</Badge>
                          </div>
                          {mat.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{mat.description}</p>}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                              <span>{mat.fileSize || "—"}</span>
                              <span>·</span>
                              <span>{format(new Date(mat.createdAt), "MMM d, yyyy")}</span>
                            </div>
                            <Button size="sm" variant="outline" data-testid={`download-material-${mat.id}`} onClick={() => window.open(mat.fileUrl, "_blank")} className="h-7 px-3 text-xs gap-1.5">
                              {mat.fileUrl?.startsWith("/uploads/") ? <><Download className="w-3 h-3" /> Download</> : <><ExternalLink className="w-3 h-3" /> Open</>}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ClientLayout>
  );
}
