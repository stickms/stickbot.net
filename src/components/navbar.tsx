import { Link } from '~/components/link';
import '~/styles/navbar.css';

export function Navbar() {
	return (
		<nav className="bar">
			<Link
				to="/"
				style={{
					color: 'var(--color-primary-foreground)',
					fontFamily: 'var(--font-header)',
					fontSize: '30px',
				}}
			>
				stickbot.net
			</Link>
		</nav>
	);
}
