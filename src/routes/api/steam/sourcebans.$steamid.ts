import { createFileRoute } from '@tanstack/react-router';
import { getSourcebans } from '../-sourcebans';

export const Route = createFileRoute('/api/steam/sourcebans/$steamid')({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const { steamid } = params;

				const sourcebans = await getSourcebans(steamid);

				return Response.json(sourcebans);
			}
		}
	}
});
