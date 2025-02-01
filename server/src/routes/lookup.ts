import { Hono } from 'hono';
import Sourcebans from '../lib/sourcebans.js';
import type { Context } from '../lib/context.js';
import { HTTPException } from 'hono/http-exception';
import { callSteamApi } from '../lib/util.js';

const lookup_route = new Hono<Context>();

lookup_route.get('/lookup/:steamid', async (c) => {
  const steamid = c.req.param('steamid');

  const sum_resp = await callSteamApi('GetPlayerSummaries/v2/', {
    steamids: steamid
  });

  const ban_resp = await callSteamApi('GetPlayerBans/v1/', {
    steamids: steamid
  });

  const sum_json = await sum_resp.json();
  const ban_json = await ban_resp.json();

  if (!sum_json['response']?.['players']?.[0]) {
    throw new HTTPException(400, { message: 'Could not find profile summary' });
  }

  if (!ban_json['players']?.[0]) {
    throw new HTTPException(400, { message: 'Could not find profile bandata' });
  }

  const resp = {
    success: true,
    data: {
      ...ban_json['players'][0],
      ...sum_json['response']['players'][0],
      SteamId: undefined // Get rid of extra SteamId from playerbans
    }
  };

  return c.json(resp);
});

lookup_route.get('/resolve/:vanityurl', async (c) => {
  const vanityurl = c.req.param('vanityurl');

  const resp = await callSteamApi('ResolveVanityURL/v1/', {
    vanityurl: vanityurl
  });

  const json = await resp.json();
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
