import { createFileRoute, isNotFound, notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import z from 'zod';
import { callSteamApi } from './-utils';

const steamLookupSchema = z.object({
	steamid: z.string().nonempty(),
});

const steamLookup = createServerFn()
	.inputValidator(steamLookupSchema)
	.handler(async ({ data }) => {
		const { steamid } = data;

		const summary = await callSteamApi({
			data: {
				endpoint: 'GetPlayerSummaries/v2/',
				params: { steamids: steamid },
			},
		});

		const bans = await callSteamApi({
			data: {
				endpoint: 'GetPlayerBans/v1/',
				params: { steamids: steamid },
			},
		});

		if (!summary.response?.players.length) {
			throw notFound();
		}

		if (!bans.players.length) {
			throw notFound();
		}

		return {
			...summary.response.players[0],
			...bans.players[0],
			SteamId: undefined,
		};
	});

export const Route = createFileRoute('/api/lookup/$steamid')({
	server: {
		handlers: {
			GET: async ({ params }) => {
				try {
					const { steamid } = params;
					return Response.json(await steamLookup({ data: { steamid } }));
				} catch (error) {
					if (isNotFound(error)) {
						return new Response('Profile not found', { status: 404 });
					}

					return new Response('Bad request', { status: 400 });
				}
			},
		},
	},
});
