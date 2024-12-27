import {  Hono } from 'hono';
import { generateState } from 'arctic';
import { CLIENT_URL, DISCORD_URL } from '../env.js';
import { getCookie, setCookie } from 'hono/cookie';
import { db, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { createSession, deleteSessionTokenCookie, generateSessionToken, invalidateSession, setSessionTokenCookie, validateSessionToken } from '../db/session.js';
import { authGuard } from '../middleware/auth-guard.js';
import type { Context } from '../lib/context.js';
import { discord, discordRefresh } from '../middleware/discord.js';
import { HTTPException } from 'hono/http-exception';

const oauth_route = new Hono<Context>();

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
	})

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

	const userinfo = await fetch(DISCORD_URL + 'users/@me', {
		headers: new Headers({
			'Authorization': `Bearer ${tokens.accessToken()}`
		})
	});

	const uinfojs = await userinfo.json();

	const userCheck = db
		.select()
		.from(users)
		.where(eq(users.discordId, uinfojs['id']))
		.get()
	
	let userid = 0;

	if (userCheck) {
		const existingUser = db
			.update(users)
			.set({
				accessToken: tokens.accessToken(),
				refreshToken: tokens.refreshToken(),
				accessTokenExpiration: tokens.accessTokenExpiresAt()
			})
			.where(eq(users.discordId, uinfojs['id']))
			.returning()
			.get();
		
		userid = existingUser.id;
	} else {
		const newUser = db
			.insert(users)
			.values({
				discordId: uinfojs['id'],
				accessToken: tokens.accessToken(),
				refreshToken: tokens.refreshToken(),
				accessTokenExpiration: tokens.accessTokenExpiresAt()
			})
			.returning()
			.get();

		if (!newUser) {
			throw new HTTPException(400, { message: 'Could not create user' });
		}
	
		userid = newUser.id;
	}

	const sessionToken = generateSessionToken();
	const session = await createSession(sessionToken, userid);
	setSessionTokenCookie(c, sessionToken, session.expiresAt);

	return c.redirect(`${CLIENT_URL}${redirect}`);
});

oauth_route.post('/logout/discord', async (c) => {
	const cookie = getCookie(c);
	const { user } = await validateSessionToken(cookie['session']);

	if (user) {
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

oauth_route.get('/discord/guilds', authGuard, discordRefresh, async (c) => {
	const user = c.get('user')!;

	const guildinfo = await fetch(DISCORD_URL + 'users/@me/guilds', {
		headers: new Headers({
			'Authorization': `Bearer ${user.accessToken}`
		})
	});

	return c.json({
		success: true,
		data: {
			guilds: await guildinfo.json()
		}
	})
});

oauth_route.get('/discord/user', authGuard, discordRefresh, async(c) => {
	const user = c.get('user')!;

	const userinfo = await fetch(DISCORD_URL + 'users/@me', {
		headers: new Headers({
			'Authorization': `Bearer ${user.accessToken}`
		})
	});
	
	return c.json({
		success: true,
		data: {
			user: await userinfo.json()
		}
	})
});

export default oauth_route;
