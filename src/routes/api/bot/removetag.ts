import { createFileRoute } from '@tanstack/react-router';
import z from 'zod';
import { playersDB } from '~/lib/mongo';
import { prisma } from '~/lib/prisma';
import { validateJson } from '../-utils';

const removeTagSchema = z.object({
	token: z.string().nonempty(),
	steamid: z.string().nonempty(),
	tag: z.enum(['cheater', 'suspcious', 'popular', 'banwatch'])
});

export const Route = createFileRoute('/api/bot/removetag')({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { token, steamid, tag } = await validateJson(
					request,
					removeTagSchema
				);

				const user = await prisma.user.findUnique({
					where: { botToken: token, botGuild: { not: null } },
					include: { accounts: true }
				});

				if (!user || !user.botGuild || !user.accounts[0]) {
					return Response.json(
						{ error: 'Token does not exist' },
						{ status: 404 }
					);
				}

				const players = await playersDB();

				await players.updateOne(
					{ _id: steamid },
					{ $unset: { [`tags.${user.botGuild}.${tag}`]: 1 } },
					{ upsert: true }
				);

				return Response.json({
					message: `Successfully removed tag "${tag}" from "${steamid}"`
				});
			}
		}
	}
});
