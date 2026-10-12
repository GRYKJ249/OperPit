import { createHash } from "node:crypto";
import { count, countDistinct, eq, gte, desc } from "drizzle-orm";
import { Router, type Request } from "express";
import { siteVisitEvents } from "../drizzle/schema";
import { getDb } from "./db";

export const analyticsRouter = Router();
const windows = new Map<string, { start: number; count: number }>();
const staticRoutes = new Set(["/", "/about", "/journey", "/approach", "/skills", "/toolkit", "/process", "/services", "/work", "/journal", "/daily", "/github", "/gitlab", "/ai-studio", "/testimonials", "/faq", "/contact", "/privacy", "/community"]);

function limit(key: string, max: number) {
  const now = Date.now();
  const slot = windows.get(key);
  if (!slot || now - slot.start > 60_000) {
    windows.set(key, { start: now, count: 1 });
    if (windows.size > 8_000) for (const [candidate, value] of windows) if (now - value.start > 10 * 60_000) windows.delete(candidate);
    return false;
  }
  slot.count += 1;
  return slot.count > max;
}

function normalizeRoute(value: unknown) {
  if (typeof value !== "string" || value.length > 240 || !value.startsWith("/") || value.startsWith("//")) return null;
  const path = value.split(/[?#]/, 1)[0].replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
  if (staticRoutes.has(path)) return path;
  if (/^\/services\/[a-z0-9-]{1,80}$/.test(path)) return "/services/:slug";
  if (/^\/work\/(branding|product|web|editorial|motion|experiments)$/.test(path)) return "/work/:category";
  if (/^\/work\/[a-z0-9-]{1,100}$/.test(path)) return "/work/:slug";
  if (path === "/journal/topics/design" || path === "/journal/topics/product" || path === "/journal/topics/process" || path === "/journal/topics/culture") return "/journal/topics/:topic";
  if (/^\/journal\/[a-z0-9-]{1,100}$/.test(path)) return "/journal/:slug";
  if (/^\/daily\/daily-\d{4}-\d{2}-\d{2}-\d{2}-(programming|psychology|trading|design|learning)$/.test(path)) return "/daily/:slug";
  if (/^\/github\/[A-Za-z0-9_.-]{1,39}\/[A-Za-z0-9_.-]{1,100}$/.test(path)) return "/github/:owner/:repo";
  if (/^\/gitlab\/project\/\d{1,12}$/.test(path)) return "/gitlab/project/:id";
  if (path === "/gitlab") return "/gitlab";
  // Never log a visitor's secret council route, code, query, or arbitrary path.
  return null;
}

function sessionHash(value: unknown) {
  if (typeof value !== "string" || value.length < 16 || value.length > 80 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  return createHash("sha256").update(value).digest("hex");
}

function requester(req: Request) {
  return (req.ip || req.socket.remoteAddress || "visitor").slice(0, 100);
}

analyticsRouter.post("/visit", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const route = normalizeRoute(body.path);
  const hash = sessionHash(body.sessionId);
  if (!route || !hash) return res.status(400).json({ error: "invalid_visit" });
  if (limit(`ip:${requester(req)}`, 90) || limit(`session:${hash}`, 45)) return res.status(429).json({ error: "rate_limited" });
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "analytics_unavailable" });
    const metricDate = new Date().toISOString().slice(0, 10);
    try {
      await db.insert(siteVisitEvents).values({ metricDate, route, visitorHash: hash });
      return res.json({ recorded: true });
    } catch (error) {
      if ((error as { code?: string })?.code === "ER_DUP_ENTRY") return res.json({ recorded: false });
      throw error;
    }
  } catch {
    return res.status(503).json({ error: "analytics_unavailable" });
  }
});

export async function getSitePulseSnapshot() {
  try {
    const db = await getDb();
    if (!db) return { status: "warming", visitors: null, views: null, activeDays: 0, topRoutes: [], asOf: new Date().toISOString() };
    const since = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const [summary] = await db.select({
      visits: count(),
      visitors: countDistinct(siteVisitEvents.visitorHash),
      activeDays: countDistinct(siteVisitEvents.metricDate),
    }).from(siteVisitEvents).where(gte(siteVisitEvents.metricDate, since));
    const uniqueVisitors = Number(summary?.visitors) || 0;
    const top = uniqueVisitors >= 10 ? await db.select({
      route: siteVisitEvents.route,
      sessions: countDistinct(siteVisitEvents.visitorHash),
    }).from(siteVisitEvents).where(gte(siteVisitEvents.metricDate, since))
      .groupBy(siteVisitEvents.route).orderBy(desc(countDistinct(siteVisitEvents.visitorHash))).limit(4) : [];
    const topRoutes = top.filter(item => Number(item.sessions) >= 5).map(item => ({ route: item.route, sessions: Number(item.sessions) }));
    return {
      status: uniqueVisitors >= 10 ? "active" : "quiet",
      visitors: uniqueVisitors >= 10 ? uniqueVisitors : null,
      views: uniqueVisitors >= 10 ? Number(summary?.visits) || 0 : null,
      activeDays: uniqueVisitors >= 10 ? Number(summary?.activeDays) || 0 : 0,
      topRoutes,
      asOf: new Date().toISOString(),
    };
  } catch {
    return { status: "warming", visitors: null, views: null, activeDays: 0, topRoutes: [], asOf: new Date().toISOString() };
  }
}

analyticsRouter.get("/pulse", async (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  return res.json(await getSitePulseSnapshot());
});
