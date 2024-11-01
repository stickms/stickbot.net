import * as path from 'node:path';
import * as dotenv from 'dotenv';

dotenv.config({
  path: path.join(import.meta.dirname, '..', '.env')
});

export const API_ENDPOINT: string = process.env.API_ENDPOINT!;
