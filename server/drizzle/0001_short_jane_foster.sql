PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`discord_id` text,
	`username` text NOT NULL,
	`avatar` text,
	`promoted_on` integer,
	`api_token` text,
	`api_guild` text,
	`refresh_token` text,
	`access_token` text,
	`access_token_expiration` integer
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "discord_id", "username", "avatar", "promoted_on", "api_token", "api_guild", "refresh_token", "access_token", "access_token_expiration") SELECT "id", "discord_id", "username", "avatar", "promoted_on", "api_token", "api_guild", "refresh_token", "access_token", "access_token_expiration" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_discord_id_unique` ON `users` (`discord_id`);