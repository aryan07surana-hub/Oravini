import { build } from "esbuild";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

// Render the same policy components used by the app. No separate legal-copy fork.
export async function buildPolicyPages(publicDirectory, root = process.cwd()) {
  const temporary = await mkdtemp(path.join(tmpdir(), "oravini-policies-"));
  try {
    const output = path.join(temporary, "renderer.cjs");
    await build({
      stdin: { contents: `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server';
        import Privacy from './client/src/pages/Privacy'; import Terms from './client/src/pages/Terms'; import DataDeletion from './client/src/pages/DataDeletion';
        export const pages = {privacy:renderToStaticMarkup(React.createElement(Privacy)),terms:renderToStaticMarkup(React.createElement(Terms)), 'data-deletion':renderToStaticMarkup(React.createElement(DataDeletion))};`, resolveDir: root, loader: "tsx" },
      bundle: true, platform: "node", format: "cjs", jsx: "automatic", outfile: output,
      define: { "process.env.NODE_ENV": '"production"' }, logLevel: "silent",
    });
    const { pages } = createRequire(import.meta.url)(output);
    const index = await readFile(path.join(publicDirectory, "index.html"), "utf8");
    const styles = (index.match(/<link\b[^>]*>/g) || []).filter(tag => /rel=["']stylesheet["']/.test(tag)).join("\n");
    const titles = { privacy: "Privacy Policy", terms: "Terms of Service", "data-deletion": "Data deletion instructions" };
    await mkdir(publicDirectory, { recursive: true });
    for (const [slug, markup] of Object.entries(pages)) {
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titles[slug]} | Oravini</title><meta name="description" content="Oravini ${titles[slug]}"><link rel="canonical" href="https://oravini.com/${slug}">${styles}<style>html{background:#0a0a0a;color:#e4e4e7;font:16px/1.7 system-ui,sans-serif}body{margin:0}main{display:block}a{color:#d4b461}h1,h2{line-height:1.3}section{margin:2rem 0}p{margin:1rem 0}footer{margin-top:2rem}</style></head><body>${markup}</body></html>`;
      await writeFile(path.join(publicDirectory, `${slug}.html`), html);
    }
  } finally { await rm(temporary, { recursive: true, force: true }); }
}
