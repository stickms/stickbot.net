import { Hono } from 'hono';
import { STEAM_API_KEY, STEAM_URL } from '../env.js';
import { URL, URLSearchParams } from 'url';
import Sourcebans from '../helpers/sourcebans.js';
import type { Context } from '../lib/context.js';
import { HTTPException } from 'hono/http-exception';

const lookup_route = new Hono<Context>();

lookup_route.get('/lookup/:steamid', async (c) => {
  const steamid = c.req.param('steamid');

  const sum_url = new URL(STEAM_URL + 'GetPlayerSummaries/v2/');
  const ban_url = new URL(STEAM_URL + 'GetPlayerBans/v1/');

  const params = new URLSearchParams({
    key: STEAM_API_KEY,
    steamids: steamid
  }).toString();

  sum_url.search = params;
  ban_url.search = params;

  const results = await Promise.all([
    await fetch(sum_url, {
      signal: AbortSignal.timeout(1000)
    }),
    await fetch(ban_url, {
      signal: AbortSignal.timeout(1000)
    })
  ]);

  if (results.some((r) => !r.ok)) {
    throw new HTTPException(400, { message: 'Could not reach Steam API' });
  }

  const jsons = [await results[0].json(), await results[1].json()];

  if (!jsons[0]['response']?.['players']?.[0]) {
    throw new HTTPException(400, { message: 'Could not find profile summary' });
  }

  if (!jsons[1]['players']?.[0]) {
    throw new HTTPException(400, { message: 'Could not find profile bandata' });
  }

  const resp = {
    success: true,
    data: {
      ...jsons[1]['players'][0],
      ...jsons[0]['response']['players'][0],
      SteamId: undefined // Get rid of extra SteamId from playerbans
    }
  };

  return c.json(resp);
});

lookup_route.get('/resolve/:vanityurl', async (c) => {
  const vanityurl = c.req.param('vanityurl');

  const res_url = new URL(STEAM_URL + 'ResolveVanityURL/v1/');

  const params = new URLSearchParams({
    key: STEAM_API_KEY,
    vanityurl: vanityurl
  }).toString();

  res_url.search = params;

  const result = await fetch(res_url, { signal: AbortSignal.timeout(1000) });
  if (!result.ok) {
    throw new HTTPException(400, { message: 'Could not reach Steam API' });
  }

  const json = await result.json();
  if (!json['response']) {
    throw new HTTPException(400, { message: 'Error resolving vanity URL' });
  }

  return c.json({
    success: true,
    data: {
      ...json['response']
    }
  });
});

lookup_route.get('/sourcebans/:steamid', async (c) => {
  const steamid = c.req.param('steamid');

  const sourcebans = await Sourcebans.get(steamid);

  return c.json({
    success: true,
    data: sourcebans
  });
});

export default lookup_route;
