import { Hono } from "hono";
import type { Context } from "../lib/context.js";
import { MongoClient } from "mongodb";
import { DISCORD_URL, MONGO_URL } from "../env.js";
import type { DatabasePlayerEntry } from "../lib/types.js";
import { authGuard } from "../middleware/auth-guard.js";
import { HTTPException } from "hono/http-exception";
import { db, users } from "../db/schema.js";
import { eq, and, isNotNull } from "drizzle-orm";
import { discordRefresh } from "../middleware/discord.js";
import { randomBytes } from "node:crypto";

const bot_route = new Hono<Context>();

const mongo = new MongoClient(MONGO_URL);
const players = mongo.db('stickbot').collection<DatabasePlayerEntry>('players');

// Create a new token for the current user (session)
bot_route.post('/bot/generate-token', authGuard, discordRefresh, async (c) => {
  const user = c.get('user')!;
  const guildid = c.req.query('guildid');

  if (!guildid) {
    throw new HTTPException(400, { message: 'Please specify a guildid' });
  }

  const guildinfo = await fetch(DISCORD_URL + 'users/@me/guilds', {
    headers: new Headers({
      'Authorization': `Bearer ${user.accessToken}`
    })
  });

  if (!guildinfo.ok) {
    throw new HTTPException(400, { message: 'Could not reach Discord API' });
  }

  const json = await guildinfo.json();

  const valid_guild = json.some((guild: { id: string }) => {
    return guild.id === guildid;
  });

  if (!valid_guild) {
    throw new HTTPException(400, { message: 'You are not in the specified guild' });
  }

  // Generate new random token, add to database
  const token = randomBytes(32).toString('hex');

  await db
    .update(users)
    .set({
      apiToken: token,
      apiGuild: guildid
    })
    .where(eq(users.discordId, user.discordId));

  return c.json({
    success: true,
    data: {
      token
    }
  })
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
    .where(eq(users.discordId, user.discordId));

  return c.json({
    success: true,
    message: `Revoked API token for Discord User #${user.discordId}`
  })
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
bot_route.get('/bot/lookup/:steamid', async (c) => {
  const steamid = c.req.param('steamid');
  const token = c.req.query('token');

  if (!token) {
    throw new HTTPException(400, { message: 'Please specify an API token' });
  }

  const user = db
    .select()
    .from(users)
    .where(and(eq(users.apiToken, token), isNotNull(users.apiGuild)))
    .get();

  if (!user) {
    throw new HTTPException(400, { message: 'Invalid API token' });
  }

  const player = await players.findOne({
    _id: steamid
  });

  if (!player) {
    throw new HTTPException(404, { message: 'Profile not found' });
  }
  
  const guildid = user.apiGuild!;

  return c.json({
    success: true,
    data: {
      names: player.names,
      addresses: player.addresses,
      tags: player.tags[guildid] ?? {}
    }
  });
});

bot_route.post('/bot/addtag/:steamid', async (c) => {
  const steamid = c.req.param('steamid');
  const token = c.req.query('token');
  const tag = c.req.query('tag');

  if (!token) {
    throw new HTTPException(400, { message: 'Please specify an API token' });
  }

  const user = db
    .select()
    .from(users)
    .where(and(eq(users.apiToken, token), isNotNull(users.apiGuild)))
    .get();

  if (!user) {
    throw new HTTPException(400, { message: 'Invalid API token' });
  }

  const valid_tags = [ 'cheater', 'suspicious', 'popular', 'banwatch'];

  if (!tag || !valid_tags.includes(tag)) {
    throw new HTTPException(400, { message: 'Please specify a valid tag' });
  }

  await players.updateOne(
    { _id: steamid },
    { $set: {
      [`tags.${user.apiGuild}.${tag}`]: {
        addedby: user.discordId,
        date: Math.floor(Date.now() / 1000)
      }
    } },
    { upsert: true }
  );

  return c.json({
    success: true,
    message: `Successfully added tag '${tag}' to Steam ID ${steamid}`
  })
});

bot_route.post('/bot/removetag/:steamid', async (c) => {
  const steamid = c.req.param('steamid');
  const token = c.req.query('token');
  const tag = c.req.query('tag');

  if (!token) {
    throw new HTTPException(400, { message: 'Please specify an API token' });
  }

  const user = db
    .select()
    .from(users)
    .where(and(eq(users.apiToken, token), isNotNull(users.apiGuild)))
    .get();

  if (!user) {
    throw new HTTPException(400, { message: 'Invalid API token' });
  }

  const valid_tags = [ 'cheater', 'suspicious', 'popular', 'banwatch'];

  if (!tag || !valid_tags.includes(tag)) {
    throw new HTTPException(400, { message: 'Please specify a valid tag' });
  }

  await players.updateOne(
    { _id: steamid },
    { $unset: {
      [`tags.${user.apiGuild}.${tag}`]: 1
    } },
    { upsert: true }
  );

  return c.json({
    success: true,
    message: `Successfully removed tag '${tag}' from Steam ID ${steamid}`
  })
});

export default bot_route;
