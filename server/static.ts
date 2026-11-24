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

let distPath: string;

try {
  distPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "public"
  );
} catch {
  distPath = path.resolve(process.cwd(), "dist", "public");
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

  // index: false — "/" is answered below so it can serve the prerendered
  // landing (or the meta-injected shell) instead of the bare shell.
  app.use(express.static(publicDirectory, { extensions: ["html"], index: false }));

  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    const route = req.path.length > 1 ? req.path.replace(/\/+$/, "") : req.path;

    const prerenderedHtml = prerendered.get(route);
    if (prerenderedHtml) {
      res.setHeader("content-type", "text/html; charset=utf-8");
      return res.send(prerenderedHtml);
    }

    if (route === "/" || route === "/oravini") {
      res.setHeader("content-type", "text/html; charset=utf-8");
      return res.send(injectSeoMeta(indexHtml, SEO_ROUTES[route] ?? DEFAULT_META));
    }

    const meta = SEO_ROUTES[route];
    if (meta) {
      let html = seoCache.get(route);
      if (!html) {
        html = injectSeoMeta(indexHtml, meta);
        seoCache.set(route, html);
      }
      res.setHeader("content-type", "text/html; charset=utf-8");
      return res.send(html);
    }

    res.sendFile(path.resolve(publicDirectory, "index.html"));
  });
}
