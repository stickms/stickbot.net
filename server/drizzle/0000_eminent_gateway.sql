CREATE TABLE `links` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`expires_at` integer,
	`user_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`host` text,
	`leaders` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`host`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`discord_id` text,
	`username` text,
	`avatar` text,
	`promoted_on` integer,
	`api_token` text,
	`api_guild` text,
	`refresh_token` text,
	`access_token` text,
	`access_token_expiration` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_discord_id_unique` ON `users` (`discord_id`);