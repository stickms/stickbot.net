import { Link } from '~/components/link';
import { Button } from '~/components/ui/button';
import { authClient } from '~/lib/auth-client';

import '~/styles/navbar.css';

export function Navbar() {
	const { data } = authClient.useSession();

	return (
		<nav className="bar">
			<Link
				to="/"
				style={{
					color: 'var(--color-primary-foreground)',
					fontFamily: 'var(--font-header)',
					fontSize: '30px'
				}}
			>
				stickbot.net
			</Link>

			<div>
				{data && <Button onClick={() => authClient.signOut()}>Logout</Button>}
			</div>
		</nav>
	);
}
