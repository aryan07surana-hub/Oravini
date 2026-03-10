import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, MessageSquare, CheckCheck, Pencil, Trash2, Check, X } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function AdminChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const { data: conversations, isLoading: convsLoading } = useQuery<any[]>({
    queryKey: ["/api/conversations"],
    refetchInterval: 15000,
  });

  const { data: allClients, isLoading: clientsLoading } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  const { data: messages, isLoading: msgsLoading } = useQuery<any[]>({
    queryKey: selectedClientId ? [`/api/messages/${selectedClientId}`] : [],
    enabled: !!selectedClientId,
    refetchInterval: 10000,
  });

  const sendMsg = useMutation({
    mutationFn: (content: string) => apiRequest("POST", "/api/messages", { receiverId: selectedClientId, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${selectedClientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setMessage("");
    },
  });

  const editMsg = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => apiRequest("PATCH", `/api/messages/${id}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${selectedClientId}`] });
      setEditingId(null);
      setEditContent("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMsg = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/messages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${selectedClientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  useEffect(() => {
    if (user?.id) {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${proto}//${window.location.host}/ws?userId=${user.id}`);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "message" || data.type === "message_updated" || data.type === "message_deleted") {
          queryClient.invalidateQueries({ queryKey: [`/api/messages/${selectedClientId}`] });
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        }
      };
      wsRef.current = ws;
      return () => ws.close();
    }
  }, [user?.id, selectedClientId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus();
  }, [editingId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && selectedClientId) sendMsg.mutate(message.trim());
  };

  const startEdit = (msg: any) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const confirmEdit = (id: string) => {
    if (editContent.trim()) editMsg.mutate({ id, content: editContent });
  };

  const initials = (name: string) => name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  const convMap = new Map((conversations || []).map((c: any) => [c.client?.id, c]));

  const mergedClients = (allClients || []).map((client: any) => {
    const conv = convMap.get(client.id);
    return { client, lastMessage: conv?.lastMessage || null };
  }).sort((a: any, b: any) => {
    if (a.lastMessage && b.lastMessage) return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
    if (a.lastMessage) return -1;
    if (b.lastMessage) return 1;
    return 0;
  });

  const selectedClient = (allClients || []).find((c: any) => c.id === selectedClientId);

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-0px)] flex overflow-hidden">
        {/* Clients sidebar */}
        <div className={`w-full lg:w-80 xl:w-96 border-r border-border flex flex-col flex-shrink-0 ${selectedClientId ? "hidden lg:flex" : "flex"}`}>
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Messages</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{(allClients || []).length} clients</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {(convsLoading || clientsLoading) ? (
              <div className="p-4 space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : mergedClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <MessageSquare className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No clients yet</p>
              </div>
            ) : (
              <div className="p-2">
                {mergedClients.map(({ client, lastMessage }: any) => {
                  const isSelected = selectedClientId === client.id;
                  return (
                    <button
                      key={client.id}
                      data-testid={`conv-${client.id}`}
                      onClick={() => setSelectedClientId(client.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-accent"}`}
                    >
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarFallback className={`text-xs font-bold ${isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                          {initials(client.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{client.name}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {lastMessage ? lastMessage.content : <span className="italic opacity-60">No messages yet</span>}
                        </p>
                      </div>
                      {lastMessage && (
                        <p className="text-[10px] text-muted-foreground flex-shrink-0">
                          {format(new Date(lastMessage.createdAt), "MMM d")}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className={`flex-1 flex flex-col min-w-0 ${!selectedClientId && "hidden lg:flex"}`}>
          {!selectedClientId ? (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <MessageSquare className="w-14 h-14 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground">Select a client to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-border flex items-center gap-3 bg-background flex-shrink-0">
                <button onClick={() => setSelectedClientId(null)} className="lg:hidden text-muted-foreground mr-1">←</button>
                <Avatar className="w-9 h-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials(selectedClient?.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedClient?.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedClient?.email}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {msgsLoading ? (
                  <div className="space-y-4">
                    {Array(5).fill(0).map((_, i) => (
                      <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <Skeleton className="h-10 w-48 rounded-2xl" />
                      </div>
                    ))}
                  </div>
                ) : (messages || []).length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                      <p className="text-sm text-muted-foreground">No messages yet</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {(messages || []).map((msg: any) => {
                      const isMe = msg.senderId === user?.id;
                      const isEditing = editingId === msg.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-2.5 group ${isMe ? "flex-row-reverse" : ""}`}
                          data-testid={`admin-msg-${msg.id}`}
                          onMouseEnter={() => setHoveredId(msg.id)}
                          onMouseLeave={() => setHoveredId(null)}
                        >
                          <Avatar className="w-7 h-7 flex-shrink-0 mt-1">
                            <AvatarFallback className={`text-[10px] font-bold ${isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                              {isMe ? "BV" : initials(selectedClient?.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`max-w-[65%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
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
                            ) : (
                              <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-card-border text-foreground rounded-tl-sm"}`}>
                                {msg.content}
                              </div>
                            )}
                            <div className={`flex items-center gap-1.5 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
                              <span className="text-[10px] text-muted-foreground">{format(new Date(msg.createdAt), "h:mm a")}</span>
                              {/* Admin sees read receipts on THEIR messages */}
                              {isMe && (
                                <CheckCheck className={`w-3 h-3 ${msg.read ? "text-primary" : "text-muted-foreground"}`} />
                              )}
                              {/* Hover actions on own messages */}
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
                      );
                    })}
                    <div ref={bottomRef} />
                  </>
                )}
              </div>

              <div className="border-t border-border px-6 py-4 bg-background flex-shrink-0">
                <form onSubmit={handleSend} className="flex gap-3 items-center">
                  <Input
                    data-testid="admin-input-message"
                    placeholder={`Message ${selectedClient?.name?.split(" ")[0] || "client"}...`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1 h-10"
                  />
                  <Button type="submit" size="icon" data-testid="admin-button-send" disabled={!message.trim() || sendMsg.isPending} className="h-10 w-10">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
