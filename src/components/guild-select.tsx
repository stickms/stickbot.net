import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select';
import { authClient } from '~/lib/auth-client';

export interface DiscordGuild {
	id: string;
	name: string;
	icon: string | null;
	owner: boolean;
	permissions: string;
}

async function fetchGuilds(): Promise<DiscordGuild[]> {
	const tokenData = await authClient.getAccessToken({ providerId: 'discord' });
	if (!tokenData.data?.accessToken) {
		throw new Error('No access token');
	}

	const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
		headers: { Authorization: `Bearer ${tokenData.data.accessToken}` },
	});

	if (!res.ok) {
		throw new Error('Failed to fetch guilds');
	}

	return res.json();
}

export function GuildSelect({
	value,
	onValueChange,
	placeholder = 'Select a server',
	className,
}: {
	value?: string;
	onValueChange?: (guildId: string, guild: DiscordGuild | undefined) => void;
	placeholder?: string;
	className?: string;
}) {
	const { data: session } = authClient.useSession();
	const [internalValue, setInternalValue] = useState<string | undefined>(value);
	const selectedValue = value ?? internalValue;

	const {
		data: guilds = [],
		isLoading,
		isError,
	} = useQuery({
		queryKey: ['discord-guilds'],
		queryFn: fetchGuilds,
		enabled: !!session,
		staleTime: 5 * 60 * 1000,
	});

	const handleValueChange = (guildId: string) => {
		const guild = guilds.find((g) => g.id === guildId);
		setInternalValue(guildId);
		onValueChange?.(guildId, guild);
	};

	const getGuildIconUrl = (guild: DiscordGuild) => {
		if (!guild.icon) {
			return undefined;
		}

		return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=32`;
	};

	if (!session) {
		return (
			<Select disabled>
				<SelectTrigger className={className}>
					<SelectValue placeholder="Sign in to select a server" />
				</SelectTrigger>
			</Select>
		);
	}

	if (isError) {
		return (
			<Select disabled>
				<SelectTrigger className={className}>
					<SelectValue placeholder="Error loading servers" />
				</SelectTrigger>
			</Select>
		);
	}

	return (
		<Select
			value={selectedValue}
			onValueChange={handleValueChange}
			disabled={isLoading}
		>
			<SelectTrigger className={className}>
				<SelectValue placeholder={isLoading ? 'Loading...' : placeholder} />
			</SelectTrigger>
			<SelectContent position="popper">
				<SelectGroup>
					{guilds.map((guild) => (
						<SelectItem key={guild.id} value={guild.id}>
							<span className="flex items-center gap-2">
								{guild.icon ? (
									<img
										src={getGuildIconUrl(guild)}
										alt="Discord Guild Icon"
										className="size-5 rounded-sm"
									/>
								) : (
									<span className="size-5 rounded-sm bg-muted flex items-center justify-center text-xs">
										{guild.name.charAt(0)}
									</span>
								)}
								{guild.name}
							</span>
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
