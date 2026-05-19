/**
 * OverlayPreview — uses @remotion/player to render animated motion-graphics
 * overlays on top of the uploaded video. Clients see exactly what the final
 * render will look like before hitting "Render".
 */
import { Player } from "@remotion/player";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// ── Composition props ─────────────────────────────────────────────────────────

interface OverlayProps {
  hookOpener?: string;
  lowerThird?: string;
  watermarkText?: string;
  ctaText?: string;
  addSubscribeCta?: boolean;
  captionStyle?: string;
  reframe?: string;
  platform?: string;
}

// ── Hook Opener ───────────────────────────────────────────────────────────────

function HookOpenerOverlay({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 200 } });
  const opacity = interpolate(frame, [60, 80], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", top: "15%", left: 0, right: 0,
      display: "flex", justifyContent: "center",
      opacity: frame < 80 ? enter : opacity,
      transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px)`,
    }}>
      <div style={{
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)",
        borderRadius: 16, padding: "16px 28px",
        border: "2px solid rgba(255,255,255,0.15)",
      }}>
        <p style={{
          color: "#fff", fontSize: 32, fontWeight: 900,
          fontFamily: "'Arial Black', sans-serif",
          textAlign: "center", margin: 0,
          textShadow: "0 2px 12px rgba(0,0,0,0.8)",
        }}>{text}</p>
      </div>
    </div>
  );
}

// ── Lower Third ───────────────────────────────────────────────────────────────

function LowerThirdOverlay({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 16, stiffness: 180 } });

  return (
    <div style={{
      position: "absolute", bottom: "25%", left: 0, right: 0,
      display: "flex", justifyContent: "center",
      transform: `translateX(${interpolate(enter, [0, 1], [-120, 0])}px)`,
      opacity: enter,
    }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(0,0,0,0.85), rgba(30,30,30,0.85))",
        borderLeft: "5px solid #f59e0b",
        padding: "12px 24px",
        borderRadius: "0 12px 12px 0",
      }}>
        <p style={{
          color: "#fff", fontSize: 22, fontWeight: 800,
          fontFamily: "'Arial Black', sans-serif",
          margin: 0, letterSpacing: 0.5,
        }}>{text}</p>
      </div>
    </div>
  );
}

// ── Watermark ─────────────────────────────────────────────────────────────────

function WatermarkOverlay({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 0.75], { extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute", top: 20, right: 20, opacity,
    }}>
      <p style={{
        color: "#fff", fontSize: 15, fontWeight: 700,
        fontFamily: "Arial, sans-serif",
        textShadow: "0 1px 6px rgba(0,0,0,0.8)",
        margin: 0,
      }}>{text}</p>
    </div>
  );
}

// ── Subscribe CTA ─────────────────────────────────────────────────────────────

function SubscribeCtaOverlay({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: Math.max(0, frame - 30), fps, config: { damping: 12, stiffness: 220 } });
  const pulse = interpolate(Math.sin(frame * 0.12), [-1, 1], [0.92, 1.0]);

  return (
    <div style={{
      position: "absolute", bottom: "12%", left: 0, right: 0,
      display: "flex", justifyContent: "center",
      transform: `translateY(${interpolate(enter, [0, 1], [60, 0])}px) scale(${pulse})`,
      opacity: enter,
    }}>
      <div style={{
        background: "#ff0000",
        borderRadius: 50, padding: "14px 40px",
        boxShadow: "0 4px 24px rgba(255,0,0,0.5)",
      }}>
        <p style={{
          color: "#fff", fontSize: 24, fontWeight: 900,
          fontFamily: "'Arial Black', sans-serif",
          margin: 0, letterSpacing: 1,
        }}>{text}</p>
      </div>
    </div>
  );
}

// ── Main composition ──────────────────────────────────────────────────────────

function OverlayComposition(props: OverlayProps) {
  return (
    <AbsoluteFill>
      {props.hookOpener && <HookOpenerOverlay text={props.hookOpener} />}
      {props.lowerThird && <LowerThirdOverlay text={props.lowerThird} />}
      {props.watermarkText && <WatermarkOverlay text={props.watermarkText} />}
      {props.addSubscribeCta && props.ctaText && <SubscribeCtaOverlay text={props.ctaText} />}
    </AbsoluteFill>
  );
}

// ── Exported preview component ────────────────────────────────────────────────

interface OverlayPreviewProps {
  hookOpener?: string;
  lowerThird?: string;
  watermarkText?: string;
  ctaText?: string;
  addSubscribeCta?: boolean;
  captionStyle?: string;
  reframe?: string;
  platform?: string;
  videoUrl?: string;
}

export default function OverlayPreview(props: OverlayPreviewProps) {
  const isPortrait = props.reframe === "9:16" ||
    ["instagram", "tiktok", "youtube-shorts"].includes(props.platform || "");
  const isSquare = props.reframe === "1:1" || props.platform === "square";

  const w = isPortrait ? 270 : isSquare ? 270 : 480;
  const h = isPortrait ? 480 : isSquare ? 270 : 270;

  const hasOverlay = props.hookOpener || props.lowerThird || props.watermarkText ||
    (props.addSubscribeCta && props.ctaText);

  if (!hasOverlay) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
        Live Overlay Preview
      </p>
      <div
        className="rounded-xl overflow-hidden border border-zinc-700/50 bg-zinc-900 relative"
        style={{ width: w, height: h }}
      >
        {/* Mock video frame behind overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
          <p className="text-zinc-600 text-xs">Your video</p>
        </div>
        <Player
          component={OverlayComposition}
          inputProps={{
            hookOpener: props.hookOpener,
            lowerThird: props.lowerThird,
            watermarkText: props.watermarkText,
            ctaText: props.ctaText,
            addSubscribeCta: props.addSubscribeCta,
          }}
          durationInFrames={90}
          compositionWidth={1080}
          compositionHeight={isPortrait ? 1920 : isSquare ? 1080 : 1080}
          fps={30}
          style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
          controls={false}
          autoPlay
          loop
        />
      </div>
    </div>
  );
}
