import { SiGithub } from '@icons-pack/react-simple-icons';
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

			<div className='flex items-center gap-2'>
				<Button variant='secondary' asChild>
					<a
						href={'https://github.com/stickms/stickbot.net'}
						target="_blank"
						rel="noopener noreferrer"
					>
						<SiGithub />
					</a>
				</Button>
				{data && <Button onClick={() => authClient.signOut()}>Logout</Button>}
			</div>
		</nav>
	);
}
