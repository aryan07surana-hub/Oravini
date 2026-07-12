"use client";

import { useEffect, useRef, useState } from "react";
import { getVideoMarketingAccess, type User } from "@/lib/access-control";
import { MODELS, type HiggsfieldModel } from "@/lib/higgsfield";
import styles from "./platform.module.css";

type JobStatus = "idle" | "pending" | "processing" | "completed" | "failed";

type GeneratedVideo = {
  jobId: string;
  prompt: string;
  model: string;
  status: JobStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  creditsUsed: number;
  createdAt: Date;
};

const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:3"];

export default function VideoMarketingPlatform() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);

  // Generator state
  const [selectedModel, setSelectedModel] = useState<HiggsfieldModel>(MODELS[0]);
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(MODELS[0].defaultDuration);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [generateAudio, setGenerateAudio] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Job tracking
  const [activeJob, setActiveJob] = useState<GeneratedVideo | null>(null);
  const [history, setHistory] = useState<GeneratedVideo[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/user").then((r) => r.json()),
      fetch("/api/credits/balance").then((r) => r.json()),
    ]).then(([userData, creditsData]) => {
      setUser(userData.user);
      setCredits(creditsData.remaining ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const access = getVideoMarketingAccess(user);

  const creditCost = selectedModel.credits[duration] ?? Object.values(selectedModel.credits)[0];

  const selectModel = (model: HiggsfieldModel) => {
    setSelectedModel(model);
    setDuration(model.defaultDuration);
    if (!model.supportsAudio) setGenerateAudio(false);
  };

  const startPolling = (jobId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/video/jobs/${jobId}`);
        const data = await res.json();

        if (data.status === "completed" || data.status === "failed") {
          clearInterval(pollRef.current!);
          setActiveJob((prev) => prev ? { ...prev, status: data.status, videoUrl: data.videoUrl, thumbnailUrl: data.thumbnailUrl } : null);
          setHistory((prev) => prev.map((v) => v.jobId === jobId
            ? { ...v, status: data.status, videoUrl: data.videoUrl, thumbnailUrl: data.thumbnailUrl }
            : v
          ));
          setGenerating(false);
          // refresh credits
          fetch("/api/credits/balance").then((r) => r.json()).then((d) => setCredits(d.remaining));
        } else {
          setActiveJob((prev) => prev ? { ...prev, status: data.status } : null);
        }
      } catch {
        clearInterval(pollRef.current!);
        setGenerating(false);
      }
    }, 4000);
  };

  const generate = async () => {
    if (!prompt.trim()) { setError("Enter a prompt first."); return; }
    if (credits !== null && credits < creditCost) { setError("Not enough credits."); return; }
    setError("");
    setGenerating(true);

    try {
      const res = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel.id, prompt, duration, aspectRatio, generateAudio }),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.error ?? "Generation failed."); setGenerating(false); return; }

      const job: GeneratedVideo = {
        jobId: data.jobId,
        prompt,
        model: selectedModel.name,
        status: "pending",
        creditsUsed: data.creditsUsed,
        createdAt: new Date(),
      };
      setActiveJob(job);
      setHistory((prev) => [job, ...prev]);
      startPolling(data.jobId);
    } catch {
      setError("Network error. Try again.");
      setGenerating(false);
    }
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  if (loading) return <div className={styles.loading}>Loading...</div>;

  if (!access.canUse) {
    return (
      <div className={styles.locked}>
        <h1>🔒 AI Video Studio</h1>
        <p>{access.reason}</p>
        <a href="/pricing" className={styles.upgradeButton}>View Plans & Upgrade</a>
      </div>
    );
  }

  return (
    <main className={styles.platform}>
      <a href="/" className={styles.backLink}>← Back to Oravini</a>

      <header className={styles.header}>
        <div>
          <h1>AI Video Studio</h1>
          <p className={styles.headerSub}>Generate with Kling · Seedance · Wan · Minimax · Cinema Studio</p>
        </div>
        <div className={styles.userInfo}>
          <span className={styles.creditsBadge}>
            {credits !== null ? `${credits} credits` : "—"}
          </span>
          <span className={styles.tierBadge}>{user?.tier?.toUpperCase()}</span>
        </div>
      </header>

      <div className={styles.studio}>
        {/* Left — controls */}
        <div className={styles.controls}>
          {/* Model picker */}
          <div className={styles.section}>
            <h2>Choose Model</h2>
            <div className={styles.modelGrid}>
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  className={`${styles.modelCard} ${selectedModel.id === m.id ? styles.modelSelected : ""}`}
                  onClick={() => selectModel(m)}
                >
                  <span className={styles.modelTag}>{m.tag}</span>
                  <div className={styles.modelName}>{m.name}</div>
                  <div className={styles.modelProvider}>{m.provider}</div>
                  <div className={styles.modelDesc}>{m.description}</div>
                  {m.supportsAudio && <div className={styles.audioChip}>🔊 Audio</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div className={styles.section}>
            <h2>Prompt</h2>
            <textarea
              className={styles.promptInput}
              rows={4}
              placeholder="Describe your video in detail... e.g. 'A serene mountain lake at sunrise with mist rising from the water, cinematic 4K'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          {/* Settings row */}
          <div className={styles.section}>
            <h2>Settings</h2>
            <div className={styles.settingsRow}>
              <label className={styles.settingGroup}>
                <span>Duration</span>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className={styles.select}
                >
                  {selectedModel.durations.map((d) => (
                    <option key={d} value={d}>{d}s</option>
                  ))}
                </select>
              </label>

              <label className={styles.settingGroup}>
                <span>Aspect Ratio</span>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className={styles.select}
                >
                  {selectedModel.aspectRatios.filter((r) => ASPECT_RATIOS.includes(r)).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>

              {selectedModel.supportsAudio && (
                <label className={styles.settingGroup}>
                  <span>Audio</span>
                  <div className={styles.toggleRow}>
                    <label className={styles.toggle}>
                      <input type="checkbox" checked={generateAudio} onChange={(e) => setGenerateAudio(e.target.checked)} />
                      <span className={styles.slider} />
                    </label>
                    <span className={styles.toggleLabel}>{generateAudio ? "On" : "Off"}</span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Generate CTA */}
          <div className={styles.generateSection}>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.costRow}>
              <span>Cost: <strong>{creditCost} credits</strong></span>
              <span className={styles.costDollar}>(${(creditCost * 0.01).toFixed(2)})</span>
            </div>
            <button
              className={styles.generateBtn}
              onClick={generate}
              disabled={generating || !prompt.trim()}
            >
              {generating ? "Generating..." : `Generate Video · ${creditCost} credits`}
            </button>
          </div>
        </div>

        {/* Right — output */}
        <div className={styles.output}>
          {/* Active job */}
          {activeJob && (
            <div className={styles.section}>
              <h2>Current Generation</h2>
              <div className={styles.activeJob}>
                <div className={styles.jobMeta}>
                  <span className={`${styles.statusBadge} ${styles[activeJob.status]}`}>
                    {activeJob.status === "pending" && "⏳ Queued"}
                    {activeJob.status === "processing" && "⚙️ Generating..."}
                    {activeJob.status === "completed" && "✅ Done"}
                    {activeJob.status === "failed" && "❌ Failed"}
                  </span>
                  <span className={styles.jobModel}>{activeJob.model}</span>
                  <span className={styles.jobCredits}>{activeJob.creditsUsed} credits</span>
                </div>
                <p className={styles.jobPrompt}>&ldquo;{activeJob.prompt}&rdquo;</p>

                {(activeJob.status === "pending" || activeJob.status === "processing") && (
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} />
                  </div>
                )}

                {activeJob.status === "completed" && activeJob.videoUrl && (
                  <video
                    className={styles.videoPlayer}
                    src={activeJob.videoUrl}
                    controls
                    autoPlay
                    loop
                  />
                )}

                {activeJob.status === "failed" && (
                  <p className={styles.failMessage}>Generation failed. Credits not charged.</p>
                )}
              </div>
            </div>
          )}

          {/* History */}
          <div className={styles.section}>
            <h2>Your Videos</h2>
            {history.length === 0 ? (
              <div className={styles.emptyHistory}>
                <p>No videos yet. Generate your first one.</p>
              </div>
            ) : (
              <div className={styles.historyGrid}>
                {history.map((v) => (
                  <div key={v.jobId} className={styles.historyCard}>
                    {v.videoUrl ? (
                      <video className={styles.historyThumb} src={v.videoUrl} muted loop onMouseEnter={(e) => (e.target as HTMLVideoElement).play()} onMouseLeave={(e) => (e.target as HTMLVideoElement).pause()} />
                    ) : (
                      <div className={styles.historyPlaceholder}>
                        {v.status === "failed" ? "❌" : "⏳"}
                      </div>
                    )}
                    <div className={styles.historyMeta}>
                      <p className={styles.historyPrompt}>{v.prompt.slice(0, 60)}{v.prompt.length > 60 ? "…" : ""}</p>
                      <span className={styles.historyModel}>{v.model}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
