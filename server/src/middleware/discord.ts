import { Discord } from 'arctic';
import type { Context, Next } from 'hono';
import { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI } from '../env.js';
import { db, users, type User } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const discord = new Discord(
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI
);

export const discordRefresh = async (c: Context, next: Next) => {
  const user: User = c.get('user')!;

  if (new Date() > user.accessTokenExpiration) {
    const tokens = await discord.refreshAccessToken(user.refreshToken);
    
    user.refreshToken = tokens.refreshToken();
    user.accessToken = tokens.accessToken();
    user.accessTokenExpiration = tokens.accessTokenExpiresAt();

    await db
      .update(users)
      .set({
        refreshToken: user.refreshToken,
        accessToken: user.accessToken,
        accessTokenExpiration: user.accessTokenExpiration
      })
      .where(eq(users.id, user.id));
    
    c.set('user', user);
  }

  return next();
};
