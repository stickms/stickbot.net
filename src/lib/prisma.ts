import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '~/.generated/prisma/client.js';

const pool = new pg.Pool({
	connectionString: process.env.PRISMA_DB_URL,
	ssl: false
});

const adapter = new PrismaPg(pool);

declare global {
	var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
	globalThis.__prisma = prisma;
}
