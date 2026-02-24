/// <reference types="vite/client" />
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts
} from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Background } from '~/components/background';
import { Navbar } from '~/components/navbar';
import appCss from '~/styles/app.css?url';

const queryClient = new QueryClient();

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: 'utf-8'
			},
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1'
			},
			{
				title: 'stickbot.net'
			}
		],
		links: [
			{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
			{ rel: 'stylesheet', href: appCss },
			{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
			{ rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: '' },
			{
				rel: 'stylesheet',
				href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;700&display=swap'
			}
		]
	}),
	component: RootComponent
});

function RootComponent() {
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	);
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<QueryClientProvider client={queryClient}>
					<Background />
					<Navbar />
					{children}
				</QueryClientProvider>
				<Scripts />
			</body>
		</html>
	);
}
