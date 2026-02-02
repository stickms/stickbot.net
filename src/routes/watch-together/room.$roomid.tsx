import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/watch-together/room/$roomid')({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/watch-together/room/$roomid"!</div>;
}
