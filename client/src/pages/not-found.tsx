import { Link } from "wouter";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,#f3f8ff,#ffffff)", padding: 24 }}>
      <div style={{ maxWidth: 440, width: "100%", textAlign: "center", background: "#fff", border: "1px solid rgba(46,120,239,.14)", borderRadius: 28, padding: "44px 32px", boxShadow: "0 24px 60px rgba(46,120,239,.12)" }}>
        <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-0.04em", color: "#2e78ef", lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#101828", margin: "14px 0 8px" }}>This page does not exist</h1>
        <p style={{ fontSize: 14.5, color: "#5b6675", lineHeight: 1.6, margin: "0 0 24px" }}>The link may be old or mistyped. Head back and pick up where you left off.</p>
        <Link href="/">
          <a style={{ display: "inline-block", padding: "12px 26px", borderRadius: 999, background: "linear-gradient(180deg,#5b9bff,#2e78ef)", color: "#fff", fontWeight: 700, fontSize: 14, boxShadow: "0 10px 24px rgba(46,120,239,.3)", textDecoration: "none" }}>Back to Oravini</a>
        </Link>
      </div>
    </div>
  );
}
