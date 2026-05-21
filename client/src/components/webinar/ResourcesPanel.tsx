import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Send, FileText, Link2, Image, Presentation, Download } from "lucide-react";

const GOLD = "#d4b461";

const TYPE_ICONS: Record<string, any> = {
  link: Link2,
  pdf: FileText,
  slide: Presentation,
  image: Image,
};

interface Props {
  webinarId: string;
  wsRef: React.MutableRefObject<WebSocket | null>;
}

export function ResourcesPanel({ webinarId, wsRef }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("link");

  const { data: resources = [] } = useQuery<any[]>({
    queryKey: [`/api/webinars/${webinarId}/resources`],
  });

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/webinars/${webinarId}/resources`, { title, url, type }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/resources`] });
      setTitle("");
      setUrl("");
      toast({ title: "Resource added!" });
    },
  });

  const pushMut = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/webinars/${webinarId}/resources/${id}/push`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/resources`] });
      // Also broadcast via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const resource = resources.find((r: any) => r.id === id);
        if (resource) {
          wsRef.current.send(JSON.stringify({
            type: "wr_resource_push",
            webinarId,
            resource: { title: resource.title, url: resource.url, type: resource.type },
          }));
        }
      }
      toast({ title: "Resource pushed to all viewers!" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/webinars/${webinarId}/resources/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/resources`] }),
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Add Resource */}
      <div className="p-3 flex-shrink-0 space-y-2" style={{ borderBottom: `1px solid ${GOLD}12` }}>
        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: `${GOLD}80` }}>Share Resources</p>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Resource title" className="bg-zinc-800 border-zinc-700 text-white text-xs h-7" />
        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL (link, PDF, slide deck)" className="bg-zinc-800 border-zinc-700 text-white text-xs h-7" />
        <div className="flex gap-1">
          {(["link", "pdf", "slide", "image"] as const).map(t => {
            const Icon = TYPE_ICONS[t];
            return (
              <button key={t} onClick={() => setType(t)}
                className="flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                style={{
                  background: type === t ? `${GOLD}20` : "rgba(255,255,255,0.04)",
                  color: type === t ? GOLD : "rgba(255,255,255,0.4)",
                  border: `1px solid ${type === t ? `${GOLD}40` : "rgba(255,255,255,0.08)"}`,
                }}>
                <Icon className="w-3 h-3" /> {t}
              </button>
            );
          })}
        </div>
        <Button size="sm" onClick={() => createMut.mutate()} disabled={!title.trim() || !url.trim()}
          className="w-full h-7 text-xs font-bold" style={{ background: GOLD, color: "#000" }}>
          <Plus className="w-3 h-3 mr-1" /> Add Resource
        </Button>
      </div>

      {/* Resource List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {resources.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-7 h-7 mx-auto mb-2 text-zinc-700" />
            <p className="text-xs text-zinc-600">No resources shared</p>
            <p className="text-[10px] text-zinc-700 mt-1">Add links, PDFs, or slides to push to viewers</p>
          </div>
        ) : (
          resources.map((r: any) => {
            const Icon = TYPE_ICONS[r.type] || Link2;
            return (
              <div key={r.id} className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}12` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: GOLD }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{r.title}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{r.url}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    {r.pushedAt && (
                      <span className="text-[9px] text-green-400 font-semibold flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Shared
                      </span>
                    )}
                    {r.downloadCount > 0 && (
                      <span className="text-[9px] text-zinc-500 flex items-center gap-0.5">
                        <Download className="w-2.5 h-2.5" /> {r.downloadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" onClick={() => pushMut.mutate(r.id)}
                      className="h-5 text-[9px] gap-0.5 px-2 border-0 font-bold"
                      style={{ background: r.pushedAt ? "rgba(52,211,153,0.15)" : `${GOLD}20`, color: r.pushedAt ? "#34d399" : GOLD }}>
                      <Send className="w-2.5 h-2.5" /> {r.pushedAt ? "Re-push" : "Push"}
                    </Button>
                    <button onClick={() => deleteMut.mutate(r.id)} className="p-1 text-zinc-600 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
