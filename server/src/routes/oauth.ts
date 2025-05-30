import { Hono } from 'hono';
import { generateState } from 'arctic';
import { CLIENT_URL } from '../env.js';
import { getCookie, setCookie } from 'hono/cookie';
import { db, users } from '../db/schema.js';
import { eq, and, isNotNull } from 'drizzle-orm';
import {
  createSession,
  deleteSessionTokenCookie,
  generateSessionToken,
  invalidateSession,
  setSessionTokenCookie,
  validateSessionToken
} from '../db/session.js';
import { authGuard } from '../middleware/auth-guard.js';
import type { Context } from '../lib/context.js';
import { discord, discordRefresh } from '../middleware/discord.js';
import { HTTPException } from 'hono/http-exception';
import { callDiscordApi } from '../lib/util.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { zValidator } from '@hono/zod-validator';
import z from 'zod';

const oauth_route = new Hono<Context>();

oauth_route.post('/validate-session', authGuard, async (c) => {
  // If we get here, we've passed the authGuard and refreshed our session
  return c.json({
    success: true,
    message: 'Validated session'
  });
});

oauth_route.post('/login', async (c) => {
  const { email, password } = await c.req.json();

  const user = db
    .select()
    .from(users)
    .where(and(eq(users.email, email), isNotNull(users.passwordHash)))
    .get();

  if (!user) {
    throw new HTTPException(404, {
      message: 'User not found'
    });
  }

  const verified = await verifyPassword(password, user.passwordHash!);

  if (!verified) {
    throw new HTTPException(401, {
      message: 'Unauthorized'
    });
  }

  // Set session-related cookies
  const sessionToken = generateSessionToken();
  const session = await createSession(sessionToken, user.id);
  setSessionTokenCookie(c, sessionToken, session.expiresAt);

  return c.json({
    success: true,
    message: 'Successfully logged in'
  });
});

oauth_route.post(
  '/register',
  zValidator(
    'json',
    z.object({
      username: z.string().min(3).max(32),
      email: z.string().email().optional(),
      password: z.string().min(6).optional()
    })
  ),
  async (c) => {
    const { username, email, password } = c.req.valid('json');

    if (email) {
      const existing_user = db
        .select()
        .from(users)
        .where(and(eq(users.email, email), isNotNull(users.passwordHash)))
        .get();

      if (existing_user) {
        throw new HTTPException(409, {
          message: 'An account already exists with that email'
        });
      }
    }

    const password_hash = password ? await hashPassword(password) : null;

    const user = db
      .insert(users)
      .values({
        username: username,
        email: email ? email : null,
        passwordHash: password_hash
      })
      .returning()
      .get();

    if (!user) {
      throw new HTTPException(400, { message: 'Could not create/update user' });
    }

    // Set session-related cookies
    const sessionToken = generateSessionToken();
    const session = await createSession(sessionToken, user.id);
    setSessionTokenCookie(c, sessionToken, session.expiresAt);

    return c.json({
      success: true
    });
  }
);

oauth_route.get('/login/discord', async (c) => {
  const redirect = c.req.query('redirect') ?? '/';

  const state = generateState();
  const url = discord.createAuthorizationURL(state, ['identify', 'guilds']);

  setCookie(c, 'discord_oauth_state', state, {
    maxAge: 60 * 10, // 10 mins
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  setCookie(c, 'callback_redirect', redirect, {
    maxAge: 60 * 10, // 10 mins
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  return c.redirect(url.toString());
});

oauth_route.get('/login/discord/callback', async (c) => {
  const storedState = getCookie(c, 'discord_oauth_state');
  const redirect = getCookie(c, 'callback_redirect') ?? '/';

  const { code, state } = c.req.query();

  if (
    !storedState ||
    !state ||
    storedState !== state ||
    typeof code !== 'string'
  ) {
    throw new HTTPException(400, { message: 'Bad request' });
  }

  const tokens = await discord.validateAuthorizationCode(code);
  const userinfo = await callDiscordApi('users/@me', tokens.accessToken());
  const json = await userinfo.json();

  const user = db
    .insert(users)
    .values({
      discordId: json['id'],
      username: json['username'],
      avatar: json['avatar'],
      accessToken: tokens.accessToken(),
      refreshToken: tokens.refreshToken(),
      accessTokenExpiration: tokens.accessTokenExpiresAt()
    })
    .onConflictDoUpdate({
      target: users.discordId,
      set: {
        username: json['username'],
        avatar: json['avatar'],
        accessToken: tokens.accessToken(),
        refreshToken: tokens.refreshToken(),
        accessTokenExpiration: tokens.accessTokenExpiresAt()
      }
    })
    .returning()
    .get();

  if (!user) {
    throw new HTTPException(400, { message: 'Could not create/update user' });
  }

  const sessionToken = generateSessionToken();
  const session = await createSession(sessionToken, user.id);
  setSessionTokenCookie(c, sessionToken, session.expiresAt);

  return c.redirect(`${CLIENT_URL}${redirect}`);
});

oauth_route.post('/logout/discord', async (c) => {
  const cookie = getCookie(c);
  const { user } = await validateSessionToken(cookie['session']);

  if (user?.accessToken) {
    await discord.revokeToken(user.accessToken);
  }

  if (cookie['session']) {
    invalidateSession(cookie['session']);
  }

  deleteSessionTokenCookie(c);

  return c.json({
    message: 'success'
  });
});

oauth_route.get('/auth/user', authGuard, async (c) => {
  const user = c.get('user')!;

  if (!user.discordId || !user.accessToken) {
    return c.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        is_admin: !!user.promotedOn
      }
    });
  }

  const userinfo = await callDiscordApi('users/@me', user.accessToken);
  const json = await userinfo.json();

  // Set username in schema
  await db
    .update(users)
    .set({
      username: json['username'],
      avatar: json['avatar']
    })
    .where(eq(users.id, user.id));

  return c.json({
    success: true,
    data: {
      id: user.id,
      username: json['username'],
      discord_id: json['id'],
      avatar: json['avatar'],
      token_guild: user.apiGuild ?? '',
      is_admin: !!user.promotedOn
    }
  });
});

oauth_route.get('/discord/guilds', authGuard, discordRefresh, async (c) => {
  const user = c.get('user')!;

  if (!user.accessToken) {
    throw new HTTPException(400, {
      message: 'Please login using discord to use this'
    });
  }

  const guildinfo = await callDiscordApi('users/@me/guilds', user.accessToken);

  return c.json({
    success: true,
    data: await guildinfo.json()
  });
});

export default oauth_route;
