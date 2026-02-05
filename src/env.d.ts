/// <reference types="vite/client" />

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			readonly STEAM_API_KEY: string;
			readonly MONGO_API_URL: string;
			readonly PRISMA_DB_URL: string;
			readonly DISCORD_CLIENT_ID: string;
			readonly DISCORD_CLIENT_SECRET: string;
			readonly NODE_ENV: 'development' | 'production' | 'test';
		}
	}
}

export {};
