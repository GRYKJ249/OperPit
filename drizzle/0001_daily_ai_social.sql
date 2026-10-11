CREATE TABLE `dailyBatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchDate` varchar(10) NOT NULL,
	`status` enum('processing','published','failed') NOT NULL DEFAULT 'processing',
	`generatedCount` int NOT NULL DEFAULT 0,
	`errorCode` varchar(100),
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `dailyBatches_id` PRIMARY KEY(`id`),
	CONSTRAINT `dailyBatches_batchDate_unique` UNIQUE(`batchDate`)
);
--> statement-breakpoint
CREATE TABLE `dailyComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postSlug` varchar(160) NOT NULL,
	`displayName` varchar(48) NOT NULL,
	`body` varchar(500) NOT NULL,
	`locale` enum('ar','en') NOT NULL DEFAULT 'ar',
	`status` enum('visible','hidden') NOT NULL DEFAULT 'visible',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dailyComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dailyMetricEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postSlug` varchar(160) NOT NULL,
	`metricDate` varchar(10) NOT NULL,
	`visitorHash` varchar(64) NOT NULL,
	`kind` enum('view','share') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dailyMetricEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_metric_events_unique` UNIQUE(`postSlug`,`metricDate`,`visitorHash`,`kind`)
);
--> statement-breakpoint
CREATE TABLE `dailyMetrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postSlug` varchar(160) NOT NULL,
	`metricDate` varchar(10) NOT NULL,
	`views` int NOT NULL DEFAULT 0,
	`shares` int NOT NULL DEFAULT 0,
	CONSTRAINT `dailyMetrics_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_metrics_post_date_unique` UNIQUE(`postSlug`,`metricDate`)
);
--> statement-breakpoint
CREATE TABLE `dailyPosts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(160) NOT NULL,
	`batchDate` varchar(10) NOT NULL,
	`position` int NOT NULL,
	`category` enum('programming','psychology','trading','design','learning') NOT NULL,
	`titleAr` varchar(180) NOT NULL,
	`titleEn` varchar(180) NOT NULL,
	`summaryAr` text NOT NULL,
	`summaryEn` text NOT NULL,
	`bodyAr` text NOT NULL,
	`bodyEn` text NOT NULL,
	`takeawayAr` varchar(500) NOT NULL,
	`takeawayEn` varchar(500) NOT NULL,
	`imagePath` varchar(512) NOT NULL,
	`imageAltAr` varchar(220) NOT NULL,
	`imageAltEn` varchar(220) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dailyPosts_id` PRIMARY KEY(`id`),
	CONSTRAINT `dailyPosts_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `daily_posts_date_position_unique` UNIQUE(`batchDate`,`position`)
);
--> statement-breakpoint
CREATE TABLE `dailyReactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postSlug` varchar(160) NOT NULL,
	`visitorHash` varchar(64) NOT NULL,
	`reaction` enum('like','insightful','inspiring') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailyReactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_reactions_post_visitor_unique` UNIQUE(`postSlug`,`visitorHash`)
);
--> statement-breakpoint
CREATE TABLE `scheduledJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` varchar(48) NOT NULL,
	`taskUid` varchar(128) NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scheduledJobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `scheduledJobs_kind_unique` UNIQUE(`kind`),
	CONSTRAINT `scheduledJobs_taskUid_unique` UNIQUE(`taskUid`)
);
--> statement-breakpoint
CREATE INDEX `daily_comments_post_created_idx` ON `dailyComments` (`postSlug`,`createdAt`);--> statement-breakpoint
CREATE INDEX `daily_posts_date_idx` ON `dailyPosts` (`batchDate`);--> statement-breakpoint
CREATE INDEX `daily_reactions_post_idx` ON `dailyReactions` (`postSlug`);