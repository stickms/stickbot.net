import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { Clipboard, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card } from '~/components/card';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import { Field, FieldLabel } from '~/components/ui/field';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '~/components/ui/input-group';
import { Label } from '~/components/ui/label';
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from '~/components/ui/popover';
import { ScrollArea } from '~/components/ui/scroll-area';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select';
import { Separator } from '~/components/ui/separator';
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

function PopoverButton({
	label,
	code,
	disabled,
}: {
	label: string;
	code: string;
	disabled?: boolean;
}) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button disabled={disabled}>{label}</Button>
			</PopoverTrigger>
			<PopoverContent className="flex flex-col gap-2" align="end">
				<PopoverHeader>
					<PopoverTitle>{label}</PopoverTitle>
					<PopoverDescription>
						Copy & paste this code into an administrator terminal
					</PopoverDescription>
				</PopoverHeader>
				<InputGroup>
					<InputGroupInput value={code} readOnly />
					<InputGroupAddon align="inline-end">
						<InputGroupButton
							aria-label="Copy to Clipboard"
							title="Copy to Clipboard"
							size="icon-xs"
							variant="secondary"
							onClick={() => navigator.clipboard.writeText(code)}
						>
							<Clipboard />
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
			</PopoverContent>
		</Popover>
	);
}

function ServerList({
	sdrData,
	servers,
	setServers,
}: {
	sdrData?: SDRConfigResult | null;
	servers: string[];
	setServers: (servers: string[]) => void;
}) {
	if (!sdrData) {
		return (
			<div className="size-100 flex items-center justify-center">
				{sdrData === undefined ? (
					<span className="flex gap-2">
						<LoaderCircle className="animate-spin" /> Loading...
					</span>
				) : (
					<span>Could not load data...</span>
				)}
			</div>
		);
	}

	const ipList = Object.entries(sdrData.pops)
		.filter(([region, _]) => servers.includes(region))
		.flatMap(([_, data]) => data.relays?.map((relay) => relay.ipv4) ?? [])
		.join();

	return (
		<div className="flex flex-col justify-stretch h-100 w-full gap-4">
			<ScrollArea className="flex-1 min-h-0">
				<div className="flex flex-col gap-2 pr-2">
					{Object.entries(sdrData.pops).map(([region, data]) => (
						<Field
							key={region}
							className="items-start"
							orientation="horizontal"
						>
							<Checkbox
								id={region}
								name={region}
								checked={servers.includes(region)}
								onCheckedChange={(check) =>
									check
										? setServers(servers.concat(region))
										: setServers(servers.filter((r) => r !== region))
								}
							/>
							<Label className="text-left" htmlFor={region}>
								({region}) {data.desc}
							</Label>
						</Field>
					))}
				</div>
			</ScrollArea>

			<div className="flex flex-wrap justify-center w-full">
				<div className="flex justify-around flex-wrap gap-4 w-full">
					<Button onClick={() => setServers(Object.keys(sdrData.pops))}>
						Select All
					</Button>
					<Button onClick={() => setServers([])}>Deselect All</Button>
					<PopoverButton
						label="Unblock All"
						code={
							'netsh advfirewall ' +
							'firewall delete rule name="stickbot-region-select"'
						}
					/>
					<PopoverButton
						label="Block Selected"
						code={
							'netsh advfirewall ' +
							'firewall delete rule name="stickbot-region-select" ; ' +
							'netsh advfirewall firewall add rule name="stickbot-region-select" ' +
							`dir=out action=block remoteip=${ipList}`
						}
						disabled={!servers.length}
					/>
				</div>
			</div>
		</div>
	);
}

function RouteComponent() {
	const [appid, setAppid] = useState<string>('440');
	const [sdrData, setSdrData] = useState<SDRConfigResult | null>();
	const [servers, setServers] = useState<string[]>([]);

	useEffect(() => {
		setSdrData(undefined);

		getSDRData({ data: { appid } })
			.then(setSdrData)
			.catch(() => setSdrData(null));
	}, [appid]);

	const apps = {
		'440': 'Team Fortress 2',
		'730': 'Counter-Strike 2',
		'570': 'DOTA 2',
	};

	return (
		<div className="w-full min-h-screen flex flex-col items-center gap-8 text-center">
			<div className="flex-1 min-h-20" />
			<h1 className="font-header text-6xl">steam region selector</h1>
			<Card className="flex flex-col gap-4 items-center max-w-[90vw]">
				<Field className="w-52 max-w-full">
					<FieldLabel>Select a game</FieldLabel>
					<Select value={appid} onValueChange={setAppid}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent position="popper">
							<SelectGroup>
								{Object.entries(apps).map(([itemvalue, itemlabel]) => (
									<SelectItem key={itemvalue} value={itemvalue}>
										{itemlabel}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</Field>

				<Separator />

				<ServerList
					sdrData={sdrData}
					servers={servers}
					setServers={setServers}
				/>
			</Card>
			<div className="flex-1 min-h-8" />
		</div>
	);
}
