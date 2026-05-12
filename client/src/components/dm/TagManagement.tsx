import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tag, Plus, X, Hash } from "lucide-react";

export function TagManager({ leadId, clientId }: { leadId: string; clientId: string }) {
  const { toast } = useToast();
  const [newTag, setNewTag] = useState("");

  const { data: allTags = [] } = useQuery<any[]>({
    queryKey: ["/api/dm/contact-tags"],
    queryFn: () => fetch("/api/dm/contact-tags").then(r => r.json()),
  });

  const leadTags = allTags.filter((t: any) => t.leadId === leadId);
  const uniqueAllTags = Array.from(new Set(allTags.map((t: any) => t.tag)));

  const addTagMutation = useMutation({
    mutationFn: (tag: string) => apiRequest("POST", "/api/dm/contact-tags", { leadId, tag }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/contact-tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dm/leads"] });
      setNewTag("");
      toast({ title: "Tag added!" });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: (tagId: string) => apiRequest("DELETE", `/api/dm/contact-tags/${tagId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/contact-tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dm/leads"] });
      toast({ title: "Tag removed" });
    },
  });

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (!tag) return;
    if (leadTags.some((t: any) => t.tag === tag)) {
      return toast({ title: "Tag already exists", variant: "destructive" });
    }
    addTagMutation.mutate(tag);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-primary" />
        <p className="text-xs font-semibold text-foreground">Tags</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {leadTags.map((tag: any) => (
          <Badge key={tag.id} variant="secondary" className="gap-1.5 pr-1">
            <Hash className="w-2.5 h-2.5" />
            {tag.tag}
            <button
              onClick={() => removeTagMutation.mutate(tag.id)}
              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </Badge>
        ))}
        {leadTags.length === 0 && (
          <p className="text-xs text-muted-foreground">No tags yet</p>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={newTag}
          onChange={e => setNewTag(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addTag()}
          placeholder="Add tag..."
          className="h-8 text-xs"
        />
        <Button
          onClick={addTag}
          disabled={!newTag.trim() || addTagMutation.isPending}
          size="sm"
          className="gap-1.5 h-8"
        >
          <Plus className="w-3 h-3" />
          Add
        </Button>
      </div>

      {uniqueAllTags.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground mb-2">Quick add:</p>
          <div className="flex flex-wrap gap-1.5">
            {uniqueAllTags.slice(0, 5).map((tag: any) => (
              <button
                key={tag}
                onClick={() => {
                  if (!leadTags.some((t: any) => t.tag === tag)) {
                    addTagMutation.mutate(tag);
                  }
                }}
                disabled={leadTags.some((t: any) => t.tag === tag)}
                className="px-2 py-1 rounded-md text-[10px] bg-muted hover:bg-muted/80 text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TagFilter({ value, onChange, clientId }: { value: string; onChange: (tag: string) => void; clientId: string }) {
  const { data: allTags = [] } = useQuery<any[]>({
    queryKey: ["/api/dm/contact-tags"],
    queryFn: () => fetch("/api/dm/contact-tags").then(r => r.json()),
  });

  const uniqueTags = Array.from(new Set(allTags.map((t: any) => t.tag)));

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => onChange("")}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          value === "" 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        }`}
      >
        All
      </button>
      {uniqueTags.map((tag: any) => (
        <button
          key={tag}
          onClick={() => onChange(tag)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
            value === tag 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Hash className="w-2.5 h-2.5" />
          {tag}
        </button>
      ))}
    </div>
  );
}
