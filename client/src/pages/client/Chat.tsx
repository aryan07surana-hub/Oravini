import { useState, useEffect, useRef } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, MessageSquare, Zap, CheckCheck } from "lucide-react";
import { format } from "date-fns";

export default function ClientChat() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

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

  useEffect(() => {
    if (!user?.id) return;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/ws?userId=${user.id}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "message") {
        queryClient.invalidateQueries({ queryKey: [`/api/messages/${adminId}`] });
      }
    };
    wsRef.current = ws;
    return () => ws.close();
  }, [user?.id, adminId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && adminId) sendMsg.mutate(message.trim());
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
            <p className="text-sm font-semibold text-foreground">Brandverse Team</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
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
                const showDate = i === 0 || new Date(msg.createdAt).toDateString() !== new Date((messages as any)[i - 1].createdAt).toDateString();
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.createdAt), "MMMM d, yyyy")}
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    <div className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`} data-testid={`message-${msg.id}`}>
                      <Avatar className="w-7 h-7 flex-shrink-0 mt-1">
                        <AvatarFallback className={`text-[10px] font-bold ${isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                          {isMe ? initials(user?.name) : "BV"}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-card border border-card-border text-foreground rounded-tl-sm"
                        }`}>
                          {msg.content}
                        </div>
                        <div className={`flex items-center gap-1 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(msg.createdAt), "h:mm a")}
                          </span>
                          {isMe && (
                            <CheckCheck className={`w-3 h-3 ${msg.read ? "text-primary" : "text-muted-foreground"}`} />
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
        <div className="border-t border-border px-6 py-4 bg-background flex-shrink-0">
          <form onSubmit={handleSend} className="flex gap-3 items-center">
            <Input
              data-testid="input-message"
              placeholder={adminId ? "Type a message to Brandverse..." : "Loading..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 h-10"
              disabled={!adminId}
            />
            <Button
              type="submit"
              size="icon"
              data-testid="button-send"
              disabled={!message.trim() || !adminId || sendMsg.isPending}
              className="h-10 w-10 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </ClientLayout>
  );
}
