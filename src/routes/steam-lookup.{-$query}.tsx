import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { SteamProfile } from '~/components/steam-profile';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '~/components/ui/input-group';

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
			<InputGroup className="w-150 max-w-[90vw]">
				<InputGroupInput
					placeholder="Lookup a Steam Profile..."
					value={userSearch}
					onChange={(e) => setUserSearch(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							navigate({
								to: '/steam-lookup/{-$query}',
								params: { query: userSearch },
							});
						}
					}}
				/>
				<InputGroupAddon align="inline-end">
					<InputGroupButton
						aria-label="Search"
						title="Search"
						size="icon-xs"
						variant="secondary"
						onClick={() => {
							navigate({
								to: '/steam-lookup/{-$query}',
								params: { query: userSearch },
							});
						}}
					>
						<Search />
					</InputGroupButton>
				</InputGroupAddon>
			</InputGroup>
			{query && <SteamProfile query={query} />}
		</div>
	);
}
