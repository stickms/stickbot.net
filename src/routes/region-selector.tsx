import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/region-selector')({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/region-selector"!</div>;
}
