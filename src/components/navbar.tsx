import { SiDiscord, SiGithub } from '@icons-pack/react-simple-icons';
import { ChevronDown } from 'lucide-react';
import { Link } from '~/components/link';
import { Button } from '~/components/ui/button';
import { authClient } from '~/lib/auth-client';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger
} from './ui/dropdown-menu';

import '~/styles/navbar.css';
import { Separator } from './ui/separator';

function UserProfile() {
	const { data } = authClient.useSession();

	if (!data) {
		return (
			<Button
				onClick={() =>
					authClient.signIn.social({
						provider: 'discord',
						callbackURL: location.href,
						errorCallbackURL: location.href
					})
				}
			>
				<SiDiscord /> Login
			</Button>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="secondary" className="gap-1.5">
					<img
						src={data.user.image ?? undefined}
						alt="Avatar"
						className="size-6 rounded-sm"
					/>
					<ChevronDown className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>{data.user.name}</DropdownMenuLabel>
				<Separator />
				<DropdownMenuItem
					variant="destructive"
					onClick={() => authClient.signOut()}
				>
					Logout
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function Navbar() {
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

			<div className="flex items-center gap-2">
				<Button variant="secondary" asChild>
					<a
						href={'https://github.com/stickms/stickbot.net'}
						target="_blank"
						rel="noopener noreferrer"
					>
						<SiGithub />
					</a>
				</Button>
				<UserProfile />
			</div>
		</nav>
	);
}
