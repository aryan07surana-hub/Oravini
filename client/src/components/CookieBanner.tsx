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
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-sm text-zinc-300 leading-relaxed">
          🍪 We use essential cookies to keep you logged in. We{" "}
          <strong className="text-white">never</strong> track you or sell your data.{" "}
          <a href="/privacy#cookies" className="text-[#d4b461] hover:underline">Learn more</a>
        </p>
        <button onClick={decline} className="text-zinc-600 hover:text-zinc-400 flex-shrink-0 mt-0.5">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={accept}
          className="flex-1 py-2 rounded-lg text-xs font-bold text-black transition-opacity hover:opacity-90"
          style={{ background: "#d4b461" }}
        >
          Accept
        </button>
        <button
          onClick={decline}
          className="flex-1 py-2 rounded-lg text-xs font-semibold text-zinc-400 border border-zinc-700 hover:border-zinc-500 transition-colors"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
