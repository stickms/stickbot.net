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
import { randomBytes } from 'node:crypto';

const oauth_route = new Hono<Context>();

oauth_route.post('/validate-session', authGuard, async (c) => {
	// If we get here, we've passed the authGuard and refreshed our session
	return c.json({
		success: true,
		message: 'Validated session'
	});
});

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

oauth_route.post('/discord/generate-token', authGuard, discordRefresh, async (c) => {
	const user = c.get('user')!;
	const guildid = c.req.query('guildid');

	if (!guildid) {
		throw new HTTPException(400, { message: 'Please specify a guildid' });
	}

	const guildinfo = await fetch(DISCORD_URL + 'users/@me/guilds', {
		headers: new Headers({
			'Authorization': `Bearer ${user.accessToken}`
		})
	});

	if (!guildinfo.ok) {
		throw new HTTPException(400, { message: 'Could not reach Discord API' });
	}

	const json = await guildinfo.json();

	const valid_guild = json.some((guild: { id: string }) => {
		return guild.id === guildid;
	});

	if (!valid_guild) {
		throw new HTTPException(400, { message: 'You are not in the specified guild' });
	}

	// Generate new random token, add to database
	const token = randomBytes(32).toString('hex');

	await db
		.update(users)
		.set({
			apiToken: token,
			apiGuild: guildid
		})
		.where(eq(users.discordId, user.discordId));

	return c.json({
		success: true,
		data: {
			token
		}
	})
});

oauth_route.post('/discord/revoke-token', authGuard, async (c) => {
	const user = c.get('user')!;

	await db
		.update(users)
		.set({
			apiToken: null,
			apiGuild: null
		})
		.where(eq(users.discordId, user.discordId));

		return c.json({
			success: true,
			message: `Revoked API token for Discord User #${user.discordId}`
		})
});

oauth_route.get('/discord/user', authGuard, discordRefresh, async(c) => {
	const user = c.get('user')!;

	const userinfo = await fetch(DISCORD_URL + 'users/@me', {
		headers: new Headers({
			'Authorization': `Bearer ${user.accessToken}`
		})
	});

	if (!userinfo.ok) {
		throw new HTTPException(400, { message: 'Could not reach Discord API' });
	}

	const json = await userinfo.json();
	
	return c.json({
		success: true,
		data: {
			user: {
				...json,
				token_guild: user.apiGuild ?? ''
			}
		}
	})
});

oauth_route.get('/discord/guilds', authGuard, discordRefresh, async (c) => {
	const user = c.get('user')!;

	const guildinfo = await fetch(DISCORD_URL + 'users/@me/guilds', {
		headers: new Headers({
			'Authorization': `Bearer ${user.accessToken}`
		})
	});

	if (!guildinfo.ok) {
		throw new HTTPException(400, { message: 'Could not reach Discord API' });
	}

	return c.json({
		success: true,
		data: {
			guilds: await guildinfo.json()
		}
	})
});

export default oauth_route;
