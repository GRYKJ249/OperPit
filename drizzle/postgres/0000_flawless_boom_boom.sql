CREATE TABLE "aiUsageCounters" (
	"id" serial PRIMARY KEY NOT NULL,
	"metricDate" varchar(10) NOT NULL,
	"mode" varchar(64) NOT NULL,
	"requestCount" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "councilAuditEvents" (
	"id" serial PRIMARY KEY NOT NULL,
	"eventDate" varchar(10) NOT NULL,
	"eventType" varchar(48) NOT NULL,
	"actorType" varchar(24) NOT NULL,
	"targetId" varchar(96),
	"detailCipher" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "councilMessages" (
	"id" serial PRIMARY KEY NOT NULL,
	"runId" integer NOT NULL,
	"sequence" integer NOT NULL,
	"providerId" varchar(40) NOT NULL,
	"role" varchar(64) NOT NULL,
	"bodyCipher" text NOT NULL,
	"ideaId" varchar(64),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "councilPins" (
	"id" serial PRIMARY KEY NOT NULL,
	"runId" integer NOT NULL,
	"bodyCipher" text NOT NULL,
	"pinnedBy" varchar(40) NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "councilPolls" (
	"id" serial PRIMARY KEY NOT NULL,
	"runId" integer NOT NULL,
	"questionCipher" text NOT NULL,
	"optionsCipher" text NOT NULL,
	"resultCipher" text,
	"status" varchar(64) DEFAULT 'open' NOT NULL,
	"closesAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "councilProviderStates" (
	"id" serial PRIMARY KEY NOT NULL,
	"providerId" varchar(40) NOT NULL,
	"frozenUntil" timestamp with time zone,
	"failureCount" integer DEFAULT 0 NOT NULL,
	"lastErrorCode" varchar(64),
	"lastSuccessAt" timestamp with time zone,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "councilProviderStates_providerId_unique" UNIQUE("providerId")
);
--> statement-breakpoint
CREATE TABLE "councilRuns" (
	"id" serial PRIMARY KEY NOT NULL,
	"meetingDate" varchar(10) NOT NULL,
	"sessionType" varchar(64) DEFAULT 'daily_meeting' NOT NULL,
	"topic" varchar(180) NOT NULL,
	"status" varchar(64) DEFAULT 'running' NOT NULL,
	"groupName" varchar(80) NOT NULL,
	"groupTheme" varchar(64) DEFAULT 'cobalt' NOT NULL,
	"facilitator" varchar(40),
	"winnerCipher" text,
	"summaryCipher" text,
	"dissentCipher" text,
	"startedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"completedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "councilVotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"runId" integer NOT NULL,
	"voterHash" varchar(64) NOT NULL,
	"ideaId" varchar(64) NOT NULL,
	"stars" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dailyBatches" (
	"id" serial PRIMARY KEY NOT NULL,
	"batchDate" varchar(10) NOT NULL,
	"status" varchar(64) DEFAULT 'processing' NOT NULL,
	"generatedCount" integer DEFAULT 0 NOT NULL,
	"themeKey" varchar(64) DEFAULT 'cobalt' NOT NULL,
	"evolutionAr" varchar(360) DEFAULT '' NOT NULL,
	"evolutionEn" varchar(360) DEFAULT '' NOT NULL,
	"errorCode" varchar(100),
	"startedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"completedAt" timestamp with time zone,
	CONSTRAINT "dailyBatches_batchDate_unique" UNIQUE("batchDate")
);
--> statement-breakpoint
CREATE TABLE "dailyComments" (
	"id" serial PRIMARY KEY NOT NULL,
	"postSlug" varchar(160) NOT NULL,
	"displayName" varchar(48) NOT NULL,
	"body" varchar(500) NOT NULL,
	"locale" varchar(64) DEFAULT 'ar' NOT NULL,
	"status" varchar(64) DEFAULT 'visible' NOT NULL,
	"moderationReason" varchar(64),
	"aiReaction" varchar(64),
	"aiReplyAr" varchar(360),
	"aiReplyEn" varchar(360),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dailyDigestDeliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"metricDate" varchar(10) NOT NULL,
	"status" varchar(64) DEFAULT 'sending' NOT NULL,
	"snapshotJson" text NOT NULL,
	"providerEmailId" varchar(255),
	"errorCode" varchar(100),
	"attempts" integer DEFAULT 0 NOT NULL,
	"sentAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dailyDigestDeliveries_metricDate_unique" UNIQUE("metricDate")
);
--> statement-breakpoint
CREATE TABLE "dailyMetricEvents" (
	"id" serial PRIMARY KEY NOT NULL,
	"postSlug" varchar(160) NOT NULL,
	"metricDate" varchar(10) NOT NULL,
	"visitorHash" varchar(64) NOT NULL,
	"kind" varchar(64) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dailyMetrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"postSlug" varchar(160) NOT NULL,
	"metricDate" varchar(10) NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"shares" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dailyPosts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(160) NOT NULL,
	"batchDate" varchar(10) NOT NULL,
	"position" integer NOT NULL,
	"category" varchar(64) NOT NULL,
	"titleAr" varchar(180) NOT NULL,
	"titleEn" varchar(180) NOT NULL,
	"summaryAr" text NOT NULL,
	"summaryEn" text NOT NULL,
	"bodyAr" text NOT NULL,
	"bodyEn" text NOT NULL,
	"takeawayAr" varchar(500) NOT NULL,
	"takeawayEn" varchar(500) NOT NULL,
	"imagePath" varchar(512) NOT NULL,
	"imageAltAr" varchar(220) NOT NULL,
	"imageAltEn" varchar(220) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dailyPosts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "dailyReactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"postSlug" varchar(160) NOT NULL,
	"visitorHash" varchar(64) NOT NULL,
	"reaction" varchar(64) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "managedGitProjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(64) NOT NULL,
	"externalId" varchar(128) NOT NULL,
	"owner" varchar(180) NOT NULL,
	"name" varchar(120) NOT NULL,
	"fullName" varchar(220) NOT NULL,
	"description" varchar(500) DEFAULT '' NOT NULL,
	"cloneUrl" varchar(500) NOT NULL,
	"webUrl" varchar(500) NOT NULL,
	"defaultBranch" varchar(120) DEFAULT 'main' NOT NULL,
	"visibility" varchar(64) DEFAULT 'private' NOT NULL,
	"exposure" varchar(64) DEFAULT 'private' NOT NULL,
	"published" integer DEFAULT 0 NOT NULL,
	"localPath" varchar(500) NOT NULL,
	"syncStatus" varchar(64) DEFAULT 'pending' NOT NULL,
	"syncError" varchar(240),
	"sourceUpdatedAt" timestamp with time zone,
	"lastSyncedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduledJobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" varchar(48) NOT NULL,
	"taskUid" varchar(128) NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scheduledJobs_kind_unique" UNIQUE("kind"),
	CONSTRAINT "scheduledJobs_taskUid_unique" UNIQUE("taskUid")
);
--> statement-breakpoint
CREATE TABLE "siteVisitEvents" (
	"id" serial PRIMARY KEY NOT NULL,
	"metricDate" varchar(10) NOT NULL,
	"route" varchar(160) NOT NULL,
	"visitorHash" varchar(64) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" varchar(64) DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_usage_date_mode_unique" ON "aiUsageCounters" USING btree ("metricDate","mode");--> statement-breakpoint
CREATE INDEX "council_audit_date_idx" ON "councilAuditEvents" USING btree ("eventDate","createdAt");--> statement-breakpoint
CREATE INDEX "council_messages_run_sequence_idx" ON "councilMessages" USING btree ("runId","sequence");--> statement-breakpoint
CREATE INDEX "council_pins_run_active_idx" ON "councilPins" USING btree ("runId","active");--> statement-breakpoint
CREATE INDEX "council_polls_run_status_idx" ON "councilPolls" USING btree ("runId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "council_runs_date_type_unique" ON "councilRuns" USING btree ("meetingDate","sessionType");--> statement-breakpoint
CREATE INDEX "council_runs_date_status_idx" ON "councilRuns" USING btree ("meetingDate","status");--> statement-breakpoint
CREATE UNIQUE INDEX "council_vote_run_voter_idea_unique" ON "councilVotes" USING btree ("runId","voterHash","ideaId");--> statement-breakpoint
CREATE INDEX "daily_comments_post_created_idx" ON "dailyComments" USING btree ("postSlug","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_metric_events_unique" ON "dailyMetricEvents" USING btree ("postSlug","metricDate","visitorHash","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_metrics_post_date_unique" ON "dailyMetrics" USING btree ("postSlug","metricDate");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_posts_date_position_unique" ON "dailyPosts" USING btree ("batchDate","position");--> statement-breakpoint
CREATE INDEX "daily_posts_date_idx" ON "dailyPosts" USING btree ("batchDate");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_reactions_post_visitor_unique" ON "dailyReactions" USING btree ("postSlug","visitorHash");--> statement-breakpoint
CREATE INDEX "daily_reactions_post_idx" ON "dailyReactions" USING btree ("postSlug");--> statement-breakpoint
CREATE UNIQUE INDEX "managed_git_provider_external_unique" ON "managedGitProjects" USING btree ("provider","externalId");--> statement-breakpoint
CREATE INDEX "managed_git_published_idx" ON "managedGitProjects" USING btree ("published","updatedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "site_visit_session_route_unique" ON "siteVisitEvents" USING btree ("metricDate","route","visitorHash");--> statement-breakpoint
CREATE INDEX "site_visit_date_idx" ON "siteVisitEvents" USING btree ("metricDate");