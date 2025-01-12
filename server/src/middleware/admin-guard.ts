import type { Context as HonoContext, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Context } from '../lib/context.js';

export const adminGuard = async (c: HonoContext<Context>, next: Next) => {
  const session = c.get('session');
  const user = c.get('user');

  if (!session || !user?.promotedOn) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  return next();
};
