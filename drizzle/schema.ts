import { integer, pgTable, serial, text, timestamp, varchar, index, uniqueIndex } from "drizzle-orm/pg-core";

/** Core user table retained from the starter; the public portfolio does not require visitor accounts. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 64 }).default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

/** One all-or-nothing, idempotent five-post generation batch per UTC date. */
export const dailyBatches = pgTable("dailyBatches", {
  id: serial("id").primaryKey(),
  batchDate: varchar("batchDate", { length: 10 }).notNull().unique(),
  status: varchar("status", { length: 64 }).default("processing").notNull(),
  generatedCount: integer("generatedCount").default(0).notNull(),
  themeKey: varchar("themeKey", { length: 64 }).default("cobalt").notNull(),
  evolutionAr: varchar("evolutionAr", { length: 360 }).default("").notNull(),
  evolutionEn: varchar("evolutionEn", { length: 360 }).default("").notNull(),
  errorCode: varchar("errorCode", { length: 100 }),
  startedAt: timestamp("startedAt", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completedAt", { withTimezone: true }),
});

/** Public bilingual educational posts generated for the daily issue. */
export const dailyPosts = pgTable("dailyPosts", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  batchDate: varchar("batchDate", { length: 10 }).notNull(),
  position: integer("position").notNull(),
  category: varchar("category", { length: 64 }).notNull(),
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
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("daily_posts_date_position_unique").on(table.batchDate, table.position),
  index("daily_posts_date_idx").on(table.batchDate),
]);

/** A one-to-one anonymous visitor reaction per post; visitor identifiers are random client tokens, not accounts. */
export const dailyReactions = pgTable("dailyReactions", {
  id: serial("id").primaryKey(),
  postSlug: varchar("postSlug", { length: 160 }).notNull(),
  visitorHash: varchar("visitorHash", { length: 64 }).notNull(),
  reaction: varchar("reaction", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  uniqueIndex("daily_reactions_post_visitor_unique").on(table.postSlug, table.visitorHash),
  index("daily_reactions_post_idx").on(table.postSlug),
]);

/** Short public comments; no email, phone, or account identifier is collected. */
export const dailyComments = pgTable("dailyComments", {
  id: serial("id").primaryKey(),
  postSlug: varchar("postSlug", { length: 160 }).notNull(),
  displayName: varchar("displayName", { length: 48 }).notNull(),
  body: varchar("body", { length: 500 }).notNull(),
  locale: varchar("locale", { length: 64 }).default("ar").notNull(),
  status: varchar("status", { length: 64 }).default("visible").notNull(),
  moderationReason: varchar("moderationReason", { length: 64 }),
  aiReaction: varchar("aiReaction", { length: 64 }),
  aiReplyAr: varchar("aiReplyAr", { length: 360 }),
  aiReplyEn: varchar("aiReplyEn", { length: 360 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("daily_comments_post_created_idx").on(table.postSlug, table.createdAt),
]);

/** Daily aggregate counters; event identifiers are stored separately to avoid double-counting a visitor per UTC day. */
export const dailyMetrics = pgTable("dailyMetrics", {
  id: serial("id").primaryKey(),
  postSlug: varchar("postSlug", { length: 160 }).notNull(),
  metricDate: varchar("metricDate", { length: 10 }).notNull(),
  views: integer("views").default(0).notNull(),
  shares: integer("shares").default(0).notNull(),
}, (table) => [
  uniqueIndex("daily_metrics_post_date_unique").on(table.postSlug, table.metricDate),
]);

export const dailyMetricEvents = pgTable("dailyMetricEvents", {
  id: serial("id").primaryKey(),
  postSlug: varchar("postSlug", { length: 160 }).notNull(),
  metricDate: varchar("metricDate", { length: 10 }).notNull(),
  visitorHash: varchar("visitorHash", { length: 64 }).notNull(),
  kind: varchar("kind", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("daily_metric_events_unique").on(table.postSlug, table.metricDate, table.visitorHash, table.kind),
]);

/** Session-only, hashed, first-party page visits; no IP address, account, or contact details. */
export const siteVisitEvents = pgTable("siteVisitEvents", {
  id: serial("id").primaryKey(),
  metricDate: varchar("metricDate", { length: 10 }).notNull(),
  route: varchar("route", { length: 160 }).notNull(),
  visitorHash: varchar("visitorHash", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("site_visit_session_route_unique").on(table.metricDate, table.route, table.visitorHash),
  index("site_visit_date_idx").on(table.metricDate),
]);

/** Aggregated feature counts only; prompts and responses are never stored here. */
export const aiUsageCounters = pgTable("aiUsageCounters", {
  id: serial("id").primaryKey(),
  metricDate: varchar("metricDate", { length: 10 }).notNull(),
  mode: varchar("mode", { length: 64 }).notNull(),
  requestCount: integer("requestCount").default(0).notNull(),
}, (table) => [
  uniqueIndex("ai_usage_date_mode_unique").on(table.metricDate, table.mode),
]);

/** One frozen, aggregate-only email snapshot per UTC day; no message or visitor identity is stored. */
export const dailyDigestDeliveries = pgTable("dailyDigestDeliveries", {
  id: serial("id").primaryKey(),
  metricDate: varchar("metricDate", { length: 10 }).notNull().unique(),
  status: varchar("status", { length: 64 }).default("sending").notNull(),
  snapshotJson: text("snapshotJson").notNull(),
  providerEmailId: varchar("providerEmailId", { length: 255 }),
  errorCode: varchar("errorCode", { length: 100 }),
  attempts: integer("attempts").default(0).notNull(),
  sentAt: timestamp("sentAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

/** Filled only when an owner registers the published heartbeat schedule. */
export const scheduledJobs = pgTable("scheduledJobs", {
  id: serial("id").primaryKey(),
  kind: varchar("kind", { length: 48 }).notNull().unique(),
  taskUid: varchar("taskUid", { length: 128 }).notNull().unique(),
  active: integer("active").default(1).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

/** One private council session per UTC date; all free-form contents remain encrypted at rest. */
export const councilRuns = pgTable("councilRuns", {
  id: serial("id").primaryKey(),
  meetingDate: varchar("meetingDate", { length: 10 }).notNull(),
  sessionType: varchar("sessionType", { length: 64 }).default("daily_meeting").notNull(),
  topic: varchar("topic", { length: 180 }).notNull(),
  status: varchar("status", { length: 64 }).default("running").notNull(),
  groupName: varchar("groupName", { length: 80 }).notNull(),
  groupTheme: varchar("groupTheme", { length: 64 }).default("cobalt").notNull(),
  facilitator: varchar("facilitator", { length: 40 }),
  winnerCipher: text("winnerCipher"),
  summaryCipher: text("summaryCipher"),
  dissentCipher: text("dissentCipher"),
  startedAt: timestamp("startedAt", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completedAt", { withTimezone: true }),
}, (table) => [
  uniqueIndex("council_runs_date_type_unique").on(table.meetingDate, table.sessionType),
  index("council_runs_date_status_idx").on(table.meetingDate, table.status),
]);

export const councilMessages = pgTable("councilMessages", {
  id: serial("id").primaryKey(),
  runId: integer("runId").notNull(),
  sequence: integer("sequence").notNull(),
  providerId: varchar("providerId", { length: 40 }).notNull(),
  role: varchar("role", { length: 64 }).notNull(),
  bodyCipher: text("bodyCipher").notNull(),
  ideaId: varchar("ideaId", { length: 64 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("council_messages_run_sequence_idx").on(table.runId, table.sequence)]);

export const councilVotes = pgTable("councilVotes", {
  id: serial("id").primaryKey(),
  runId: integer("runId").notNull(),
  voterHash: varchar("voterHash", { length: 64 }).notNull(),
  ideaId: varchar("ideaId", { length: 64 }).notNull(),
  stars: integer("stars").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("council_vote_run_voter_idea_unique").on(table.runId, table.voterHash, table.ideaId)]);

export const councilPolls = pgTable("councilPolls", {
  id: serial("id").primaryKey(),
  runId: integer("runId").notNull(),
  questionCipher: text("questionCipher").notNull(),
  optionsCipher: text("optionsCipher").notNull(),
  resultCipher: text("resultCipher"),
  status: varchar("status", { length: 64 }).default("open").notNull(),
  closesAt: timestamp("closesAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("council_polls_run_status_idx").on(table.runId, table.status)]);

export const councilPins = pgTable("councilPins", {
  id: serial("id").primaryKey(),
  runId: integer("runId").notNull(),
  bodyCipher: text("bodyCipher").notNull(),
  pinnedBy: varchar("pinnedBy", { length: 40 }).notNull(),
  active: integer("active").default(1).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("council_pins_run_active_idx").on(table.runId, table.active)]);

export const councilProviderStates = pgTable("councilProviderStates", {
  id: serial("id").primaryKey(),
  providerId: varchar("providerId", { length: 40 }).notNull().unique(),
  frozenUntil: timestamp("frozenUntil", { withTimezone: true }),
  failureCount: integer("failureCount").default(0).notNull(),
  lastErrorCode: varchar("lastErrorCode", { length: 64 }),
  lastSuccessAt: timestamp("lastSuccessAt", { withTimezone: true }),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

/** Append-only audit metadata; details are sealed before insert and there is no public read endpoint. */
export const councilAuditEvents = pgTable("councilAuditEvents", {
  id: serial("id").primaryKey(),
  eventDate: varchar("eventDate", { length: 10 }).notNull(),
  eventType: varchar("eventType", { length: 48 }).notNull(),
  actorType: varchar("actorType", { length: 24 }).notNull(),
  targetId: varchar("targetId", { length: 96 }),
  detailCipher: text("detailCipher"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("council_audit_date_idx").on(table.eventDate, table.createdAt)]);

/** Owner-managed repositories mirrored locally for the public portfolio. Tokens never enter this table. */
export const managedGitProjects = pgTable("managedGitProjects", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 64 }).notNull(),
  externalId: varchar("externalId", { length: 128 }).notNull(),
  owner: varchar("owner", { length: 180 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  fullName: varchar("fullName", { length: 220 }).notNull(),
  description: varchar("description", { length: 500 }).default("").notNull(),
  cloneUrl: varchar("cloneUrl", { length: 500 }).notNull(),
  webUrl: varchar("webUrl", { length: 500 }).notNull(),
  defaultBranch: varchar("defaultBranch", { length: 120 }).default("main").notNull(),
  visibility: varchar("visibility", { length: 64 }).default("private").notNull(),
  exposure: varchar("exposure", { length: 64 }).default("private").notNull(),
  published: integer("published").default(0).notNull(),
  localPath: varchar("localPath", { length: 500 }).notNull(),
  syncStatus: varchar("syncStatus", { length: 64 }).default("pending").notNull(),
  syncError: varchar("syncError", { length: 240 }),
  sourceUpdatedAt: timestamp("sourceUpdatedAt", { withTimezone: true }),
  lastSyncedAt: timestamp("lastSyncedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  uniqueIndex("managed_git_provider_external_unique").on(table.provider, table.externalId),
  index("managed_git_published_idx").on(table.published, table.updatedAt),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type DailyPost = typeof dailyPosts.$inferSelect;
