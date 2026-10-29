CREATE TABLE `live_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`candidate_user_id` text NOT NULL,
	`job_id` text NOT NULL,
	`company_id` text NOT NULL,
	`candidate_interest` integer DEFAULT 0 NOT NULL,
	`employer_interest` integer DEFAULT 0 NOT NULL,
	`stage` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `live_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `live_jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `live_companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `live_application_unique` ON `live_applications` (`candidate_id`,`job_id`);--> statement-breakpoint
CREATE INDEX `applications_user_idx` ON `live_applications` (`candidate_user_id`);--> statement-breakpoint
CREATE INDEX `applications_company_idx` ON `live_applications` (`company_id`);--> statement-breakpoint
CREATE TABLE `live_companies` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`domain` text NOT NULL,
	`verification_token` text NOT NULL,
	`verified_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_domain_unique` ON `live_companies` (`domain`);--> statement-breakpoint
CREATE TABLE `live_interviews` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`slot_id` text NOT NULL,
	`host_id` text NOT NULL,
	`guest_id` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`status` text NOT NULL,
	`notes` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `live_applications`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`slot_id`) REFERENCES `live_slots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interview_slot_unique` ON `live_interviews` (`slot_id`);--> statement-breakpoint
CREATE TABLE `live_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`data` text NOT NULL,
	`status` text NOT NULL,
	`confirmed_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `live_companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `live_job_company_idx` ON `live_jobs` (`company_id`);--> statement-breakpoint
CREATE TABLE `live_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `live_applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `messages_application_idx` ON `live_messages` (`application_id`);--> statement-breakpoint
CREATE TABLE `live_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`data` text NOT NULL,
	`privacy` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `live_profile_user_unique` ON `live_profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `live_members` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`email` text NOT NULL,
	`user_id` text,
	`role` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `live_companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `members_user_idx` ON `live_members` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_company_email` ON `live_members` (`company_id`,`email`);--> statement-breakpoint
CREATE TABLE `live_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	`read_at` text
);
--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `live_notifications` (`user_id`);--> statement-breakpoint
CREATE TABLE `live_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `live_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `slots_owner_idx` ON `live_slots` (`owner_id`);