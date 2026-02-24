import { useQuery } from '@tanstack/react-query';
import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { Clipboard, LoaderCircle } from 'lucide-react';
import { type JSX, useEffect, useState } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { playersDB } from '~/lib/mongo';
import { getSourcebans as getSourcebansInternal } from '~/routes/api/-sourcebans';
import type { SteamProfileSummary } from '~/types';
import { Card } from './card';

import '~/styles/steam-profile.css';

const getBotTags = createServerFn()
	.inputValidator((data: { steamId: string; guildId: string }) => data)
	.handler(async ({ data }) => {
		const players = await playersDB();
		const player = await players.findOne({
			_id: data.steamId
		});

		if (!player) {
			throw notFound();
		}

		return {
			tags: player.tags[data.guildId] ?? {}
		};
	});

const getSourcebans = createServerFn()
	.inputValidator((data: { steamId: string }) => data)
	.handler(async ({ data }) => {
		return await getSourcebansInternal(data.steamId);
	});

function IDList({ summary }: { summary: SteamProfileSummary }) {
	const accountid = Number(BigInt(summary.steamid) & BigInt(0xffffffff));

	const idlist = [
		summary.steamid,
		`[U:1:${accountid}]`,
		`STEAM_1:${accountid & 1}:${Math.floor(accountid / 2)}`
	];

	// Include vanity URL if present
	if (summary.profileurl.includes('/id/')) {
		idlist.push(summary.profileurl.split('/')[4]);
	}

	return (
		<div className="flex flex-col items-start gap-1 min-w-36">
			<h3 className="font-medium">Steam IDs</h3>
			{idlist.map((id) => (
				<div
					key={id}
					className="flex w-full justify-between items-center gap-4"
				>
					<div>{id}</div>
					<Button
						size="icon-xs"
						variant="ghost"
						onClick={() => navigator.clipboard.writeText(id)}
					>
						<Clipboard />
					</Button>
				</div>
			))}
		</div>
	);
}

function AlertList({
	summary,
	guildId
}: {
	summary: SteamProfileSummary;
	guildId?: string;
}) {
	const [tags, setTags] = useState<string[]>();

	useEffect(() => {
		setTags(undefined);

		if (!guildId) {
			setTags([]);
			return;
		}

		getBotTags({ data: { steamId: summary.steamid, guildId: guildId } })
			.then((res) => setTags(Object.keys(res.tags)))
			.catch(() => setTags([]));
	}, [summary.steamid, guildId]);

	const plural = (num: number, label: string) => {
		return `${num} ${label}${num === 1 ? '' : 's'}`;
	};

	const tagLabel = {
		cheater: 'Cheater',
		suspicious: 'Suspicious',
		popular: 'Content Creator',
		banwatch: 'Ban Watch'
	};

	if (!tags) {
		return (
			<div className="flex flex-col items-start gap-1 min-w-36">
				<h3 className="font-medium">Alerts</h3>
				<span className="flex gap-2">
					<LoaderCircle className="animate-spin" /> Loading...
				</span>
			</div>
		);
	}

	const alerts: JSX.Element[] = [
		{
			label: `${plural(summary.NumberOfVACBans, 'VAC Ban')}`,
			show: summary.NumberOfVACBans > 0
		},
		{
			label: `${plural(summary.NumberOfGameBans, 'Game Ban')}`,
			show: summary.NumberOfGameBans > 0
		},
		{
			label: 'Community Ban',
			show: summary.CommunityBanned
		},
		{
			label: 'Trade Ban',
			show: summary.EconomyBan === 'banned'
		}
	]
		.filter((alert) => alert.show)
		.map((alert) => (
			<Badge key={alert.label} className="bg-red-800">
				{alert.label}
			</Badge>
		))
		.concat(
			tags.map((tag) => (
				<Badge
					key={tag}
					className={tag === 'banwatch' ? 'bg-blue-700' : 'bg-yellow-600'}
				>
					{tagLabel[tag]}
				</Badge>
			))
		);

	return (
		<div className="flex flex-col items-start gap-1 min-w-36">
			<h3 className="font-medium">Alerts</h3>
			{alerts.length ? (
				alerts.map((badge) => badge)
			) : (
				<Badge className="bg-green-700">None</Badge>
			)}
		</div>
	);
}

function LinksList({ summary }: { summary: SteamProfileSummary }) {
	const quicklinks = {
		SteamHistory: 'https://steamhistory.net/id/',
		'SteamID.uk': 'https://steamid.uk/profile/',
		SteamDB: 'https://steamdb.info/calculator/',
		'Backpack.tf': 'https://backpack.tf/profiles/',
		'Open in Client': '/open-profile/'
	};

	return (
		<div className="flex flex-col items-start gap-1 min-w-36">
			<h3 className="font-medium">Quick Links</h3>
			{Object.entries(quicklinks).map(([site, url]) => (
				<a
					key={site}
					className="link"
					href={url + summary.steamid}
					target="_blank"
					rel="noopener noreferrer"
				>
					{site}
				</a>
			))}
		</div>
	);
}

function Sourcebans({ summary }: { summary: SteamProfileSummary }) {
	const { data: sourcebans, isLoading } = useQuery({
		queryKey: ['sourcebans', summary.steamid],
		queryFn: () => getSourcebans({ data: { steamId: summary.steamid } }),
		staleTime: 5 * 60 * 1000
	});

	if (isLoading) {
		return (
			<div className="flex flex-col items-start gap-1 w-full">
				<h3 className="font-medium">Sourcebans</h3>
				<span className="flex gap-2">
					<LoaderCircle className="animate-spin" /> Loading...
				</span>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-start gap-1 w-full">
			<h3 className="font-medium">Sourcebans</h3>
			{sourcebans?.length ? (
				sourcebans.map((ban) => (
					<a
						key={ban.url}
						className="link text-left text-sm"
						href={ban.url}
						target="_blank"
						rel="noopener noreferrer"
					>
						{ban.reason}
					</a>
				))
			) : (
				<Badge className="bg-green-700">None</Badge>
			)}
		</div>
	);
}

function ProfileSummary({
	summary,
	guildId
}: {
	summary: SteamProfileSummary;
	guildId?: string;
}) {
	return (
		<>
			<div className="steam-profile-avatar">
				<img
					className="rounded-xl"
					src={summary.avatarfull}
					alt="Steam Profile Avatar"
				/>
			</div>

			<div className="steam-profile-summary">
				{/* Username */}
				<div>
					<a
						className="font-semibold text-lg hover:underline"
						href={`https://steamcommunity.com/profiles/${summary.steamid}/`}
						target="_blank"
						rel="noopener noreferrer"
					>
						{summary.personaname}
					</a>
				</div>

				{/* Rest of the summary */}
				<div className="flex w-full justify-between gap-4 flex-wrap">
					<IDList summary={summary} />
					<AlertList summary={summary} guildId={guildId} />
					<LinksList summary={summary} />
					<Sourcebans summary={summary} />
				</div>
			</div>
		</>
	);
}

export function SteamProfile({
	query,
	guildId
}: {
	query: string;
	guildId?: string;
}) {
	const [summary, setSummary] = useState<SteamProfileSummary | null>();
	const [error, setError] = useState<string>();

	useEffect(() => {
		const getProfileSummary = async () => {
			try {
				const res = await fetch(`/api/steam/lookup/${query}`);
				if (!res.ok) {
					throw new Error('Could not load profile summary');
				}

				setSummary(await res.json());
			} catch (error) {
				setSummary(null);
				setError(error);
			}
		};

		getProfileSummary();
	}, [query]);

	return (
		<Card className="steam-profile-card">
			{summary === undefined && (
				<span className="flex gap-2 col-span-5 m-auto text-center">
					<LoaderCircle className="animate-spin" /> Loading...
				</span>
			)}

			{summary === null && (
				<Badge variant="destructive" className="col-span-5 m-auto text-sm">
					{error?.toString()}
				</Badge>
			)}

			{summary && <ProfileSummary summary={summary} guildId={guildId} />}
		</Card>
	);
}
