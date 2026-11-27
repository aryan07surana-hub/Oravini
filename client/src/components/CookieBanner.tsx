import { useState, useEffect } from "react";
import { X } from "lucide-react";

const COOKIE_KEY = "brandverse_cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(COOKIE_KEY)) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(COOKIE_KEY, "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50"
      style={{ borderRadius: 20, background: "rgba(255,255,255,.94)", backdropFilter: "blur(14px)", border: "1px solid rgba(46,120,239,.16)", boxShadow: "0 18px 50px rgba(16,24,40,.16)", padding: 16 }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#475467", margin: 0 }}>
          We use essential cookies to keep you logged in. We{" "}
          <strong style={{ color: "#101828" }}>never</strong> track you or sell your data.{" "}
          <a href="/privacy#section-15" style={{ color: "#2e78ef", fontWeight: 600 }}>Learn more</a>
        </p>
        <button onClick={decline} aria-label="Close" style={{ color: "#98a2b3", flexShrink: 0, marginTop: 2 }}>
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={accept}
          style={{ flex: 1, padding: "9px 0", borderRadius: 999, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(180deg,#5b9bff,#2e78ef)", boxShadow: "0 6px 16px rgba(46,120,239,.3)" }}
        >
          Accept
        </button>
        <button
          onClick={decline}
          style={{ flex: 1, padding: "9px 0", borderRadius: 999, fontSize: 13, fontWeight: 600, color: "#344054", background: "#fff", border: "1px solid #e4e7ec" }}
        >
          Decline
        </button>
      </div>
    </div>
  );
}
