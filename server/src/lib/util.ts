import { HTTPException } from 'hono/http-exception';
import { DISCORD_BOT_TOKEN, STEAM_API_KEY } from '../env.js';

const STEAM_URL = 'https://api.steampowered.com/';
const DISCORD_URL = 'https://discord.com/api/v10/';

export async function callSteamApi(
  endpoint: string,
  params: { [key: string]: string } = {},
  api: string = 'ISteamUser'
) {
  const url = new URL(`${STEAM_URL}${api}/${endpoint}`);
  const search = new URLSearchParams({
    ...params,
    key: STEAM_API_KEY
  });

  url.search = search.toString();

  const resp = await fetch(url);

  if (!resp.ok) {
    throw new HTTPException(400, { message: 'Could not reach Steam API' });
  }

  return resp;
}

export async function callDiscordApi(endpoint: string, token?: string) {
  let attempts = 0;

  const headers = new Headers({
    'Authorization': token ? `Bearer ${token}` : `Bot ${DISCORD_BOT_TOKEN}`
  });

  while (++attempts < 5) {
    const resp = await fetch(DISCORD_URL + endpoint, {
      headers
    });

    if (!resp.ok) {
      if (resp.status != 429) {
        throw new HTTPException(400, {
          message: 'Could not reach Discord API'
        });
      }

      // Rate limit
      const retry_after = resp.headers.get('retry-after')!;
      const time = parseFloat(retry_after);

      // Too long of a rate limit = give up
      if (time > 5.0) {
        throw new HTTPException(429, {
          message: 'Rate limited by Discord API'
        });
      }

      await new Promise((res) => setTimeout(res, time * 1000));
    } else {
      return resp;
    }
  }

  throw new HTTPException(400, {
    message: 'Could not reach Discord API'
  });
}