import { useState, useEffect, useCallback, useRef } from "react";
import { Music2, Pause, Play, Volume2, VolumeX, ChevronUp, ChevronDown, X, Wifi } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   TRACK DEFINITIONS
───────────────────────────────────────────────────────────── */
type TrackKind = "stream" | "synth";

interface Track {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  kind: TrackKind;
  url?: string;       // for stream tracks
  synth?: SynthType;  // for synth tracks
  color: string;
  category: "music" | "nature" | "focus";
}

type SynthType = "rain" | "heavy-rain" | "ocean" | "forest" | "fire" | "white-noise" | "brown-noise";

const TRACKS: Track[] = [
  // ── Music
  { id: "groovesalad",      label: "Lo-fi Chill",       emoji: "☕", desc: "Soft ambient beats",       kind: "stream", url: "https://ice6.somafm.com/groovesalad-128-mp3",      color: "#a78bfa", category: "music" },
  { id: "dronezone",        label: "Deep Focus",         emoji: "🌌", desc: "Cinematic ambience",       kind: "stream", url: "https://ice6.somafm.com/dronezone-128-mp3",         color: "#60a5fa", category: "music" },
  { id: "spacestation",     label: "Space Station",      emoji: "🚀", desc: "Weightless & calm",        kind: "stream", url: "https://ice6.somafm.com/spacestation-128-mp3",      color: "#34d399", category: "music" },
  { id: "beatblender",      label: "Deep House",         emoji: "🎹", desc: "Smooth focus grooves",     kind: "stream", url: "https://ice6.somafm.com/beatblender-128-mp3",       color: "#f472b6", category: "music" },
  { id: "suburbsofgoa",     label: "Zen Flow",           emoji: "🌊", desc: "Eastern calm vibes",       kind: "stream", url: "https://ice6.somafm.com/suburbsofgoa-128-mp3",     color: "#fb923c", category: "music" },
  { id: "fluid",            label: "New Age",            emoji: "✨", desc: "Crystal clarity",          kind: "stream", url: "https://ice6.somafm.com/fluid-128-mp3",            color: "#e879f9", category: "music" },
  { id: "sonicuniverse",    label: "Jazz Fusion",        emoji: "🎷", desc: "Smooth jazz & chill",      kind: "stream", url: "https://ice6.somafm.com/sonicuniverse-128-mp3",    color: "#fbbf24", category: "music" },
  { id: "gsclassic",        label: "Classical Focus",    emoji: "🎻", desc: "Orchestral calm",          kind: "stream", url: "https://ice6.somafm.com/gsclassic-128-mp3",        color: "#f9a8d4", category: "music" },
  // ── Nature / Synth
  { id: "rain",             label: "Rain Shower",        emoji: "🌧️", desc: "Gentle steady rain",       kind: "synth", synth: "rain",        color: "#93c5fd", category: "nature" },
  { id: "heavy-rain",       label: "Thunderstorm",       emoji: "⛈️", desc: "Heavy rain & thunder",     kind: "synth", synth: "heavy-rain",  color: "#818cf8", category: "nature" },
  { id: "ocean",            label: "Ocean Waves",        emoji: "🌊", desc: "Rolling sea shore",        kind: "synth", synth: "ocean",       color: "#22d3ee", category: "nature" },
  { id: "forest",           label: "Forest & Birds",     emoji: "🌿", desc: "Nature ambience",          kind: "synth", synth: "forest",      color: "#4ade80", category: "nature" },
  { id: "fire",             label: "Fireplace",          emoji: "🔥", desc: "Crackling warm fire",      kind: "synth", synth: "fire",        color: "#f97316", category: "nature" },
  // ── Focus
  { id: "white-noise",      label: "White Noise",        emoji: "🤍", desc: "Pure focus static",        kind: "synth", synth: "white-noise", color: "#e4e4e7", category: "focus" },
  { id: "brown-noise",      label: "Brown Noise",        emoji: "🟤", desc: "Deep rich rumble",         kind: "synth", synth: "brown-noise", color: "#d97706", category: "focus" },
];

/* ─────────────────────────────────────────────────────────────
   MODULE-LEVEL AUDIO SINGLETON
   Lives outside React — survives component remounts / navigation
───────────────────────────────────────────────────────────── */
let _stream: HTMLAudioElement | null = null;
let _ctx: AudioContext | null = null;
let _gainNode: GainNode | null = null;
let _sourceNode: AudioBufferSourceNode | OscillatorNode | null = null;
let _lfoNode: OscillatorNode | null = null;
let _lfoGain: GainNode | null = null;
let _activeId: string = "groovesalad";
let _playing = false;
let _volume = 0.45;
let _muted = false;
let _listeners: Array<() => void> = [];

function notifyListeners() {
  _listeners.forEach(fn => fn());
}

function subscribe(fn: () => void) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

/* ─── Synth generators ────────────────────────────────────── */
function getCtx() {
  if (!_ctx || _ctx.state === "closed") {
    _ctx = new AudioContext();
  }
  if (_ctx.state === "suspended") {
    _ctx.resume();
  }
  return _ctx;
}

function makePinkNoise(ctx: AudioContext, seconds = 3) {
  const bufSize = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(2, bufSize, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buf.getChannelData(c);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufSize; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }
  return buf;
}

function makeBrownNoise(ctx: AudioContext, seconds = 3) {
  const bufSize = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(2, bufSize, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buf.getChannelData(c);
    let last = 0;
    for (let i = 0; i < bufSize; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return buf;
}

function makeWhiteNoise(ctx: AudioContext, seconds = 3) {
  const bufSize = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(2, bufSize, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buf.getChannelData(c);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

function stopSynth() {
  try { _lfoNode?.stop(); } catch {}
  try { _sourceNode?.stop(); } catch {}
  try { _lfoNode?.disconnect(); } catch {}
  try { _sourceNode?.disconnect(); } catch {}
  try { _lfoGain?.disconnect(); } catch {}
  try { _gainNode?.disconnect(); } catch {}
  _sourceNode = null;
  _lfoNode = null;
  _lfoGain = null;
  _gainNode = null;
}

function startSynth(type: SynthType, vol: number) {
  stopSynth();
  const ctx = getCtx();
  const gain = ctx.createGain();
  gain.gain.value = _muted ? 0 : vol;
  _gainNode = gain;

  if (type === "white-noise") {
    const src = ctx.createBufferSource();
    src.buffer = makeWhiteNoise(ctx);
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.value = 4000;
    filt.Q.value = 0.5;
    src.connect(filt);
    filt.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    _sourceNode = src;

  } else if (type === "brown-noise") {
    const src = ctx.createBufferSource();
    src.buffer = makeBrownNoise(ctx);
    src.loop = true;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    _sourceNode = src;

  } else if (type === "rain") {
    const src = ctx.createBufferSource();
    src.buffer = makePinkNoise(ctx);
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 2200;
    src.connect(filt);
    filt.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    _sourceNode = src;

  } else if (type === "heavy-rain") {
    // Heavier rain: pink noise + periodic thunder simulation
    const src = ctx.createBufferSource();
    src.buffer = makePinkNoise(ctx);
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 3500;

    // LFO for gentle intensity variation
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.15;
    lfo.connect(lfoG);
    lfoG.connect(gain.gain);
    lfo.start();
    _lfoNode = lfo;
    _lfoGain = lfoG;

    src.connect(filt);
    filt.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    _sourceNode = src;

    // Periodic thunder rumbles (brown noise bursts)
    scheduleThunder(ctx, gain);

  } else if (type === "ocean") {
    const src = ctx.createBufferSource();
    src.buffer = makePinkNoise(ctx);
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 900;

    // LFO for wave rhythm — slow oscillation ~0.13 Hz (~8 sec cycle)
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.13;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.3;
    lfo.connect(lfoG);
    lfoG.connect(gain.gain);
    lfo.start();
    _lfoNode = lfo;
    _lfoGain = lfoG;

    src.connect(filt);
    filt.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    _sourceNode = src;

  } else if (type === "forest") {
    // Layered: gentle brown base + high-freq pink texture (birds/leaves)
    const src = ctx.createBufferSource();
    src.buffer = makeBrownNoise(ctx);
    src.loop = true;
    const filt1 = ctx.createBiquadFilter();
    filt1.type = "lowpass";
    filt1.frequency.value = 600;

    const src2 = ctx.createBufferSource();
    src2.buffer = makePinkNoise(ctx);
    src2.loop = true;
    const filt2 = ctx.createBiquadFilter();
    filt2.type = "highpass";
    filt2.frequency.value = 3000;
    const g2 = ctx.createGain();
    g2.gain.value = 0.3;

    // LFO for gentle wind variation
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.05;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.1;
    lfo.connect(lfoG);
    lfoG.connect(gain.gain);
    lfo.start();
    _lfoNode = lfo;
    _lfoGain = lfoG;

    src.connect(filt1);
    filt1.connect(gain);
    src2.connect(filt2);
    filt2.connect(g2);
    g2.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    src2.start();
    _sourceNode = src;

  } else if (type === "fire") {
    // Fire: brown noise + random crackling via band-pass + LFO
    const src = ctx.createBufferSource();
    src.buffer = makeBrownNoise(ctx);
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.value = 500;
    filt.Q.value = 0.8;

    // Crackling LFO
    const lfo = ctx.createOscillator();
    lfo.type = "sawtooth";
    lfo.frequency.value = 3.5;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.2;
    lfo.connect(lfoG);
    lfoG.connect(gain.gain);
    lfo.start();
    _lfoNode = lfo;
    _lfoGain = lfoG;

    src.connect(filt);
    filt.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    _sourceNode = src;
  }
}

// Schedule random thunder rumbles in the background
function scheduleThunder(ctx: AudioContext, masterGain: GainNode) {
  const interval = 15000 + Math.random() * 25000; // 15–40s
  setTimeout(() => {
    try {
      if (_ctx !== ctx) return; // audio context changed — stop scheduling
      const rumble = ctx.createBufferSource();
      rumble.buffer = makeBrownNoise(ctx, 1.5);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, ctx.currentTime);
      env.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.3);
      env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
      const filt = ctx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.value = 200;
      rumble.connect(filt);
      filt.connect(env);
      env.connect(masterGain);
      rumble.start();
      rumble.stop(ctx.currentTime + 3);
      scheduleThunder(ctx, masterGain);
    } catch {}
  }, interval);
}

/* ─── Stream control ──────────────────────────────────────── */
function stopStream() {
  if (_stream) {
    _stream.pause();
    _stream.src = "";
    _stream = null;
  }
}

async function startStream(url: string, vol: number): Promise<boolean> {
  stopStream();
  const audio = new Audio(url);
  audio.volume = _muted ? 0 : vol;
  audio.preload = "none";
  _stream = audio;
  try {
    await audio.play();
    return true;
  } catch {
    // Try after a short delay (browser autoplay policy)
    return new Promise(resolve => {
      audio.addEventListener("canplay", async () => {
        try { await audio.play(); resolve(true); } catch { resolve(false); }
      }, { once: true });
      audio.addEventListener("error", () => resolve(false), { once: true });
      audio.load();
    });
  }
}

/* ─── Main play / stop ────────────────────────────────────── */
async function audioPlay(trackId: string): Promise<void> {
  _activeId = trackId;
  const track = TRACKS.find(t => t.id === trackId)!;

  // Stop whatever was playing
  stopStream();
  stopSynth();

  if (track.kind === "stream") {
    const ok = await startStream(track.url!, _volume);
    _playing = ok;
  } else {
    startSynth(track.synth!, _volume);
    _playing = true;
  }
  notifyListeners();
}

function audioPause() {
  stopStream();
  stopSynth();
  _playing = false;
  notifyListeners();
}

function audioSetVolume(vol: number) {
  _volume = vol;
  _muted = vol === 0;
  if (_stream) _stream.volume = _muted ? 0 : vol;
  if (_gainNode) _gainNode.gain.value = _muted ? 0 : vol;
  notifyListeners();
}

function audioSetMuted(m: boolean) {
  _muted = m;
  if (_stream) _stream.volume = m ? 0 : _volume;
  if (_gainNode) _gainNode.gain.value = m ? 0 : _volume;
  notifyListeners();
}

/* ─── Restore when page becomes visible again ─────────────── */
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    // If we were playing a stream, resume it (browser may have suspended it)
    if (_playing && _stream) {
      _stream.play().catch(() => {});
    }
    // AudioContext may have been suspended by the browser
    if (_playing && _ctx && _ctx.state === "suspended") {
      _ctx.resume();
    }
  });
}

/* ─────────────────────────────────────────────────────────────
   STORAGE
───────────────────────────────────────────────────────────── */
const STORAGE_KEY = "focus-music-prefs-v2";
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}
function savePrefs() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ trackId: _activeId, volume: _volume })); } catch {}
}

// Restore prefs on module load
const _prefs = loadPrefs();
if (_prefs) {
  _activeId = _prefs.trackId ?? "groovesalad";
  _volume = _prefs.volume ?? 0.45;
}

/* ─────────────────────────────────────────────────────────────
   REACT COMPONENT
───────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { id: "music", label: "Music" },
  { id: "nature", label: "Nature" },
  { id: "focus", label: "Focus" },
] as const;

export default function FocusMusicPlayer() {
  const [, forceUpdate] = useState(0);
  const rerender = useCallback(() => forceUpdate(n => n + 1), []);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<"music" | "nature" | "focus">("music");

  // Subscribe to singleton changes
  useEffect(() => subscribe(rerender), [rerender]);

  const track = TRACKS.find(t => t.id === _activeId)!;

  const handlePlayPause = useCallback(async () => {
    if (_playing) {
      audioPause();
    } else {
      setLoading(true);
      await audioPlay(_activeId);
      savePrefs();
      setLoading(false);
    }
  }, []);

  const handleTrackSwitch = useCallback(async (id: string) => {
    setLoading(true);
    const wasPlaying = _playing;
    _activeId = id;
    if (wasPlaying) {
      await audioPlay(id);
    } else {
      stopStream();
      stopSynth();
      _activeId = id;
      notifyListeners();
    }
    savePrefs();
    setLoading(false);
  }, []);

  const handleVolume = useCallback((v: number) => {
    audioSetVolume(v);
    savePrefs();
  }, []);

  const filteredTracks = TRACKS.filter(t => t.category === activeCategory);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2" data-testid="focus-music-player">

      {/* ── Expanded panel ── */}
      {open && (
        <div
          className="w-76 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          style={{
            width: 300,
            background: "rgba(12,12,16,0.98)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(212,180,97,0.15)" }}>
                <Music2 className="w-3 h-3" style={{ color: "#d4b461" }} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-white leading-none">Focus Music</p>
                <p className="text-[9px] text-zinc-600 mt-0.5 leading-none">Keeps playing across all pages</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors" data-testid="music-player-close">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Now playing */}
          <div className="px-4 pt-3 pb-2">
            <div
              className="rounded-xl px-3 py-3 flex items-center gap-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 relative"
                style={{ background: `${track.color}18`, border: `1px solid ${track.color}28` }}
              >
                {track.emoji}
                {_playing && !loading && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex gap-px items-end h-3">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-0.5 rounded-full"
                        style={{ background: track.color, height: `${6 + i * 3}px`, animation: `eq-bar 0.8s ${i * 0.15}s ease-in-out infinite alternate` }} />
                    ))}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white truncate">{track.label}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {track.kind === "stream" && <Wifi className="w-2.5 h-2.5 text-zinc-600 flex-shrink-0" />}
                  <p className="text-[10px] text-zinc-500">{loading ? "Loading…" : track.desc}</p>
                </div>
              </div>
              <button
                onClick={handlePlayPause}
                disabled={loading}
                data-testid="music-play-pause"
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{ background: "#d4b461" }}
              >
                {loading
                  ? <div className="w-3 h-3 border-2 border-black/40 border-t-transparent rounded-full animate-spin" />
                  : _playing
                  ? <Pause className="w-3.5 h-3.5 text-black" fill="currentColor" />
                  : <Play className="w-3.5 h-3.5 text-black ml-0.5" fill="currentColor" />
                }
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => audioSetMuted(!_muted)} className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0" data-testid="music-mute">
                {_muted || _volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range" min={0} max={1} step={0.01}
                value={_muted ? 0 : _volume}
                onChange={e => handleVolume(parseFloat(e.target.value))}
                className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #d4b461 ${(_muted ? 0 : _volume) * 100}%, rgba(255,255,255,0.1) ${(_muted ? 0 : _volume) * 100}%)`, accentColor: "#d4b461" }}
                data-testid="music-volume"
              />
              <span className="text-[10px] text-zinc-600 w-6 text-right flex-shrink-0">
                {Math.round((_muted ? 0 : _volume) * 100)}
              </span>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex px-4 gap-1 pb-2">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                style={{
                  background: activeCategory === c.id ? "rgba(212,180,97,0.12)" : "transparent",
                  color: activeCategory === c.id ? "#d4b461" : "rgba(255,255,255,0.35)",
                  border: activeCategory === c.id ? "1px solid rgba(212,180,97,0.25)" : "1px solid transparent",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Track list */}
          <div className="px-3 pb-3 space-y-0.5 overflow-y-auto" style={{ maxHeight: 240 }}>
            {filteredTracks.map(t => {
              const isActive = _activeId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleTrackSwitch(t.id)}
                  data-testid={`music-track-${t.id}`}
                  aria-pressed={isActive}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all"
                  style={{
                    background: isActive ? `${t.color}12` : "transparent",
                    border: isActive ? `1px solid ${t.color}28` : "1px solid transparent",
                  }}
                >
                  <span className="text-base leading-none">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold leading-none" style={{ color: isActive ? t.color : "rgba(255,255,255,0.75)" }}>
                      {t.label}
                    </p>
                    <p className="text-[9px] text-zinc-600 mt-0.5 leading-none">{t.desc}</p>
                  </div>
                  {isActive && _playing && !loading && (
                    <span className="flex gap-px items-end h-3 flex-shrink-0">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-0.5 rounded-full"
                          style={{ background: t.color, height: `${4 + i * 2}px`, animation: `eq-bar 0.9s ${i * 0.2}s ease-in-out infinite alternate` }} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-[9px] text-zinc-700 text-center pb-3">
            Music by{" "}
            <a href="https://somafm.com" target="_blank" rel="noreferrer" className="underline hover:text-zinc-500 transition-colors">SomaFM</a>
            {" · "}Nature sounds synthesised locally
          </p>
        </div>
      )}

      {/* ── Floating trigger ── */}
      <button
        onClick={() => setOpen(v => !v)}
        data-testid="music-player-trigger"
        className="relative flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-2xl shadow-xl transition-all hover:scale-[1.04] active:scale-[0.97]"
        style={{
          background: open ? "rgba(212,180,97,0.12)" : "rgba(12,12,16,0.96)",
          border: `1px solid ${_playing ? "rgba(212,180,97,0.4)" : "rgba(255,255,255,0.08)"}`,
          backdropFilter: "blur(16px)",
          boxShadow: _playing ? "0 0 20px rgba(212,180,97,0.15), 0 4px 24px rgba(0,0,0,0.6)" : "0 4px 24px rgba(0,0,0,0.5)",
        }}
      >
        {_playing && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black animate-pulse" />}
        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,180,97,0.12)" }}>
          {loading
            ? <div className="w-3 h-3 border-2 border-[#d4b461]/40 border-t-[#d4b461] rounded-full animate-spin" />
            : <Music2 className="w-3.5 h-3.5" style={{ color: "#d4b461" }} />
          }
        </div>
        <div className="text-left leading-none">
          {_playing
            ? (<><p className="text-[10px] font-bold text-white">{track.emoji} {track.label}</p><p className="text-[9px] text-zinc-500 mt-0.5">Focus mode on</p></>)
            : <p className="text-[11px] font-semibold text-zinc-400">Focus Music</p>
          }
        </div>
        {open ? <ChevronDown className="w-3 h-3 text-zinc-600 ml-1" /> : <ChevronUp className="w-3 h-3 text-zinc-600 ml-1" />}
      </button>

      <style>{`
        @keyframes eq-bar { from { transform: scaleY(0.35); } to { transform: scaleY(1); } }
      `}</style>
    </div>
  );
}
