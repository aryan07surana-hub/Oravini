import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  DEFAULT_META,
  PRERENDERED_ROUTES,
  SEO_ROUTES,
  injectSeoMeta,
} from "./seoMeta";
import { matchesSpaRoute } from "./spaRoutes";

let distPath: string;

try {
  distPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "public"
  );
} catch {
  distPath = path.resolve(process.cwd(), "dist", "public");
}

// Cache policy for static assets:
// - /assets/* are Vite content-hashed bundles: safe to cache for a year.
// - Other files in public/ (logo, favicon, video, robots.txt, sitemap.xml)
//   change in place, so they get a day at most.
// - HTML (shell + prerendered pages) always revalidates so deploys show
//   immediately.
function staticCacheHeaders(res: express.Response, filePath: string) {
  if (/[/\\]assets[/\\]/.test(filePath)) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else if (!/\.html?$/i.test(filePath)) {
    res.setHeader("Cache-Control", "public, max-age=86400");
  }
}

export function serveStatic(app: Express, publicDirectory = distPath) {
  if (!fs.existsSync(publicDirectory)) {
    throw new Error(
      `Could not find the build directory: ${publicDirectory}, make sure to build the client first`,
    );
  }

  const indexHtml = fs.readFileSync(
    path.resolve(publicDirectory, "index.html"),
    "utf8",
  );

  // Prerendered marketing HTML from script/buildMarketingPages.mjs, when the
  // build produced it. Crawlers get the full page content without executing
  // JavaScript; the SPA still boots over it for real visitors.
  const prerendered = new Map<string, string>();
  for (const [route, file] of Object.entries(PRERENDERED_ROUTES)) {
    const filePath = path.resolve(publicDirectory, file);
    if (fs.existsSync(filePath)) {
      prerendered.set(route, fs.readFileSync(filePath, "utf8"));
    }
  }

  // index.html with per-route meta injected, cached per route.
  const seoCache = new Map<string, string>();

  function sendHtml(res: express.Response, html: string, status = 200) {
    res.status(status);
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    return res.send(html);
  }

  // index: false — "/" is answered below so it can serve the prerendered
  // landing (or the meta-injected shell) instead of the bare shell.
  app.use(
    express.static(publicDirectory, {
      extensions: ["html"],
      index: false,
      setHeaders: staticCacheHeaders,
    }),
  );

  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    const route = req.path.length > 1 ? req.path.replace(/\/+$/, "") : req.path;

    const prerenderedHtml = prerendered.get(route);
    if (prerenderedHtml) {
      return sendHtml(res, prerenderedHtml);
    }

    if (route === "/" || route === "/oravini") {
      return sendHtml(res, injectSeoMeta(indexHtml, SEO_ROUTES[route] ?? DEFAULT_META));
    }

    const meta = SEO_ROUTES[route];
    if (meta) {
      let html = seoCache.get(route);
      if (!html) {
        html = injectSeoMeta(indexHtml, meta);
        seoCache.set(route, html);
      }
      return sendHtml(res, html);
    }

    // Unknown URLs get a real 404 status (the SPA still renders its
    // not-found page over the shell). Serving a 200 here would be a soft
    // 404: Google flags them and they waste crawl budget.
    if (!matchesSpaRoute(route)) {
      return sendHtml(res, indexHtml, 404);
    }

    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.sendFile(path.resolve(publicDirectory, "index.html"));
  });
}
