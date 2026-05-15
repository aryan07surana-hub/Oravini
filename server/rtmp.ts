// @ts-ignore - node-media-server has no types
import NodeMediaServer from "node-media-server";
import path from "path";
import fs from "fs";

const HLS_DIR = path.resolve("hls");
const RTMP_PORT = parseInt(process.env.RTMP_PORT || "1935", 10);
const HTTP_PORT = parseInt(process.env.RTMP_HTTP_PORT || "8000", 10);

if (!fs.existsSync(HLS_DIR)) fs.mkdirSync(HLS_DIR, { recursive: true });

let nms: NodeMediaServer | null = null;

export function getHlsDir(): string {
  return HLS_DIR;
}

export function getHttpPort(): number {
  return HTTP_PORT;
}

export function startRtmpServer(): NodeMediaServer {
  if (nms) return nms;

  const config = {
    rtmp: {
      port: RTMP_PORT,
      chunk_size: 60000,
      gop_cache: true,
      ping: 30,
      ping_timeout: 60,
    },
    http: {
      port: HTTP_PORT,
      allow_origin: "*",
      mediaroot: HLS_DIR,
    },
    relay: {
      ffmpeg: "/opt/homebrew/bin/ffmpeg",
      tasks: [],
    },
    trans: {
      ffmpeg: "/opt/homebrew/bin/ffmpeg",
      tasks: [
        {
          app: "live",
          hls: true,
          hlsFlags: "[hls_time=2][hls_list_size=30][hls_flags=delete_segments+append_list]",
          dash: false,
          dashFlags: "",
        },
      ],
    },
  };

  nms = new NodeMediaServer(config);
  nms.run();

  console.log(`[rtmp] RTMP server on port ${RTMP_PORT}`);
  console.log(`[rtmp] HLS HTTP server on port ${HTTP_PORT}`);
  console.log(`[rtmp] HLS output: ${HLS_DIR}`);

  nms.on("prePublish", async (session: any) => {
    const streamPath: string = session?.streamPath || "";
    const parts = streamPath.split("/");
    const streamKey = parts[parts.length - 1];
    if (streamKey) {
      console.log(`[rtmp] Publishing: ${streamKey}`);
      const { startHlsTranscode } = await import("./hls-transcoder");
      startHlsTranscode(streamKey);
    } else {
      console.log(`[rtmp] Publishing: ${streamPath}`);
    }
  });

  nms.on("donePublish", async (session: any) => {
    const streamPath: string = session?.streamPath || "";
    const parts = streamPath.split("/");
    const streamKey = parts[parts.length - 1];
    if (streamKey) {
      console.log(`[rtmp] Stream ended: ${streamKey}`);
      const { stopHlsTranscode } = await import("./hls-transcoder");
      stopHlsTranscode(streamKey);
    } else {
      console.log(`[rtmp] Stream ended: ${streamPath}`);
    }
  });

  return nms;
}

export function stopRtmpServer(): void {
  if (nms) {
    try { nms.stop(); } catch {}
    nms = null;
  }
}
