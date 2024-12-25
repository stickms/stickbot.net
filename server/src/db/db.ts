import sqlite from "better-sqlite3";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { drizzle } from "drizzle-orm/better-sqlite3";

import type { InferSelectModel } from "drizzle-orm";

const sqliteDB = sqlite(":memory:");
export const db = drizzle(sqliteDB);

export const users = sqliteTable("users", {
	id: integer("id").primaryKey()
});

export const sessions = sqliteTable("sessions", {
	id: text("id").primaryKey(),
	userId: integer("user_id")
		.notNull()
		.references(() => users.id),
	expiresAt: integer("expires_at", {
		mode: "timestamp"
	}).notNull()
});

export type User = InferSelectModel<typeof users>;
export type Session = InferSelectModel<typeof sessions>;
