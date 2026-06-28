import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SuperAdminLayout from "./Layout";
import { Upload, X, ZoomIn, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const GOLD = "#d4b461";

const CATEGORIES = ["Quotes", "Consulting", "Must Reads"] as const;
type Category = typeof CATEGORIES[number];

interface InspirationImage {
  id: string;
  category: string;
  url: string;
  caption: string;
  created_at: string;
}

async function fetchImages(): Promise<InspirationImage[]> {
  const r = await fetch("/api/super-admin/inspiration", { credentials: "include" });
  if (!r.ok) throw new Error("Failed to load");
  return r.json();
}

async function uploadImage(formData: FormData): Promise<InspirationImage> {
  const r = await fetch("/api/super-admin/inspiration", {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!r.ok) throw new Error("Upload failed");
  return r.json();
}

async function deleteImage(id: string): Promise<void> {
  const r = await fetch(`/api/super-admin/inspiration/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!r.ok) throw new Error("Delete failed");
}

export default function Inspiration() {
  const qc = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<Category>("Quotes");
  const [lightbox, setLightbox] = useState<InspirationImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["inspiration-images"],
    queryFn: fetchImages,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadImage,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspiration-images"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteImage,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspiration-images"] }),
  });

  const filtered = images.filter(img => img.category === activeCategory);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("category", activeCategory);
      await uploadMutation.mutateAsync(fd);
    }
    setUploading(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  return (
    <SuperAdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: GOLD }}>Inspiration Board</p>
          <h1 className="text-3xl font-black text-foreground mt-1">Visual Library</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload images that fuel your mindset, strategy, and vision.</p>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all border"
              style={activeCategory === cat
                ? { background: GOLD, color: "#0a0910", borderColor: GOLD }
                : { borderColor: "var(--border)", color: "var(--muted-foreground)", background: "transparent" }}
            >
              {cat}
              {images.filter(i => i.category === cat).length > 0 && (
                <span className="ml-2 text-xs opacity-70">
                  {images.filter(i => i.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Upload zone */}
        <div
          className="rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors hover:border-opacity-80"
          style={{ borderColor: `${GOLD}50`, background: `${GOLD}05` }}
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          <Upload className="w-6 h-6 mx-auto mb-2" style={{ color: GOLD }} />
          <p className="text-sm font-semibold text-foreground">
            {uploading ? "Uploading..." : "Drop images here or click to upload"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Uploading to <span style={{ color: GOLD }}>{activeCategory}</span> · JPG, PNG, GIF, WebP · max 20MB
          </p>
        </div>

        {/* Image grid */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-square rounded-xl bg-card animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">No images yet in {activeCategory}.</p>
            <p className="text-xs text-muted-foreground mt-1">Upload some to get started.</p>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 gap-3 space-y-3">
            {filtered.map(img => (
              <div
                key={img.id}
                className="relative group rounded-xl overflow-hidden break-inside-avoid cursor-pointer"
                style={{ border: "1px solid var(--border)" }}
              >
                <img
                  src={img.url}
                  alt={img.caption || img.category}
                  className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Overlay */}
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
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img
            src={lightbox.url}
            alt={lightbox.caption || lightbox.category}
            className="max-w-full max-h-[90vh] object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
          {lightbox.caption && (
            <p className="absolute bottom-6 left-0 right-0 text-center text-sm text-white/70">{lightbox.caption}</p>
          )}
        </div>
      )}
    </SuperAdminLayout>
  );
}
