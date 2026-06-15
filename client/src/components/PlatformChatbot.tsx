import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Bot, X, Send, Loader2, ChevronDown, ChevronUp, Copy, Check, ThumbsUp, ThumbsDown, MessageSquarePlus } from "lucide-react";

const GOLD = "#d4b461";
const SESSION_KEY = "oravi_chat_v2";

// ── Types ─────────────────────────────────────────────────────────────────────

type Message = {
  role: "user" | "assistant";
  content: string;
  followUps?: string[];
};

// ── Session storage ───────────────────────────────────────────────────────────

function loadSession(): Message[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Message[]) : [];
  } catch { return []; }
}

function saveSession(msgs: Message[]) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(msgs.slice(-40))); } catch { }
}

function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { }
}

// ── API ───────────────────────────────────────────────────────────────────────

async function chatWithOravi(messages: { role: string; content: string }[], context: string) {
  const r = await fetch("/api/platform/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ messages, context }),
  });
  if (!r.ok) throw new Error("Chat failed");
  return r.json() as Promise<{ reply: string; followUps: string[] }>;
}

async function sendFeedback(content: string, vote: "up" | "down", context: string) {
  await fetch("/api/platform/ai/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ messageContent: content, vote, context }),
  }).catch(() => null);
}

async function saveSessionToDB(messages: Message[]) {
  await fetch("/api/platform/chat/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ messages: messages.map(m => ({ role: m.role, content: m.content })) }),
  }).catch(() => null);
}

async function loadSessionFromDB(): Promise<Message[]> {
  try {
    const r = await fetch("/api/platform/chat/session", { credentials: "include" });
    const d = await r.json();
    return (d.messages || []) as Message[];
  } catch { return []; }
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
      return <em key={i} className="italic text-zinc-300">{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="px-1 py-0.5 rounded text-xs font-mono bg-zinc-700 text-amber-300">{part.slice(1, -1)}</code>;
    return <span key={i}>{part}</span>;
  });
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s/, "")); i++; }
      nodes.push(
        <ol key={`ol-${i}`} className="list-none space-y-1.5 my-1.5">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="font-black flex-shrink-0 mt-0.5 text-xs w-4 text-right" style={{ color: GOLD }}>{idx + 1}.</span>
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }
    if (/^[-•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-•]\s/.test(lines[i])) { items.push(lines[i].replace(/^[-•]\s/, "")); i++; }
      nodes.push(
        <ul key={`ul-${i}`} className="list-none space-y-1.5 my-1.5">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }
    if (/^━+/.test(line) || /^\*\*[^*]+\*\*$/.test(line.trim())) {
      const label = line.replace(/^━+\s*/, "").replace(/\*\*/g, "").trim();
      if (label) nodes.push(<p key={`h-${i}`} className="font-black text-xs mt-3 mb-1" style={{ color: GOLD }}>{label}</p>);
      i++; continue;
    }
    if (/^---+$/.test(line.trim())) { nodes.push(<hr key={`hr-${i}`} className="border-zinc-700 my-2" />); i++; continue; }
    if (line.trim() === "") { nodes.push(<div key={`sp-${i}`} className="h-1" />); i++; continue; }
    nodes.push(<p key={`p-${i}`} className="leading-relaxed">{inlineFormat(line)}</p>);
    i++;
  }
  return nodes;
}

// ── Page metadata ─────────────────────────────────────────────────────────────

type PageMeta = { label: string; greeting: string; questions: { category: string; qs: string[] }[] };

function getPageMeta(pathname: string): PageMeta {
  if (pathname.startsWith("/video-marketing")) return {
    label: "Video Marketing",
    greeting: "You're on Video Marketing. Working on a webinar, uploading a video, or setting up a channel? I can walk you through any of it.",
    questions: [
      { category: "Webinars", qs: ["How do I create and go live with a webinar?", "How do I invite a panelist?", "How do I set up webinar reminder emails?"] },
      { category: "Video Hosting", qs: ["How do I upload and share a video?", "How do I embed a video on my website?", "How do I create a public video channel?"] },
      { category: "Analytics", qs: ["How do I see webinar analytics?", "Why is my video getting 0 views?", "How do I create an automated replay webinar?"] },
    ],
  };
  if (pathname.startsWith("/email-marketing")) return {
    label: "Email Marketing",
    greeting: "Email Marketing — sending a campaign, building an automation, or trying to figure out why something isn't working?",
    questions: [
      { category: "Campaigns", qs: ["How do I send my first email campaign?", "How do I schedule an email?", "Why are my emails going to spam?"] },
      { category: "Automations", qs: ["How do I build an email automation?", "How do I set triggers for a sequence?"] },
      { category: "Setup", qs: ["How do I connect Gmail?", "How do I import email contacts?", "My open rate is low — what do I fix?"] },
    ],
  };
  if (pathname.startsWith("/dm-automation") || pathname.startsWith("/dm-hub") || pathname.startsWith("/dm-tracker")) return {
    label: "DM Automation",
    greeting: "DM Automation — great for growing on Instagram. Setting up keyword triggers, managing conversations, or building a sequence?",
    questions: [
      { category: "Setup", qs: ["How do I connect my Instagram?", "How do I set up a keyword DM trigger?", "How do DM sequences work?"] },
      { category: "Strategy", qs: ["What keywords should I use?", "How do I use DMs to get leads?", "What should my auto-reply say?"] },
    ],
  };
  if (pathname.startsWith("/sms-marketing")) return { label: "SMS Marketing", greeting: "", questions: [] };
  if (pathname.startsWith("/tracking") || pathname.startsWith("/content-analyser")) return {
    label: "Tracking & Analytics",
    greeting: "Tracking — let's look at what the numbers are telling you. Analysing your own account or a competitor?",
    questions: [
      { category: "Your analytics", qs: ["How do I read my Instagram analytics?", "What is a good engagement rate?", "Why is my YouTube CTR low?"] },
      { category: "Competitors", qs: ["How do I track a competitor?", "What metrics matter most?"] },
    ],
  };
  if (pathname.startsWith("/ai-ideas") || pathname.startsWith("/ai-coach") || pathname.startsWith("/content-intelligence") || pathname.startsWith("/niche-intelligence")) return {
    label: "Content Tools",
    greeting: "Content tools — generating ideas, improving what you've written, or researching your niche?",
    questions: [
      { category: "Ideas & research", qs: ["How do I generate content ideas for my niche?", "How does Niche Intelligence work?"] },
      { category: "Writing", qs: ["How do I improve my content with AI Coach?", "How do I write a viral hook?"] },
    ],
  };
  if (pathname.startsWith("/ai-design") || pathname.startsWith("/carousel-studio") || pathname.startsWith("/brand-kit") || pathname.startsWith("/story-generator") || pathname.startsWith("/lead-magnet")) return {
    label: "Design Studio",
    greeting: "Design Studio — creating graphics, carousels, a lead magnet, or setting up your brand kit?",
    questions: [
      { category: "Design", qs: ["How do I generate a branded graphic?", "How do I build a carousel post?", "How do I create an Instagram Story?"] },
      { category: "Brand & lead gen", qs: ["How do I set up my Brand Kit?", "How do I create a PDF lead magnet?"] },
    ],
  };
  if (pathname.startsWith("/scheduling") || pathname.includes("scheduler")) return {
    label: "Scheduling",
    greeting: "Scheduling — getting your content calendar set up. Which platform are you scheduling for, or is it a setup issue?",
    questions: [
      { category: "Scheduling posts", qs: ["How do I schedule a post?", "Can I schedule for multiple platforms?", "How do I connect my social accounts?"] },
      { category: "Strategy", qs: ["What are the best times to post on Instagram?", "How many times a week should I post?"] },
    ],
  };
  if (pathname.startsWith("/crm")) return {
    label: "CRM",
    greeting: "CRM — managing your pipeline and contacts. What do you need, deal tracking, contact import, or activity logging?",
    questions: [
      { category: "Contacts & deals", qs: ["How do I add a contact to the CRM?", "How do I set up a deal pipeline?", "How do I import contacts from CSV?"] },
      { category: "Tracking", qs: ["How do I log a call or meeting?", "How do I filter contacts by tag?"] },
    ],
  };
  if (pathname.startsWith("/meetings")) return {
    label: "Meetings",
    greeting: "Meetings — setting up your booking page, managing upcoming meetings, or sending reminders?",
    questions: [
      { category: "Setup", qs: ["How do I set up a booking page?", "How do I share my booking link?", "How do I set my availability?"] },
      { category: "Managing", qs: ["How do I cancel or reschedule a meeting?", "Do clients get automatic reminders?"] },
    ],
  };
  if (pathname.startsWith("/tools")) return {
    label: "Tools",
    greeting: "Tools Hub — building a form, using the Board Builder, or generating a bio?",
    questions: [
      { category: "Forms", qs: ["How do I create a lead capture form?", "How do I share my form?", "How do I view form responses?"] },
      { category: "Other tools", qs: ["How do I use the Board Builder?", "How do I generate a social bio?"] },
    ],
  };
  if (pathname.startsWith("/credits")) return {
    label: "Credits",
    greeting: "Credits page — need to understand how credits work or top up your balance?",
    questions: [
      { category: "Credits", qs: ["How do credits work?", "Which AI features use credits?", "How do I buy more credits?", "Why did my credits run out so fast?"] },
    ],
  };
  if (pathname.startsWith("/settings")) return {
    label: "Settings",
    greeting: "Settings — upgrading your plan, connecting accounts, or managing your profile?",
    questions: [
      { category: "Plan & billing", qs: ["How do I upgrade my plan?", "What's included in each plan?", "How do I cancel my subscription?"] },
      { category: "Connections", qs: ["How do I connect my Instagram?", "How do I connect YouTube?", "How do I connect Gmail?"] },
    ],
  };
  if (pathname.startsWith("/analytics")) return {
    label: "Analytics",
    greeting: "Analytics — want to understand your numbers across the whole platform, or dig into a specific channel?",
    questions: [
      { category: "Overview", qs: ["What do my analytics mean?", "Which channel is performing best?", "How do I improve my reach?"] },
      { category: "Channels", qs: ["Why is my email open rate low?", "Why is my SMS delivery rate low?", "How do I get more video views?"] },
    ],
  };
  if (pathname.startsWith("/dashboard")) return {
    label: "Dashboard",
    greeting: "Hey! I'm Oravi — I know every feature on this platform. What do you want to work on today?",
    questions: [
      { category: "Getting started", qs: ["What should I set up first?", "How do I connect my social accounts?", "Which plan should I be on?"] },
      { category: "Features", qs: ["How do I host a webinar?", "How do I set up SMS marketing?", "How do I schedule posts?"] },
      { category: "Troubleshooting", qs: ["A feature isn't showing in my sidebar", "My credits ran out", "How do I upgrade my plan?"] },
    ],
  };
  return {
    label: "Oravini",
    greeting: "Hey! I'm Oravi — I know every feature on this platform. Ask me anything and I'll give you a straight answer.",
    questions: [
      { category: "Getting started", qs: ["What should I do first?", "What's included in my plan?", "How do credits work?"] },
      { category: "Features", qs: ["How do I host a webinar?", "How do I set up SMS marketing?", "How do I schedule posts?"] },
      { category: "Troubleshooting", qs: ["Why aren't my emails sending?", "Why is my delivery rate low?", "A feature isn't in my sidebar"] },
    ],
  };
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={copy} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-1 rounded hover:bg-zinc-700 text-zinc-600 hover:text-zinc-400" title="Copy">
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ── Thumbs feedback ───────────────────────────────────────────────────────────

function ThumbsFeedback({ content, context }: { content: string; context: string }) {
  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  function vote(v: "up" | "down") {
    if (voted) return;
    setVoted(v);
    sendFeedback(content, v, context);
  }
  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-60 transition-opacity">
      <button
        onClick={() => vote("up")}
        className={`p-1 rounded hover:bg-zinc-700 transition-colors ${voted === "up" ? "text-emerald-400 !opacity-100" : "text-zinc-600 hover:text-zinc-400"}`}
        title="Good answer"
      >
        <ThumbsUp className="w-3 h-3" />
      </button>
      <button
        onClick={() => vote("down")}
        className={`p-1 rounded hover:bg-zinc-700 transition-colors ${voted === "down" ? "text-red-400 !opacity-100" : "text-zinc-600 hover:text-zinc-400"}`}
        title="Bad answer"
      >
        <ThumbsDown className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function Bubble({ role, content, context }: { role: "user" | "assistant"; content: string; context: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} items-end gap-1 group`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mb-0.5" style={{ background: `${GOLD}20` }}>
          <Bot className="w-3 h-3" style={{ color: GOLD }} />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${isUser ? "rounded-br-sm font-medium" : "rounded-bl-sm bg-zinc-800 text-zinc-300"}`}
        style={isUser ? { background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" } : {}}
      >
        {isUser ? content : renderMarkdown(content)}
      </div>
      {!isUser && (
        <div className="flex flex-col gap-0.5 mb-0.5">
          <CopyButton text={content} />
          <ThumbsFeedback content={content} context={context} />
        </div>
      )}
    </div>
  );
}

// ── Follow-up chips ───────────────────────────────────────────────────────────

function FollowUpChips({ chips, onSelect }: { chips: string[]; onSelect: (q: string) => void }) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pl-7 mt-1">
      {chips.map(q => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          className="text-[10px] px-2.5 py-1.5 rounded-lg border transition-all hover:scale-[1.02] active:scale-95 text-left"
          style={{ borderColor: `${GOLD}35`, background: `${GOLD}08`, color: GOLD }}
        >
          {q}
        </button>
      ))}
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-1.5 justify-start">
      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}20` }}>
        <Bot className="w-3 h-3" style={{ color: GOLD }} />
      </div>
      <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PlatformChatbot() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => loadSession());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [dbLoaded, setDbLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (location.startsWith("/sms-marketing")) return null;
  if (location.startsWith("/portal") || location === "/login" || location === "/register") return null;

  const meta = getPageMeta(location);
  const hasMessages = messages.length > 0;

  // Load from DB on first open — merges with sessionStorage (DB wins if it has more messages)
  useEffect(() => {
    if (open && !dbLoaded) {
      setDbLoaded(true);
      loadSessionFromDB().then(dbMsgs => {
        if (dbMsgs.length > messages.length) {
          setMessages(dbMsgs);
          saveSession(dbMsgs);
        }
      });
    }
  }, [open]);

  // Persist to both sessionStorage and DB whenever messages change
  useEffect(() => {
    if (messages.length === 0) return;
    saveSession(messages);
    saveSessionToDB(messages);
  }, [messages]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  const clearChat = useCallback(() => {
    setMessages([]);
    clearSession();
    saveSessionToDB([]);
    setOpenCategory(null);
    setInput("");
  }, []);

  async function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    const userMsg: Message = { role: "user", content: msg };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setOpenCategory(null);
    setLoading(true);
    try {
      const d = await chatWithOravi(
        newMsgs.map(m => ({ role: m.role, content: m.content })),
        meta.label
      );
      const reply: Message = {
        role: "assistant",
        content: d.reply,
        followUps: d.followUps || [],
      };
      setMessages(prev => [...prev, reply]);
      if (!open) setUnread(n => n + 1);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Something went wrong. Try again — or contact **support@oravini.com** if it keeps happening.",
      }]);
    } finally {
      setLoading(false);
    }
  }

  const lastAssistantIdx = messages.map((m, i) => m.role === "assistant" ? i : -1).filter(i => i >= 0).at(-1) ?? -1;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        title="Ask Oravi — your Oravini assistant"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-50 transition-all duration-200 hover:scale-110 active:scale-95"
        style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)` }}
      >
        {open ? <X className="w-6 h-6 text-black" /> : <Bot className="w-6 h-6 text-black" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-black">{unread}</span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 rounded-2xl border border-zinc-700 shadow-2xl z-50 flex flex-col overflow-hidden"
          style={{ width: 376, height: 560, background: "#080810" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 flex-shrink-0" style={{ background: `${GOLD}08` }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}25` }}>
              <Bot className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-black">Oravi</p>
              <p className="text-xs text-zinc-500 truncate">
                {meta.label} · {hasMessages ? `${messages.length} msg${messages.length !== 1 ? "s" : ""}` : "Ask me anything"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {hasMessages && (
                <button onClick={clearChat} title="New chat" className="text-zinc-600 hover:text-zinc-400 transition-colors p-1.5 rounded-lg hover:bg-zinc-800">
                  <MessageSquarePlus className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors p-1.5 rounded-lg hover:bg-zinc-800">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Context banner */}
          {hasMessages && (
            <div className="px-3 py-1.5 border-b border-zinc-800/60 flex items-center gap-2" style={{ background: `${GOLD}05` }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: GOLD }} />
              <p className="text-xs text-zinc-500">
                Chat saved · on <span className="text-zinc-300 font-medium">{meta.label}</span>
              </p>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {!hasMessages ? (
              <div className="space-y-3">
                <div className="flex items-end gap-1.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}20` }}>
                    <Bot className="w-3 h-3" style={{ color: GOLD }} />
                  </div>
                  <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-3.5 py-2.5 max-w-[84%]">
                    <p className="text-xs text-zinc-300 leading-relaxed">{meta.greeting}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {meta.questions.map(cat => (
                    <div key={cat.category} className="rounded-xl border border-zinc-800 overflow-hidden">
                      <button
                        onClick={() => setOpenCategory(openCategory === cat.category ? null : cat.category)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-zinc-900/50 transition-colors"
                      >
                        <span className="text-xs font-semibold text-zinc-400">{cat.category}</span>
                        {openCategory === cat.category
                          ? <ChevronUp className="w-3.5 h-3.5 text-zinc-600" />
                          : <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />}
                      </button>
                      {openCategory === cat.category && (
                        <div className="border-t border-zinc-800 divide-y divide-zinc-800/50">
                          {cat.qs.map(q => (
                            <button key={q} onClick={() => send(q)} className="w-full text-left px-3 py-2.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 transition-colors">
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div key={i} className="space-y-2">
                    <Bubble role={m.role} content={m.content} context={meta.label} />
                    {m.role === "assistant" && i === lastAssistantIdx && !loading && (m.followUps?.length ?? 0) > 0 && (
                      <FollowUpChips chips={m.followUps!} onSelect={send} />
                    )}
                  </div>
                ))}
                {loading && <TypingIndicator />}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-zinc-800 flex gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              placeholder={hasMessages ? "Ask a follow-up..." : `Ask anything about ${meta.label}...`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-xs focus:outline-none focus:border-yellow-500/50 placeholder-zinc-600"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-30 transition-opacity"
              style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)` }}
            >
              {loading
                ? <Loader2 className="w-3.5 h-3.5 text-black animate-spin" />
                : <Send className="w-3.5 h-3.5 text-black" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
