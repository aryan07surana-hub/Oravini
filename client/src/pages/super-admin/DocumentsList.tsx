import SuperAdminLayout from "./Layout";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FolderOpen, Plus, Trash2, Link2, FileText, ArrowLeft,
  Search, X, ExternalLink, Folder, Folders, RefreshCw, Download, Upload,
} from "lucide-react";

const GOLD = "#d4b461";
const LS_KEY = "super_admin_documents_v1";
const LS_MIGRATED_KEY = "super_admin_docs_migrated_v1";

type DocType = "link" | "text";

interface Doc {
  id: string;
  name: string;
  type: DocType;
  url: string;
  content: string;
  createdAt: string;
}

interface DocFile {
  id: string;
  name: string;
  docs: Doc[];
  createdAt: string;
  parentId?: string | null;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const FILE_COLORS = ["#d4b461","#3b82f6","#22c55e","#a855f7","#f97316","#ef4444","#06b6d4","#ec4899"];
function fileColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % FILE_COLORS.length;
  return FILE_COLORS[h];
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function DocumentsList() {
  const { toast } = useToast();
  const [files, setFiles] = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSuper, setSelectedSuper] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  const [showNewSuper, setShowNewSuper] = useState(false);
  const [newSuperName, setNewSuperName] = useState("");
  const [selectedForSuper, setSelectedForSuper] = useState<string[]>([]);

  const [showAddDoc, setShowAddDoc] = useState(false);
  const [importing, setImporting] = useState(false);
  const [docForm, setDocForm] = useState<{ name: string; type: DocType; url: string; content: string }>({
    name: "", type: "link", url: "", content: "",
  });

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/super-admin/doc-files");
      setFiles(data);
    } catch (e: any) {
      toast({ title: "Failed to load documents", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // On mount: migrate localStorage data then load from server
  useEffect(() => {
    async function init() {
      const alreadyMigrated = localStorage.getItem(LS_MIGRATED_KEY);
      if (!alreadyMigrated) {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          try {
            const localData = JSON.parse(raw);
            if (Array.isArray(localData) && localData.length > 0) {
              await apiFetch("/api/super-admin/doc-files/bulk-import", {
                method: "POST",
                body: JSON.stringify(localData),
              });
              toast({ title: `Recovered ${localData.length} file(s) from local storage` });
            }
          } catch {
            // silently skip if migration fails
          }
        }
        localStorage.setItem(LS_MIGRATED_KEY, "1");
      }
      await loadFiles();
    }
    init();
  }, [loadFiles, toast]);

  const currentSuper = files.find((f) => f.id === selectedSuper) ?? null;
  const currentFile = files.find((f) => f.id === selectedFile) ?? null;

  async function createFile() {
    if (!newFileName.trim()) return;
    const id = uid();
    try {
      const f: DocFile = await apiFetch("/api/super-admin/doc-files", {
        method: "POST",
        body: JSON.stringify({ id, name: newFileName.trim(), parentId: selectedSuper ?? null }),
      });
      setFiles((prev) => [f, ...prev]);
      setNewFileName("");
      setShowNewFile(false);
      setSelectedFile(f.id);
      toast({ title: `"${f.name}" created` });
    } catch (e: any) {
      toast({ title: "Failed to create file", description: e.message, variant: "destructive" });
    }
  }

  async function createSuperFile() {
    if (!newSuperName.trim()) return;
    const id = uid();
    try {
      const superFile: DocFile = await apiFetch("/api/super-admin/doc-files", {
        method: "POST",
        body: JSON.stringify({ id, name: newSuperName.trim(), parentId: null }),
      });
      // reparent selected files
      await Promise.all(
        selectedForSuper.map((fid) =>
          apiFetch(`/api/super-admin/doc-files/${fid}`, {
            method: "PATCH",
            body: JSON.stringify({ parentId: id }),
          })
        )
      );
      await loadFiles();
      setNewSuperName("");
      setSelectedForSuper([]);
      setShowNewSuper(false);
      toast({ title: `"${superFile.name}" created with ${selectedForSuper.length} file(s)` });
    } catch (e: any) {
      toast({ title: "Failed to create super file", description: e.message, variant: "destructive" });
    }
  }

  async function deleteFile(id: string) {
    try {
      await apiFetch(`/api/super-admin/doc-files/${id}`, { method: "DELETE" });
      setFiles((prev) => prev.filter((f) => f.id !== id).map((f) => f.parentId === id ? { ...f, parentId: null } : f));
      if (selectedFile === id) setSelectedFile(null);
      if (selectedSuper === id) setSelectedSuper(null);
    } catch (e: any) {
      toast({ title: "Failed to delete", description: e.message, variant: "destructive" });
    }
  }

  async function addDoc() {
    if (!docForm.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    if (docForm.type === "link" && !docForm.url.trim()) { toast({ title: "URL required", variant: "destructive" }); return; }
    const id = uid();
    try {
      const doc: Doc = await apiFetch(`/api/super-admin/doc-files/${selectedFile}/docs`, {
        method: "POST",
        body: JSON.stringify({ id, ...docForm }),
      });
      setFiles((prev) => prev.map((f) => f.id === selectedFile ? { ...f, docs: [doc, ...f.docs] } : f));
      setDocForm({ name: "", type: "link", url: "", content: "" });
      setShowAddDoc(false);
      toast({ title: "Document added" });
    } catch (e: any) {
      toast({ title: "Failed to add document", description: e.message, variant: "destructive" });
    }
  }

  function saveFilesToDisk() {
    const blob = new Blob([JSON.stringify(files, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oravini-docs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Saved ${files.length} file(s) to disk` });
  }

  async function importFromDisk(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("Invalid format");
      await apiFetch("/api/super-admin/doc-files/bulk-import", {
        method: "POST",
        body: JSON.stringify(data),
      });
      await loadFiles();
      toast({ title: `Imported ${data.length} file(s)` });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  async function deleteDoc(docId: string, fileId: string) {
    try {
      await apiFetch(`/api/super-admin/docs/${docId}`, { method: "DELETE" });
      setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, docs: f.docs.filter((d) => d.id !== docId) } : f));
    } catch (e: any) {
      toast({ title: "Failed to delete document", description: e.message, variant: "destructive" });
    }
  }

  // ── Doc view ─────────────────────────────────────────────────────────────────
  if (currentFile) {
    const filteredDocs = currentFile.docs.filter(
      (d) => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.url.toLowerCase().includes(search.toLowerCase()) || d.content.toLowerCase().includes(search.toLowerCase())
    );
    const parentSuper = currentFile.parentId ? files.find((f) => f.id === currentFile.parentId) : null;

    return (
      <SuperAdminLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelectedFile(null); if (currentFile.parentId) setSelectedSuper(currentFile.parentId); }}
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="h-4 w-px bg-border" />
            {parentSuper && (
              <>
                <button
                  onClick={() => { setSelectedFile(null); setSelectedSuper(parentSuper.id); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {parentSuper.name}
                </button>
                <span className="text-muted-foreground text-xs">/</span>
              </>
            )}
            <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold" style={{ background: `${fileColor(currentFile.name)}22`, color: fileColor(currentFile.name) }}>
              {currentFile.name[0].toUpperCase()}
            </div>
            <h1 className="text-lg font-bold text-foreground flex-1">{currentFile.name}</h1>
            <span className="text-xs text-muted-foreground">{currentFile.docs.length} docs</span>
            <Button size="sm" onClick={() => setShowAddDoc(true)}><Plus className="w-4 h-4 mr-1" /> Add Document</Button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents..." className="pl-8 h-8 text-sm" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
          </div>

          {filteredDocs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{search ? "No documents match" : "No documents yet. Add your first one."}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocs.map((doc) => (
                <div key={doc.id} className="group rounded-xl border border-border bg-card p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: doc.type === "link" ? "#3b82f622" : `${GOLD}22`, color: doc.type === "link" ? "#3b82f6" : GOLD }}>
                    {doc.type === "link" ? <Link2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">{doc.name}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{doc.type}</Badge>
                    </div>
                    {doc.type === "link" && doc.url && (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-0.5 transition-colors truncate">
                        {doc.url} <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                      </a>
                    )}
                    {doc.content && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed whitespace-pre-wrap">{doc.content}</p>}
                    <p className="text-[10px] text-muted-foreground/50 mt-1.5">{new Date(doc.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => deleteDoc(doc.id, currentFile.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Dialog open={showAddDoc} onOpenChange={setShowAddDoc}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Document Name *</Label>
                <Input value={docForm.name} onChange={(e) => setDocForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name this document" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <div className="flex gap-2">
                  {(["link", "text"] as DocType[]).map((t) => (
                    <button key={t} onClick={() => setDocForm((f) => ({ ...f, type: t }))} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm transition-colors ${docForm.type === t ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:text-foreground"}`}>
                      {t === "link" ? <Link2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {docForm.type === "link" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">URL *</Label>
                  <Input value={docForm.url} onChange={(e) => setDocForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." type="url" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">{docForm.type === "link" ? "Notes (optional)" : "Content *"}</Label>
                <Textarea value={docForm.content} onChange={(e) => setDocForm((f) => ({ ...f, content: e.target.value }))} placeholder={docForm.type === "link" ? "Add notes..." : "Paste or type content..."} rows={4} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddDoc(false)}>Cancel</Button>
                <Button className="flex-1" onClick={addDoc}>Add Document</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </SuperAdminLayout>
    );
  }

  // ── Super file view ──────────────────────────────────────────────────────────
  if (currentSuper) {
    const childFiles = files.filter((f) => f.parentId === currentSuper.id);
    const filteredChildren = childFiles.filter(
      (f) => !search || f.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <SuperAdminLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => { setSelectedSuper(null); setSearch(""); }} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="h-4 w-px bg-border" />
            <Folders className="w-5 h-5" style={{ color: fileColor(currentSuper.name) }} />
            <h1 className="text-lg font-bold text-foreground flex-1">{currentSuper.name}</h1>
            <span className="text-xs text-muted-foreground">{childFiles.length} files</span>
            <Button size="sm" onClick={() => setShowNewFile(true)}><Plus className="w-4 h-4 mr-1" /> New File</Button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files..." className="pl-8 h-8 text-sm" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
          </div>

          {filteredChildren.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Folder className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{search ? "No files match" : 'No files yet. Add one with "New File".'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredChildren.map((f) => {
                const color = fileColor(f.name);
                return (
                  <button key={f.id} onClick={() => { setSelectedFile(f.id); setSearch(""); }} className="group text-left rounded-xl border border-border bg-card p-4 hover:border-foreground/20 transition-all hover:shadow-md">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold transition-transform group-hover:scale-105" style={{ background: `${color}22`, color }}>
                        {f.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{f.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{f.docs.length} {f.docs.length === 1 ? "document" : "documents"}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1">{new Date(f.createdAt).toLocaleDateString()}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteFile(f.id); }} className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Dialog open={showNewFile} onOpenChange={setShowNewFile}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>New File in "{currentSuper.name}"</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">File Name *</Label>
                <Input value={newFileName} onChange={(e) => setNewFileName(e.target.value)} placeholder="e.g. Strategy Docs, Books, Contracts..." autoFocus onKeyDown={(e) => e.key === "Enter" && createFile()} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowNewFile(false)}>Cancel</Button>
                <Button className="flex-1" onClick={createFile}>Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </SuperAdminLayout>
    );
  }

  // ── Root view ────────────────────────────────────────────────────────────────
  const rootItems = files.filter((f) => !f.parentId);
  const filteredRoot = rootItems.filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()));
  const movableFiles = files.filter((f) => !f.parentId);

  return (
    <SuperAdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FolderOpen className="w-5 h-5" style={{ color: GOLD }} /> Documents
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {rootItems.length} {rootItems.length === 1 ? "item" : "items"} &middot; {files.reduce((a, f) => a + f.docs.length, 0)} total docs
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={loadFiles} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" variant="outline" onClick={saveFilesToDisk} disabled={files.length === 0}>
              <Download className="w-4 h-4 mr-1" /> Save Files
            </Button>
            <label>
              <Button size="sm" variant="outline" asChild disabled={importing}>
                <span className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-1" /> {importing ? "Importing..." : "Import"}
                </span>
              </Button>
              <input type="file" accept=".json" className="hidden" onChange={importFromDisk} />
            </label>
            <Button size="sm" variant="outline" onClick={() => { setSelectedForSuper([]); setShowNewSuper(true); }}>
              <Folders className="w-4 h-4 mr-1" /> New Super File
            </Button>
            <Button size="sm" onClick={() => setShowNewFile(true)}><Plus className="w-4 h-4 mr-1" /> New File</Button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files..." className="pl-8 h-8 text-sm" />
          {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin opacity-30" />
            <p className="text-sm">Loading documents...</p>
          </div>
        ) : filteredRoot.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Folder className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{search ? "No files match" : 'No files yet. Create one with "New File".'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredRoot.map((f) => {
              const color = fileColor(f.name);
              const childFiles = files.filter((c) => c.parentId === f.id);
              const isSuper = childFiles.length > 0;
              return (
                <button
                  key={f.id}
                  onClick={() => { setSearch(""); isSuper ? setSelectedSuper(f.id) : setSelectedFile(f.id); }}
                  className="group text-left rounded-xl border border-border bg-card p-4 hover:border-foreground/20 transition-all hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105" style={{ background: `${color}22`, color }}>
                      {isSuper ? <Folders className="w-5 h-5" /> : <span className="text-lg font-bold">{f.name[0].toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm text-foreground truncate">{f.name}</p>
                        {isSuper && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0" style={{ borderColor: color, color }}>super</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isSuper
                          ? `${childFiles.length} ${childFiles.length === 1 ? "file" : "files"}`
                          : `${f.docs.length} ${f.docs.length === 1 ? "document" : "documents"}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1">{new Date(f.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteFile(f.id); }} className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* New File Dialog */}
      <Dialog open={showNewFile} onOpenChange={setShowNewFile}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>New File</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">File Name *</Label>
              <Input value={newFileName} onChange={(e) => setNewFileName(e.target.value)} placeholder="e.g. Strategy Docs, Books, Contracts..." autoFocus onKeyDown={(e) => e.key === "Enter" && createFile()} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowNewFile(false)}>Cancel</Button>
              <Button className="flex-1" onClick={createFile}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Super File Dialog */}
      <Dialog open={showNewSuper} onOpenChange={setShowNewSuper}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>New Super File</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Super File Name *</Label>
              <Input value={newSuperName} onChange={(e) => setNewSuperName(e.target.value)} placeholder="e.g. Oravini Docs, Client Files..." autoFocus onKeyDown={(e) => e.key === "Enter" && createSuperFile()} />
            </div>
            {movableFiles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Add existing files (optional)</Label>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {movableFiles.map((f) => (
                    <label key={f.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                      <Checkbox
                        checked={selectedForSuper.includes(f.id)}
                        onCheckedChange={(checked) => {
                          setSelectedForSuper((prev) =>
                            checked ? [...prev, f.id] : prev.filter((id) => id !== f.id)
                          );
                        }}
                      />
                      <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: `${fileColor(f.name)}22`, color: fileColor(f.name) }}>
                        {f.name[0].toUpperCase()}
                      </div>
                      <span className="text-sm text-foreground flex-1 truncate">{f.name}</span>
                      <span className="text-[10px] text-muted-foreground">{f.docs.length} docs</span>
                    </label>
                  ))}
                </div>
                {selectedForSuper.length > 0 && (
                  <p className="text-xs text-muted-foreground">{selectedForSuper.length} file(s) selected</p>
                )}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowNewSuper(false)}>Cancel</Button>
              <Button className="flex-1" onClick={createSuperFile}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
