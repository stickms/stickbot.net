import sqlite from 'better-sqlite3';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { type InferSelectModel } from 'drizzle-orm';
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
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  username: text('username').notNull(),

  // Discord-related
  discordId: text('discord_id').unique(),
  avatar: text('avatar'),

  // When was this user made an Admin?
  // Null if user is not an admin
  promotedOn: integer('promoted_on', {
    mode: 'timestamp'
  }),

  // Website API
  apiToken: text('api_token'),
  apiGuild: text('api_guild'),

  // Username/password logins
  email: text('email'),
  passwordHash: text('password_hash'),

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
  unlisted: integer('unlisted', {
    mode: 'boolean'
  }).notNull(),
  hostId: text('host_id')
    .references(() => users.id, {
      onDelete: 'cascade'
    })
    .notNull(),
  hostUsername: text('host_username').notNull(),
  backgroundUrl: text('background_url'),
  backgroundSize: text('background_size')
});

export const links = sqliteTable('links', {
  id: text('id').primaryKey(),
  url: text('url').notNull(),
  // NULL expiresAt = never expires
  expiresAt: integer('expires_at', {
    mode: 'timestamp'
  }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' })
});

export type User = InferSelectModel<typeof users>;
export type Session = InferSelectModel<typeof sessions>;
export type Room = InferSelectModel<typeof rooms>;
export type Link = InferSelectModel<typeof links>;
