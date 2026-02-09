import { randomBytes } from 'node:crypto';
import { SiDiscord } from '@icons-pack/react-simple-icons';
import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { ClipboardIcon } from 'lucide-react';
import { useState } from 'react';
import { ApiRoute } from '~/components/api-route';
import { GuildSelect } from '~/components/guild-select';
import { InputButton } from '~/components/input-button';
import { Button } from '~/components/ui/button';
import { auth } from '~/lib/auth';
import { authClient } from '~/lib/auth-client';
import { prisma } from '~/lib/prisma';

const generateBotToken = createServerFn({ method: 'POST' })
	.inputValidator((data: { guildId: string }) => data)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const session = await auth.api.getSession({ headers });

		if (!session?.user) {
			throw new Error('Unauthorized');
		}

		const token = randomBytes(32).toString('hex');

		await prisma.user.update({
			where: { id: session.user.id },
			data: {
				botToken: token,
				botGuild: data.guildId
			}
		});

		return token;
	});

const revokeBotToken = createServerFn({ method: 'POST' }).handler(async () => {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });

	if (!session?.user) {
		throw new Error('Unauthorized');
	}

	await prisma.user.update({
		where: { id: session.user.id },
		data: { botToken: null, botGuild: null }
	});
});

export const Route = createFileRoute('/api-reference')({
	component: RouteComponent,
	ssr: false
});

function TokenGeneration() {
	const { data, refetch } = authClient.useSession();
	const [guildId, setGuildId] = useState<string>();
	const [token, setToken] = useState<string>();

	if (!data) {
		return (
			<div className="flex flex-col items-center gap-2 max-w-[90vw] text-wrap">
				<span>Please login via Discord to use the Stickbot API</span>
				<Button
					className="w-30"
					onClick={() =>
						authClient.signIn.social({
							provider: 'discord',
							callbackURL: location.href,
							errorCallbackURL: location.href
						})
					}
				>
					<SiDiscord /> Login
				</Button>
			</div>
		);
	}

	if (token) {
		return (
			<div className="flex flex-col items-center gap-2 max-w-[90vw] text-wrap">
				<span>Save your Stickbot API token</span>
				<InputButton
					icon={<ClipboardIcon />}
					value={token}
					onSubmit={() => navigator.clipboard.writeText(token)}
					readOnly
				/>
			</div>
		);
	}

	if (data.user.botToken) {
		return (
			<div className="flex flex-col items-center gap-2 max-w-[90vw] text-wrap">
				<span>You have an existing Stickbot API token</span>
				<Button
					className="w-42"
					onClick={() => revokeBotToken().then(() => refetch())}
				>
					Regenerate Token
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center gap-2 max-w-[90vw]">
			<GuildSelect
				className="w-60"
				value={guildId}
				onValueChange={setGuildId}
			/>
			<Button
				className="w-40"
				disabled={!guildId}
				onClick={() => {
					generateBotToken({ data: { guildId: guildId ?? '' } }).then(setToken);
				}}
			>
				Generate Token
			</Button>
		</div>
	);
}

function RouteComponent() {
	return (
		<div className="w-full flex flex-col items-center justify-center mt-40 mb-16 gap-16 text-center">
			<h1 className="font-header text-6xl">api & reference</h1>
			<span className="font-mono">
				{`${location.protocol}//`}
				{location.host}/api/
			</span>
			<TokenGeneration />
			<ApiRoute
				endpoint="/bot/lookup"
				method="POST"
				fields={[
					{
						key: 'token',
						type: 'string',
						description: 'Stickbot API token',
						example: '"abcdef1234567890"'
					},
					{
						key: 'steamids',
						type: 'string[]',
						description: 'Array of SteamIDs (ID64) for lookup',
						example: '["76561197960287930"]'
					}
				]}
			/>
			<ApiRoute
				endpoint="/bot/addtag"
				method="POST"
				fields={[
					{
						key: 'token',
						type: 'string',
						description: 'Stickbot API token',
						example: '"abcdef1234567890"'
					},
					{
						key: 'steamid',
						type: 'string',
						description: 'SteamID of profile',
						example: '"76561197960287930"'
					},
					{
						key: 'tag',
						type: 'string',
						description:
							'Profile tag to add\n(cheater, suspicious, popular, banwatch)',
						example: '"cheater"'
					}
				]}
			/>
			<ApiRoute
				endpoint="/bot/removetag"
				method="POST"
				fields={[
					{
						key: 'token',
						type: 'string',
						description: 'Stickbot API token',
						example: '"abcdef1234567890"'
					},
					{
						key: 'steamid',
						type: 'string',
						description: 'SteamID of profile',
						example: '"76561197960287930"'
					},
					{
						key: 'tag',
						type: 'string',
						description:
							'Profile tag to remove\n(cheater, suspicious, popular, banwatch)',
						example: '"cheater"'
					}
				]}
			/>
		</div>
	);
}
