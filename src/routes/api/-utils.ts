import { createServerFn } from '@tanstack/react-start';
import z, { type ZodType } from 'zod';

export async function validateJson<T>(request: Request, schema: ZodType<T>) {
	let json: unknown;

	try {
		json = await request.json();
	} catch (_error) {
		throw Response.json({ error: 'Please supply a JSON body' }, {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}
	
	const result = schema.safeParse(json);
	
	if (!result.success) {
		throw Response.json({ error: z.prettifyError(result.error) }, {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}
	
	return result.data;
}

const callSteamApiSchema = z.object({
	endpoint: z.string().nonempty(),
	params: z.record(z.string(), z.string()),
	api: z.string().default('ISteamUser'),
});

export const callSteamApi = createServerFn()
	.inputValidator(callSteamApiSchema)
	.handler(async ({ data }) => {
		const { endpoint, params, api } = data;

		const url = new URL(`https://api.steampowered.com/${api}/${endpoint}`);
		url.search = new URLSearchParams({
			...params,
			key: process.env.STEAM_API_KEY,
		}).toString();

		const resp = await fetch(url);

		if (!resp.ok) {
			throw new Error('Could not reach Steam API');
		}

		return resp.json();
	});

export function parseSteamID(steamid: string) {
	if (!steamid) {
		return null;
	}

	// Steam Community ID 64
	if (steamid.match(/^\d{17}$/)) {
		return steamid;
	}

	// Steam ID 2
	let matches = steamid.match(/^STEAM_([0-1]):([0-1]):([0-9]+)$/);
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

	return null;
}
