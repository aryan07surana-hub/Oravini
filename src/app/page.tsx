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
              <p>{result ? `Generated with ${result.source === "ai" ? "AI" : "the built-in planner"}` : "No plan yet"}</p>
            </div>
          </div>

          <div className={styles.timeline}>
            {(result?.schedule ?? []).map((block, index) => (
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
            ))}

            {!result ? (
              <div className={styles.emptyState}>
                <p>Your full-day timeline will show up here after you generate a plan.</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className={styles.pricingSection}>
        <div className={styles.pricingHeader}>
          <h2>Choose Your Plan</h2>
          <p>Select the perfect tier for your needs</p>
        </div>

        <div className={styles.pricingGrid}>
          <div className={styles.pricingCard}>
            <h3>Free</h3>
            <p className={styles.price}>$0<span>/mo</span></p>
            <ul className={styles.features}>
              <li>✓ 20 AI credits/month</li>
              <li>✓ AI Day Planner</li>
              <li>✓ Basic scheduling</li>
              <li>✓ Community support</li>
            </ul>
            <a href="/pricing" className={styles.pricingButton}>Get Started</a>
          </div>

          <div className={styles.pricingCard}>
            <h3>Starter</h3>
            <p className={styles.price}>$19<span>/mo</span></p>
            <ul className={styles.features}>
              <li>✓ 100 AI credits/month</li>
              <li>✓ Unlimited daily plans</li>
              <li>✓ Full audit access</li>
              <li>✓ Email support</li>
            </ul>
            <a href="/pricing" className={styles.pricingButton}>Get Started</a>
          </div>

          <div className={`${styles.pricingCard} ${styles.featured}`}>
            <span className={styles.popularBadge}>Most Popular</span>
            <h3>Growth</h3>
            <p className={styles.price}>$49<span>/mo</span></p>
            <ul className={styles.features}>
              <li>✓ 250 AI credits/month</li>
              <li>✓ Video Marketing (+$20/mo)</li>
              <li>✓ API access</li>
              <li>✓ Priority support</li>
            </ul>
            <a href="/pricing" className={styles.pricingButton}>Get Started</a>
          </div>

          <div className={styles.pricingCard}>
            <h3>Pro</h3>
            <p className={styles.price}>$59<span>/mo</span></p>
            <ul className={styles.features}>
              <li>✓ 500 AI credits/month</li>
              <li>✓ Video Marketing FREE</li>
              <li>✓ Unlimited team members</li>
              <li>✓ Dedicated manager</li>
            </ul>
            <a href="/pricing" className={styles.pricingButton}>Get Started</a>
          </div>

          <div className={styles.pricingCard}>
            <h3>Enterprise</h3>
            <p className={styles.price}>Custom</p>
            <ul className={styles.features}>
              <li>✓ Unlimited AI credits</li>
              <li>✓ Video Marketing Included</li>
              <li>✓ White-glove onboarding</li>
              <li>✓ Custom development</li>
            </ul>
            <a href="/pricing" className={styles.pricingButton}>Work With Us</a>
          </div>
        </div>
      </section>
    </main>
  );
}
