const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const BASE = "https://www.googleapis.com/youtube/v3";

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

export function extractYouTubeChannelId(url: string): { type: "id" | "handle" | "user"; value: string } | null {
  if (!url) return null;
  const id = url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/)?.[1];
  if (id) return { type: "id", value: id };
  const handle = url.match(/youtube\.com\/@([a-zA-Z0-9_.-]+)/)?.[1];
  if (handle) return { type: "handle", value: handle };
  const user = url.match(/youtube\.com\/user\/([a-zA-Z0-9_.-]+)/)?.[1];
  if (user) return { type: "user", value: user };
  return null;
}

export interface YTVideoStats {
  views: number;
  likes: number;
  comments: number;
  title: string;
  description: string;
  duration: string;
  publishedAt: string;
  thumbnailUrl: string;
  channelTitle: string;
  channelId: string;
  contentType: "short" | "video";
}

export interface YTChannelStats {
  channelId: string;
  title: string;
  handle: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  thumbnailUrl: string;
  description: string;
}

function parseDuration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return iso;
  const h = parseInt(m[1] || "0");
  const min = parseInt(m[2] || "0");
  const s = parseInt(m[3] || "0");
  if (h > 0) return `${h}:${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${min}:${String(s).padStart(2, "0")}`;
}

export async function getYouTubeVideoStats(videoId: string): Promise<YTVideoStats | null> {
  if (!YOUTUBE_API_KEY) throw new Error("YOUTUBE_API_KEY not set");
  const url = `${BASE}/videos?part=statistics,snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`YouTube API error ${resp.status}: ${err}`);
  }
  const data = await resp.json();
  const item = data.items?.[0];
  if (!item) return null;

  const stats = item.statistics || {};
  const snippet = item.snippet || {};
  const details = item.contentDetails || {};
  const durationIso = details.duration || "PT0S";
  const durationSec = (() => {
    const m = durationIso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return 0;
    return (parseInt(m[1] || "0") * 3600) + (parseInt(m[2] || "0") * 60) + parseInt(m[3] || "0");
  })();

  return {
    views: parseInt(stats.viewCount || "0"),
    likes: parseInt(stats.likeCount || "0"),
    comments: parseInt(stats.commentCount || "0"),
    title: snippet.title || "",
    description: snippet.description || "",
    duration: parseDuration(durationIso),
    publishedAt: snippet.publishedAt || "",
    thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || "",
    channelTitle: snippet.channelTitle || "",
    channelId: snippet.channelId || "",
    contentType: durationSec <= 60 ? "short" : "video",
  };
}

export async function getYouTubeChannelStats(channelRef: { type: "id" | "handle" | "user"; value: string }): Promise<YTChannelStats | null> {
  if (!YOUTUBE_API_KEY) throw new Error("YOUTUBE_API_KEY not set");

  let searchUrl: string;
  if (channelRef.type === "id") {
    searchUrl = `${BASE}/channels?part=statistics,snippet&id=${channelRef.value}&key=${YOUTUBE_API_KEY}`;
  } else if (channelRef.type === "handle") {
    searchUrl = `${BASE}/channels?part=statistics,snippet&forHandle=${encodeURIComponent("@" + channelRef.value)}&key=${YOUTUBE_API_KEY}`;
  } else {
    searchUrl = `${BASE}/channels?part=statistics,snippet&forUsername=${encodeURIComponent(channelRef.value)}&key=${YOUTUBE_API_KEY}`;
  }

  const resp = await fetch(searchUrl);
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`YouTube API error ${resp.status}: ${err}`);
  }
  const data = await resp.json();
  const item = data.items?.[0];
  if (!item) return null;

  const stats = item.statistics || {};
  const snippet = item.snippet || {};

  return {
    channelId: item.id,
    title: snippet.title || "",
    handle: snippet.customUrl || "",
    subscribers: parseInt(stats.subscriberCount || "0"),
    totalViews: parseInt(stats.viewCount || "0"),
    videoCount: parseInt(stats.videoCount || "0"),
    thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || "",
    description: snippet.description || "",
  };
}

export async function getYouTubeChannelRecentVideos(channelId: string, maxResults = 20): Promise<YTVideoStats[]> {
  if (!YOUTUBE_API_KEY) throw new Error("YOUTUBE_API_KEY not set");

  const searchUrl = `${BASE}/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
  const searchResp = await fetch(searchUrl);
  if (!searchResp.ok) throw new Error(`YouTube search API error ${searchResp.status}`);
  const searchData = await searchResp.json();
  const videoIds: string[] = (searchData.items || []).map((item: any) => item.id?.videoId).filter(Boolean);
  if (!videoIds.length) return [];

  const statsUrl = `${BASE}/videos?part=statistics,snippet,contentDetails&id=${videoIds.join(",")}&key=${YOUTUBE_API_KEY}`;
  const statsResp = await fetch(statsUrl);
  if (!statsResp.ok) throw new Error(`YouTube videos API error ${statsResp.status}`);
  const statsData = await statsResp.json();

  return (statsData.items || []).map((item: any) => {
    const stats = item.statistics || {};
    const snippet = item.snippet || {};
    const details = item.contentDetails || {};
    const durationIso = details.duration || "PT0S";
    const durationSec = (() => {
      const m = durationIso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!m) return 0;
      return (parseInt(m[1] || "0") * 3600) + (parseInt(m[2] || "0") * 60) + parseInt(m[3] || "0");
    })();
    return {
      views: parseInt(stats.viewCount || "0"),
      likes: parseInt(stats.likeCount || "0"),
      comments: parseInt(stats.commentCount || "0"),
      title: snippet.title || "",
      description: snippet.description || "",
      duration: parseDuration(durationIso),
      publishedAt: snippet.publishedAt || "",
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || "",
      channelTitle: snippet.channelTitle || "",
      channelId: snippet.channelId || "",
      contentType: (durationSec <= 60 ? "short" : "video") as "short" | "video",
      videoId: item.id,
      videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
    };
  });
}
