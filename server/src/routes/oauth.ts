import { Hono } from 'hono';
import { Discord, generateState, OAuth2RequestError } from 'arctic';
import {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI
} from '../env.js';
import { getCookie, setCookie } from 'hono/cookie';
import { db, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { createSession, generateSessionToken, setSessionTokenCookie } from '../db/session.js';

const oauth_route = new Hono();

const url_endpoint = 'https://discord.com/api/v10/';

const discord = new Discord(
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI
);

oauth_route.get('/login/discord', async (c) => {
  const state = generateState();
  const url = discord.createAuthorizationURL(state, ['identify', 'guilds']);

  setCookie(c, 'discord_oauth_state', state, {
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
  const { code, state } = c.req.query();

  if (
    !storedState ||
    !state ||
    storedState !== state ||
    typeof code !== 'string'
  ) {
    return c.text('Bad request', 400);
  }

  try {
    const tokens = await discord.validateAuthorizationCode(code);

    const userinfo = await fetch(url_endpoint + 'users/@me', {
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
			const newUser = db
				.update(users)
				.set({
					accessToken: tokens.accessToken(),
					refreshToken: tokens.refreshToken(),
					accessTokenExpiration: tokens.accessTokenExpiresAt()
				})
				.returning()
				.get();
			
			userid = newUser.id;
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
				return c.text('Could not create user context', 500);
			}
		
			userid = newUser.id;
		}

		const sessionToken = generateSessionToken();
		const session = await createSession(sessionToken, userid);
		setSessionTokenCookie(c, sessionToken, session.expiresAt);

		return c.redirect('http://localhost:5173/profile');
  } catch (error) {
    if (error instanceof OAuth2RequestError) {
      // invalid code
      return c.text('Bad request', 400);
    }

		if (error instanceof Error) {
			return c.text(error.message, 400);
		}

    return c.text('An unknown error occurred', 500);
  }
});

export default oauth_route;
