CREATE TABLE `email_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`state` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `email_deliveries_due` ON `email_deliveries` (`state`,`next_attempt`);--> statement-breakpoint
CREATE TABLE `email_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`events` text NOT NULL,
	`enabled_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pending_swipes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`actor` text NOT NULL,
	`origin` text NOT NULL,
	`payload` text NOT NULL,
	`label` text NOT NULL,
	`company_id` text,
	`due_at` integer NOT NULL,
	`state` text NOT NULL,
	`error` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `pending_swipes_due` ON `pending_swipes` (`state`,`due_at`);--> statement-breakpoint
CREATE INDEX `pending_swipes_user` ON `pending_swipes` (`user_id`,`updated_at`);