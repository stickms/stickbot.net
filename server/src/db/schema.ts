import sqlite from 'better-sqlite3';
import {
  sqliteTable,
  integer,
  text
} from 'drizzle-orm/sqlite-core';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql, type InferSelectModel } from 'drizzle-orm';

const sqliteDB = sqlite('sqlite.db');
export const db = drizzle(sqliteDB);

export const users = sqliteTable('users', {
  id: integer('id').primaryKey(), // Discord ID
  apiToken: text('api_token'),
  apiGuild: text('api_guild'),
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

export type User = InferSelectModel<typeof users>;
export type Session = InferSelectModel<typeof sessions>;
