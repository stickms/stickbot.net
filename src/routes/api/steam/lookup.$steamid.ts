import { createFileRoute, isNotFound, notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import z from 'zod';
import { callSteamApi, parseSteamID } from '../-utils';

const steamLookupSchema = z.object({
	query: z.string().nonempty()
});

const resolveQuery = createServerFn()
	.inputValidator(steamLookupSchema)
	.handler(async ({ data }) => {
		const { query } = data;

		try {
			const json = await callSteamApi({
				data: {
					endpoint: 'ResolveVanityURL/v1/',
					params: { vanityurl: query }
				}
			});

			if (json.response?.success !== 1) {
				return parseSteamID(query);
			}

			return json.response.steamid as string;
		} catch (_error) {
			return null;
		}
	});

const steamLookup = createServerFn()
	.inputValidator(steamLookupSchema)
	.handler(async ({ data }) => {
		const steamid = await resolveQuery({ data });

		if (!steamid) {
			throw notFound();
		}

		const summary = await callSteamApi({
			data: {
				endpoint: 'GetPlayerSummaries/v2/',
				params: { steamids: steamid }
			}
		});

		const bans = await callSteamApi({
			data: {
				endpoint: 'GetPlayerBans/v1/',
				params: { steamids: steamid }
			}
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
			SteamId: undefined
		};
	});

export const Route = createFileRoute('/api/steam/lookup/$steamid')({
	server: {
		handlers: {
			GET: async ({ params }) => {
				try {
					return Response.json(
						await steamLookup({ data: { query: params.steamid } })
					);
				} catch (error) {
					if (isNotFound(error)) {
						return new Response('Profile not found', { status: 404 });
					}

					return new Response('Bad request', { status: 400 });
				}
			}
		}
	}
});
