import { createFileRoute, isNotFound, notFound } from '@tanstack/react-router';
import { callSteamApi } from './-utils';

function parseSteamID(steamid: string) {
	let matches: RegExpMatchArray | null = null;

	// Steam Community ID 64
	if (steamid.match(/^\d{17}$/)) {
		return steamid;
	}

	// Steam ID 2
	matches = steamid.match(/^STEAM_([0-1]):([0-1]):([0-9]+)$/);
	if (matches) {
		const accountid = parseInt(matches[3], 10) * 2 + parseInt(matches[2], 10);
		return `${(1n << 56n) | (1n << 52n) | (1n << 32n) | BigInt(accountid)}`;
	}

	// Steam ID 3
	matches = steamid.match(/^\[U:1:([0-9]+)]$/);
	if (matches) {
		const accountid = parseInt(matches[1], 10);
		return `${(1n << 56n) | (1n << 52n) | (1n << 32n) | BigInt(accountid)}`;
	}

	throw notFound();
}

export const Route = createFileRoute('/api/resolve/$query')({
	server: {
		handlers: {
			GET: async ({ params }) => {
				try {
					const { query } = params;

					const json = await callSteamApi({
						data: {
							endpoint: 'ResolveVanityURL/v1/',
							params: { vanityurl: query },
						},
					});

					if (!json.response) {
						return new Response('Could not resolve vanity URL', {
							status: 400,
						});
					}

					if (json.response.success !== 1) {
						return Response.json({
							steamid: parseSteamID(query),
							resolved: false,
						});
					}

					return Response.json({
						steamid: json.response.steamid,
						resolved: true,
					});
				} catch (error) {
					if (isNotFound(error)) {
						return new Response('Could not resolve vanity URL', {
							status: 404,
						});
					}

					return new Response('Bad request', { status: 400 });
				}
			},
		},
	},
});
