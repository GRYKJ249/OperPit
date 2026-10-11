CREATE TABLE `aiUsageCounters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`metricDate` varchar(10) NOT NULL,
	`mode` enum('guide','draft','explain_code','daily_generation','comment_moderation') NOT NULL,
	`requestCount` int NOT NULL DEFAULT 0,
	CONSTRAINT `aiUsageCounters_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_usage_date_mode_unique` UNIQUE(`metricDate`,`mode`)
);
--> statement-breakpoint
CREATE TABLE `dailyDigestDeliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`metricDate` varchar(10) NOT NULL,
	`status` enum('sending','sent','failed') NOT NULL DEFAULT 'sending',
	`snapshotJson` text NOT NULL,
	`providerEmailId` varchar(255),
	`errorCode` varchar(100),
	`attempts` int NOT NULL DEFAULT 0,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailyDigestDeliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `dailyDigestDeliveries_metricDate_unique` UNIQUE(`metricDate`)
);
--> statement-breakpoint
CREATE TABLE `siteVisitEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`metricDate` varchar(10) NOT NULL,
	`route` varchar(160) NOT NULL,
	`visitorHash` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `siteVisitEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_visit_session_route_unique` UNIQUE(`metricDate`,`route`,`visitorHash`)
);
--> statement-breakpoint
ALTER TABLE `dailyBatches` ADD `themeKey` enum('cobalt','coral','jade','violet') DEFAULT 'cobalt' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailyBatches` ADD `evolutionAr` varchar(360) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailyBatches` ADD `evolutionEn` varchar(360) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailyComments` ADD `moderationReason` enum('abuse','hate','threat','spam','privacy','unsafe','other');--> statement-breakpoint
ALTER TABLE `dailyComments` ADD `aiReaction` enum('heart','thoughtful','thanks');--> statement-breakpoint
ALTER TABLE `dailyComments` ADD `aiReplyAr` varchar(360);--> statement-breakpoint
ALTER TABLE `dailyComments` ADD `aiReplyEn` varchar(360);--> statement-breakpoint
CREATE INDEX `site_visit_date_idx` ON `siteVisitEvents` (`metricDate`);