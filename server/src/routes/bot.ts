import { Hono } from 'hono';
import type { Context } from '../lib/context.js';
import { MongoClient } from 'mongodb';
import { MONGO_URL } from '../env.js';
import type { DatabasePlayerEntry } from '../lib/types.js';
import { authGuard } from '../middleware/auth-guard.js';
import { HTTPException } from 'hono/http-exception';
import { db, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { discordRefresh } from '../middleware/discord.js';
import { randomBytes } from 'node:crypto';
import { validateToken } from '../middleware/validate-token.js';
import Sourcebans from '../lib/sourcebans.js';
import { validateSteamId } from '../middleware/validate-steamid.js';
import { callDiscordApi } from '../lib/util.js';

const bot_route = new Hono<Context>();

const mongo = new MongoClient(MONGO_URL);
const players = mongo.db('stickbot').collection<DatabasePlayerEntry>('players');

// Create a new token for the current user (session)
bot_route.post('/bot/generate-token', authGuard, discordRefresh, async (c) => {
  const user = c.get('user')!;
  const guildid = c.req.query('guildid');

  if (!user.accessToken) {
    throw new HTTPException(400, {
      message: 'Please login using Discord for this feature'
    });
  }

  if (!guildid) {
    throw new HTTPException(400, { message: 'Please specify a guildid' });
  }

  const guildinfo = await callDiscordApi('users/@me/guilds', user.accessToken);

  const json = await guildinfo.json();

  const valid_guild = json.some((guild: { id: string }) => {
    return guild.id === guildid;
  });

  if (!valid_guild) {
    throw new HTTPException(400, {
      message: 'You are not in the specified guild'
    });
  }

  // Generate new random token, add to database
  const token = randomBytes(32).toString('hex');

  await db
    .update(users)
    .set({
      apiToken: token,
      apiGuild: guildid
    })
    .where(eq(users.id, user.id));

  return c.json({
    success: true,
    data: token
  });
});

// Revoke an existing token
bot_route.post('/bot/revoke-token', authGuard, async (c) => {
  const user = c.get('user')!;

  await db
    .update(users)
    .set({
      apiToken: null,
      apiGuild: null
    })
    .where(eq(users.id, user.id));

  return c.json({
    success: true,
    message: `Revoked API token for Discord User #${user.id}`
  });
});

// Frontend use only
bot_route.get('/botdata/:steamid', authGuard, async (c) => {
  const steamid = c.req.param('steamid');
  const guildid = c.req.query('guildid');

  if (!guildid) {
    throw new HTTPException(400, { message: 'Please specify a guildid' });
  }

  const player = await players.findOne({
    _id: steamid
  });

  if (!player) {
    throw new HTTPException(404, { message: 'Profile not found' });
  }

  return c.json({
    success: true,
    data: {
      names: player.names,
      tags: player.tags[guildid] ?? {}
    }
  });
});

// API for anyone else
bot_route.get('/bot/lookup', validateToken, async (c) => {
  const user = c.get('user')!;
  const steamids = c.req.query('steamids');

  if (!steamids) {
    throw new HTTPException(400, {
      message: 'Please specify steamids for lookup'
    });
  }

  const idlist = steamids.split(',');
  if (idlist.length > 100) {
    throw new HTTPException(400, {
      message: 'A maximum of 100 profiles can be looked up per search'
    });
  }

  const profiles = await players
    .find({
      _id: { $in: idlist }
    })
    .toArray();

  if (!profiles.length) {
    throw new HTTPException(404, { message: 'Profile(s) not found' });
  }

  const guildid = user.apiGuild!;

  const server_profiles = profiles.map((profile) => {
    return {
      steamid: profile._id,
      names: profile.names,
      addresses: profile.addresses,
      tags: profile.tags[guildid] ?? {}
    };
  });

  return c.json({
    success: true,
    data: server_profiles
  });
});

bot_route.get('/bot/sourcebans', validateToken, validateSteamId, async (c) => {
  const steamid = c.req.query('steamid')!;

  const sourcebans = await Sourcebans.get(steamid);

  return c.json({
    success: true,
    data: sourcebans
  });
});

bot_route.post('/bot/addtag', validateToken, validateSteamId, async (c) => {
  const user = c.get('user')!;
  const steamid = c.req.query('steamid');
  const tag = c.req.query('tag');

  if (!steamid) {
    throw new HTTPException(400, { message: 'Please specify a Steam ID' });
  }

  const valid_tags = ['cheater', 'suspicious', 'popular', 'banwatch'];

  if (!tag || !valid_tags.includes(tag)) {
    throw new HTTPException(400, { message: 'Please specify a valid tag' });
  }

  await players.updateOne(
    { _id: steamid },
    {
      $set: {
        [`tags.${user.apiGuild!}.${tag}`]: {
          addedby: user.discordId!,
          date: Math.floor(Date.now() / 1000)
        }
      }
    },
    { upsert: true }
  );

  return c.json({
    success: true,
    message: `Successfully added tag '${tag}' to Steam ID ${steamid}`
  });
});

bot_route.post('/bot/removetag', validateToken, validateSteamId, async (c) => {
  const user = c.get('user')!;
  const steamid = c.req.query('steamid')!;
  const tag = c.req.query('tag');

  const valid_tags = ['cheater', 'suspicious', 'popular', 'banwatch'];

  if (!tag || !valid_tags.includes(tag)) {
    throw new HTTPException(400, { message: 'Please specify a valid tag' });
  }

  await players.updateOne(
    { _id: steamid },
    {
      $unset: {
        [`tags.${user.apiGuild!}.${tag}`]: 1
      }
    },
    { upsert: true }
  );

  return c.json({
    success: true,
    message: `Successfully removed tag '${tag}' from Steam ID ${steamid}`
  });
});

export default bot_route;
