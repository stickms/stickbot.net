import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { InputButton } from '~/components/input-button';
import { SteamProfile } from '~/components/steam-profile';

export const Route = createFileRoute('/steam-lookup/{-$query}')({
	component: RouteComponent,
});

function RouteComponent() {
	const { query } = Route.useParams();
	const navigate = useNavigate();

	const [userSearch, setUserSearch] = useState<string>('');

	return (
		<div className="w-full flex flex-col items-center justify-center mt-40 mb-16 gap-8 text-center">
			<h1 className="font-header text-6xl">steam profile lookup</h1>
			<InputButton 
				className='w-150 max-w-[90vw]'
				placeholder="Lookup a Steam Profile..."
				icon={<SearchIcon />}
				value={userSearch}
				onChange={(e) => setUserSearch(e.target.value)}
				onSubmit={() => {
					navigate({
						to: '/steam-lookup/{-$query}',
						params: { query: userSearch },
					});
				}}
			/>
			{query && <SteamProfile query={query} />}
		</div>
	);
}
