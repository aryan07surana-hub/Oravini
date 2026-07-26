"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ParsedDayRequest, PlannerInput, ScheduleBlock } from "@/lib/types";
import styles from "./page.module.css";

const initialState: PlannerInput = {
  wakeTime: "07:00",
  sleepHours: 8,
  workHours: 7,
  breaksHours: 1,
  fixedEvents: [
    { title: "Gym", start: "08:00", end: "09:00" },
    { title: "Lunch with family", start: "13:00", end: "14:00" },
  ],
  tasks: [
    { title: "Client project", hours: 3, priority: "high" },
    { title: "Study AI", hours: 2, priority: "medium" },
    { title: "Admin + email", hours: 1, priority: "low" },
  ],
};

type PlanResponse = {
  schedule: ScheduleBlock[];
  source: "ai" | "fallback";
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

export default function Home() {
  const [form, setForm] = useState(initialState);
  const [result, setResult] = useState<PlanResponse | null>(null);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState(
    "I wake up at 7 am, need 8 hours of sleep, want to work for 7 hours, need breaks for 1 hour, I have gym from 8 am to 9 am, lunch with family from 1 pm to 2 pm, work on client project for 3 hours, study AI for 2 hours, and do admin email for 1 hour.",
  );
  const [parseSource, setParseSource] = useState<ParsedDayRequest["source"] | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isPending, startTransition] = useTransition();
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setSpeechSupported(Boolean(Recognition));

    if (!Recognition) {
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const spokenText = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ");
      setTranscript(spokenText.trim());
    };
    recognition.onerror = () => {
      setIsListening(false);
      setError("Voice capture failed. You can still type your day below.");
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);

  const updateFixedEvent = (index: number, key: "title" | "start" | "end", value: string) => {
    setForm((current) => ({
      ...current,
      fixedEvents: current.fixedEvents.map((event, eventIndex) =>
        eventIndex === index ? { ...event, [key]: value } : event,
      ),
    }));
  };

  const updateTask = (index: number, key: "title" | "hours" | "priority", value: string) => {
    setForm((current) => ({
      ...current,
      tasks: current.tasks.map((task, taskIndex) =>
        taskIndex === index
          ? {
              ...task,
              [key]: key === "hours" ? Number(value) : value,
            }
          : task,
      ),
    }));
  };

  const generatePlan = async () => {
    setError("");

    startTransition(async () => {
      try {
        const parseResponse = await fetch("/api/parse", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ transcript }),
        });

        if (!parseResponse.ok) {
          throw new Error("Could not understand your day description.");
        }

        const parsed = (await parseResponse.json()) as ParsedDayRequest;
        setForm(parsed.input);
        setParseSource(parsed.source);

        const response = await fetch("/api/plan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(parsed.input),
        });

        if (!response.ok) {
          throw new Error("Could not create your plan.");
        }

        const data = (await response.json()) as PlanResponse;
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError("Voice input is not supported in this browser. You can type your day instead.");
      return;
    }

    setError("");

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    recognitionRef.current.start();
    setIsListening(true);
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>AI-powered day planner</p>
          <h1>Tell it your day once. Let it map the whole thing.</h1>
          <p className={styles.lede}>
            Speak naturally about your day, and the app turns that into wake time, sleep, work blocks, events, tasks, and a full schedule.
          </p>
        </div>
        <div className={styles.heroCard}>
          <span>What this handles</span>
          <ul>
            <li>Sleep timing</li>
            <li>Deep-work blocks</li>
            <li>Meetings and fixed plans</li>
            <li>Breaks and flex time</li>
          </ul>
        </div>
      </section>

      <section className={styles.grid}>
        <div className={styles.panel}>
          <h2>Describe your day</h2>
          <div className={styles.voiceCard}>
            <p>
              Example: &quot;I wake up at 7, need 8 hours of sleep, want to work 6 hours, I have gym from 8 to 9, lunch from 1 to
              2, and I need to work on my startup for 3 hours and study for 2 hours.&quot;
            </p>
            <div className={styles.voiceActions}>
              <button type="button" className={styles.secondaryButton} onClick={toggleListening}>
                {isListening ? "Stop listening" : "Start voice input"}
              </button>
              <span>{speechSupported ? "Browser voice input is ready." : "Voice not supported here, but text input still works."}</span>
            </div>
            <textarea
              className={styles.transcript}
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              placeholder="Describe your day in one message..."
              rows={7}
            />
          </div>

          <div className={styles.sectionHeader}>
            <h3>Detected plan inputs</h3>
            <span className={styles.sourceBadge}>
              {parseSource ? `Parsed with ${parseSource === "ai" ? "AI" : "fallback logic"}` : "Waiting for your description"}
            </span>
          </div>

          <div className={styles.fieldGrid}>
            <label>
              Wake time
              <input
                type="time"
                value={form.wakeTime}
                onChange={(event) => setForm((current) => ({ ...current, wakeTime: event.target.value }))}
              />
            </label>
            <label>
              Sleep hours
              <input
                type="number"
                min="4"
                max="12"
                step="0.5"
                value={form.sleepHours}
                onChange={(event) => setForm((current) => ({ ...current, sleepHours: Number(event.target.value) }))}
              />
            </label>
            <label>
              Work hours
              <input
                type="number"
                min="0"
                max="16"
                step="0.5"
                value={form.workHours}
                onChange={(event) => setForm((current) => ({ ...current, workHours: Number(event.target.value) }))}
              />
            </label>
            <label>
              Break hours
              <input
                type="number"
                min="0"
                max="5"
                step="0.25"
                value={form.breaksHours}
                onChange={(event) => setForm((current) => ({ ...current, breaksHours: Number(event.target.value) }))}
              />
            </label>
          </div>

          <div className={styles.sectionHeader}>
            <h3>Fixed events</h3>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  fixedEvents: [...current.fixedEvents, { title: "", start: "09:00", end: "10:00" }],
                }))
              }
            >
              Add event
            </button>
          </div>

          <div className={styles.stack}>
            {form.fixedEvents.map((event, index) => (
              <div className={styles.rowCard} key={`${event.title}-${index}`}>
                <input value={event.title} placeholder="Event name" onChange={(e) => updateFixedEvent(index, "title", e.target.value)} />
                <input type="time" value={event.start} onChange={(e) => updateFixedEvent(index, "start", e.target.value)} />
                <input type="time" value={event.end} onChange={(e) => updateFixedEvent(index, "end", e.target.value)} />
              </div>
            ))}
          </div>

          <div className={styles.sectionHeader}>
            <h3>Tasks</h3>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  tasks: [...current.tasks, { title: "", hours: 1, priority: "medium" }],
                }))
              }
            >
              Add task
            </button>
          </div>

          <div className={styles.stack}>
            {form.tasks.map((task, index) => (
              <div className={styles.taskCard} key={`${task.title}-${index}`}>
                <input value={task.title} placeholder="Task name" onChange={(e) => updateTask(index, "title", e.target.value)} />
                <input type="number" min="0.5" step="0.5" value={task.hours} onChange={(e) => updateTask(index, "hours", e.target.value)} />
                <select value={task.priority} onChange={(e) => updateTask(index, "priority", e.target.value)}>
                  <option value="high">High priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="low">Low priority</option>
                </select>
              </div>
            ))}
          </div>

          <button type="button" className={styles.primaryButton} onClick={generatePlan} disabled={isPending}>
            {isPending ? "Understanding and planning..." : "Generate my day"}
          </button>

          <p className={styles.helper}>
            Add `OPENAI_API_KEY` in `.env.local` for AI-powered transcript parsing and smarter schedule generation. Without it, the app still works with local parsing and planning.
          </p>

          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        <div className={styles.panel}>
          <div className={styles.resultHeader}>
            <div>
              <h2>Your planned day</h2>
              <p>{result ? `Generated with ${result.source === "ai" ? "AI" : "the built-in planner"}` : "Preview — generate to personalize"}</p>
            </div>
          </div>

          <div className={styles.timeline}>
            {result ? (
              result.schedule.map((block, index) => (
                <article className={`${styles.block} ${styles[block.type]}`} key={`${block.title}-${block.start}-${index}`}>
                  <div className={styles.time}>
                    <strong>{block.start}</strong>
                    <span>{block.end}</span>
                  </div>
                  <div>
                    <h3>{block.title}</h3>
                    {block.notes ? <p>{block.notes}</p> : null}
                  </div>
                </article>
              ))
            ) : (
              <>
                <article className={`${styles.block} ${styles.sleep}`}>
                  <div className={styles.time}><strong>07:00</strong><span>07:30</span></div>
                  <div><h3>Wake up &amp; morning routine</h3><p>Ease into the day</p></div>
                </article>
                <article className={`${styles.block} ${styles.fixed}`}>
                  <div className={styles.time}><strong>08:00</strong><span>09:00</span></div>
                  <div><h3>Gym</h3><p>Fixed event</p></div>
                </article>
                <article className={`${styles.block} ${styles.task}`}>
                  <div className={styles.time}><strong>09:15</strong><span>12:15</span></div>
                  <div><h3>Client project</h3><p>High priority · 3 hrs deep work</p></div>
                </article>
                <article className={`${styles.block} ${styles.break}`}>
                  <div className={styles.time}><strong>12:15</strong><span>12:45</span></div>
                  <div><h3>Break</h3><p>Rest and recharge</p></div>
                </article>
                <article className={`${styles.block} ${styles.fixed}`}>
                  <div className={styles.time}><strong>13:00</strong><span>14:00</span></div>
                  <div><h3>Lunch with family</h3><p>Fixed event</p></div>
                </article>
                <article className={`${styles.block} ${styles.task}`}>
                  <div className={styles.time}><strong>14:15</strong><span>16:15</span></div>
                  <div><h3>Study AI</h3><p>Medium priority · 2 hrs focused</p></div>
                </article>
                <article className={`${styles.block} ${styles.task}`}>
                  <div className={styles.time}><strong>16:30</strong><span>17:30</span></div>
                  <div><h3>Admin + email</h3><p>Low priority · 1 hr</p></div>
                </article>
                <article className={`${styles.block} ${styles.buffer}`}>
                  <div className={styles.time}><strong>17:30</strong><span>18:30</span></div>
                  <div><h3>Buffer / flex time</h3><p>Catch-up or wind down</p></div>
                </article>
                <article className={`${styles.block} ${styles.sleep}`}>
                  <div className={styles.time}><strong>23:00</strong><span>07:00</span></div>
                  <div><h3>Sleep</h3><p>8 hours</p></div>
                </article>
              </>
            )}
          </div>
        </div>
      </section>

      {/* AI Video Studio section */}
      <section className={styles.videoStudioSection}>
        <div className={styles.videoStudioHeader}>
          <p className={styles.videoStudioEyebrow}>Powered by Higgsfield</p>
          <h2>Generate AI Videos. Right Inside Your Platform.</h2>
          <p className={styles.videoStudioSub}>
            6 state-of-the-art models. Pay per generation. No subscriptions to individual tools.
          </p>
          <div className={styles.freeVideoBadge}>
            🎬 Every account gets <strong>2 free AI videos per week</strong> — no card needed
          </div>
        </div>

        <div className={styles.videoModelGrid}>
          <div className={styles.videoModelCard}>
            <div className={styles.videoModelTag}>Popular</div>
            <div className={styles.videoModelName}>Kling 2.6</div>
            <div className={styles.videoModelProvider}>by Kling</div>
            <div className={styles.videoModelDesc}>Cinematic motion, advanced physics, native audio</div>
            <div className={styles.videoModelMeta}>
              <span>5s – 10s</span>
              <span className={styles.videoModelCredits}>from 24 credits</span>
            </div>
          </div>

          <div className={styles.videoModelCard}>
            <div className={styles.videoModelTag}>4K Quality</div>
            <div className={styles.videoModelName}>Seedance 2.0</div>
            <div className={styles.videoModelProvider}>by ByteDance</div>
            <div className={styles.videoModelDesc}>Reference-driven identity, 4K capable, multi-SKU</div>
            <div className={styles.videoModelMeta}>
              <span>5s – 15s</span>
              <span className={styles.videoModelCredits}>from 30 credits</span>
            </div>
          </div>

          <div className={styles.videoModelCard}>
            <div className={styles.videoModelTag}>Fast</div>
            <div className={styles.videoModelName}>Seedance Mini</div>
            <div className={styles.videoModelProvider}>by ByteDance</div>
            <div className={styles.videoModelDesc}>Budget Seedance 2.0 — fast turnaround, full audio</div>
            <div className={styles.videoModelMeta}>
              <span>5s – 15s</span>
              <span className={styles.videoModelCredits}>from 18 credits</span>
            </div>
          </div>

          <div className={styles.videoModelCard}>
            <div className={styles.videoModelTag}>Creative</div>
            <div className={styles.videoModelName}>Wan 2.6</div>
            <div className={styles.videoModelProvider}>by Wan</div>
            <div className={styles.videoModelDesc}>Open-weight, stylized, experimental creative output</div>
            <div className={styles.videoModelMeta}>
              <span>5s – 15s</span>
              <span className={styles.videoModelCredits}>from 17 credits</span>
            </div>
          </div>

          <div className={styles.videoModelCard}>
            <div className={styles.videoModelTag}>Cinematic</div>
            <div className={styles.videoModelName}>Minimax Hailuo</div>
            <div className={styles.videoModelProvider}>by Hailuo</div>
            <div className={styles.videoModelDesc}>Natural physics, facial emotion, realistic motion</div>
            <div className={styles.videoModelMeta}>
              <span>6s – 10s</span>
              <span className={styles.videoModelCredits}>from 33 credits</span>
            </div>
          </div>

          <div className={`${styles.videoModelCard} ${styles.videoModelPremium}`}>
            <div className={styles.videoModelTag}>Premium</div>
            <div className={styles.videoModelName}>Cinema Studio 3.0</div>
            <div className={styles.videoModelProvider}>by Higgsfield</div>
            <div className={styles.videoModelDesc}>Most advanced cinema-grade AI model. Genre control, 4K, audio</div>
            <div className={styles.videoModelMeta}>
              <span>5s – 15s</span>
              <span className={styles.videoModelCredits}>from 40 credits</span>
            </div>
          </div>
        </div>

        <div className={styles.videoStudioCta}>
          <a href="/video-marketing/platform" className={styles.videoStudioBtn}>
            Open AI Video Studio
          </a>
          <span className={styles.videoStudioCtaNote}>1 credit = $0.01 · Pay only for what you generate</span>
        </div>
      </section>

      <section className={styles.pricingSection}>
        <div className={styles.pricingHeader}>
          <h2>Choose Your Plan</h2>
          <p>Start free. Add AI video models whenever you&apos;re ready.</p>
        </div>

        <div className={styles.freeVideoCallout}>
          🎬 <strong>Every account gets 2 free AI video generations per week</strong> — no credit card needed.
        </div>

        <div className={styles.pricingGrid}>
          <div className={styles.pricingCard}>
            <h3>Free</h3>
            <p className={styles.price}>$0<span>/mo</span></p>
            <ul className={styles.features}>
              <li>✓ 150 AI credits/month</li>
              <li>✓ 2 free AI videos/week</li>
              <li>✓ AI Day Planner</li>
              <li>✓ Basic scheduling</li>
              <li>✓ Community support</li>
            </ul>
            <a href="/pricing" className={styles.pricingButton}>Get Started Free</a>
          </div>

          <div className={styles.pricingCard}>
            <h3>Starter</h3>
            <p className={styles.price}>$19<span>/mo</span></p>
            <ul className={styles.features}>
              <li>✓ 400 AI credits/month</li>
              <li>✓ Unlimited daily plans</li>
              <li>✓ Full audit access</li>
              <li>✓ AI Video Models (add-on)</li>
              <li>✓ Email support</li>
            </ul>
            <a href="/pricing" className={styles.pricingButton}>Get Started</a>
          </div>

          <div className={styles.pricingCard}>
            <h3>Growth</h3>
            <p className={styles.price}>$49<span>/mo</span></p>
            <ul className={styles.features}>
              <li>✓ 1,000 AI credits/month</li>
              <li>✓ AI Video Models (add-on)</li>
              <li>✓ Video Marketing (add-on)</li>
              <li>✓ API access</li>
              <li>✓ Priority support</li>
            </ul>
            <a href="/pricing" className={styles.pricingButton}>Get Started</a>
          </div>

          <div className={`${styles.pricingCard} ${styles.featured}`}>
            <span className={styles.popularBadge}>Best Value</span>
            <h3>Pro</h3>
            <p className={styles.price}>$69<span>/mo</span></p>
            <ul className={styles.features}>
              <li>✓ 2,500 AI credits/month</li>
              <li>✓ AI Video Models — FREE</li>
              <li>✓ Kling 2.6 · Seedance 2.0 · Wan 2.6 · Cinema Studio</li>
              <li>✓ Video Marketing — FREE</li>
              <li>✓ Dedicated manager</li>
            </ul>
            <a href="/pricing" className={styles.pricingButton}>Get Started</a>
          </div>

          <div className={styles.pricingCard}>
            <h3>Enterprise</h3>
            <p className={styles.price}>$99<span>/mo</span></p>
            <ul className={styles.features}>
              <li>✓ 7,000 AI credits/month</li>
              <li>✓ All AI video models included</li>
              <li>✓ Video Marketing included</li>
              <li>✓ White-glove onboarding</li>
              <li>✓ Custom SLA</li>
            </ul>
            <a href="/pricing" className={styles.pricingButton}>Work With Us</a>
          </div>
        </div>

        <div className={styles.modelsShowcase}>
          <p className={styles.modelsLabel}>AI Video Models — powered by Higgsfield</p>
          <div className={styles.modelPills}>
            <span>Kling 2.6 · from 24cr · cinematic motion</span>
            <span>Seedance 2.0 · from 30cr · 4K identity</span>
            <span>Seedance Mini · from 18cr · fast &amp; budget</span>
            <span>Wan 2.6 · from 17cr · stylized creative</span>
            <span>Minimax Hailuo · from 33cr · natural physics</span>
            <span>Cinema Studio 3.0 · from 40cr · premium film</span>
          </div>
          <p className={styles.modelsNote}>1 credit = $0.01 · Pay only for what you generate · Audio generation included</p>
        </div>
      </section>
    </main>
  );
}
