import { and, count, desc, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import {
  aiUsageCounters, dailyBatches, dailyComments, dailyDigestDeliveries, dailyMetricEvents,
  dailyMetrics, dailyPosts, dailyReactions, siteVisitEvents,
} from "../drizzle/schema";
import { getDb } from "./db";

export type DailyDigestSnapshot = {
  date: string;
  sessions: number;
  pageViews: number;
  topRoutes: { route: string; views: number }[];
  postsPublished: number;
  imagesPublished: number;
  commentsVisible: number;
  commentsRemoved: number;
  aiCommentReplies: number;
  reactions: number;
  postShares: number;
  aiCalls: { mode: string; count: number }[];
  themeKey: string | null;
  evolutionEn: string | null;
};

function dayBounds(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) !== date) throw new Error("invalid_report_date");
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.valueOf() + 86_400_000);
  return { start, end };
}

async function buildSnapshot(date: string): Promise<DailyDigestSnapshot> {
  const db = await getDb();
  if (!db) throw new Error("database_unavailable");
  const { start, end } = dayBounds(date);
  const [visits] = await db.select({ pageViews: count(), sessions: sql<number>`count(distinct ${siteVisitEvents.visitorHash})` })
    .from(siteVisitEvents).where(eq(siteVisitEvents.metricDate, date));
  const topRoutes = await db.select({ route: siteVisitEvents.route, views: count() }).from(siteVisitEvents)
    .where(eq(siteVisitEvents.metricDate, date)).groupBy(siteVisitEvents.route).orderBy(desc(count())).limit(5);
  const [batch] = await db.select({ generatedCount: dailyBatches.generatedCount, themeKey: dailyBatches.themeKey, evolutionEn: dailyBatches.evolutionEn })
    .from(dailyBatches).where(and(eq(dailyBatches.batchDate, date), eq(dailyBatches.status, "published"))).limit(1);
  const [visible] = await db.select({ total: count() }).from(dailyComments)
    .where(and(gte(dailyComments.createdAt, start), lt(dailyComments.createdAt, end), eq(dailyComments.status, "visible")));
  const [removed] = await db.select({ total: count() }).from(dailyComments)
    .where(and(gte(dailyComments.createdAt, start), lt(dailyComments.createdAt, end), eq(dailyComments.status, "hidden")));
  const [replies] = await db.select({ total: count() }).from(dailyComments)
    .where(and(gte(dailyComments.createdAt, start), lt(dailyComments.createdAt, end), isNotNull(dailyComments.aiReplyAr)));
  const [reactionRows] = await db.select({ total: count() }).from(dailyReactions)
    .where(and(gte(dailyReactions.createdAt, start), lt(dailyReactions.createdAt, end)));
  const [metricRows] = await db.select({ shares: sql<number>`coalesce(sum(${dailyMetrics.shares}), 0)` })
    .from(dailyMetrics).where(eq(dailyMetrics.metricDate, date));
  const aiCalls = await db.select({ mode: aiUsageCounters.mode, count: aiUsageCounters.requestCount })
    .from(aiUsageCounters).where(eq(aiUsageCounters.metricDate, date)).orderBy(aiUsageCounters.mode);
  return {
    date,
    sessions: Number(visits?.sessions ?? 0),
    pageViews: Number(visits?.pageViews ?? 0),
    topRoutes: topRoutes.map(row => ({ route: row.route, views: Number(row.views) })),
    postsPublished: Number(batch?.generatedCount ?? 0),
    imagesPublished: Number(batch?.generatedCount ?? 0),
    commentsVisible: Number(visible?.total ?? 0),
    commentsRemoved: Number(removed?.total ?? 0),
    aiCommentReplies: Number(replies?.total ?? 0),
    reactions: Number(reactionRows?.total ?? 0),
    postShares: Number(metricRows?.shares ?? 0),
    aiCalls: aiCalls.map(row => ({ mode: row.mode, count: Number(row.count) })),
    themeKey: batch?.themeKey ?? null,
    evolutionEn: batch?.evolutionEn ?? null,
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function emailPayload(snapshot: DailyDigestSnapshot) {
  const routes = snapshot.topRoutes.length
    ? snapshot.topRoutes.map(item => `<li><code>${escapeHtml(item.route)}</code>: ${item.views}</li>`).join("")
    : "<li>No recorded page views</li>";
  const calls = snapshot.aiCalls.length
    ? snapshot.aiCalls.map(item => `<li>${escapeHtml(item.mode)}: ${item.count}</li>`).join("")
    : "<li>No recorded AI calls</li>";
  const idea = snapshot.evolutionEn ? `<p><strong>Site evolution proposal:</strong> ${escapeHtml(snapshot.evolutionEn)}</p>` : "";
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#222"><h1>Folio daily operations — ${escapeHtml(snapshot.date)} UTC</h1><p>Anonymous session metrics only; no visitor names, IP addresses, prompts, or comment text are included.</p><ul><li>Anonymous sessions: ${snapshot.sessions}</li><li>Recorded page views: ${snapshot.pageViews}</li><li>AI-generated posts/images: ${snapshot.postsPublished}/${snapshot.imagesPublished}</li><li>Comments visible/removed by moderation: ${snapshot.commentsVisible}/${snapshot.commentsRemoved}</li><li>AI replies to comments: ${snapshot.aiCommentReplies}</li><li>Reactions: ${snapshot.reactions}</li><li>Post shares: ${snapshot.postShares}</li></ul><h2>Most-read routes</h2><ul>${routes}</ul><h2>AI activity</h2><ul>${calls}</ul>${idea}<p>Daily theme preset: ${escapeHtml(snapshot.themeKey ?? "unchanged")}</p></body></html>`;
  const text = [
    `Folio daily operations — ${snapshot.date} UTC`,
    "Anonymous session metrics only; no visitor names, IP addresses, prompts, or comment text are included.",
    `Anonymous sessions: ${snapshot.sessions}; page views: ${snapshot.pageViews}`,
    `AI-generated posts/images: ${snapshot.postsPublished}/${snapshot.imagesPublished}`,
    `Comments visible/removed: ${snapshot.commentsVisible}/${snapshot.commentsRemoved}; AI replies: ${snapshot.aiCommentReplies}`,
    `Reactions: ${snapshot.reactions}; post shares: ${snapshot.postShares}`,
    `Top routes: ${snapshot.topRoutes.map(item => `${item.route} (${item.views})`).join(", ") || "none"}`,
    `AI calls: ${snapshot.aiCalls.map(item => `${item.mode} (${item.count})`).join(", ") || "none"}`,
    `Daily theme: ${snapshot.themeKey ?? "unchanged"}`,
    snapshot.evolutionEn ? `Site evolution proposal (preview only): ${snapshot.evolutionEn}` : "",
  ].filter(Boolean).join("\n");
  return { html, text };
}

function validEmail(value: string | undefined) {
  return Boolean(value && value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

/** Sends one frozen aggregate report for a completed UTC day; no email key means safe no-op. */
export async function sendDailyDigest(date: string): Promise<"sent" | "already_sent" | "not_configured" | "retry_later"> {
  dayBounds(date);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.DAILY_DIGEST_TO;
  if (!apiKey || !validEmail(from?.match(/<([^>]+)>/)?.[1] ?? from) || !validEmail(to)) return "not_configured";

  const db = await getDb();
  if (!db) throw new Error("database_unavailable");
  const [existing] = await db.select().from(dailyDigestDeliveries).where(eq(dailyDigestDeliveries.metricDate, date)).limit(1);
  if (existing?.status === "sent") return "already_sent";
  if (existing?.status === "sending" && Date.now() - existing.updatedAt.getTime() < 15 * 60_000) return "retry_later";

  let snapshot: DailyDigestSnapshot;
  if (existing?.snapshotJson) {
    snapshot = JSON.parse(existing.snapshotJson) as DailyDigestSnapshot;
  } else {
    snapshot = await buildSnapshot(date);
  }
  if (existing) {
    await db.update(dailyDigestDeliveries).set({ status: "sending", snapshotJson: JSON.stringify(snapshot), attempts: sql`${dailyDigestDeliveries.attempts} + 1`, errorCode: null })
      .where(eq(dailyDigestDeliveries.metricDate, date));
  } else {
    await db.insert(dailyDigestDeliveries).values({ metricDate: date, status: "sending", snapshotJson: JSON.stringify(snapshot), attempts: 1 });
  }

  const message = emailPayload(snapshot);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `folio-daily-digest/${date}` },
      body: JSON.stringify({ from, to: [to], subject: `Folio daily operations — ${date} UTC`, html: message.html, text: message.text }),
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => null) as { id?: unknown } | null;
    if (!response.ok || typeof payload?.id !== "string") {
      await db.update(dailyDigestDeliveries).set({ status: "failed", errorCode: `provider_http_${response.status}` }).where(eq(dailyDigestDeliveries.metricDate, date));
      return "retry_later";
    }
    await db.update(dailyDigestDeliveries).set({ status: "sent", providerEmailId: payload.id, sentAt: new Date(), errorCode: null }).where(eq(dailyDigestDeliveries.metricDate, date));
    return "sent";
  } catch {
    await db.update(dailyDigestDeliveries).set({ status: "failed", errorCode: "provider_network_error" }).where(eq(dailyDigestDeliveries.metricDate, date));
    return "retry_later";
  }
}

export async function collectDailyReportMetrics(date: string) {
  return buildSnapshot(date);
}
