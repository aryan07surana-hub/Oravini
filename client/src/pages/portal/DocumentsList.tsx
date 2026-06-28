import PortalLayout from "./Layout";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  FolderOpen, Plus, Trash2, Link2, FileText, ArrowLeft,
  Search, X, ExternalLink, Folder
} from "lucide-react";

const GOLD = "#d4b461";
const LS_KEY = "portal_documents_v2";

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
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadFiles(): DocFile[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveFiles(files: DocFile[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(files));
}

const FILE_COLORS = [
  "#d4b461", "#3b82f6", "#22c55e", "#a855f7",
  "#f97316", "#ef4444", "#06b6d4", "#ec4899",
];

function fileColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % FILE_COLORS.length;
  return FILE_COLORS[h];
}

export default function DocumentsList() {
  const { toast } = useToast();
  const [files, setFiles] = useState<DocFile[]>(loadFiles);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docForm, setDocForm] = useState<{ name: string; type: DocType; url: string; content: string }>({
    name: "",
    type: "link",
    url: "",
    content: "",
  });

  useEffect(() => {
    saveFiles(files);
  }, [files]);

  const currentFile = files.find((f) => f.id === selectedFile) ?? null;

  function createFile() {
    if (!newFileName.trim()) return;
    const f: DocFile = {
      id: uid(),
      name: newFileName.trim(),
      docs: [],
      createdAt: new Date().toISOString(),
    };
    setFiles((prev) => [f, ...prev]);
    setNewFileName("");
    setShowNewFile(false);
    setSelectedFile(f.id);
    toast({ title: `"${f.name}" created` });
  }

  function deleteFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (selectedFile === id) setSelectedFile(null);
  }

  function addDoc() {
    if (!docForm.name.trim()) {
      toast({ title: "Document name required", variant: "destructive" });
      return;
    }
    if (docForm.type === "link" && !docForm.url.trim()) {
      toast({ title: "URL required for link type", variant: "destructive" });
      return;
    }
    const doc: Doc = {
      id: uid(),
      name: docForm.name.trim(),
      type: docForm.type,
      url: docForm.url.trim(),
      content: docForm.content.trim(),
      createdAt: new Date().toISOString(),
    };
    setFiles((prev) =>
      prev.map((f) =>
        f.id === selectedFile ? { ...f, docs: [doc, ...f.docs] } : f
      )
    );
    setDocForm({ name: "", type: "link", url: "", content: "" });
    setShowAddDoc(false);
    toast({ title: "Document added" });
  }

  function deleteDoc(fileId: string, docId: string) {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, docs: f.docs.filter((d) => d.id !== docId) } : f
      )
    );
  }

  const filteredFiles = files.filter(
    (f) => !search || f.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredDocs = currentFile
    ? currentFile.docs.filter(
        (d) =>
          !search ||
          d.name.toLowerCase().includes(search.toLowerCase()) ||
          d.url.toLowerCase().includes(search.toLowerCase()) ||
          d.content.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  if (currentFile) {
    return (
      <PortalLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedFile(null)}
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="h-4 w-px bg-border" />
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
              style={{ background: `${fileColor(currentFile.name)}22`, color: fileColor(currentFile.name) }}
            >
              {currentFile.name[0].toUpperCase()}
            </div>
            <h1 className="text-lg font-bold text-foreground flex-1">{currentFile.name}</h1>
            <span className="text-xs text-muted-foreground">{currentFile.docs.length} docs</span>
            <Button size="sm" onClick={() => setShowAddDoc(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Document
            </Button>
          </div>

          {/* Search within file */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="pl-8 h-8 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Docs list */}
          {filteredDocs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {search ? "No documents match your search" : "No documents yet. Add your first one."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="group rounded-xl border border-border bg-card p-4 flex items-start gap-3"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: doc.type === "link" ? "#3b82f622" : `${GOLD}22`,
                      color: doc.type === "link" ? "#3b82f6" : GOLD,
                    }}
                  >
                    {doc.type === "link" ? (
                      <Link2 className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">{doc.name}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {doc.type}
                      </Badge>
                    </div>
                    {doc.type === "link" && doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-0.5 transition-colors truncate"
                      >
                        {doc.url}
                        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                      </a>
                    )}
                    {doc.content && (
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed whitespace-pre-wrap">
                        {doc.content}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteDoc(currentFile.id, doc.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Document Dialog */}
        <Dialog open={showAddDoc} onOpenChange={setShowAddDoc}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Document Name *</Label>
                <Input
                  value={docForm.name}
                  onChange={(e) => setDocForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Name this document"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDocForm((f) => ({ ...f, type: "link" }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm transition-colors ${
                      docForm.type === "link"
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Link2 className="w-4 h-4" /> Link
                  </button>
                  <button
                    onClick={() => setDocForm((f) => ({ ...f, type: "text" }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm transition-colors ${
                      docForm.type === "text"
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FileText className="w-4 h-4" /> Text
                  </button>
                </div>
              </div>
              {docForm.type === "link" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">URL *</Label>
                  <Input
                    value={docForm.url}
                    onChange={(e) => setDocForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder="https://..."
                    type="url"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {docForm.type === "link" ? "Notes (optional)" : "Content *"}
                </Label>
                <Textarea
                  value={docForm.content}
                  onChange={(e) => setDocForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder={
                    docForm.type === "link" ? "Add any notes..." : "Paste or type your content..."
                  }
                  rows={4}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddDoc(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={addDoc}>
                  Add Document
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </PortalLayout>
    );
  }

  // ── File browser ──────────────────────────────────────────────────────────────
  return (
    <PortalLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FolderOpen className="w-5 h-5" style={{ color: GOLD }} />
              Documents
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {files.length} {files.length === 1 ? "file" : "files"} &middot;{" "}
              {files.reduce((acc, f) => acc + f.docs.length, 0)} total documents
            </p>
          </div>
          <Button size="sm" onClick={() => setShowNewFile(true)}>
            <Plus className="w-4 h-4 mr-1" /> New File
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="pl-8 h-8 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Files grid */}
        {filteredFiles.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Folder className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {search ? "No files match your search" : 'No files yet. Create one with "New File".'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredFiles.map((f) => {
              const color = fileColor(f.name);
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setSelectedFile(f.id);
                    setSearch("");
                  }}
                  className="group text-left rounded-xl border border-border bg-card p-4 hover:border-foreground/20 transition-all hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold transition-transform group-hover:scale-105"
                      style={{ background: `${color}22`, color }}
                    >
                      {f.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{f.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {f.docs.length} {f.docs.length === 1 ? "document" : "documents"}
                      </p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1">
                        {new Date(f.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFile(f.id);
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                    >
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
          <DialogHeader>
            <DialogTitle>New File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">File Name *</Label>
              <Input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="e.g. Strategy Docs, Books, Contracts..."
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && createFile()}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowNewFile(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={createFile}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
