import sqlite from 'better-sqlite3';
import { sqliteTable, integer, text, SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql, type InferSelectModel } from 'drizzle-orm';

const sqliteDB = sqlite(':memory:');
export const db = drizzle(sqliteDB);

export const users = sqliteTable('users', {
  id: integer('id').primaryKey(),
	discordId: text('discord_id').notNull(),
	refreshToken: text('refresh_token').notNull(),
	accessToken: text('access_token').notNull(),
	accessTokenExpiration: integer('access_token_expiration', {
		mode: 'timestamp'
	}).notNull()
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: integer('expires_at', {
    mode: 'timestamp'
  }).notNull()
});

// Annoying, hardcoded, but necessary for in-memory db

db.run(sql`
  CREATE TABLE users (
	id integer PRIMARY KEY NOT NULL,
	discord_id text NOT NULL,
	refresh_token text NOT NULL,
	access_token text NOT NULL,
	access_token_expiration integer NOT NULL
);
`);

db.run(sql`
  CREATE TABLE sessions (
	id text PRIMARY KEY NOT NULL,
	user_id integer NOT NULL,
	expires_at integer NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
);
`);

export type User = InferSelectModel<typeof users>;
export type Session = InferSelectModel<typeof sessions>;
