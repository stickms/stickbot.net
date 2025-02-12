import { Discord } from 'arctic';
import type { Context as HonoContext, Next } from 'hono';
import {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI
} from '../env.js';
import { db, users, type User } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { Context } from '../lib/context.js';
import { HTTPException } from 'hono/http-exception';

export const discord = new Discord(
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI
);

export const discordRefresh = async (c: HonoContext<Context>, next: Next) => {
  const user = c.get('user')!;

  if (!user.discordId || !user.accessTokenExpiration || !user.refreshToken) {
    throw new HTTPException(400, {
      message: 'Please login to discord to use this feature'
    });
  }

  if (new Date() > user.accessTokenExpiration) {
    // Will throw an error if this fails
    const tokens = await discord.refreshAccessToken(user.refreshToken);

    const new_user = db
      .update(users)
      .set({
        refreshToken: tokens.refreshToken(),
        accessToken: tokens.accessToken(),
        accessTokenExpiration: tokens.accessTokenExpiresAt()
      })
      .where(eq(users.id, user.id))
      .returning()
      .get();

    c.set('user', new_user);
  }

  return next();
};
