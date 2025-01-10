CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`api_token` text,
	`api_guild` text,
	`refresh_token` text NOT NULL,
	`access_token` text NOT NULL,
	`access_token_expiration` integer NOT NULL
);
