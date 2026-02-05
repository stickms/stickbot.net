import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { SearchIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { GuildSelect } from '~/components/guild-select';
import { InputButton } from '~/components/input-button';
import { SteamProfile } from '~/components/steam-profile';
import { Button } from '~/components/ui/button';
import { authClient } from '~/lib/auth-client';

export const Route = createFileRoute('/steam-lookup/{-$query}')({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const { query } = Route.useParams();
	const { data } = authClient.useSession();

	const inputRef = useRef<HTMLInputElement>(null);
	const [ guildId, setGuildId ] = useState<string>();

	return (
		<div className="w-full flex flex-col items-center justify-center mt-40 mb-16 gap-8 text-center">
			<h1 className="font-header text-6xl">steam profile lookup</h1>
			<div className='flex gap-2 w-150 max-w-[90vw]'>
				<InputButton 
					ref={inputRef}
					placeholder="Lookup a Steam Profile..."
					icon={<SearchIcon />}
					onSubmit={() => {
						navigate({
							to: '/steam-lookup/{-$query}',
							params: { query: inputRef.current?.value },
						});
					}}
				/>
				{data ? (
					<GuildSelect
						className='min-w-48 w-48'
						value={guildId}
						onValueChange={setGuildId}
					/>
				) : (
					<Button
						onClick={() => authClient.signIn.social({
							provider: 'discord',
							callbackURL: location.href,
							errorCallbackURL: location.href
						})}
					>
						Login
					</Button>
				)}
			</div>
			{query && <SteamProfile query={query} guildId={guildId} />}
		</div>
	);
}
