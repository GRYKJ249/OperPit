import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, index, uniqueIndex } from "drizzle-orm/mysql-core";

/** Core user table retained from the starter; the public portfolio does not require visitor accounts. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** One all-or-nothing, idempotent five-post generation batch per UTC date. */
export const dailyBatches = mysqlTable("dailyBatches", {
  id: int("id").autoincrement().primaryKey(),
  batchDate: varchar("batchDate", { length: 10 }).notNull().unique(),
  status: mysqlEnum("status", ["processing", "published", "failed"]).default("processing").notNull(),
  generatedCount: int("generatedCount").default(0).notNull(),
  themeKey: mysqlEnum("themeKey", ["cobalt", "coral", "jade", "violet"]).default("cobalt").notNull(),
  evolutionAr: varchar("evolutionAr", { length: 360 }).default("").notNull(),
  evolutionEn: varchar("evolutionEn", { length: 360 }).default("").notNull(),
  errorCode: varchar("errorCode", { length: 100 }),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

/** Public bilingual educational posts generated for the daily issue. */
export const dailyPosts = mysqlTable("dailyPosts", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  batchDate: varchar("batchDate", { length: 10 }).notNull(),
  position: int("position").notNull(),
  category: mysqlEnum("category", ["programming", "psychology", "trading", "design", "learning"]).notNull(),
  titleAr: varchar("titleAr", { length: 180 }).notNull(),
  titleEn: varchar("titleEn", { length: 180 }).notNull(),
  summaryAr: text("summaryAr").notNull(),
  summaryEn: text("summaryEn").notNull(),
  bodyAr: text("bodyAr").notNull(),
  bodyEn: text("bodyEn").notNull(),
  takeawayAr: varchar("takeawayAr", { length: 500 }).notNull(),
  takeawayEn: varchar("takeawayEn", { length: 500 }).notNull(),
  imagePath: varchar("imagePath", { length: 512 }).notNull(),
  imageAltAr: varchar("imageAltAr", { length: 220 }).notNull(),
  imageAltEn: varchar("imageAltEn", { length: 220 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("daily_posts_date_position_unique").on(table.batchDate, table.position),
  index("daily_posts_date_idx").on(table.batchDate),
]);

/** A one-to-one anonymous visitor reaction per post; visitor identifiers are random client tokens, not accounts. */
export const dailyReactions = mysqlTable("dailyReactions", {
  id: int("id").autoincrement().primaryKey(),
  postSlug: varchar("postSlug", { length: 160 }).notNull(),
  visitorHash: varchar("visitorHash", { length: 64 }).notNull(),
  reaction: mysqlEnum("reaction", ["like", "insightful", "inspiring"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("daily_reactions_post_visitor_unique").on(table.postSlug, table.visitorHash),
  index("daily_reactions_post_idx").on(table.postSlug),
]);

/** Short public comments; no email, phone, or account identifier is collected. */
export const dailyComments = mysqlTable("dailyComments", {
  id: int("id").autoincrement().primaryKey(),
  postSlug: varchar("postSlug", { length: 160 }).notNull(),
  displayName: varchar("displayName", { length: 48 }).notNull(),
  body: varchar("body", { length: 500 }).notNull(),
  locale: mysqlEnum("locale", ["ar", "en"]).default("ar").notNull(),
  status: mysqlEnum("status", ["visible", "hidden"]).default("visible").notNull(),
  moderationReason: mysqlEnum("moderationReason", ["abuse", "hate", "threat", "spam", "privacy", "unsafe", "other"]),
  aiReaction: mysqlEnum("aiReaction", ["heart", "thoughtful", "thanks"]),
  aiReplyAr: varchar("aiReplyAr", { length: 360 }),
  aiReplyEn: varchar("aiReplyEn", { length: 360 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("daily_comments_post_created_idx").on(table.postSlug, table.createdAt),
]);

/** Daily aggregate counters; event identifiers are stored separately to avoid double-counting a visitor per UTC day. */
export const dailyMetrics = mysqlTable("dailyMetrics", {
  id: int("id").autoincrement().primaryKey(),
  postSlug: varchar("postSlug", { length: 160 }).notNull(),
  metricDate: varchar("metricDate", { length: 10 }).notNull(),
  views: int("views").default(0).notNull(),
  shares: int("shares").default(0).notNull(),
}, (table) => [
  uniqueIndex("daily_metrics_post_date_unique").on(table.postSlug, table.metricDate),
]);

export const dailyMetricEvents = mysqlTable("dailyMetricEvents", {
  id: int("id").autoincrement().primaryKey(),
  postSlug: varchar("postSlug", { length: 160 }).notNull(),
  metricDate: varchar("metricDate", { length: 10 }).notNull(),
  visitorHash: varchar("visitorHash", { length: 64 }).notNull(),
  kind: mysqlEnum("kind", ["view", "share"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("daily_metric_events_unique").on(table.postSlug, table.metricDate, table.visitorHash, table.kind),
]);

/** Session-only, hashed, first-party page visits; no IP address, account, or contact details. */
export const siteVisitEvents = mysqlTable("siteVisitEvents", {
  id: int("id").autoincrement().primaryKey(),
  metricDate: varchar("metricDate", { length: 10 }).notNull(),
  route: varchar("route", { length: 160 }).notNull(),
  visitorHash: varchar("visitorHash", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("site_visit_session_route_unique").on(table.metricDate, table.route, table.visitorHash),
  index("site_visit_date_idx").on(table.metricDate),
]);

/** Aggregated feature counts only; prompts and responses are never stored here. */
export const aiUsageCounters = mysqlTable("aiUsageCounters", {
  id: int("id").autoincrement().primaryKey(),
  metricDate: varchar("metricDate", { length: 10 }).notNull(),
  mode: mysqlEnum("mode", ["guide", "draft", "explain_code", "daily_generation", "comment_moderation", "council", "provider_healthcheck"]).notNull(),
  requestCount: int("requestCount").default(0).notNull(),
}, (table) => [
  uniqueIndex("ai_usage_date_mode_unique").on(table.metricDate, table.mode),
]);

/** One frozen, aggregate-only email snapshot per UTC day; no message or visitor identity is stored. */
export const dailyDigestDeliveries = mysqlTable("dailyDigestDeliveries", {
  id: int("id").autoincrement().primaryKey(),
  metricDate: varchar("metricDate", { length: 10 }).notNull().unique(),
  status: mysqlEnum("status", ["sending", "sent", "failed"]).default("sending").notNull(),
  snapshotJson: text("snapshotJson").notNull(),
  providerEmailId: varchar("providerEmailId", { length: 255 }),
  errorCode: varchar("errorCode", { length: 100 }),
  attempts: int("attempts").default(0).notNull(),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Filled only when an owner registers the published heartbeat schedule. */
export const scheduledJobs = mysqlTable("scheduledJobs", {
  id: int("id").autoincrement().primaryKey(),
  kind: varchar("kind", { length: 48 }).notNull().unique(),
  taskUid: varchar("taskUid", { length: 128 }).notNull().unique(),
  active: int("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** One private council session per UTC date; all free-form contents remain encrypted at rest. */
export const councilRuns = mysqlTable("councilRuns", {
  id: int("id").autoincrement().primaryKey(),
  meetingDate: varchar("meetingDate", { length: 10 }).notNull(),
  sessionType: mysqlEnum("sessionType", ["discussion", "daily_meeting"]).default("daily_meeting").notNull(),
  topic: varchar("topic", { length: 180 }).notNull(),
  status: mysqlEnum("status", ["running", "completed", "failed"]).default("running").notNull(),
  groupName: varchar("groupName", { length: 80 }).notNull(),
  groupTheme: mysqlEnum("groupTheme", ["cobalt", "coral", "jade", "violet"]).default("cobalt").notNull(),
  facilitator: varchar("facilitator", { length: 40 }),
  winnerCipher: text("winnerCipher"),
  summaryCipher: text("summaryCipher"),
  dissentCipher: text("dissentCipher"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, (table) => [
  uniqueIndex("council_runs_date_type_unique").on(table.meetingDate, table.sessionType),
  index("council_runs_date_status_idx").on(table.meetingDate, table.status),
]);

export const councilMessages = mysqlTable("councilMessages", {
  id: int("id").autoincrement().primaryKey(),
  runId: int("runId").notNull(),
  sequence: int("sequence").notNull(),
  providerId: varchar("providerId", { length: 40 }).notNull(),
  role: mysqlEnum("role", ["proposal", "reply", "system", "admin", "dissent"]).notNull(),
  bodyCipher: text("bodyCipher").notNull(),
  ideaId: varchar("ideaId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("council_messages_run_sequence_idx").on(table.runId, table.sequence)]);

export const councilVotes = mysqlTable("councilVotes", {
  id: int("id").autoincrement().primaryKey(),
  runId: int("runId").notNull(),
  voterHash: varchar("voterHash", { length: 64 }).notNull(),
  ideaId: varchar("ideaId", { length: 64 }).notNull(),
  stars: int("stars").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("council_vote_run_voter_idea_unique").on(table.runId, table.voterHash, table.ideaId)]);

export const councilPolls = mysqlTable("councilPolls", {
  id: int("id").autoincrement().primaryKey(),
  runId: int("runId").notNull(),
  questionCipher: text("questionCipher").notNull(),
  optionsCipher: text("optionsCipher").notNull(),
  resultCipher: text("resultCipher"),
  status: mysqlEnum("status", ["open", "closed"]).default("open").notNull(),
  closesAt: timestamp("closesAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("council_polls_run_status_idx").on(table.runId, table.status)]);

export const councilPins = mysqlTable("councilPins", {
  id: int("id").autoincrement().primaryKey(),
  runId: int("runId").notNull(),
  bodyCipher: text("bodyCipher").notNull(),
  pinnedBy: varchar("pinnedBy", { length: 40 }).notNull(),
  active: int("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("council_pins_run_active_idx").on(table.runId, table.active)]);

export const councilProviderStates = mysqlTable("councilProviderStates", {
  id: int("id").autoincrement().primaryKey(),
  providerId: varchar("providerId", { length: 40 }).notNull().unique(),
  frozenUntil: timestamp("frozenUntil"),
  failureCount: int("failureCount").default(0).notNull(),
  lastErrorCode: varchar("lastErrorCode", { length: 64 }),
  lastSuccessAt: timestamp("lastSuccessAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Append-only audit metadata; details are sealed before insert and there is no public read endpoint. */
export const councilAuditEvents = mysqlTable("councilAuditEvents", {
  id: int("id").autoincrement().primaryKey(),
  eventDate: varchar("eventDate", { length: 10 }).notNull(),
  eventType: varchar("eventType", { length: 48 }).notNull(),
  actorType: varchar("actorType", { length: 24 }).notNull(),
  targetId: varchar("targetId", { length: 96 }),
  detailCipher: text("detailCipher"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("council_audit_date_idx").on(table.eventDate, table.createdAt)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type DailyPost = typeof dailyPosts.$inferSelect;
