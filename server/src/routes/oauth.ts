import { Hono } from 'hono';
import { Discord, generateState, OAuth2RequestError } from 'arctic';
import { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI } from '../env.js';
import { getCookie, setCookie } from 'hono/cookie';

const oauth_route = new Hono();

const discord = new Discord(
  DISCORD_CLIENT_ID, 
  DISCORD_CLIENT_SECRET, 
  DISCORD_REDIRECT_URI
);

oauth_route.get('/login/discord', async (c) => {
  const state = generateState();
  const url = discord.createAuthorizationURL(state, [ 'identify', 'guilds' ]);

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
  const storedState = getCookie(c, "github_oauth_state");
	const { code, state } = c.req.query();
	// validate state
	if (
		!storedState ||
		!state ||
		storedState !== state ||
		typeof code !== "string"
	) {
		return c.text("Bad request", 400);
	}

	try {
		const tokens = await discord.validateAuthorizationCode(code);

		
	} catch (error) {
		if (error instanceof OAuth2RequestError) {
			// invalid code
			return c.text("Bad request", 400);
		}

		return c.text("An unknown error occurred", 500);
	}
});

export default oauth_route;
