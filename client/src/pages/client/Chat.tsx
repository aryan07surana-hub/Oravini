import { useState, useEffect, useRef } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, MessageSquare, Zap, Pencil, Trash2, Check, X, Paperclip, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { AiRefineButton } from "@/components/ui/AiRefineButton";

export default function ClientChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: adminUser } = useQuery<any>({ queryKey: ["/api/admin-user"] });
  const adminId = adminUser?.id;

  const { data: messages, isLoading } = useQuery<any[]>({
    queryKey: adminId ? [`/api/messages/${adminId}`] : [],
    enabled: !!adminId,
    refetchInterval: 8000,
  });

  const sendMsg = useMutation({
    mutationFn: (content: string) => apiRequest("POST", "/api/messages", { receiverId: adminId, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${adminId}`] });
      setMessage("");
    },
  });

  const editMsg = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => apiRequest("PATCH", `/api/messages/${id}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${adminId}`] });
      setEditingId(null);
      setEditContent("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMsg = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/messages/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/messages/${adminId}`] }),
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  useEffect(() => {
    if (!user?.id) return;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/ws?userId=${user.id}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "message" || data.type === "message_updated" || data.type === "message_deleted") {
        queryClient.invalidateQueries({ queryKey: [`/api/messages/${adminId}`] });
      }
    };
    wsRef.current = ws;
    return () => ws.close();
  }, [user?.id, adminId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus();
  }, [editingId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && adminId) sendMsg.mutate(message.trim());
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !adminId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("receiverId", adminId);
      const res = await fetch("/api/messages/upload", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${adminId}`] });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startEdit = (msg: any) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const confirmEdit = (id: string) => {
    if (editContent.trim()) editMsg.mutate({ id, content: editContent });
  };

  const initials = (name: string) => name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <ClientLayout>
      <div className="h-[calc(100vh-4rem)] lg:h-screen flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center gap-3 bg-background flex-shrink-0">
          <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Oravini Team</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
          {isLoading ? (
            <div className="space-y-4">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
                  <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
                  <Skeleton className="h-10 w-48 rounded-2xl" />
                </div>
              ))}
            </div>
          ) : (messages || []).length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No messages yet</p>
                <p className="text-xs text-muted-foreground mt-1">Start the conversation — say hi!</p>
              </div>
            </div>
          ) : (
            <>
              {(messages || []).map((msg: any, i: number) => {
                const isMe = msg.senderId === user?.id;
                const isEditing = editingId === msg.id;
                const showDate = i === 0 || new Date(msg.createdAt).toDateString() !== new Date((messages as any)[i - 1].createdAt).toDateString();
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">{format(new Date(msg.createdAt), "MMMM d, yyyy")}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    <div
                      className={`flex gap-2.5 group ${isMe ? "flex-row-reverse" : ""}`}
                      data-testid={`message-${msg.id}`}
                      onMouseEnter={() => setHoveredId(msg.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <Avatar className="w-7 h-7 flex-shrink-0 mt-1">
                        <AvatarFallback className={`text-[10px] font-bold ${isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                          {isMe ? initials(user?.name) : "BV"}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              ref={editInputRef}
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(msg.id); if (e.key === "Escape") setEditingId(null); }}
                              className="h-9 text-sm min-w-[200px]"
                              data-testid={`edit-input-${msg.id}`}
                            />
                            <button onClick={() => confirmEdit(msg.id)} className="text-primary hover:text-primary/80"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                          </div>
                        ) : msg.fileUrl ? (
                          <div className={`rounded-2xl overflow-hidden border ${isMe ? "border-primary/30" : "border-card-border"}`}>
                            {msg.fileMime?.startsWith("image/") ? (
                              <img src={msg.fileUrl} alt={msg.fileName || "image"} className="max-w-[240px] max-h-[180px] object-cover" />
                            ) : (
                              <a href={msg.fileUrl} target="_blank" rel="noreferrer" download className={`flex items-center gap-3 px-4 py-3 ${isMe ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}>
                                <FileText className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm font-medium truncate max-w-[160px]">{msg.fileName || msg.content}</span>
                                <Download className="w-4 h-4 flex-shrink-0" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isMe
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-card border border-card-border text-foreground rounded-tl-sm"
                          }`}>
                            {msg.content}
                          </div>
                        )}
                        <div className={`flex items-center gap-1.5 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
                          <span className="text-[10px] text-muted-foreground">{format(new Date(msg.createdAt), "h:mm a")}</span>
                          {/* Client does NOT see read receipts — admin's read status is hidden from client */}
                          {isMe && hoveredId === msg.id && !isEditing && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => startEdit(msg)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                data-testid={`edit-msg-${msg.id}`}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteMsg.mutate(msg.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                data-testid={`delete-msg-${msg.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border px-6 py-3 bg-background flex-shrink-0 space-y-2">
          <AiRefineButton text={message} onAccept={setMessage} context="chat message to a branding agency" />
          <form onSubmit={handleSend} className="flex gap-2 items-center">
            <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" className="hidden" onChange={handleFileUpload} data-testid="client-file-input" />
            <Button type="button" variant="outline" size="icon" className="h-10 w-10 flex-shrink-0" onClick={() => fileInputRef.current?.click()} disabled={uploading || !adminId} data-testid="client-button-attach">
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              data-testid="input-message"
              placeholder={uploading ? "Uploading..." : adminId ? "Type a message to Oravini..." : "Loading..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 h-10"
              disabled={!adminId || uploading}
            />
            <Button type="submit" size="icon" data-testid="button-send" disabled={!message.trim() || !adminId || sendMsg.isPending || uploading} className="h-10 w-10 flex-shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </ClientLayout>
  );
}
