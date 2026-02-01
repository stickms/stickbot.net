import { createServerFn } from '@tanstack/react-start';
import z from 'zod';

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
