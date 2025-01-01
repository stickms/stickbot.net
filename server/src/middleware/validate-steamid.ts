import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { STEAM_API_KEY, STEAM_URL } from '../env.js';

export const validateSteamId = async (c: Context, next: Next) => {
  const steamid = c.req.query('steamid');

  if (!steamid || Number.isNaN(+steamid)) {
    throw new HTTPException(401, { message: 'Please specify a valid Steam ID' });
  }

  const sum_url = new URL(STEAM_URL + 'GetPlayerSummaries/v2/');
  const params = new URLSearchParams({
    key: STEAM_API_KEY,
    steamids: steamid
  }).toString();

  sum_url.search = params;

  const resp = await fetch(sum_url, {
    signal: AbortSignal.timeout(1000)
  });

  if (!resp.ok) {
    throw new HTTPException(400, { message: 'Could not reach Steam API' });
  }

  const json = await resp.json();

  if(!json['response']?.['players']?.[0]) {
    throw new HTTPException(404, { message: `Steam profile \'${steamid}\' not found` });
  }

  return next();
};
