// Public blog pages (/blog index and /blog/:slug posts). Pure presentational
// components: no hooks, no router, no auth — so they prerender to static HTML
// at build time (script/buildMarketingPages.mjs) and also render inside the
// SPA for real visitors. Content lives in blogData.ts.
import React from "react";
import { BLOG_POSTS, type BlogPost } from "./blogData";

const GOLD = "#2e78ef";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ background: "#ffffff", minHeight: "100vh", color: "#101828", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "96px 24px 80px" }}>{children}</div>
    </main>
  );
}

function Header({ kicker }: { kicker: string }) {
  return (
    <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase" }}>{kicker}</div>
      <a href="/" style={{ color: "rgba(16,24,40,0.52)", fontSize: 13, textDecoration: "none" }}>oravini.com</a>
    </div>
  );
}

function Cta() {
  return (
    <div style={{ textAlign: "center", margin: "72px auto 24px", maxWidth: 640 }}>
      <h2 style={{ fontSize: 30, fontWeight: 900, color: "#101828", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
        Start free. <span style={{ color: GOLD }}>Scale when ready.</span>
      </h2>
      <p style={{ color: "rgba(16,24,40,0.67)", fontSize: 15, lineHeight: 1.7, margin: "14px 0 26px" }}>
        Free plan includes 100 app credits every month. No card required.
      </p>
      <a
        href="/login?tab=register"
        style={{
          display: "inline-block", background: `linear-gradient(135deg, #4f93ff, ${GOLD})`, color: "#ffffff",
          fontWeight: 800, fontSize: 15, borderRadius: 12, padding: "15px 38px", textDecoration: "none",
        }}
      >
        Create your free account
      </a>
    </div>
  );
}

export function BlogIndexPage() {
  return (
    <Shell>
      <Header kicker="Oravini Blog" />
      <h1 style={{ fontSize: "clamp(30px, 5vw, 46px)", fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1.12, margin: "0 0 18px" }}>
        Guides for creators who sell with <span style={{ color: GOLD }}>DMs, webinars and funnels</span>
      </h1>
      <p style={{ fontSize: 17, color: "rgba(16,24,40,0.72)", lineHeight: 1.75, margin: "0 0 52px" }}>
        Practical playbooks for growing a creator business: Instagram DM automation, webinar platforms that actually sell, and choosing the right tools.
      </p>
      {BLOG_POSTS.map((p) => (
        <a
          key={p.slug}
          href={`/blog/${p.slug}`}
          style={{
            display: "block", textDecoration: "none", marginBottom: 20, padding: "26px 28px",
            border: "1px solid rgba(16,24,40,0.08)", borderRadius: 16, background: "rgba(16,24,40,0.02)",
          }}
        >
          <div style={{ fontSize: 12, color: "rgba(16,24,40,0.52)", marginBottom: 10 }}>
            {formatDate(p.datePublished)} · {p.readingTime}
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, color: "#101828", letterSpacing: "-0.01em", lineHeight: 1.3, marginBottom: 8 }}>{p.h1}</div>
          <div style={{ fontSize: 14, color: "rgba(16,24,40,0.67)", lineHeight: 1.7 }}>{p.description}</div>
          <div style={{ marginTop: 14, fontSize: 13, color: GOLD, fontWeight: 700 }}>Read the guide →</div>
        </a>
      ))}
      <Cta />
    </Shell>
  );
}

export function BlogPostPage({ slug }: { slug: string }) {
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) {
    return (
      <Shell>
        <Header kicker="Oravini Blog" />
        <h1 style={{ fontSize: 34, fontWeight: 900, margin: "0 0 14px" }}>Post not found</h1>
        <p style={{ color: "rgba(16,24,40,0.67)", fontSize: 15, lineHeight: 1.7 }}>
          This post does not exist or was moved. <a href="/blog" style={{ color: GOLD }}>Back to the blog</a>
        </p>
      </Shell>
    );
  }
  return <PostBody post={post} />;
}

function PostBody({ post }: { post: BlogPost }) {
  return (
    <Shell>
      <Header kicker="Oravini Blog" />
      <div style={{ fontSize: 12, color: "rgba(16,24,40,0.52)", marginBottom: 12 }}>
        {formatDate(post.datePublished)} · {post.readingTime}
      </div>
      <h1 style={{ fontSize: "clamp(28px, 4.6vw, 44px)", fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1.15, margin: "0 0 22px" }}>
        {post.h1}
      </h1>
      <p style={{ fontSize: 17, color: "rgba(16,24,40,0.72)", lineHeight: 1.8, margin: "0 0 44px" }}>{post.intro}</p>

      {post.sections.map((s) => (
        <section key={s.heading} style={{ marginBottom: 38 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.01em", margin: "0 0 12px" }}>{s.heading}</h2>
          {s.paragraphs.map((para, i) => (
            <p key={i} style={{ fontSize: 15, color: "rgba(16,24,40,0.67)", lineHeight: 1.85, margin: "0 0 14px" }}>{para}</p>
          ))}
        </section>
      ))}

      <section style={{ marginTop: 52, padding: "24px 26px", border: "1px solid rgba(16,24,40,0.08)", borderRadius: 16, background: "rgba(16,24,40,0.02)" }}>
        <div style={{ fontSize: 12, letterSpacing: "0.2em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>Keep reading</div>
        {post.related.map((r) => (
          <div key={r.href} style={{ marginBottom: 10 }}>
            <a href={r.href} style={{ color: "#101828", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
              {r.label} <span style={{ color: GOLD }}>→</span>
            </a>
          </div>
        ))}
      </section>

      <Cta />
      <p style={{ textAlign: "center", marginTop: 20, fontSize: 13 }}>
        <a href="/blog" style={{ color: "rgba(16,24,40,0.52)", textDecoration: "none" }}>← All guides</a>
      </p>
    </Shell>
  );
}

function formatDate(iso: string): string {
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const [y, m, d] = iso.split("-").map(Number);
  return `${months[m - 1]} ${d}, ${y}`;
}
