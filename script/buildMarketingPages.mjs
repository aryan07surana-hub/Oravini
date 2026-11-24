import { build } from "esbuild";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

// Prerenders the marketing landing page into dist/public/home.html so
// crawlers see the full page content (hero, features, steps, current
// pricing) without executing JavaScript. The SPA still boots over the
// prerendered markup for real visitors, so behavior is unchanged.
//
// Browser-only providers are swapped for SSR-safe stubs via esbuild
// aliasing; the client bundle is untouched. In this prerender bundle only,
// the landing's pricing-preview flag is defined true and LegacyPricingCards
// is aliased to the live TermPricingPreview component, so the static HTML
// carries the current prepaid plans exactly where the pricing section is,
// and none of the retired pricing copy. The real client bundle is built by
// vite separately and is unaffected.

const SITE = "https://oravini.com";

const HOME_TITLE = "Oravini — AI-Powered Brand Growth Platform";
const HOME_DESCRIPTION =
  "Oravini is the all-in-one AI platform for creators and personal brands: AI content ideas, competitor intelligence, webinars, video hosting, funnels and Instagram DM automation, tracked and optimized in one place.";

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Oravini",
    url: SITE,
    logo: `${SITE}/oravini-logo.png`,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Oravini",
    url: SITE,
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Oravini",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: HOME_DESCRIPTION,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
];

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

// Prerenders the public marketing pages into dist/public/*.html so crawlers
// see the full page content (hero, features, current pricing, keyword
// landing pages, FAQs) without executing JavaScript. The SPA still boots
// over the prerendered markup for real visitors, so behavior is unchanged.
//
// Browser-only providers are swapped for SSR-safe stubs via esbuild
// aliasing; the client bundle is untouched. In this prerender bundle only,
// the landing's pricing-preview flag is defined true and LegacyPricingCards
// is aliased to the live TermPricingPreview component, so the static HTML
// carries the current prepaid plans exactly where the pricing section is,
// and none of the retired pricing copy. The real client bundle is built by
// vite separately and is unaffected.

const SITE = "https://oravini.com";

const HOME_TITLE = "Oravini — AI-Powered Brand Growth Platform";
const HOME_DESCRIPTION =
  "Oravini is the all-in-one AI platform for creators and personal brands: AI content ideas, competitor intelligence, webinars, video hosting, funnels and Instagram DM automation, tracked and optimized in one place.";

const BASE_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Oravini",
    url: SITE,
    logo: `${SITE}/oravini-logo.png`,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Oravini",
    url: SITE,
  },
];

const HOME_JSON_LD = [
  ...BASE_JSON_LD,
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Oravini",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: HOME_DESCRIPTION,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
];

function faqJsonLd(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

function resolveWithExtensions(candidate) {
  for (const p of [candidate, `${candidate}.ts`, `${candidate}.tsx`, path.join(candidate, "index.ts"), path.join(candidate, "index.tsx")]) {
    if (existsSync(p)) return p;
  }
  return null;
}

function ssrPlugin(root) {
  return {
    name: "oravini-ssr-prerender",
    setup(b) {
      b.onResolve({ filter: /^@\/hooks\/use-auth$/ }, () => ({
        path: "use-auth-stub",
        namespace: "ssr-stub",
      }));
      b.onResolve({ filter: /^wouter$/ }, () => ({
        path: "wouter-stub",
        namespace: "ssr-stub",
      }));
      b.onResolve({ filter: /^@\/components\/pricing\/LegacyPricingCards$/ }, () => {
        const target = resolveWithExtensions(
          path.join(root, "client/src/components/video-marketing/TermPricingPreview"),
        );
        return target ? { path: target } : { path: "pricing-stub", namespace: "ssr-stub" };
      });
      b.onResolve({ filter: /^@\// }, (args) => {
        const target = resolveWithExtensions(path.join(root, "client/src", args.path.slice(2)));
        return target ? { path: target } : { errors: [{ text: `cannot resolve ${args.path}` }] };
      });
      b.onResolve({ filter: /^@shared\// }, (args) => {
        const target = resolveWithExtensions(path.join(root, "shared", args.path.slice(8)));
        return target ? { path: target } : { errors: [{ text: `cannot resolve ${args.path}` }] };
      });
      b.onLoad({ filter: /.*/, namespace: "ssr-stub" }, (args) => {
        if (args.path === "use-auth-stub") {
          return {
            contents: "export const useAuth = () => ({ user: null, isLoading: false });",
            loader: "ts",
          };
        }
        if (args.path === "wouter-stub") {
          return {
            contents:
              "export const useLocation = () => ['/', () => {}];" +
              "export const Redirect = () => null;" +
              // wouter's Link wraps an existing <a> child, so passing the
              // child through keeps the anchor markup in the static HTML.
              "export const Link = ({ children }) => children;",
            loader: "ts",
          };
        }
        return { contents: "export default function EmptyPricing(){ return null; }", loader: "ts" };
      });
    },
  };
}

function escapeAttr(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Injects per-page SEO tags (deduping the shell's defaults) and the
// prerendered markup into the built index.html.
function composePage(index, { title, description, canonical, jsonLd, markup }) {
  const metaTags = [
    `<meta name="description" content="${escapeAttr(description)}" />`,
    `<meta name="robots" content="index,follow" />`,
    `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Oravini" />`,
    `<meta property="og:title" content="${escapeAttr(title)}" />`,
    `<meta property="og:description" content="${escapeAttr(description)}" />`,
    `<meta property="og:url" content="${escapeAttr(canonical)}" />`,
    `<meta property="og:image" content="${SITE}/oravini-logo.png" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(description)}" />`,
    `<meta name="twitter:image" content="${SITE}/oravini-logo.png" />`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ].join("\n    ");

  let html = index;
  // Drop the shell's default SEO tags so the page block never duplicates them.
  html = html
    .replace(/[ \t]*<meta\b[^>]*name="description"[^>]*>\s*\n?/g, "")
    .replace(/[ \t]*<meta\b[^>]*name="robots"[^>]*>\s*\n?/g, "")
    .replace(/[ \t]*<link\b[^>]*rel="canonical"[^>]*>\s*\n?/g, "")
    .replace(/[ \t]*<meta\b[^>]*property="og:[^"]*"[^>]*>\s*\n?/g, "")
    .replace(/[ \t]*<meta\b[^>]*name="twitter:[^"]*"[^>]*>\s*\n?/g, "");
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttr(title)}</title>`);
  html = html.replace(/<\/head>/, `    ${metaTags}\n  </head>`);
  if (!html.includes('<div id="root"></div>')) {
    throw new Error('index.html is missing <div id="root"></div>; cannot inject prerendered markup');
  }
  return html.replace('<div id="root"></div>', `<div id="root">${markup}</div>`);
}

export async function buildMarketingPages(publicDirectory, root = process.cwd()) {
  const temporary = await mkdtemp(path.join(tmpdir(), "oravini-marketing-"));
  try {
    const output = path.join(temporary, "renderer.cjs");
    await build({
      stdin: {
        contents: `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server';
          import Landing from './client/src/pages/OraviniLanding';
          import {SEO_PAGES, SEOPage} from './client/src/pages/seoPages';
          export const home = renderToStaticMarkup(React.createElement(Landing));
          export const seoPages = SEO_PAGES.map(c => ({slug: c.slug, title: c.title, description: c.description, faqs: c.faqs, html: renderToStaticMarkup(React.createElement(SEOPage, {config: c}))}));`,
        resolveDir: root,
        loader: "tsx",
      },
      bundle: true,
      platform: "node",
      format: "cjs",
      jsx: "automatic",
      outfile: output,
      plugins: [ssrPlugin(root)],
      define: {
        "process.env.NODE_ENV": '"production"',
        "import.meta.env.VITE_PRICING_V2_PREVIEW": '"true"',
      },
      logLevel: "silent",
    });
    const { home, seoPages } = createRequire(import.meta.url)(output);

    const index = await readFile(path.join(publicDirectory, "index.html"), "utf8");

    await writeFile(
      path.join(publicDirectory, "home.html"),
      composePage(index, {
        title: HOME_TITLE,
        description: HOME_DESCRIPTION,
        canonical: `${SITE}/`,
        jsonLd: HOME_JSON_LD,
        markup: home,
      }),
    );

    for (const page of seoPages) {
      const fileName = `${page.slug.replace(/\//g, "-")}.html`;
      await writeFile(
        path.join(publicDirectory, fileName),
        composePage(index, {
          title: page.title,
          description: page.description,
          canonical: `${SITE}/${page.slug}`,
          jsonLd: [...BASE_JSON_LD, faqJsonLd(page.faqs)],
          markup: page.html,
        }),
      );
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
