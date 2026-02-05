import { createFileRoute } from '@tanstack/react-router';
import z from 'zod';
import { prisma } from '~/lib/prisma';
import { getSourcebans } from '../-sourcebans';
import { validateJson } from '../-utils';

const sourcebansSchema = z.object({
  token: z.string().nonempty(),
  steamid: z.string().nonempty()
});

export const Route = createFileRoute('/api/bot/sourcebans')({
  server: {
    handlers: {
      POST: async({ request }) => {
        const { token, steamid } = await validateJson(request, sourcebansSchema);

        const user = await prisma.user.findUnique({ where: { botToken: token, botGuild: { not: null } } });

        if (!user || !user.botGuild) {
          return Response.json({ 'error': 'Token does not exist' }, { status: 404 });
        }

        const sourcebans = await getSourcebans(steamid);

        return Response.json(sourcebans);
      }
    }
  }
});
