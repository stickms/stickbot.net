import { Hono } from 'hono';
import { MONGO_URL, STEAM_API_KEY } from '../env.js';
import { URL, URLSearchParams } from 'url';
import Sourcebans from '../helpers/sourcebans.js';
import { getCookie } from 'hono/cookie';
import { deleteSessionTokenCookie, validateSessionToken } from '../db/session.js';
import { Collection, MongoClient } from 'mongodb';

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
    await fetch(sum_url, {
      signal: AbortSignal.timeout(1000)
    }),
    await fetch(ban_url, {
      signal: AbortSignal.timeout(1000)
    })
  ]);

  if (results.some((r) => !r.ok)) {
    return c.json({ 'error': 'Could not reach Steam API' });
  }

  const jsons = [await results[0].json(), await results[1].json()];

  if (!jsons[0]['response']?.['players']?.[0]) {
    return c.json({ 'error': 'Could not find profile summary' });
  }

  if (!jsons[1]['players']?.[0]) {
    return c.json({ 'error': 'Could not find profile ban data' });
  }

  const resp = {
    ...jsons[1]['players'][0],
    ...jsons[0]['response']['players'][0]
  };

  return c.json(resp);
});

lookup_route.get('/resolve/:vanityurl', async (c) => {
  const vanityurl = c.req.param('vanityurl');

  const res_url = new URL(url_endpoint + 'ResolveVanityURL/v1/');

  const params = new URLSearchParams({
    key: STEAM_API_KEY,
    vanityurl: vanityurl
  }).toString();

  res_url.search = params;

  const result = await fetch(res_url, { signal: AbortSignal.timeout(1000) });
  if (!result.ok) {
    return c.json({ 'error': 'Could not reach Steam API' });
  }

  const json = await result.json();
  if (!json['response']) {
    return c.json({ 'error': 'Error resolving Vanity URL' });
  }

  return c.json({
    ...json['response']
  });
});

lookup_route.get('/sourcebans/:steamid', async (c) => {
  const steamid = c.req.param('steamid');

  const sourcebans = await Sourcebans.get(steamid);

  return c.json({
    'sourcebans': sourcebans
  });
});

type TagEntry = {
  addedby: string;
  date: number;
};

export interface DatabasePlayerEntry {
  _id: string;
  addresses: {
    [ip: string]: {
      game: string;
      date: number;
    };
  };
  bandata: {
    vacbans: number;
    gamebans: number;
    communityban: boolean;
    tradeban: boolean;
  };
  names: {
    [name: string]: number;
  };
  notifications: {
    [guildid: string]: {
      ban: string[];
      name: string[];
      log: string[];
    };
  };
  tags: {
    [guildid: string]: {
      cheater?: TagEntry;
      suspicious?: TagEntry;
      popular?: TagEntry;
      banwatch?: TagEntry;
    };
  };
}

const mongo = new MongoClient(MONGO_URL);
const players: Collection<DatabasePlayerEntry> = mongo.db('stickbot').collection('players');

lookup_route.get('/botdata/:steamid', async (c) => {
  const cookie = getCookie(c);
  const { session, user } = await validateSessionToken(cookie['session']);

  if (!session || !user) {
    deleteSessionTokenCookie(c);
    return c.json({ message: 'Invalid session' }, 400);
  }
  
  const steamid = c.req.param('steamid');
  const guildid = c.req.query('guildid');

  if (!guildid) {
    return c.json({ message: 'Please specify a guildid' }, 400);
  }

  const player = await players.findOne({
    _id: steamid
  });

  if (!player) {
    return c.json({ message: 'Profile not found' }, 404);
  }

  return c.json({
    names: player.names,
    tags: player.tags[guildid] ?? {}
  });
});

export default lookup_route;
