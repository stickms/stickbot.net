import * as path from 'node:path';
import * as dotenv from 'dotenv';

dotenv.config({
  path: path.join(import.meta.dirname, '..', '.env')
});

export const API_PORT: string | undefined = process.env.API_PORT;
export const STEAM_API_KEY: string = process.env.STEAM_API_KEY!;

export const DISCORD_CLIENT_ID: string = process.env.DISCORD_CLIENT_ID!;
export const DISCORD_CLIENT_SECRET: string = process.env.DISCORD_CLIENT_SECRET!;
export const DISCORD_REDIRECT_URI: string = process.env.DISCORD_REDIRECT_URI!;

