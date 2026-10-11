CREATE TABLE `councilAuditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventDate` varchar(10) NOT NULL,
	`eventType` varchar(48) NOT NULL,
	`actorType` varchar(24) NOT NULL,
	`targetId` varchar(96),
	`detailCipher` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `councilAuditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `councilMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`sequence` int NOT NULL,
	`providerId` varchar(40) NOT NULL,
	`role` enum('proposal','reply','system','admin','dissent') NOT NULL,
	`bodyCipher` text NOT NULL,
	`ideaId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `councilMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `councilPins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`bodyCipher` text NOT NULL,
	`pinnedBy` varchar(40) NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `councilPins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `councilPolls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`questionCipher` text NOT NULL,
	`optionsCipher` text NOT NULL,
	`resultCipher` text,
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`closesAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `councilPolls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `councilProviderStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` varchar(40) NOT NULL,
	`frozenUntil` timestamp,
	`failureCount` int NOT NULL DEFAULT 0,
	`lastErrorCode` varchar(64),
	`lastSuccessAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `councilProviderStates_id` PRIMARY KEY(`id`),
	CONSTRAINT `councilProviderStates_providerId_unique` UNIQUE(`providerId`)
);
--> statement-breakpoint
CREATE TABLE `councilRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingDate` varchar(10) NOT NULL,
	`topic` varchar(180) NOT NULL,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`groupName` varchar(80) NOT NULL,
	`groupTheme` enum('cobalt','coral','jade','violet') NOT NULL DEFAULT 'cobalt',
	`facilitator` varchar(40),
	`winnerCipher` text,
	`summaryCipher` text,
	`dissentCipher` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `councilRuns_id` PRIMARY KEY(`id`),
	CONSTRAINT `councilRuns_meetingDate_unique` UNIQUE(`meetingDate`)
);
--> statement-breakpoint
CREATE TABLE `councilVotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`voterHash` varchar(64) NOT NULL,
	`ideaId` varchar(64) NOT NULL,
	`stars` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `councilVotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `council_vote_run_voter_idea_unique` UNIQUE(`runId`,`voterHash`,`ideaId`)
);
--> statement-breakpoint
ALTER TABLE `aiUsageCounters` MODIFY COLUMN `mode` enum('guide','draft','explain_code','daily_generation','comment_moderation','council','provider_healthcheck') NOT NULL;--> statement-breakpoint
CREATE INDEX `council_audit_date_idx` ON `councilAuditEvents` (`eventDate`,`createdAt`);--> statement-breakpoint
CREATE INDEX `council_messages_run_sequence_idx` ON `councilMessages` (`runId`,`sequence`);--> statement-breakpoint
CREATE INDEX `council_pins_run_active_idx` ON `councilPins` (`runId`,`active`);--> statement-breakpoint
CREATE INDEX `council_polls_run_status_idx` ON `councilPolls` (`runId`,`status`);--> statement-breakpoint
CREATE INDEX `council_runs_date_status_idx` ON `councilRuns` (`meetingDate`,`status`);