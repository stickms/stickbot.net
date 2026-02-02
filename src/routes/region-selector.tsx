import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useEffect, useState } from 'react';
import { Card } from '~/components/card';
import { Field, FieldLabel } from '~/components/ui/field';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
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
	const [appid, setAppid] = useState<string>('440');
	const [sdrData, setSdrData] = useState<SDRConfigResult | null>();

	const apps = {
		'440': 'Team Fortress 2',
		'730': 'Counter-Strike 2',
		'570': 'DOTA 2'
	}

	useEffect(() => {
		getSDRData({ data: { appid } })
			.then(setSdrData)
			.catch(() => setSdrData(null));
	}, [appid]);

	return (
		<div className="w-full flex flex-col items-center justify-center mt-40 mb-8 gap-8 text-center">
			<h1 className="font-header text-6xl">steam region selector</h1>
			<Card className='flex flex-col gap-4 items-center w-72 max-w-[90vw]'>
				<Field className='w-52 max-w-full'>
					<FieldLabel>Select a game</FieldLabel>
					<Select value={appid} onValueChange={setAppid}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent position="popper">
							<SelectGroup>
								{Object.entries(apps).map(
									([itemvalue, itemlabel]) => (
										<SelectItem key={itemvalue} value={itemvalue}>
											{itemlabel}
										</SelectItem>
									),
								)}
							</SelectGroup>
						</SelectContent>
					</Select>
				</Field>

				{!sdrData && <span></span>}

				<ScrollArea className='h-96 w-full'>
					
				</ScrollArea>
			</Card>
		</div>
	);
}
