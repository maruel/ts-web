CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`google_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`given_name` text,
	`family_name` text,
	`picture` text,
	`locale` text,
	`verified_email` integer NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text,
	`expires_at` integer,
	`created_at` integer DEFAULT current_timestamp NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_id_unique` ON `users` (`google_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);