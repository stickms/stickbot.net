import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { prisma } from './prisma';

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: 'postgresql',
	}),
	plugins: [tanstackStartCookies()],
	user: {
		additionalFields: {
			botToken: {
				type: 'string',
				required: false,
				input: false,
			},
			botGuild: {
				type: 'string',
				required: false,
				input: false,
			},
		},
	},
	socialProviders: {
		discord: {
			clientId: process.env.DISCORD_CLIENT_ID,
			clientSecret: process.env.DISCORD_CLIENT_SECRET,
			scope: ['identify', 'guilds'],
		},
	},
});
