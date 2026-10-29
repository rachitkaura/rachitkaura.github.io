CREATE TABLE `profile_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`submitted_name` text NOT NULL,
	`photo_key` text,
	`id_key` text,
	`status` text NOT NULL,
	`submitted_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`reviewed_at` text,
	`reviewed_by` text,
	`reason` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `live_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `verification_user_unique` ON `profile_verifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_status_idx` ON `profile_verifications` (`status`);--> statement-breakpoint
CREATE TABLE `verification_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_audit_subject_idx` ON `verification_audit` (`subject_type`,`subject_id`);--> statement-breakpoint
ALTER TABLE `live_companies` ADD `review_status` text DEFAULT 'unsubmitted' NOT NULL;--> statement-breakpoint
ALTER TABLE `live_companies` ADD `review_data` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `live_companies` ADD `review_requested_at` text;--> statement-breakpoint
ALTER TABLE `live_companies` ADD `reviewed_at` text;--> statement-breakpoint
ALTER TABLE `live_companies` ADD `reviewed_by` text;--> statement-breakpoint
ALTER TABLE `live_companies` ADD `review_reason` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `live_profiles` ADD `photo_key` text;--> statement-breakpoint
ALTER TABLE `live_profiles` ADD `identity_verified_at` text;--> statement-breakpoint
ALTER TABLE `live_profiles` ADD `verified_name` text;