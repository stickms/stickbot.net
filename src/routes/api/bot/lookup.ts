import { createFileRoute } from '@tanstack/react-router';
import z from 'zod';
import { playersDB } from '~/lib/mongo';
import { prisma } from '~/lib/prisma';
import { validateJson } from '../-utils';

const lookupSchema = z.object({
  token: z.string().nonempty(),
  steamids: z.array(z.string().nonempty())
});

export const Route = createFileRoute('/api/bot/lookup')({
  server: {
    handlers: {
      POST: async({ request }) => {
        const { token, steamids } = await validateJson(request, lookupSchema);

        const user = await prisma.user.findUnique({ where: { botToken: token, botGuild: { not: null } } });

        if (!user || !user.botGuild) {
          return Response.json({ 'error': 'Token does not exist' }, { status: 404 });
        }

        const profiles = await (await playersDB()).find({ _id: { $in: steamids } }).toArray();
        const guild = user.botGuild;

        return Response.json(profiles.map((profile) => ({
          [ profile._id ]: {
            names: profile.names,
            tags: profile.tags[guild] ?? {}
          }
        })));
      }
    }
  }
});
