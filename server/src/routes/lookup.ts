import { Hono } from 'hono';
import { STEAM_API_KEY } from '../env.js';
import { URL, URLSearchParams } from 'url';
import type { SteamProfileSummary } from '../types.js';

const lookup_route = new Hono();

const url_endpoint = 'https://api.steampowered.com/ISteamUser/';

lookup_route.get('/lookup/:steamid', async (c) => {
  const steamid = c.req.param('steamid');

  const sum_url = new URL(url_endpoint + 'GetPlayerSummaries/v2/');
  const ban_url = new URL(url_endpoint + 'GetPlayerBans/v1/');

  const params = new URLSearchParams({
    key: STEAM_API_KEY,
    steamids: steamid
  }).toString();

  sum_url.search = params;
  ban_url.search = params;

  const results = await Promise.all([ 
    await fetch(sum_url, { signal: AbortSignal.timeout(500) }), 
    await fetch(ban_url, { signal: AbortSignal.timeout(500) })
  ]);
  
  if (results.some((r) => !r.ok)) {
    return c.json({ 'error': 'Could not reach Steam API' });
  }

  const jsons = [ await results[0].json(), await results[1].json() ];

  if (!jsons[0]['response']?.['players']?.[0]) {
    return c.json({ 'error': 'Could not find profile summary' });
  }

  if (!jsons[1]['players']?.[0]) {
    return c.json({ 'error': 'Could not find profile ban data' });
  }

  return c.json({ 
    ...jsons[1]['players'][0],
    ...jsons[0]['response']['players'][0]
  });
});

export default lookup_route;
