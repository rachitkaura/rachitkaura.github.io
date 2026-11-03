CREATE TABLE `calibration_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`calibration_id` text NOT NULL,
	`user_id` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`calibration_id`) REFERENCES `hiring_calibrations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calibration_voter` ON `calibration_votes` (`calibration_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `hiring_calibrations` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`version` integer NOT NULL,
	`job_data` text NOT NULL,
	`data` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`approved_at` text,
	FOREIGN KEY (`job_id`) REFERENCES `live_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calibration_job_version` ON `hiring_calibrations` (`job_id`,`version`);--> statement-breakpoint
CREATE TABLE `proof_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `proof_owner` ON `proof_cards` (`user_id`);--> statement-breakpoint
CREATE TABLE `proof_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`application_id` text NOT NULL,
	`review` text DEFAULT '' NOT NULL,
	`question` text DEFAULT '' NOT NULL,
	`reviewed_by` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `proof_cards`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`application_id`) REFERENCES `live_applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `proof_share_unique` ON `proof_shares` (`card_id`,`application_id`);--> statement-breakpoint
CREATE TABLE `review_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`capacity` integer NOT NULL,
	`deadline` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `live_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `review_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text NOT NULL,
	`outcome` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_at` text,
	FOREIGN KEY (`batch_id`) REFERENCES `review_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reservation_batch_user` ON `review_reservations` (`batch_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `reservation_batch_status` ON `review_reservations` (`batch_id`,`status`);