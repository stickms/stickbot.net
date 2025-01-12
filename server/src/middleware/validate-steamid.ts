import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { callSteamApi } from '../lib/util.js';

export const validateSteamId = async (c: Context, next: Next) => {
  const steamid = c.req.query('steamid');

  if (!steamid || Number.isNaN(+steamid)) {
    throw new HTTPException(401, {
      message: 'Please specify a valid Steam ID'
    });
  }

  const resp = await callSteamApi('GetPlayerSummaries/v2/', {
    steamids: steamid
  });

  const json = await resp.json();

  if (!json['response']?.['players']?.[0]) {
    throw new HTTPException(404, {
      message: `Steam profile \'${steamid}\' not found`
    });
  }

  return next();
};
