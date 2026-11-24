// SEO metadata for public routes + HTML shell injection.
// Pure functions only, so this module is unit-testable without a server
// and importable from build scripts.

export interface SeoMeta {
  title: string;
  description: string;
  canonical: string; // absolute URL
  robots?: string; // defaults to "index,follow"
  ogImage?: string;
}

export const SITE_URL = "https://oravini.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/oravini-logo.png`;

const DEFAULT_DESCRIPTION =
  "Oravini is the all-in-one AI platform for creators and personal brands: AI content ideas, competitor intelligence, webinars, video hosting, funnels and Instagram DM automation, tracked and optimized in one place.";

export const DEFAULT_META: SeoMeta = {
  title: "Oravini — AI-Powered Brand Growth Platform",
  description: DEFAULT_DESCRIPTION,
  canonical: `${SITE_URL}/`,
  ogImage: DEFAULT_OG_IMAGE,
};

// Routes whose fully prerendered HTML is generated at build time
// (script/buildMarketingPages.mjs) and served instead of the bare app shell.
export const HOME_PATHS = ["/", "/oravini"];

// Per-route metadata for public pages served from the app shell.
// Guarded app pages are intentionally absent: they fall through to the
// default shell and are excluded in robots.txt.
export const SEO_ROUTES: Record<string, SeoMeta> = {
  "/": DEFAULT_META,
  "/oravini": {
    ...DEFAULT_META,
// Pure functions only, so this module is unit-testable without a server
// and importable from build scripts.

export interface SeoMeta {
  title: string;
  description: string;
  canonical: string; // absolute URL
  robots?: string; // defaults to "index,follow"
  ogImage?: string;
}

export const SITE_URL = "https://oravini.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/oravini-logo.png`;

const DEFAULT_DESCRIPTION =
  "Oravini is the all-in-one AI platform for creators and personal brands: AI content ideas, competitor intelligence, webinars, video hosting, funnels and Instagram DM automation, tracked and optimized in one place.";

export const DEFAULT_META: SeoMeta = {
  title: "Oravini — AI-Powered Brand Growth Platform",
  description: DEFAULT_DESCRIPTION,
  canonical: `${SITE_URL}/`,
  ogImage: DEFAULT_OG_IMAGE,
};

// Routes whose fully prerendered HTML is generated at build time
// (script/buildMarketingPages.mjs) and served instead of the bare app shell.
// Keys are route paths, values are the generated file in dist/public.
export const PRERENDERED_ROUTES: Record<string, string> = {
  "/": "home.html",
  "/oravini": "home.html",
  "/manychat-alternative": "manychat-alternative.html",
  "/vs/manychat": "vs-manychat.html",
  "/instagram-dm-automation": "instagram-dm-automation.html",
  "/webinar-platform": "webinar-platform.html",
};

// Per-route metadata for public pages served from the app shell.
// Guarded app pages are intentionally absent: they fall through to the
// default shell and are excluded in robots.txt.
export const SEO_ROUTES: Record<string, SeoMeta> = {
  "/": DEFAULT_META,
  "/oravini": {
    ...DEFAULT_META,
    canonical: `${SITE_URL}/oravini`,
  },
  "/manychat-alternative": {
    title: "ManyChat Alternative for Creators: Instagram DM Automation + Webinars + Funnels | Oravini",
    description:
      "Looking for a ManyChat alternative? Oravini combines Instagram DM automation with webinars, video hosting, funnels, CRM and AI content tools in one platform built for creators and personal brands.",
    canonical: `${SITE_URL}/manychat-alternative`,
    ogImage: DEFAULT_OG_IMAGE,
  },
  "/vs/manychat": {
    title: "Oravini vs ManyChat: Honest Comparison for Creators (2026) | Oravini",
    description:
      "Oravini vs ManyChat compared feature by feature: DM automation, webinars, funnels, video hosting, CRM, AI tools and pricing model. See which fits a creator business.",
    canonical: `${SITE_URL}/vs/manychat`,
    ogImage: DEFAULT_OG_IMAGE,
  },
  "/instagram-dm-automation": {
    title: "Instagram DM Automation for Creators: Comment-to-DM, Keyword Replies | Oravini",
    description:
      "Automate Instagram DMs: comment-to-DM, keyword auto-replies, story mentions and welcome messages. Oravini connects DM automation to your webinars, funnels and CRM.",
    canonical: `${SITE_URL}/instagram-dm-automation`,
    ogImage: DEFAULT_OG_IMAGE,
  },
  "/webinar-platform": {
    title: "Webinar Platform for Creators & Coaches: Registration → Live → Replay → Sale | Oravini",
    description:
      "A webinar platform built for creators: registration pages, live room with chat, Q&A, polls and offers, automatic replays, and every attendee tracked in your CRM.",
    canonical: `${SITE_URL}/webinar-platform`,
    ogImage: DEFAULT_OG_IMAGE,
  },
  "/preview": {
    title: "Oravini Dashboard Preview — See the AI Growth Platform in Action",
    description:
      "Preview the Oravini dashboard: AI content ideas, competitor tracking, content calendar, webinars and growth analytics for creators and personal brands.",
    canonical: `${SITE_URL}/preview`,
    ogImage: DEFAULT_OG_IMAGE,
  },
  "/video-marketing-landing": {
    title: "Video Marketing — Webinars, VSLs & Video Hosting | Oravini",
    description:
      "Host webinars, deploy VSLs and stream hosted video from one place. Video marketing tools built into the Oravini AI brand growth platform.",
    canonical: `${SITE_URL}/video-marketing-landing`,
    ogImage: DEFAULT_OG_IMAGE,
  },
  "/brandverse": {
    title: "Oravini Elite (Tier 5) — Work With Us | Oravini",
    description:
      "A done-with-you engagement with the Oravini team: unlimited credits and custom scope for brands that want the growth system run with them.",
    canonical: `${SITE_URL}/brandverse`,
    ogImage: DEFAULT_OG_IMAGE,
  },
  "/apply": {
    title: "Apply to Work With Oravini | Oravini",
    description:
      "Apply for Oravini Elite, the done-with-you growth engagement. Tell us about your brand and goals and we review every application.",
    canonical: `${SITE_URL}/apply`,
    ogImage: DEFAULT_OG_IMAGE,
  },
  "/audit": {
    title: "Free AI Brand Audit | Oravini",
    description:
      "Get a free AI-powered audit of your brand: content gaps, competitor position and the exact playbook Oravini would build for you.",
    canonical: `${SITE_URL}/audit`,
    ogImage: DEFAULT_OG_IMAGE,
  },
  // Utility pages: reachable but kept out of the index.
  "/login": {
    title: "Log in | Oravini",
    description: "Log in to your Oravini account.",
    canonical: `${SITE_URL}/login`,
    robots: "noindex,follow",
  },
  "/select-plan": {
    title: "Choose your plan | Oravini",
    description: "Choose your Oravini plan.",
    canonical: `${SITE_URL}/select-plan`,
    robots: "noindex,follow",
  },
  "/onboarding": {
    title: "Onboarding | Oravini",
    description: "Set up your Oravini account.",
    canonical: `${SITE_URL}/onboarding`,
    robots: "noindex,follow",
  },
  "/verify-phone": {
    title: "Verify your phone | Oravini",
    description: "Verify your phone number to continue.",
    canonical: `${SITE_URL}/verify-phone`,
    robots: "noindex,follow",
  },
};

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderMetaTags(meta: SeoMeta): string {
  const robots = meta.robots ?? "index,follow";
  const ogImage = meta.ogImage ?? DEFAULT_OG_IMAGE;
  const description = escapeAttr(meta.description);
  const title = escapeAttr(meta.title);
  return [
    `<meta name="description" content="${description}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${escapeAttr(meta.canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Oravini" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${escapeAttr(meta.canonical)}" />`,
    `<meta property="og:image" content="${escapeAttr(ogImage)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${escapeAttr(ogImage)}" />`,
  ].join("\n    ");
}

// Strips default SEO tags the shell template already carries so the
// injected per-route tags never duplicate them.
function stripExistingSeoTags(html: string): string {
  return html
    .replace(/[ \t]*<meta\b[^>]*name="description"[^>]*>\s*\n?/g, "")
    .replace(/[ \t]*<meta\b[^>]*name="robots"[^>]*>\s*\n?/g, "")
    .replace(/[ \t]*<link\b[^>]*rel="canonical"[^>]*>\s*\n?/g, "")
    .replace(/[ \t]*<meta\b[^>]*property="og:[^"]*"[^>]*>\s*\n?/g, "")
    .replace(/[ \t]*<meta\b[^>]*name="twitter:[^"]*"[^>]*>\s*\n?/g, "");
}

export function injectSeoMeta(indexHtml: string, meta: SeoMeta): string {
  let html = stripExistingSeoTags(indexHtml);
  if (/<title>[\s\S]*?<\/title>/.test(html)) {
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttr(meta.title)}</title>`);
  } else {
    html = html.replace(/<head>/, `<head>\n    <title>${escapeAttr(meta.title)}</title>`);
  }
  return html.replace(/<\/head>/, `    ${renderMetaTags(meta)}\n  </head>`);
}
