import { sql } from "drizzle-orm";
import { aiUsageCounters } from "../drizzle/schema";
import { getDb } from "./db";

export type AiUsageMode = "guide" | "draft" | "explain_code" | "daily_generation" | "comment_moderation" | "council" | "provider_healthcheck";

export async function recordAiUsage(mode: AiUsageMode, metricDate = new Date().toISOString().slice(0, 10)) {
  try {
    const db = await getDb();
    if (!db || !/^\d{4}-\d{2}-\d{2}$/.test(metricDate)) return false;
    await db.insert(aiUsageCounters).values({ metricDate, mode, requestCount: 1 })
      .onConflictDoUpdate({ target: [aiUsageCounters.metricDate, aiUsageCounters.mode], set: { requestCount: sql`${aiUsageCounters.requestCount} + 1` } });
    return true;
  } catch {
    // Aggregated analytics must never take down a visitor-facing AI response.
    return false;
  }
}
