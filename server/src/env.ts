import * as path from 'node:path';
import * as dotenv from 'dotenv';

dotenv.config({
  path: path.join(import.meta.dirname, '..', '.env')
});

export const API_ORIGIN: string = process.env.API_ORIGIN!;
export const STEAM_API_KEY: string = process.env.STEAM_API_KEY!;
