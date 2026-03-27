import { useState, useEffect } from "react";

const FACTS = [
  { emoji: "📈", text: "Content marketing generates 3× more leads than paid search — at 62% lower cost." },
  { emoji: "🎥", text: "Video content gets 1,200% more shares than text and image combined." },
  { emoji: "📸", text: "Instagram posts with faces receive 38% more engagement than those without." },
  { emoji: "📧", text: "Email marketing delivers $42 back for every $1 spent — a 4,200% ROI." },
  { emoji: "🔄", text: "Carousel posts have the highest reach and saves on Instagram across all content types." },
  { emoji: "⚡", text: "Brands that post consistently grow 3× faster than those with inconsistent schedules." },
  { emoji: "🧠", text: "The human brain processes visuals 60,000× faster than text." },
  { emoji: "📱", text: "Short-form video content has the highest ROI of any social media format in 2024." },
  { emoji: "🎯", text: "LinkedIn generates 277% more leads than Facebook and Twitter combined." },
  { emoji: "✍️", text: "Blog posts over 1,500 words get 68% more tweets and 22% more likes." },
  { emoji: "🌟", text: "91% of consumers want to see more online video content from the brands they follow." },
  { emoji: "💡", text: "Reels on Instagram get 2× more reach than any other type of post." },
  { emoji: "📊", text: "Interactive content generates 2× more conversions than passive content." },
  { emoji: "🔑", text: "Posts with at least one hashtag get 12.6% more engagement on average." },
  { emoji: "🏆", text: "Brands with an active blog generate 67% more leads per month than those without." },
  { emoji: "⏱️", text: "You have 8 seconds to capture attention — shorter than a goldfish's attention span." },
  { emoji: "💬", text: "70% of consumers prefer learning about a brand through articles, not ads." },
  { emoji: "🖼️", text: "46% of marketers say photography and visual content is critical to their strategy." },
  { emoji: "🚀", text: "Stories receive 3× more engagement per viewer than standard feed posts." },
  { emoji: "💼", text: "Thought leadership content on LinkedIn gets 3× more impressions than regular posts." },
  { emoji: "🎨", text: "Consistent brand presentation across all platforms increases revenue by 23%." },
  { emoji: "📣", text: "User-generated content is 42% more effective at driving conversions than branded content." },
  { emoji: "🌐", text: "Content marketing costs 62% less than traditional outbound marketing." },
  { emoji: "🔥", text: "Brands that tell stories see 22× more recall than those that just share facts." },
];

interface Props {
  label?: string;
  minMs?: number;
  isComplete?: boolean;
  onReady?: () => void;
}

export default function GeneratingScreen({ label = "your content", minMs = 47000, isComplete = false, onReady }: Props) {
  const [factIdx, setFactIdx] = useState(0);
  const [fade, setFade] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [minDone, setMinDone] = useState(false);
  const [ready, setReady] = useState(false);

  // Rotate facts every 5-7 seconds
  useEffect(() => {
    const delays = FACTS.map(() => 5000 + Math.random() * 2000);
    let ti = 0;
    const next = () => {
      setFade(false);
      setTimeout(() => {
        setFactIdx(i => (i + 1) % FACTS.length);
        setFade(true);
      }, 400);
      ti = window.setTimeout(next, delays[factIdx % delays.length]);
    };
    ti = window.setTimeout(next, delays[0]);
    return () => clearTimeout(ti);
  }, []);

  // Count elapsed time (tick every 100ms)
  useEffect(() => {
    const iv = setInterval(() => setElapsed(e => e + 100), 100);
    return () => clearInterval(iv);
  }, []);

  // Mark min time done
  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), minMs);
    return () => clearTimeout(t);
  }, [minMs]);

  // Fire onReady when both conditions met
  useEffect(() => {
    if (isComplete && minDone && !ready) {
      setReady(true);
      onReady?.();
    }
  }, [isComplete, minDone, ready, onReady]);

  const progress = Math.min(elapsed / minMs, 1);
  const circumference = 2 * Math.PI * 52;
  const dash = circumference * (1 - progress);
  const seconds = Math.ceil((minMs - elapsed) / 1000);
  const fact = FACTS[factIdx];

  // Animated dot colors cycle
  const dots = ["bg-primary", "bg-primary/60", "bg-primary/30"];

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center px-6">
      {/* Background ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-primary/3 blur-2xl" />
      </div>

      <div className="relative flex flex-col items-center gap-10 max-w-sm w-full">

        {/* Circle Progress */}
        <div className="relative flex items-center justify-center">
          <svg width="128" height="128" className="rotate-[-90deg]">
            <circle cx="64" cy="64" r="52" fill="none" stroke="rgba(212,180,97,0.08)" strokeWidth="6" />
            <circle
              cx="64" cy="64" r="52"
              fill="none"
              stroke="#d4b461"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dash}
              style={{ transition: "stroke-dashoffset 0.3s ease" }}
            />
          </svg>
          {/* Inner icon + time */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <div className="text-2xl font-black text-primary tabular-nums">
              {seconds > 0 ? seconds : "✓"}
            </div>
            <div className="text-[10px] text-zinc-600 font-medium">
              {seconds > 0 ? "seconds" : "done"}
            </div>
          </div>
        </div>

        {/* Label */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-black text-white">Building {label}…</h2>
          <div className="flex items-center justify-center gap-1.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`rounded-full ${dots[i]} animate-bounce`}
                style={{ width: 6, height: 6, animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>
        </div>

        {/* Rotating Fact Card */}
        <div className={`w-full rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 transition-opacity duration-400 ${fade ? "opacity-100" : "opacity-0"}`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0 mt-0.5">{fact.emoji}</span>
            <div>
              <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1.5">Did you know?</p>
              <p className="text-sm text-zinc-300 leading-relaxed font-medium">{fact.text}</p>
            </div>
          </div>
          <div className="flex gap-1 mt-4 justify-center">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`h-0.5 rounded-full transition-all ${i === factIdx % 5 ? "bg-primary w-4" : "bg-zinc-700 w-2"}`} />
            ))}
          </div>
        </div>

        {/* Process steps */}
        <div className="space-y-2 w-full">
          {[
            { label: "Analysing your brand & niche", done: progress > 0.1 },
            { label: "Writing tailored copy & content", done: progress > 0.3 },
            { label: "Structuring layouts & flow", done: progress > 0.55 },
            { label: "Optimising for your goal", done: progress > 0.75 },
            { label: "Final polish & quality check", done: progress > 0.92 },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3 text-xs text-zinc-500">
              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${step.done ? "bg-primary border-primary" : "border-zinc-700"}`}>
                {step.done && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
              </div>
              <span className={step.done ? "text-zinc-300" : "text-zinc-600"}>{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
