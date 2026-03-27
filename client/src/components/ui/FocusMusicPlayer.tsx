import { useState, useRef, useEffect, useCallback } from "react";
import { Music2, Pause, Play, Volume2, VolumeX, ChevronUp, ChevronDown, X } from "lucide-react";

const TRACKS = [
  {
    id: "groovesalad",
    label: "Lo-fi Chill",
    emoji: "☕",
    desc: "Soft ambient beats",
    url: "https://ice6.somafm.com/groovesalad-128-mp3",
    color: "#a78bfa",
  },
  {
    id: "dronezone",
    label: "Deep Focus",
    emoji: "🌌",
    desc: "Cinematic ambience",
    url: "https://ice6.somafm.com/dronezone-128-mp3",
    color: "#60a5fa",
  },
  {
    id: "spacestation",
    label: "Space Station",
    emoji: "🚀",
    desc: "Weightless & calm",
    url: "https://ice6.somafm.com/spacestation-128-mp3",
    color: "#34d399",
  },
  {
    id: "beatblender",
    label: "Deep House",
    emoji: "🎹",
    desc: "Smooth focus grooves",
    url: "https://ice6.somafm.com/beatblender-128-mp3",
    color: "#f472b6",
  },
  {
    id: "suburbsofgoa",
    label: "Zen Flow",
    emoji: "🌊",
    desc: "Eastern calm vibes",
    url: "https://ice6.somafm.com/suburbsofgoa-128-mp3",
    color: "#fb923c",
  },
] as const;

type TrackId = (typeof TRACKS)[number]["id"];

const STORAGE_KEY = "focus-music-prefs";

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { trackId: TrackId; volume: number };
  } catch {
    return null;
  }
}

function savePrefs(trackId: TrackId, volume: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ trackId, volume }));
  } catch {}
}

export default function FocusMusicPlayer() {
  const prefs = loadPrefs();
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(prefs?.volume ?? 0.45);
  const [muted, setMuted] = useState(false);
  const [activeTrack, setActiveTrack] = useState<TrackId>(prefs?.trackId ?? "groovesalad");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const track = TRACKS.find(t => t.id === activeTrack)!;

  const setupAudio = useCallback((trackUrl: string, vol: number, mute: boolean) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    const audio = new Audio(trackUrl);
    audio.volume = mute ? 0 : vol;
    audio.preload = "none";
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;
    return audio;
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  const play = useCallback(async (trackId: TrackId, vol: number, mute: boolean) => {
    const t = TRACKS.find(x => x.id === trackId)!;
    setLoading(true);
    setError(false);
    const audio = setupAudio(t.url, vol, mute);

    const onCanPlay = async () => {
      setLoading(false);
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setError(true);
        setPlaying(false);
      }
    };

    const onError = () => {
      setLoading(false);
      setError(true);
      setPlaying(false);
    };

    audio.addEventListener("canplay", onCanPlay, { once: true });
    audio.addEventListener("error", onError, { once: true });
    audio.load();

    setTimeout(() => {
      if (loading) {
        setLoading(false);
        onCanPlay();
      }
    }, 3000);
  }, [setupAudio]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlaying(false);
  }, []);

  const togglePlay = useCallback(async () => {
    if (playing) {
      pause();
    } else {
      await play(activeTrack, volume, muted);
    }
  }, [playing, pause, play, activeTrack, volume, muted]);

  const switchTrack = useCallback(async (trackId: TrackId) => {
    setActiveTrack(trackId);
    savePrefs(trackId, volume);
    setError(false);
    if (playing) {
      await play(trackId, volume, muted);
    }
  }, [playing, volume, muted, play]);

  const changeVolume = useCallback((val: number) => {
    setVolume(val);
    setMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
    savePrefs(activeTrack, val);
  }, [activeTrack]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    if (audioRef.current) {
      audioRef.current.volume = next ? 0 : volume;
    }
  }, [muted, volume]);

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2"
      data-testid="focus-music-player"
    >
      {/* Expanded panel */}
      {open && (
        <div
          className="w-72 rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: "rgba(15,15,17,0.97)",
            border: "1px solid rgba(255,255,255,0.09)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "rgba(212,180,97,0.15)" }}
              >
                <Music2 className="w-3 h-3" style={{ color: "#d4b461" }} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-white leading-none">Focus Music</p>
                <p className="text-[9px] text-zinc-500 mt-0.5 leading-none">Powered by SomaFM</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
              data-testid="music-player-close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Now playing */}
          <div className="px-4 py-3">
            <div
              className="rounded-xl px-4 py-3 mb-3 flex items-center gap-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 relative"
                style={{ background: `${track.color}18`, border: `1px solid ${track.color}30` }}
              >
                {track.emoji}
                {playing && !loading && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex gap-px items-end h-3">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="w-0.5 rounded-full"
                        style={{
                          background: track.color,
                          height: `${6 + i * 3}px`,
                          animation: `eq-bar 0.8s ${i * 0.15}s ease-in-out infinite alternate`,
                        }}
                      />
                    ))}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{track.label}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {loading ? "Connecting…" : error ? "Stream unavailable" : track.desc}
                </p>
              </div>
              <button
                onClick={togglePlay}
                disabled={loading}
                data-testid="music-play-pause"
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{ background: "#d4b461" }}
              >
                {loading ? (
                  <div className="w-3 h-3 border-2 border-black/40 border-t-transparent rounded-full animate-spin" />
                ) : playing ? (
                  <Pause className="w-3.5 h-3.5 text-black" fill="currentColor" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-black ml-0.5" fill="currentColor" />
                )}
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={toggleMute}
                className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
                data-testid="music-mute"
              >
                {muted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={e => changeVolume(parseFloat(e.target.value))}
                className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #d4b461 ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.1) ${(muted ? 0 : volume) * 100}%)`,
                  accentColor: "#d4b461",
                }}
                data-testid="music-volume"
              />
              <span className="text-[10px] text-zinc-600 w-6 text-right flex-shrink-0">
                {Math.round((muted ? 0 : volume) * 100)}
              </span>
            </div>

            {/* Track list */}
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2 px-0.5">Channels</p>
            <div className="space-y-1">
              {TRACKS.map(t => (
                <button
                  key={t.id}
                  onClick={() => switchTrack(t.id)}
                  data-testid={`music-track-${t.id}`}
                  aria-pressed={activeTrack === t.id}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all"
                  style={{
                    background: activeTrack === t.id
                      ? `${t.color}12`
                      : "rgba(255,255,255,0.02)",
                    border: activeTrack === t.id
                      ? `1px solid ${t.color}30`
                      : "1px solid transparent",
                  }}
                >
                  <span className="text-sm">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[11px] font-semibold leading-none"
                      style={{ color: activeTrack === t.id ? t.color : "rgba(255,255,255,0.7)" }}
                    >
                      {t.label}
                    </p>
                    <p className="text-[9px] text-zinc-600 mt-0.5 leading-none">{t.desc}</p>
                  </div>
                  {activeTrack === t.id && playing && !loading && (
                    <span className="flex gap-px items-end h-3">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="w-0.5 rounded-full"
                          style={{
                            background: t.color,
                            height: `${5 + i * 2}px`,
                            animation: `eq-bar 0.9s ${i * 0.2}s ease-in-out infinite alternate`,
                          }}
                        />
                      ))}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <p className="text-[9px] text-zinc-700 text-center mt-3">
              Free music by{" "}
              <a
                href="https://somafm.com"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-zinc-500 transition-colors"
              >
                SomaFM
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        data-testid="music-player-trigger"
        className="relative flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-2xl shadow-xl transition-all hover:scale-[1.04] active:scale-[0.97]"
        style={{
          background: open
            ? "rgba(212,180,97,0.15)"
            : "rgba(15,15,17,0.95)",
          border: `1px solid ${playing ? "rgba(212,180,97,0.4)" : "rgba(255,255,255,0.09)"}`,
          backdropFilter: "blur(16px)",
          boxShadow: playing
            ? "0 0 18px rgba(212,180,97,0.18), 0 4px 24px rgba(0,0,0,0.6)"
            : "0 4px 24px rgba(0,0,0,0.5)",
        }}
      >
        {/* Live indicator */}
        {playing && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black animate-pulse" />
        )}

        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(212,180,97,0.12)" }}
        >
          {loading ? (
            <div className="w-3 h-3 border-2 border-[#d4b461]/40 border-t-[#d4b461] rounded-full animate-spin" />
          ) : (
            <Music2 className="w-3.5 h-3.5" style={{ color: "#d4b461" }} />
          )}
        </div>

        <div className="text-left leading-none">
          {playing ? (
            <>
              <p className="text-[10px] font-bold text-white">{track.emoji} {track.label}</p>
              <p className="text-[9px] text-zinc-500 mt-0.5">Focus mode on</p>
            </>
          ) : (
            <p className="text-[11px] font-semibold text-zinc-400">Focus Music</p>
          )}
        </div>

        {open ? (
          <ChevronDown className="w-3 h-3 text-zinc-600 ml-1" />
        ) : (
          <ChevronUp className="w-3 h-3 text-zinc-600 ml-1" />
        )}
      </button>

      <style>{`
        @keyframes eq-bar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
