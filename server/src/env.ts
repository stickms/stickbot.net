import * as path from 'node:path';
import * as dotenv from 'dotenv';

dotenv.config({
  path: path.join(import.meta.dirname, '..', '.env')
});

export const STEAM_URL: string = 'https://api.steampowered.com/ISteamUser/';

export const SITE_ADMIN_IDS: string = process.env.SITE_ADMIN_IDS ?? '';
export const API_PORT: string = process.env.API_PORT ?? '3000';

export const STEAM_API_KEY: string = process.env.STEAM_API_KEY!;
export const CLIENT_URL: string = process.env.CLIENT_URL!;
export const MONGO_URL: string = process.env.MONGO_URL!;

export const DISCORD_BOT_TOKEN: string = process.env.DISCORD_BOT_TOKEN!;
export const DISCORD_CLIENT_ID: string = process.env.DISCORD_CLIENT_ID!;
export const DISCORD_CLIENT_SECRET: string = process.env.DISCORD_CLIENT_SECRET!;
export const DISCORD_REDIRECT_URI: string = process.env.DISCORD_REDIRECT_URI!;
