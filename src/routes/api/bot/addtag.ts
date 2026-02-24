import { createFileRoute } from '@tanstack/react-router';
import z from 'zod';
import { playersDB } from '~/lib/mongo';
import { prisma } from '~/lib/prisma';
import { validateJson } from '../-utils';

const addTagSchema = z.object({
	token: z.string().nonempty(),
	steamid: z.string().nonempty(),
	tag: z.enum(['cheater', 'suspcious', 'popular', 'banwatch'])
});

export const Route = createFileRoute('/api/bot/addtag')({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { token, steamid, tag } = await validateJson(
					request,
					addTagSchema
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
					{
						$set: {
							[`tags.${user.botGuild}.${tag}`]: {
								addedby: user.accounts[0].accountId,
								date: Math.floor(Date.now() / 1000)
							}
						}
					},
					{ upsert: true }
				);

				return Response.json({
					message: `Successfully added tag "${tag}" to "${steamid}"`
				});
			}
		}
	}
});
