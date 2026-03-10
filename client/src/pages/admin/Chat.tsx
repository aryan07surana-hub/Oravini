import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, MessageSquare } from "lucide-react";
import { format } from "date-fns";

export default function AdminChat() {
  const { user } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const { data: conversations, isLoading: convsLoading } = useQuery<any[]>({
    queryKey: ["/api/conversations"],
    refetchInterval: 15000,
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

  useEffect(() => {
    if (user?.id) {
      const ws = new WebSocket(`${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws?userId=${user.id}`);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && selectedClientId) {
      sendMsg.mutate(message.trim());
    }
  };

  const initials = (name: string) => name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const selectedConv = (conversations || []).find((c: any) => c.client?.id === selectedClientId);

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-0px)] flex overflow-hidden">
        {/* Conversations sidebar */}
        <div className={`w-full lg:w-80 xl:w-96 border-r border-border flex flex-col flex-shrink-0 ${selectedClientId ? "hidden lg:flex" : "flex"}`}>
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Messages</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{(conversations || []).length} conversations</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {convsLoading ? (
              <div className="p-4 space-y-3">
                {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (conversations || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <MessageSquare className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
              </div>
            ) : (
              <div className="p-2">
                {(conversations || []).map((conv: any) => {
                  const isSelected = selectedClientId === conv.client?.id;
                  return (
                    <button
                      key={conv.client?.id}
                      data-testid={`conv-${conv.client?.id}`}
                      onClick={() => setSelectedClientId(conv.client?.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-accent"}`}
                    >
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarFallback className={`text-xs font-bold ${isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                          {initials(conv.client?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{conv.client?.name}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage?.content}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground flex-shrink-0">
                        {conv.lastMessage && format(new Date(conv.lastMessage.createdAt), "MMM d")}
                      </p>
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
                <p className="text-muted-foreground">Select a conversation to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-6 py-4 border-b border-border flex items-center gap-3 bg-background flex-shrink-0">
                <button onClick={() => setSelectedClientId(null)} className="lg:hidden text-muted-foreground mr-1">
                  ←
                </button>
                <Avatar className="w-9 h-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {initials(selectedConv?.client?.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedConv?.client?.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedConv?.client?.email}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
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
                      return (
                        <div key={msg.id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`} data-testid={`admin-msg-${msg.id}`}>
                          <Avatar className="w-7 h-7 flex-shrink-0 mt-1">
                            <AvatarFallback className={`text-[10px] font-bold ${isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                              {isMe ? "BV" : initials(selectedConv?.client?.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`max-w-[70%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-card-border text-foreground rounded-tl-sm"}`}>
                              {msg.content}
                            </div>
                            <span className="text-[10px] text-muted-foreground px-1">
                              {format(new Date(msg.createdAt), "h:mm a")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-border px-6 py-4 bg-background flex-shrink-0">
                <form onSubmit={handleSend} className="flex gap-3 items-center">
                  <Input
                    data-testid="admin-input-message"
                    placeholder={`Message ${selectedConv?.client?.name || "client"}...`}
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
