import PortalLayout from "./Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BookOpenCheck, Plus, Trash2, ArrowLeft, ChevronRight,
  ChevronLeft, BookOpen, Clock, Sparkles, X
} from "lucide-react";

const GOLD = "#d4b461";

const BOOK_COLORS = [
  "#d4b461", "#3b82f6", "#22c55e", "#a855f7",
  "#f97316", "#ef4444", "#06b6d4", "#ec4899",
];

const TIME_OPTIONS = [
  { label: "5 min", minutes: 5, cards: 3 },
  { label: "10 min", minutes: 10, cards: 6 },
  { label: "30 min", minutes: 30, cards: 15 },
];

type View = "library" | "book" | "pick-time" | "reading";

// ─── helpers ─────────────────────────────────────────────────────────────────
function bookColor(title: string) {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) % BOOK_COLORS.length;
  return BOOK_COLORS[h];
}

function bookInitials(title: string) {
  return title.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
}

// ─── Reading card ─────────────────────────────────────────────────────────────
function ReadingCard({
  card, index, total, onNext, onPrev, onDone,
}: {
  card: { excerpt: string; note: string | null; bookTitle: string; bookColor: string };
  index: number; total: number;
  onNext: () => void; onPrev: () => void; onDone: () => void;
}) {
  const progress = ((index + 1) / total) * 100;
  return (
    <div className="flex flex-col min-h-[70vh]">
      {/* progress bar */}
      <div className="w-full h-1 rounded-full bg-zinc-800 mb-8">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: GOLD }} />
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
        {/* source badge */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: `${card.bookColor}22`, color: card.bookColor }}>
            {bookInitials(card.bookTitle)}
          </div>
          <span className="text-xs text-muted-foreground">{card.bookTitle}</span>
          <span className="text-xs text-muted-foreground ml-auto">{index + 1} / {total}</span>
        </div>

        {/* main content */}
        <p className="text-xl md:text-2xl font-medium text-foreground leading-relaxed">
          {card.excerpt}
        </p>

        {/* personal note */}
        {card.note && (
          <p className="mt-6 text-base text-muted-foreground leading-relaxed border-l-2 pl-4" style={{ borderColor: GOLD }}>
            {card.note}
          </p>
        )}
      </div>

      {/* navigation */}
      <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
        <Button variant="ghost" size="sm" onClick={onPrev} disabled={index === 0} className="gap-2 text-muted-foreground">
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        {index < total - 1 ? (
          <Button onClick={onNext} size="sm" className="gap-2" style={{ background: GOLD, color: "#0a0910" }}>
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={onDone} size="sm" className="gap-2" style={{ background: GOLD, color: "#0a0910" }}>
            Done <Sparkles className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DailyRead() {
  const { toast } = useToast();
  const [view, setView] = useState<View>("library");
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [readingCards, setReadingCards] = useState<any[]>([]);

  // book form
  const [bookDialog, setBookDialog] = useState(false);
  const [bTitle, setBTitle] = useState("");
  const [bAuthor, setBAuthor] = useState("");

  // content form
  const [contentDialog, setContentDialog] = useState(false);
  const [cText, setCText] = useState("");
  const [cNote, setCNote] = useState("");

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: books = [], isLoading: booksLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/reading-materials"],
  });

  const { data: highlights = [], isLoading: highlightsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/reading-materials", selectedBook?.id, "highlights"],
    queryFn: () => apiRequest("GET", `/api/admin/reading-materials/${selectedBook.id}/highlights`),
    enabled: !!selectedBook?.id,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const addBook = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/reading-materials", {
      title: bTitle.trim(),
      author: bAuthor.trim() || null,
      category: "Books",
      status: "reading",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reading-materials"] });
      toast({ title: "Book added" });
      setBookDialog(false);
      setBTitle(""); setBAuthor("");
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteBook = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/reading-materials/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reading-materials"] });
      toast({ title: "Book removed" });
      setView("library");
      setSelectedBook(null);
    },
  });

  const addContent = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/reading-materials/${selectedBook.id}/highlights`, {
      excerpt: cText.trim(),
      note: cNote.trim() || null,
      tag: "insight",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reading-materials", selectedBook?.id, "highlights"] });
      toast({ title: "Content saved" });
      setContentDialog(false);
      setCText(""); setCNote("");
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteContent = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/reading-highlights/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reading-materials", selectedBook?.id, "highlights"] });
    },
  });

  // ── Start reading session ─────────────────────────────────────────────────
  const startReading = async (cardCount: number) => {
    // Gather all content from all books
    const all: any[] = [];
    for (const book of books) {
      const hs: any[] = await apiRequest("GET", `/api/admin/reading-materials/${book.id}/highlights`).catch(() => []);
      (hs || []).forEach((h) => all.push({
        excerpt: h.excerpt,
        note: h.note,
        bookTitle: book.title,
        bookColor: bookColor(book.title),
      }));
    }

    if (all.length === 0) {
      toast({ title: "No content yet", description: "Add content to your books first.", variant: "destructive" });
      return;
    }

    // Shuffle and pick cards, trying to vary books
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    const picked: any[] = [];
    const usedBooks = new Set<string>();

    // First pass: one per book
    for (const c of shuffled) {
      if (!usedBooks.has(c.bookTitle) && picked.length < cardCount) {
        picked.push(c); usedBooks.add(c.bookTitle);
      }
    }
    // Fill remaining from any book
    for (const c of shuffled) {
      if (picked.length >= cardCount) break;
      if (!picked.includes(c)) picked.push(c);
    }

    setReadingCards(picked.slice(0, cardCount));
    setCardIndex(0);
    setView("reading");
  };

  // ── Library view ───────────────────────────────────────────────────────────
  if (view === "library") {
    return (
      <PortalLayout>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BookOpenCheck className="w-6 h-6" style={{ color: GOLD }} />
                Every Day Read
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{books.length} books in your library</p>
            </div>
            <div className="flex items-center gap-2">
              {books.length > 0 && (
                <Button
                  onClick={() => setView("pick-time")}
                  size="sm"
                  className="gap-2"
                  style={{ background: GOLD, color: "#0a0910" }}
                >
                  <BookOpenCheck className="w-4 h-4" /> Read Today
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setBookDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Add Book
              </Button>
            </div>
          </div>

          {booksLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : books.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-2xl">
              <BookOpen className="w-12 h-12 text-muted-foreground mb-4 opacity-40" />
              <p className="font-semibold text-foreground mb-1">No books yet</p>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs">
                Add books you've read. Paste in your notes or key passages. Every day, pick a reading time and learn.
              </p>
              <Button onClick={() => setBookDialog(true)} size="sm" style={{ background: GOLD, color: "#0a0910" }}>
                <Plus className="w-4 h-4 mr-2" /> Add Your First Book
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {books.map((book) => {
                const color = bookColor(book.title);
                const initials = bookInitials(book.title);
                return (
                  <div
                    key={book.id}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-zinc-600 transition-all group"
                    onClick={() => { setSelectedBook(book); setView("book"); }}
                  >
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: `${color}22`, color }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{book.title}</p>
                      {book.author && <p className="text-xs text-muted-foreground mt-0.5">{book.author}</p>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    <button
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity ml-1"
                      onClick={(e) => { e.stopPropagation(); deleteBook.mutate(book.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add book dialog */}
        <Dialog open={bookDialog} onOpenChange={setBookDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" style={{ color: GOLD }} /> Add Book
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label className="text-xs mb-1.5 block">Book Title *</Label>
                <Input value={bTitle} onChange={(e) => setBTitle(e.target.value)} placeholder="$100M Offers" autoFocus />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Author (optional)</Label>
                <Input value={bAuthor} onChange={(e) => setBAuthor(e.target.value)} placeholder="Alex Hormozi" />
              </div>
              <Button
                className="w-full mt-1"
                style={{ background: GOLD, color: "#0a0910" }}
                onClick={() => addBook.mutate()}
                disabled={!bTitle.trim() || addBook.isPending}
              >
                {addBook.isPending ? "Adding..." : "Add Book"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PortalLayout>
    );
  }

  // ── Book detail view ───────────────────────────────────────────────────────
  if (view === "book" && selectedBook) {
    const color = bookColor(selectedBook.title);
    return (
      <PortalLayout>
        <div className="max-w-3xl mx-auto">
          {/* Back */}
          <button
            onClick={() => { setView("library"); setSelectedBook(null); }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Library
          </button>

          {/* Book header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0" style={{ background: `${color}22`, color }}>
              {bookInitials(selectedBook.title)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground">{selectedBook.title}</h2>
              {selectedBook.author && <p className="text-muted-foreground text-sm mt-0.5">{selectedBook.author}</p>}
            </div>
            <button
              onClick={() => deleteBook.mutate(selectedBook.id)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Add content */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-foreground">
              Content
              {highlights.length > 0 && <Badge variant="outline" className="ml-2 text-[10px]">{highlights.length}</Badge>}
            </h3>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setContentDialog(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Content
            </Button>
          </div>

          {highlightsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : highlights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-2xl">
              <p className="text-muted-foreground text-sm mb-1">No content yet</p>
              <p className="text-xs text-muted-foreground mb-4">Paste in notes, quotes, insights, or passages from this book.</p>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setContentDialog(true)}>
                <Plus className="w-3.5 h-3.5" /> Add First Content
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {highlights.map((h: any) => (
                <div key={h.id} className="rounded-xl border border-border bg-card p-4 group relative">
                  <p className="text-sm text-foreground leading-relaxed pr-6">{h.excerpt}</p>
                  {h.note && (
                    <p className="text-xs text-muted-foreground mt-2 italic border-l-2 pl-3" style={{ borderColor: color }}>
                      {h.note}
                    </p>
                  )}
                  <button
                    onClick={() => deleteContent.mutate(h.id)}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add content dialog */}
        <Dialog open={contentDialog} onOpenChange={setContentDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Content — {selectedBook.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-xs mb-1.5 block">Notes / Passage / Idea *</Label>
                <Textarea
                  value={cText}
                  onChange={(e) => setCText(e.target.value)}
                  rows={5}
                  placeholder="Paste your notes, a key quote, an insight, or anything from this book..."
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Your take on it (optional)</Label>
                <Textarea
                  value={cNote}
                  onChange={(e) => setCNote(e.target.value)}
                  rows={2}
                  placeholder="How does this apply to your work?"
                />
              </div>
              <Button
                className="w-full"
                style={{ background: GOLD, color: "#0a0910" }}
                onClick={() => addContent.mutate()}
                disabled={!cText.trim() || addContent.isPending}
              >
                {addContent.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PortalLayout>
    );
  }

  // ── Pick time view ─────────────────────────────────────────────────────────
  if (view === "pick-time") {
    return (
      <PortalLayout>
        <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
          <button
            onClick={() => setView("library")}
            className="self-start flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-12 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Library
          </button>

          <div className="mb-2">
            <BookOpenCheck className="w-10 h-10 mx-auto mb-4" style={{ color: GOLD }} />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">How long do you have?</h2>
          <p className="text-muted-foreground text-sm mb-10">
            I'll pull content from across your {books.length} book{books.length !== 1 ? "s" : ""} and serve it to you.
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.minutes}
                onClick={() => startReading(opt.cards)}
                className="flex items-center justify-between px-6 py-4 rounded-2xl border border-border bg-card hover:border-zinc-500 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="font-semibold text-foreground">{opt.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{opt.cards} ideas</span>
              </button>
            ))}
          </div>
        </div>
      </PortalLayout>
    );
  }

  // ── Reading session view ───────────────────────────────────────────────────
  if (view === "reading") {
    if (readingCards.length === 0) {
      return (
        <PortalLayout>
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <p className="text-muted-foreground mb-4">No content found. Add notes to your books.</p>
            <Button onClick={() => setView("library")} size="sm">Back to Library</Button>
          </div>
        </PortalLayout>
      );
    }

    if (cardIndex >= readingCards.length) {
      // Done screen
      return (
        <PortalLayout>
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-sm mx-auto">
            <Sparkles className="w-12 h-12 mb-4" style={{ color: GOLD }} />
            <h2 className="text-2xl font-bold text-foreground mb-2">Done for today</h2>
            <p className="text-muted-foreground text-sm mb-8">
              You read {readingCards.length} idea{readingCards.length !== 1 ? "s" : ""} from {new Set(readingCards.map(c => c.bookTitle)).size} book{new Set(readingCards.map(c => c.bookTitle)).size !== 1 ? "s" : ""}.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={() => { setCardIndex(0); }}>Read again</Button>
              <Button size="sm" onClick={() => { setView("library"); setReadingCards([]); setCardIndex(0); }} style={{ background: GOLD, color: "#0a0910" }}>
                Back to Library
              </Button>
            </div>
          </div>
        </PortalLayout>
      );
    }

    return (
      <PortalLayout>
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => { setView("library"); setReadingCards([]); setCardIndex(0); }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <X className="w-4 h-4" /> Exit
          </button>
          <ReadingCard
            card={readingCards[cardIndex]}
            index={cardIndex}
            total={readingCards.length}
            onNext={() => setCardIndex((i) => i + 1)}
            onPrev={() => setCardIndex((i) => Math.max(0, i - 1))}
            onDone={() => setCardIndex(readingCards.length)}
          />
        </div>
      </PortalLayout>
    );
  }

  return null;
}
