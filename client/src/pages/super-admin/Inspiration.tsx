import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SuperAdminLayout from "./Layout";
import { Upload, X, ZoomIn, Trash2, Plus, Pencil, Check, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const GOLD = "#d4b461";
const DEFAULT_CATEGORIES = ["Quotes", "Consulting", "Must Reads"];
const CATEGORIES_KEY = "sa_inspiration_categories";

function loadCategories(): string[] {
  try {
    const v = localStorage.getItem(CATEGORIES_KEY);
    return v ? JSON.parse(v) : DEFAULT_CATEGORIES;
  } catch { return DEFAULT_CATEGORIES; }
}
function saveCategories(cats: string[]) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
}

interface InspirationImage {
  id: string;
  category: string;
  url: string;
  filename: string;
  caption: string;
  created_at: string;
}

async function fetchImages(): Promise<InspirationImage[]> {
  const r = await fetch("/api/super-admin/inspiration", { credentials: "include" });
  if (!r.ok) throw new Error("Failed to load");
  return r.json();
}
async function uploadFile(formData: FormData): Promise<InspirationImage> {
  const r = await fetch("/api/super-admin/inspiration", { method: "POST", credentials: "include", body: formData });
  if (!r.ok) throw new Error("Upload failed");
  return r.json();
}
async function deleteImage(id: string) {
  const r = await fetch(`/api/super-admin/inspiration/${id}`, { method: "DELETE", credentials: "include" });
  if (!r.ok) throw new Error("Delete failed");
}
async function renameCategory(oldName: string, newName: string) {
  const r = await fetch("/api/super-admin/inspiration/rename-category", {
    method: "PATCH", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oldName, newName }),
  });
  if (!r.ok) throw new Error("Rename failed");
}

function isPdf(url: string) {
  return url.toLowerCase().endsWith(".pdf");
}

export default function Inspiration() {
  const qc = useQueryClient();
  const [categories, setCategories] = useState<string[]>(loadCategories);
  const [activeCategory, setActiveCategory] = useState<string>(loadCategories()[0] ?? "Quotes");
  const [lightbox, setLightbox] = useState<InspirationImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: images = [], isLoading } = useQuery({ queryKey: ["inspiration-images"], queryFn: fetchImages });

  const uploadMutation = useMutation({ mutationFn: uploadFile, onSuccess: () => qc.invalidateQueries({ queryKey: ["inspiration-images"] }) });
  const deleteMutation = useMutation({ mutationFn: deleteImage, onSuccess: () => qc.invalidateQueries({ queryKey: ["inspiration-images"] }) });
  const renameMutation = useMutation({ mutationFn: ({ o, n }: { o: string; n: string }) => renameCategory(o, n), onSuccess: () => qc.invalidateQueries({ queryKey: ["inspiration-images"] }) });

  const filtered = images.filter(img => img.category === activeCategory);

  const lightboxIndex = lightbox ? filtered.findIndex(i => i.id === lightbox.id) : -1;

  const goNext = useCallback(() => {
    if (lightboxIndex < 0 || filtered.length === 0) return;
    setLightbox(filtered[(lightboxIndex + 1) % filtered.length]);
  }, [lightboxIndex, filtered]);

  const goPrev = useCallback(() => {
    if (lightboxIndex < 0 || filtered.length === 0) return;
    setLightbox(filtered[(lightboxIndex - 1 + filtered.length) % filtered.length]);
  }, [lightboxIndex, filtered]);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") setLightbox(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, goNext, goPrev]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("category", activeCategory);
      await uploadMutation.mutateAsync(fd).catch(() => null);
    }
    setUploading(false);
  }

  function addCategory() {
    const name = newCatName.trim();
    if (!name || categories.includes(name)) return;
    const updated = [...categories, name];
    setCategories(updated);
    saveCategories(updated);
    setActiveCategory(name);
    setNewCatName("");
    setAddingCat(false);
  }

  function commitRename() {
    const name = renameDraft.trim();
    if (!name || !renamingCat || name === renamingCat) { setRenamingCat(null); return; }
    const updated = categories.map(c => c === renamingCat ? name : c);
    setCategories(updated);
    saveCategories(updated);
    if (activeCategory === renamingCat) setActiveCategory(name);
    renameMutation.mutate({ o: renamingCat, n: name });
    setRenamingCat(null);
  }

  function removeCategory(cat: string) {
    const hasImages = images.some(i => i.category === cat);
    if (hasImages) { alert(`Delete all images in "${cat}" first.`); return; }
    const updated = categories.filter(c => c !== cat);
    setCategories(updated);
    saveCategories(updated);
    if (activeCategory === cat) setActiveCategory(updated[0] ?? "");
  }

  return (
    <SuperAdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: GOLD }}>Inspiration Board</p>
          <h1 className="text-3xl font-black text-foreground mt-1">Visual Library</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload images and PDFs that fuel your mindset, strategy, and vision.</p>
        </div>

        {/* Category tabs */}
        <div className="flex items-center flex-wrap gap-2">
          {categories.map(cat => (
            <div key={cat} className="flex items-center gap-1 group">
              {renamingCat === cat ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={renameDraft}
                    onChange={e => setRenameDraft(e.target.value)}
                    className="h-8 text-sm w-32"
                    autoFocus
                    onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingCat(null); }}
                  />
                  <button onClick={commitRename} className="text-green-400 p-1"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setRenamingCat(null)} className="text-muted-foreground p-1"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <button
                  onClick={() => setActiveCategory(cat)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all border flex items-center gap-2"
                  style={activeCategory === cat
                    ? { background: GOLD, color: "#0a0910", borderColor: GOLD }
                    : { borderColor: "var(--border)", color: "var(--muted-foreground)", background: "transparent" }}
                >
                  {cat}
                  {images.filter(i => i.category === cat).length > 0 && (
                    <span className="text-xs opacity-60">{images.filter(i => i.category === cat).length}</span>
                  )}
                </button>
              )}

              {/* Edit/delete icons — show on hover */}
              {renamingCat !== cat && (
                <div className="hidden group-hover:flex items-center gap-0.5">
                  <button
                    onClick={() => { setRenamingCat(cat); setRenameDraft(cat); }}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Rename"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeCategory(cat)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete category"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Add category */}
          {addingCat ? (
            <div className="flex items-center gap-1">
              <Input
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Category name..."
                className="h-8 text-sm w-36"
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") addCategory(); if (e.key === "Escape") { setAddingCat(false); setNewCatName(""); } }}
              />
              <button onClick={addCategory} className="text-green-400 p-1"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => { setAddingCat(false); setNewCatName(""); }} className="text-muted-foreground p-1"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button
              onClick={() => setAddingCat(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-dashed text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
              style={{ borderColor: `${GOLD}40` }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add section
            </button>
          )}
        </div>

        {/* Upload zone */}
        <div
          className="rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors hover:border-opacity-80"
          style={{ borderColor: `${GOLD}50`, background: `${GOLD}05` }}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          <Upload className="w-6 h-6 mx-auto mb-2" style={{ color: GOLD }} />
          <p className="text-sm font-semibold text-foreground">
            {uploading ? "Uploading..." : "Drop files here or click to upload"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Adding to <span style={{ color: GOLD }}>{activeCategory}</span> · Images &amp; PDFs · max 50MB
          </p>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-square rounded-xl bg-card animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">No files yet in {activeCategory}.</p>
            <p className="text-xs text-muted-foreground mt-1">Upload images or PDFs to get started.</p>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 gap-3 space-y-3">
            {filtered.map(img => (
              <div
                key={img.id}
                className="relative group rounded-xl overflow-hidden break-inside-avoid cursor-pointer"
                style={{ border: "1px solid var(--border)" }}
              >
                {isPdf(img.url) ? (
                  <div
                    className="w-full flex flex-col items-center justify-center bg-card py-8 gap-2"
                    onClick={() => setLightbox(img)}
                  >
                    <FileText className="w-10 h-10" style={{ color: GOLD }} />
                    <p className="text-xs text-muted-foreground text-center px-3 leading-snug">
                      {img.filename.replace(/^inspiration-\d+-\d+-/, "")}
                    </p>
                  </div>
                ) : (
                  <img
                    src={img.url}
                    alt={img.caption || img.category}
                    className="w-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                    loading="lazy"
                    onClick={() => setLightbox(img)}
                  />
                )}

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => setLightbox(img)}
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
                  >
                    <ZoomIn className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(img.id)}
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-red-500/80 backdrop-blur-sm hover:bg-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          {/* Close */}
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Counter */}
          {filtered.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium z-10">
              {lightboxIndex + 1} / {filtered.length}
            </div>
          )}

          {/* Prev */}
          {filtered.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); goPrev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors z-10"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Next */}
          {filtered.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); goNext(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors z-10"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}

          {isPdf(lightbox.url) ? (
            <iframe
              src={lightbox.url}
              className="w-full max-w-4xl h-[90vh] rounded-xl"
              onClick={e => e.stopPropagation()}
              title="PDF viewer"
            />
          ) : (
            <img
              src={lightbox.url}
              alt={lightbox.caption || lightbox.category}
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
              onClick={e => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </SuperAdminLayout>
  );
}
