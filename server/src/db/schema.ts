import sqlite from 'better-sqlite3';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { InferSelectModel } from 'drizzle-orm';
import { timestamp } from 'drizzle-orm/mysql-core';

export const connection = sqlite('sqlite.db');
export const db = drizzle(connection);

export const users = sqliteTable('users', {
  // Same as Discord ID
  id: text('id').primaryKey(),
  // Discord Profile Stuff
  username: text('username'),
  avatar: text('avatar'),
  // When was this user made an Admin?
  // Null if user is not an admin 
  promotedOn: integer('promoted_on', {
    mode: 'timestamp'
  }),
  // Website API
  apiToken: text('api_token'),
  apiGuild: text('api_guild'),
  // Discord OAuth2
  refreshToken: text('refresh_token').notNull(),
  accessToken: text('access_token').notNull(),
  accessTokenExpiration: integer('access_token_expiration', {
    mode: 'timestamp'
  }).notNull()
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', {
    mode: 'timestamp'
  }).notNull()
});

export type User = InferSelectModel<typeof users>;
export type Session = InferSelectModel<typeof sessions>;
