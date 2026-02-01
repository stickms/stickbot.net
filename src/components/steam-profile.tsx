import { type JSX, useEffect, useState } from 'react';
import type { SteamProfileSummary } from '~/types';
import '~/styles/steam-profile.css';
import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { Clipboard } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { playersDB } from '~/lib/db';

const getBotTags = createServerFn({ method: 'GET' })
	.inputValidator((data: { steamid: string; guildid: string }) => data)
	.handler(async ({ data }) => {
		const player = await (await playersDB()).findOne({
			_id: data.steamid,
		});

		if (!player) {
			throw notFound();
		}

		return {
			tags: player.tags[data.guildid] ?? {},
		};
	});

function IDList({ summary }: { summary: SteamProfileSummary }) {
	const accountid = Number(BigInt(summary.steamid) & BigInt(0xffffffff));

	const idlist = [
		summary.steamid,
		`[U:1:${accountid}]`,
		`STEAM_1:${accountid & 1}:${Math.floor(accountid / 2)}`,
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

function AlertList({ summary }: { summary: SteamProfileSummary }) {
	const alerts: JSX.Element[] = [];

	const plural = (num: number, label: string) => {
		return `${num} ${label}${num === 1 ? '' : 's'}`;
	};

	alerts.concat(
		[
			{
				label: `${plural(summary.NumberOfVACBans, 'VAC Ban')}`,
				show: summary.NumberOfVACBans > 0,
			},
			{
				label: `${plural(summary.NumberOfGameBans, 'Game Ban')}`,
				show: summary.NumberOfGameBans > 0,
			},
			{
				label: 'Community Ban',
				show: summary.CommunityBanned,
			},
			{
				label: 'Trade Ban',
				show: summary.EconomyBan === 'banned',
			},
		]
			.filter((alert) => alert.show)
			.map((alert) => (
				<Badge key={alert.label} className="bg-red-800">
					{alert.label}
				</Badge>
			)),
	);

	return (
		<div className="flex flex-col items-start gap-1 min-w-36">
			<h3 className="font-medium">Alerts</h3>
			{alerts.length > 0 ? (
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
		'Open in Client': '/open-profile/',
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

function ProfileSummary({ summary }: { summary: SteamProfileSummary }) {
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
				<h2>
					<a
						className="font-semibold text-lg hover:underline"
						href={`https://steamcommunity.com/profiles/${summary.steamid}/`}
						target="_blank"
						rel="noopener noreferrer"
					>
						{summary.personaname}
					</a>
				</h2>

				{/* Rest of the summary */}
				<div className="flex w-full justify-between gap-4 flex-wrap">
					<IDList summary={summary} />
					<AlertList summary={summary} />
					<LinksList summary={summary} />
				</div>
			</div>
		</>
	);
}

export function SteamProfile({ query }: { query: string }) {
	const [summary, setSummary] = useState<SteamProfileSummary | null>();
	const [error, setError] = useState<string>();

	useEffect(() => {
		const getProfileSummary = async () => {
			try {
				const resolve_resp = await fetch(`/api/resolve/${query}`);
				if (!resolve_resp.ok) {
					throw new Error('Could not resolve SteamID or VanityURL');
				}

				const { steamid } = await resolve_resp.json();

				const summary_resp = await fetch(`/api/lookup/${steamid}`);
				if (!summary_resp.ok) {
					throw new Error('Could not load profile summary');
				}

				setSummary(await summary_resp.json());
			} catch (error) {
				setError(error);
			}
		};

		getProfileSummary();
	}, [query]);

	return (
		<div className="steam-profile-card">
			{summary === undefined && (
				<h2 className="col-span-5 m-auto text-center">Loading...</h2>
			)}

			{summary === null && (
				<h2 className="col-span-5 m-auto text-center">Error: {error}</h2>
			)}

			{summary && <ProfileSummary summary={summary} />}
		</div>
	);
}
