import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/open-profile/$steamid')({
	component: RouteComponent
});

function RouteComponent() {
	const { steamid } = Route.useParams();

	useEffect(() => {
		window.location.href = `steam://openurl/https://steamcommunity.com/profiles/${steamid}`;
	});

	return (
		<div className="flex items-center justify-center h-screen min-h-72">
			<h1 className="font-header text-6xl">redirecting...</h1>
		</div>
	);
}
