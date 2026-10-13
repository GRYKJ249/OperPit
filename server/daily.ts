import { and, asc, desc, eq, inArray, lt } from "drizzle-orm";
import { jwtVerify } from "jose";
import { Router, type Request, type Response } from "express";
import { dailyBatches, dailyMetricEvents, dailyPosts, scheduledJobs, siteVisitEvents } from "../drizzle/schema";
import { getDb } from "./db";
import { generateDailyIssue } from "./daily-generation";
import { sendDailyDigest } from "./daily-report";

export const dailyRouter = Router();
const dailyScheduleKind = "daily-content";

dailyRouter.get("/latest", async (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "daily_unavailable" });
    const [batch] = await db.select({ batchDate: dailyBatches.batchDate, themeKey: dailyBatches.themeKey, evolutionAr: dailyBatches.evolutionAr, evolutionEn: dailyBatches.evolutionEn })
      .from(dailyBatches).where(eq(dailyBatches.status, "published")).orderBy(desc(dailyBatches.batchDate)).limit(1);
    return res.json({ batch: batch ?? null });
  } catch (error) {
    console.error("[daily] latest query failed:", error instanceof Error ? error.message.slice(0, 200) : "unknown_error");
    return res.status(503).json({ error: "daily_unavailable" });
  }
});

function validSlug(value: string) {
  return /^daily-\d{4}-\d{2}-\d{2}-\d{2}-(programming|psychology|trading|design|learning)$/.test(value);
}

async function publishedDates(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, limit: number) {
  const rows = await db.select({ batchDate: dailyBatches.batchDate }).from(dailyBatches)
    .where(eq(dailyBatches.status, "published")).orderBy(desc(dailyBatches.batchDate)).limit(limit);
  return rows.map(row => row.batchDate);
}

dailyRouter.get("/posts", async (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  const parsed = Number(req.query.limit ?? 25);
  const limit = Number.isInteger(parsed) ? Math.max(1, Math.min(parsed, 30)) : 25;
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "daily_unavailable" });
    const dates = await publishedDates(db, 30);
    if (dates.length === 0) return res.json({ posts: [], dates: [] });
    const posts = await db.select().from(dailyPosts).where(inArray(dailyPosts.batchDate, dates))
      .orderBy(desc(dailyPosts.batchDate), asc(dailyPosts.position)).limit(limit);
    return res.json({ posts, dates });
  } catch {
    return res.status(503).json({ error: "daily_unavailable" });
  }
});

dailyRouter.get("/posts/:slug", async (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  const slug = req.params.slug;
  if (!validSlug(slug)) return res.status(400).json({ error: "invalid_post" });
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "daily_unavailable" });
    const [post] = await db.select().from(dailyPosts).where(eq(dailyPosts.slug, slug)).limit(1);
    if (!post) return res.status(404).json({ error: "post_not_found" });
    const [batch] = await db.select({ status: dailyBatches.status }).from(dailyBatches).where(and(eq(dailyBatches.batchDate, post.batchDate), eq(dailyBatches.status, "published"))).limit(1);
    return batch ? res.json({ post }) : res.status(404).json({ error: "post_not_found" });
  } catch {
    return res.status(503).json({ error: "daily_unavailable" });
  }
});

function scheduledCookie(req: Request) {
  const header = req.headers.cookie ?? "";
  const part = header.split(";").map(value => value.trim()).find(value => value.startsWith("app_session_id="));
  return part ? part.slice("app_session_id=".length) : "";
}

export async function authenticateScheduledRequest(req: Request) {
  const token = scheduledCookie(req);
  const secret = process.env.MANUS_JWT_SECRET;
  const projectId = process.env.MANUS_PROJECT_ID;
  const oauthBase = process.env.MANUS_OAUTH_API_URL?.replace(/\/+$/, "");
  if (!token || !secret || !projectId || !oauthBase) return null;
  try {
    const verified = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    const claims = verified.payload as Record<string, unknown>;
    if (claims.appId !== projectId || typeof claims.openId !== "string" || !claims.openId.startsWith("cron_")) return null;
    const lookup = await fetch(`${oauthBase}/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jwt_token: token, project_id: projectId }),
      signal: AbortSignal.timeout(12_000),
    });
    const identity = await lookup.json().catch(() => null) as { taskUid?: unknown; projectId?: unknown; project_id?: unknown } | null;
    if (!lookup.ok || !identity || typeof identity.taskUid !== "string" || !identity.taskUid || (identity.projectId ?? identity.project_id) !== projectId) return null;
    return identity.taskUid;
  } catch {
    return null;
  }
}

export async function scheduledDailyHandler(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  const taskUid = await authenticateScheduledRequest(req);
  if (!taskUid) return res.status(401).json({ error: "scheduled_identity_invalid" });
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "daily_unavailable" });
    const [job] = await db.select({ taskUid: scheduledJobs.taskUid }).from(scheduledJobs)
      .where(and(eq(scheduledJobs.kind, dailyScheduleKind), eq(scheduledJobs.taskUid, taskUid), eq(scheduledJobs.active, 1))).limit(1);
    if (!job) return res.status(403).json({ error: "scheduled_job_not_registered" });
    const now = new Date();
    const batchDate = now.toISOString().slice(0, 10);
    const reportDate = new Date(now.valueOf() - 86_400_000).toISOString().slice(0, 10);
    let digestStatus: string = "not_configured";
    try { digestStatus = await sendDailyDigest(reportDate); }
    catch { digestStatus = "retry_later"; }
    const posts = await generateDailyIssue(batchDate);
    if (posts.length !== 5) return res.status(503).json({ error: "daily_batch_incomplete" });
    const retentionDate = new Date(now.valueOf() - 30 * 86_400_000).toISOString().slice(0, 10);
    try {
      await db.delete(siteVisitEvents).where(lt(siteVisitEvents.metricDate, retentionDate));
      await db.delete(dailyMetricEvents).where(lt(dailyMetricEvents.metricDate, retentionDate));
    } catch { /* Retention cleanup is best-effort; generation remains idempotent. */ }
    return res.status(200).json({ success: true, batchDate, published: posts.length, reportDate, digestStatus });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "daily_generation_failed";
    if (reason === "daily_batch_in_progress") return res.status(409).json({ error: "daily_batch_in_progress" });
    console.error("[daily] Scheduled generation failed", reason.slice(0, 100));
    return res.status(503).json({ error: "daily_generation_failed" });
  }
}
