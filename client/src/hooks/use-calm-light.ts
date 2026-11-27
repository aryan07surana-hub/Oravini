import { useEffect } from "react";

/** White/blue light theme for every signed-in screen. Restored on leave. */
export function useCalmLight() {
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    const had = root.classList.contains("calm-light");
    root.classList.remove("dark");
    root.classList.add("calm-light");
    if (!document.getElementById("calm-inter")) {
      const link = document.createElement("link");
      link.id = "calm-inter"; link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap";
      document.head.appendChild(link);
    }
    return () => {
      if (!had) root.classList.remove("calm-light");
      if (wasDark) root.classList.add("dark");
    };
  }, []);
}
