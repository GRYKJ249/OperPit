const storageKey = "folio_council_session_v1";
let sessionToken: string | null = null;

export function setCouncilSession(token: string, expiresAt?: string) {
  sessionToken = token;
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify({ token, expiresAt: expiresAt ?? null }));
  } catch {
    // Keep the short-lived token in memory when browser storage is unavailable.
  }
}

export function getCouncilSession() {
  if (sessionToken) return sessionToken;
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { token?: unknown; expiresAt?: unknown };
    if (typeof saved.token !== "string" || (typeof saved.expiresAt === "string" && Date.parse(saved.expiresAt) <= Date.now())) {
      clearCouncilSession();
      return null;
    }
    sessionToken = saved.token;
    return sessionToken;
  } catch {
    return null;
  }
}

export function clearCouncilSession() {
  sessionToken = null;
  try { window.sessionStorage.removeItem(storageKey); } catch { /* Storage can be disabled by the browser. */ }
}
