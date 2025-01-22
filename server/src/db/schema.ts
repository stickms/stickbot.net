import sqlite from 'better-sqlite3';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql, type InferSelectModel } from 'drizzle-orm';
import { encodeBase32LowerCaseNoPadding } from '@oslojs/encoding';

export const connection = sqlite('sqlite.db');
export const db = drizzle(connection);

function createId() {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

export const users = sqliteTable('users', {
  // Same as Discord ID
  id: text('id').primaryKey().$defaultFn(() => createId()),
  // Discord ID
  discordId: text('discord_id').unique(),
  // Discord Profile Stuff
  username: text('username').notNull(),
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
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  accessTokenExpiration: integer('access_token_expiration', {
    mode: 'timestamp'
  })
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

export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  host: text('host').references(() => users.id, {
    onDelete: 'cascade'
  }),
  hostUsername: text('host_username').notNull(),
  leaders: text('leaders', {
    mode: 'json'
  }).notNull().$type<string[]>().default(sql`'[]'`)
});

export const links = sqliteTable('links', {
  id: text('id').primaryKey(),
  url: text('url').notNull(),
  // NULL expiresAt = never expires
  expiresAt: integer('expires_at', {
    mode: 'timestamp'
  }),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' }),
});

export type User = InferSelectModel<typeof users>;
export type Session = InferSelectModel<typeof sessions>;
export type Room = InferSelectModel<typeof rooms>;
export type Link = InferSelectModel<typeof links>;
