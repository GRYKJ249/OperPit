import { useEffect } from "react";

const allowedDailyThemes = new Set(["cobalt", "coral", "jade", "violet"]);

function sessionId() {
  try {
    const current = sessionStorage.getItem("folio-analytics-session");
    if (current && /^[A-Za-z0-9_-]{16,80}$/.test(current)) return current;
    const value = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("folio-analytics-session", value);
    return value;
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }
}

export function SiteAmbient({ path }: { path: string }) {
  useEffect(() => {
    const route = path.split(/[?#]/, 1)[0];
    if (route === "/council" || route.startsWith("/council/")) return;
    try {
      void fetch("/api/analytics/visit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: route, sessionId: sessionId() }), keepalive: true,
      }).catch(() => undefined);
    } catch { /* Metrics are optional; never block navigation. */ }
  }, [path]);

  useEffect(() => {
    let live = true;
    const syncTheme = async () => {
      try {
        const response = await fetch("/api/daily/latest", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json() as { batch?: { themeKey?: unknown } | null };
        const next = payload.batch?.themeKey;
        if (live && typeof next === "string" && allowedDailyThemes.has(next)) {
          document.documentElement.dataset.dailyTheme = next;
        }
      } catch { /* Keep the last valid theme when the daily service is offline. */ }
    };
    void syncTheme();
    const timer = window.setInterval(() => void syncTheme(), 15 * 60_000);
    return () => { live = false; window.clearInterval(timer); };
  }, []);
  return null;
}
