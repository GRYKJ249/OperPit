import { createHash } from "node:crypto";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import { dailyBatches, dailyComments, dailyMetricEvents, dailyMetrics, dailyPosts, dailyReactions } from "../drizzle/schema";
import { getDb } from "./db";
import { moderatePublicComment } from "./comment-moderation";

export const socialRouter = Router();
const requestWindows = new Map<string, { start: number; count: number }>();

function limited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const current = requestWindows.get(key);
  if (!current || now - current.start >= windowMs) {
    requestWindows.set(key, { start: now, count: 1 });
    if (requestWindows.size > 8_000) {
      for (const [candidate, window] of requestWindows) if (now - window.start > 10 * 60_000) requestWindows.delete(candidate);
    }
    return false;
  }
  current.count += 1;
  return current.count > max;
}

function postSlug(value: unknown): value is string {
  return typeof value === "string" && /^daily-\d{4}-\d{2}-\d{2}-\d{2}-(programming|psychology|trading|design|learning)$/.test(value);
}

function visitorHash(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 16 || value.length > 80 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  return createHash("sha256").update(value).digest("hex");
}

function requester(req: Request) {
  return (req.ip || req.socket.remoteAddress || "visitor").slice(0, 100);
}

async function publishedPost(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, slug: string) {
  const [row] = await db.select({ slug: dailyPosts.slug }).from(dailyPosts)
    .innerJoin(dailyBatches, eq(dailyPosts.batchDate, dailyBatches.batchDate))
    .where(and(eq(dailyPosts.slug, slug), eq(dailyBatches.status, "published"))).limit(1);
  return Boolean(row);
}

async function getSnapshot(slug: string, hash: string | null) {
  const db = await getDb();
  if (!db) throw new Error("database_unavailable");
  if (!await publishedPost(db, slug)) return null;
  const metricRows = await db.select({ views: dailyMetrics.views, shares: dailyMetrics.shares }).from(dailyMetrics).where(eq(dailyMetrics.postSlug, slug));
  const metrics = metricRows.reduce((sum, row) => ({ views: sum.views + Number(row.views), shares: sum.shares + Number(row.shares) }), { views: 0, shares: 0 });
  const reactionRows = await db.select({ reaction: dailyReactions.reaction, total: count() }).from(dailyReactions).where(eq(dailyReactions.postSlug, slug)).groupBy(dailyReactions.reaction);
  const reactions = { like: 0, insightful: 0, inspiring: 0 };
  for (const row of reactionRows) {
    if (row.reaction === "like" || row.reaction === "insightful" || row.reaction === "inspiring") {
      reactions[row.reaction] = Number(row.total);
    }
  }
  const [mine] = hash ? await db.select({ reaction: dailyReactions.reaction }).from(dailyReactions).where(and(eq(dailyReactions.postSlug, slug), eq(dailyReactions.visitorHash, hash))).limit(1) : [];
  const comments = await db.select({ id: dailyComments.id, displayName: dailyComments.displayName, body: dailyComments.body, locale: dailyComments.locale, aiReaction: dailyComments.aiReaction, aiReplyAr: dailyComments.aiReplyAr, aiReplyEn: dailyComments.aiReplyEn, createdAt: dailyComments.createdAt })
    .from(dailyComments).where(and(eq(dailyComments.postSlug, slug), eq(dailyComments.status, "visible"))).orderBy(desc(dailyComments.createdAt)).limit(40);
  return { ...metrics, reactions, myReaction: mine?.reaction ?? null, comments };
}

socialRouter.get("/:slug", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!postSlug(req.params.slug)) return res.status(400).json({ error: "invalid_post" });
  const hash = visitorHash(req.query.visitorId);
  try {
    const snapshot = await getSnapshot(req.params.slug, hash);
    return snapshot ? res.json(snapshot) : res.status(404).json({ error: "post_not_found" });
  } catch {
    return res.status(503).json({ error: "social_unavailable" });
  }
});

socialRouter.post("/:slug/reaction", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const slug = req.params.slug;
  if (!postSlug(slug)) return res.status(400).json({ error: "invalid_post" });
  const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const hash = visitorHash(body.visitorId);
  const reaction = body.reaction;
  if (!hash || !(reaction === null || reaction === "like" || reaction === "insightful" || reaction === "inspiring")) return res.status(400).json({ error: "invalid_reaction" });
  if (limited(`reaction:${hash}`, 30, 60_000)) return res.status(429).json({ error: "rate_limited" });
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "social_unavailable" });
    if (!await publishedPost(db, slug)) return res.status(404).json({ error: "post_not_found" });
    if (reaction === null) {
      await db.delete(dailyReactions).where(and(eq(dailyReactions.postSlug, slug), eq(dailyReactions.visitorHash, hash)));
    } else {
      await db.insert(dailyReactions).values({ postSlug: slug, visitorHash: hash, reaction }).onConflictDoUpdate({ target: [dailyReactions.postSlug, dailyReactions.visitorHash], set: { reaction, updatedAt: new Date() } });
    }
    return res.json(await getSnapshot(slug, hash));
  } catch {
    return res.status(503).json({ error: "social_unavailable" });
  }
});

socialRouter.post("/:slug/metric", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const slug = req.params.slug;
  if (!postSlug(slug)) return res.status(400).json({ error: "invalid_post" });
  const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const hash = visitorHash(body.visitorId);
  const kind = body.kind;
  if (!hash || (kind !== "view" && kind !== "share")) return res.status(400).json({ error: "invalid_metric" });
  if (limited(`metric:${hash}:${kind}`, 40, 60_000)) return res.status(429).json({ error: "rate_limited" });
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "social_unavailable" });
    if (!await publishedPost(db, slug)) return res.status(404).json({ error: "post_not_found" });
    const date = new Date().toISOString().slice(0, 10);
    let inserted = false;
    try {
      await db.insert(dailyMetricEvents).values({ postSlug: slug, metricDate: date, visitorHash: hash, kind });
      inserted = true;
    } catch (error) {
      if ((error as { code?: string })?.code !== "23505") throw error;
    }
    if (inserted) {
      const viewUpdate = { views: sql`${dailyMetrics.views} + 1` };
      const shareUpdate = { shares: sql`${dailyMetrics.shares} + 1` };
      await db.insert(dailyMetrics).values({ postSlug: slug, metricDate: date, views: kind === "view" ? 1 : 0, shares: kind === "share" ? 1 : 0 })
        .onConflictDoUpdate({ target: [dailyMetrics.postSlug, dailyMetrics.metricDate], set: kind === "view" ? viewUpdate : shareUpdate });
    }
    return res.json({ success: true, counted: inserted });
  } catch {
    return res.status(503).json({ error: "social_unavailable" });
  }
});

socialRouter.post("/:slug/comments", async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  const slug = req.params.slug;
  if (!postSlug(slug)) return res.status(400).json({ error: "invalid_post" });
  const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const hash = visitorHash(body.visitorId);
  const name = typeof body.displayName === "string" ? body.displayName.trim().replace(/[\u0000-\u001f<>]/g, "").slice(0, 48) : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const locale = body.locale === "en" ? "en" : "ar";
  if (!hash || name.length < 2 || text.length < 2 || text.length > 320) return res.status(400).json({ error: "invalid_comment" });
  if (/https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\+?\d[\d\s().-]{7,}\d/i.test(text)) return res.status(422).json({ error: "comment_personal_data_or_links" });
  if (/(.)\1{9,}/u.test(text) || /(?:buy now|sell now|guaranteed profit|suicide instructions|self-harm instructions|اشتر الآن|بيع الآن|ربح مضمون|طريقة الانتحار|إيذاء النفس)/i.test(text)) return res.status(422).json({ error: "comment_needs_revision" });
  if (limited(`comment:${hash}`, 3, 60 * 60_000)) return res.status(429).json({ error: "comment_rate_limited" });
  if (limited(`comment-ip:${requester(req)}`, 18, 60 * 60_000)) return res.status(429).json({ error: "comment_rate_limited" });
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "social_unavailable" });
    if (!await publishedPost(db, slug)) return res.status(404).json({ error: "post_not_found" });
    let moderation;
    try { moderation = await moderatePublicComment(text, locale); }
    catch { return res.status(503).json({ error: "comment_moderation_unavailable" }); }
    if (!moderation.publish) {
      // Remove the submitted text and name from storage; retain only the date and moderation category.
      await db.insert(dailyComments).values({ postSlug: slug, displayName: "Removed", body: "", locale, status: "hidden", moderationReason: moderation.reason, aiReaction: null, aiReplyAr: null, aiReplyEn: null });
      return res.status(422).json({ error: "comment_hidden" });
    }
    const [saved] = await db.insert(dailyComments).values({ postSlug: slug, displayName: name, body: text, locale, status: "visible", moderationReason: null, aiReaction: moderation.reaction, aiReplyAr: moderation.replyAr, aiReplyEn: moderation.replyEn }).returning();
    return res.status(201).json({ success: true, comment: { id: saved.id, displayName: name, body: text, locale, aiReaction: moderation.reaction, aiReplyAr: moderation.replyAr, aiReplyEn: moderation.replyEn, createdAt: new Date().toISOString() } });
  } catch {
    return res.status(503).json({ error: "social_unavailable" });
  }
});
