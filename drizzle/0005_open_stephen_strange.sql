CREATE TABLE `managedGitProjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('github','gitlab') NOT NULL,
	`externalId` varchar(128) NOT NULL,
	`owner` varchar(180) NOT NULL,
	`name` varchar(120) NOT NULL,
	`fullName` varchar(220) NOT NULL,
	`description` varchar(500) NOT NULL DEFAULT '',
	`cloneUrl` varchar(500) NOT NULL,
	`webUrl` varchar(500) NOT NULL,
	`defaultBranch` varchar(120) NOT NULL DEFAULT 'main',
	`visibility` enum('private','internal','public') NOT NULL DEFAULT 'private',
	`exposure` enum('private','open_source','for_sale') NOT NULL DEFAULT 'private',
	`published` int NOT NULL DEFAULT 0,
	`localPath` varchar(500) NOT NULL,
	`syncStatus` enum('pending','syncing','synced','error') NOT NULL DEFAULT 'pending',
	`syncError` varchar(240),
	`sourceUpdatedAt` timestamp,
	`lastSyncedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `managedGitProjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `managed_git_provider_external_unique` UNIQUE(`provider`,`externalId`)
);
--> statement-breakpoint
CREATE INDEX `managed_git_published_idx` ON `managedGitProjects` (`published`,`updatedAt`);