import { Hono } from 'hono';
import { STEAM_API_KEY } from '../env.js';
import { URL, URLSearchParams } from 'url';
import type { SteamProfileSummary } from '../types.js';

const lookup_route = new Hono();

const url_endpoint = 'https://api.steampowered.com/ISteamUser/';

lookup_route.get('/lookup/:steamid', async (c) => {
  const steamid = c.req.param('steamid');

  const url = new URL(url_endpoint + 'GetPlayerSummaries/v2/');
  url.search = new URLSearchParams({
    key: STEAM_API_KEY,
    steamids: steamid
  }).toString();

  const resp = await fetch(url);
  const summary: SteamProfileSummary = await resp.json();

  return c.json(summary);
});

export default lookup_route;
