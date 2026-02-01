import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useEffect } from 'react';
import type { SDRConfigResult } from '~/types';
import { callSteamApi } from './api/-utils';

const getSDRData = createServerFn({ method: 'GET' })
	.inputValidator((data: { appid: string }) => data)
	.handler(async ({ data }) => {
		const { appid } = data;

		return (await callSteamApi({
			data: {
				endpoint: 'GetSDRConfig/v1/',
				params: { appid },
				api: 'ISteamApps',
			},
		})) as SDRConfigResult;
	});

export const Route = createFileRoute('/region-selector')({
	component: RouteComponent,
});

function RouteComponent() {
	useEffect(() => {
		getSDRData({ data: { appid: '440' } })
			.then(console.log)
			.catch(console.error);
	}, []);

	return (
		<div className="w-full flex flex-col items-center justify-center mt-40 mb-8 gap-8 text-center">
			<h1 className="font-header text-6xl">steam region selector</h1>
		</div>
	);
}
