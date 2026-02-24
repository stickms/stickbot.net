import { redirect } from '@tanstack/react-router';
import { createMiddleware } from '@tanstack/react-start';
import { authClient } from '~/lib/auth-client';

export const authMiddleware = createMiddleware().server(async ({ next }) => {
	const session = await authClient.getSession();

	if (!session) {
		throw redirect({ to: '/' });
	}

	return await next();
});
