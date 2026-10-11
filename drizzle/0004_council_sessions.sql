ALTER TABLE `councilRuns` DROP INDEX `councilRuns_meetingDate_unique`;--> statement-breakpoint
ALTER TABLE `councilRuns` ADD `sessionType` enum('discussion','daily_meeting') DEFAULT 'daily_meeting' NOT NULL;--> statement-breakpoint
ALTER TABLE `councilRuns` ADD CONSTRAINT `council_runs_date_type_unique` UNIQUE(`meetingDate`,`sessionType`);