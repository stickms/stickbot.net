import { createFileRoute } from '@tanstack/react-router';
import { Link } from '~/components/link';

export const Route = createFileRoute('/')({
	component: Home,
});

function Home() {
	return (
		<div className="w-full flex flex-col items-center justify-center my-[30vh] gap-20 text-center">
			<h1 className="font-header text-6xl">stickbot.net</h1>
			<ul className="flex flex-col gap-3">
				<li>
					<Link to="/watch-together">watch together</Link>
				</li>
				<li>
					<Link to="/steam-lookup/{-$query}">steam profile lookup</Link>
				</li>
				<li>
					<Link to="/region-selector">steam region selector</Link>
				</li>
				<li>
					<Link to="/qr-code-generator">qr code generator</Link>
				</li>
			</ul>
		</div>
	);
}
