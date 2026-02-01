import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/qr-code-generator')({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/qr-code-generator"!</div>;
}
