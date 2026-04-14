import { useState } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Instagram, Plus, Trash2, Play, Loader2, CheckCircle2,
  AlertCircle, Cookie, MessageSquare, Link, ChevronRight, RefreshCw,
  Clock, Info, ExternalLink
} from "lucide-react";
import { format } from "date-fns";

function statusBadge(status: string | null) {
  if (!status || status === "idle") return <Badge variant="outline" className="text-[10px]">Idle</Badge>;
  if (status === "running") return <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Running…</Badge>;
  if (status === "done") return <Badge className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Done</Badge>;
  if (status === "failed") return <Badge className="text-[10px] bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
  return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
}

export default function IgCommentBot() {
  const { toast } = useToast();

  // ── Cookie state ───────────────────────────────────────────────────────────
  const [cookieDialogOpen, setCookieDialogOpen] = useState(false);
  const [cookieInput, setCookieInput] = useState("");

  const { data: cookieStatus } = useQuery<{ configured: boolean; updatedAt?: string }>({
    queryKey: ["/api/ig-bot/cookies"],
  });

  const saveCookies = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ig-bot/cookies", { cookiesJson: cookieInput }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ig-bot/cookies"] });
      setCookieDialogOpen(false);
      setCookieInput("");
      toast({ title: "Cookies saved", description: "Your Instagram session is now active." });
    },
    onError: (e: any) => toast({ title: "Invalid cookies", description: e.message, variant: "destructive" }),
  });

  // ── Campaign state ──────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [urlsInput, setUrlsInput] = useState("");
  const [commentsInput, setCommentsInput] = useState("");
  const [runningId, setRunningId] = useState<number | null>(null);

  const { data: campaigns = [] } = useQuery<any[]>({ queryKey: ["/api/ig-bot/campaigns"] });

  const createCampaign = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ig-bot/campaigns", {
      name: campaignName.trim(),
      postUrls: urlsInput.split("\n").map(u => u.trim()).filter(Boolean),
      comments: commentsInput.split("\n").map(c => c.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ig-bot/campaigns"] });
      setCreateOpen(false);
      setCampaignName(""); setUrlsInput(""); setCommentsInput("");
      toast({ title: "Campaign created" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteCampaign = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/ig-bot/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ig-bot/campaigns"] });
      toast({ title: "Campaign deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  async function runCampaign(id: number) {
    if (!cookieStatus?.configured) {
      toast({ title: "No session", description: "Add your Instagram cookies first.", variant: "destructive" });
      return;
    }
    setRunningId(id);
    queryClient.setQueryData(["/api/ig-bot/campaigns"], (prev: any[]) =>
      prev.map(c => c.id === id ? { ...c, status: "running" } : c)
    );
    try {
      const result = await apiRequest("POST", `/api/ig-bot/campaigns/${id}/run`);
      queryClient.invalidateQueries({ queryKey: ["/api/ig-bot/campaigns"] });
      toast({ title: "Bot finished!", description: `${result.resultCount ?? 0} comments posted successfully.` });
    } catch (e: any) {
      queryClient.invalidateQueries({ queryKey: ["/api/ig-bot/campaigns"] });
      toast({ title: "Run failed", description: e.message, variant: "destructive" });
    } finally {
      setRunningId(null);
    }
  }

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-pink-500/10 rounded-xl flex items-center justify-center">
            <Instagram className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Instagram Comment Bot</h1>
            <p className="text-xs text-muted-foreground">Auto-comment on posts & reels via Apify</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              data-testid="button-manage-cookies"
              onClick={() => setCookieDialogOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                cookieStatus?.configured
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-pink-500/10 text-pink-400 border-pink-500/30 hover:bg-pink-500/20"
              }`}
            >
              <Cookie className="w-3.5 h-3.5" />
              {cookieStatus?.configured ? "Session Active" : "Add Session Cookies"}
            </button>
            <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="button-create-campaign">
              <Plus className="w-4 h-4 mr-1.5" /> New Campaign
            </Button>
          </div>
        </div>

        {/* Warning banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-300">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>Use responsibly. Instagram may flag excessive automated commenting. We recommend keeping comments varied and posting in small batches.</span>
        </div>

        {/* Cookie status card */}
        <Card className="border border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Cookie className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Instagram Session</p>
                {cookieStatus?.configured
                  ? <p className="text-xs text-muted-foreground">Last updated: {cookieStatus.updatedAt ? format(new Date(cookieStatus.updatedAt), "MMM d, yyyy 'at' h:mm a") : "–"}</p>
                  : <p className="text-xs text-muted-foreground">No cookies saved yet. Add your Instagram session cookies to enable the bot.</p>
                }
              </div>
              {cookieStatus?.configured
                ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              }
            </div>
          </CardContent>
        </Card>

        {/* Campaigns */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Campaigns ({campaigns.length})</p>
          {campaigns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No campaigns yet — create one to start commenting on posts automatically.</p>
              <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)} data-testid="button-empty-create">
                <Plus className="w-4 h-4 mr-1.5" /> Create Campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c: any) => (
                <Card key={c.id} data-testid={`campaign-card-${c.id}`} className="border border-card-border">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-foreground truncate">{c.name}</span>
                          {statusBadge(c.status)}
                          {c.resultCount != null && c.status === "done" && (
                            <span className="text-[10px] text-emerald-400 font-semibold">{c.resultCount} commented</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Link className="w-3 h-3" />{c.postUrls?.length ?? 0} posts</span>
                          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{c.comments?.length ?? 0} comment variants</span>
                          {c.lastRunAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Last run {format(new Date(c.lastRunAt), "MMM d")}</span>}
                        </div>
                        {c.status === "failed" && c.errorMsg && (
                          <p className="text-[11px] text-red-400 mt-1.5 line-clamp-2">{c.errorMsg}</p>
                        )}
                        {/* Post URLs preview */}
                        {c.postUrls?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {c.postUrls.slice(0, 3).map((url: string, i: number) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1 text-[10px] text-pink-400 hover:text-pink-300 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20 transition-colors">
                                <ExternalLink className="w-2.5 h-2.5" />
                                {url.replace("https://www.instagram.com/", "").replace(/\/$/, "").slice(0, 30)}
                              </a>
                            ))}
                            {c.postUrls.length > 3 && (
                              <span className="text-[10px] text-muted-foreground px-2 py-0.5">+{c.postUrls.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button
                          size="sm"
                          data-testid={`button-run-campaign-${c.id}`}
                          disabled={runningId === c.id || c.status === "running"}
                          onClick={() => runCampaign(c.id)}
                          className="gap-1.5 bg-pink-500/15 text-pink-400 border border-pink-500/30 hover:bg-pink-500/25 h-8 px-3"
                          variant="outline"
                        >
                          {runningId === c.id || c.status === "running"
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Running…</>
                            : <><Play className="w-3.5 h-3.5" />Run</>
                          }
                        </Button>
                        <button
                          data-testid={`button-delete-campaign-${c.id}`}
                          onClick={() => deleteCampaign.mutate(c.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Cookie Dialog */}
        <Dialog open={cookieDialogOpen} onOpenChange={setCookieDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Cookie className="w-4 h-4 text-pink-400" /> Instagram Session Cookies
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1">
                <p className="font-semibold">How to get your cookies:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-blue-200/80">
                  <li>Open Instagram in Chrome and log in</li>
                  <li>Install the "EditThisCookie" extension</li>
                  <li>Click the extension → Export as JSON</li>
                  <li>Paste the full JSON array below</li>
                </ol>
              </div>
              <div>
                <Label>Cookies JSON</Label>
                <Textarea
                  data-testid="textarea-cookies"
                  className="mt-1 font-mono text-xs min-h-[140px]"
                  placeholder={'[\n  { "name": "sessionid", "value": "...", ... },\n  ...\n]'}
                  value={cookieInput}
                  onChange={e => setCookieInput(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setCookieDialogOpen(false)}>Cancel</Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => saveCookies.mutate()}
                  disabled={saveCookies.isPending || !cookieInput.trim()}
                  data-testid="button-save-cookies"
                >
                  {saveCookies.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {saveCookies.isPending ? "Saving…" : "Save Cookies"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Campaign Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-pink-400" /> New Comment Campaign
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div>
                <Label>Campaign Name</Label>
                <Input
                  data-testid="input-campaign-name"
                  className="mt-1"
                  placeholder="e.g. Competitor reel outreach"
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                />
              </div>
              <div>
                <Label>Post / Reel URLs <span className="text-muted-foreground text-xs font-normal">(one per line)</span></Label>
                <Textarea
                  data-testid="textarea-post-urls"
                  className="mt-1 font-mono text-xs min-h-[100px]"
                  placeholder={"https://www.instagram.com/reel/ABC123/\nhttps://www.instagram.com/p/XYZ456/"}
                  value={urlsInput}
                  onChange={e => setUrlsInput(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {urlsInput.split("\n").filter(l => l.trim()).length} URLs entered
                </p>
              </div>
              <div>
                <Label>Comment Variants <span className="text-muted-foreground text-xs font-normal">(one per line — bot picks randomly)</span></Label>
                <Textarea
                  data-testid="textarea-comments"
                  className="mt-1 text-sm min-h-[100px]"
                  placeholder={"Love this! ❤️\nSo inspiring! 🔥\nGreat content as always 👏"}
                  value={commentsInput}
                  onChange={e => setCommentsInput(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {commentsInput.split("\n").filter(l => l.trim()).length} variants
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button
                  className="flex-1 gap-2"
                  data-testid="button-confirm-create-campaign"
                  onClick={() => createCampaign.mutate()}
                  disabled={createCampaign.isPending || !campaignName.trim() || !urlsInput.trim() || !commentsInput.trim()}
                >
                  {createCampaign.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {createCampaign.isPending ? "Creating…" : "Create Campaign"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </ClientLayout>
  );
}
