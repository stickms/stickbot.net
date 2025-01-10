import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { User } from '../db/schema.js';

export const adminGuard = async (c: Context, next: Next) => {
  const session = c.get('session');
  const user: User | null = c.get('user');

  if (!session || !user?.isAdmin) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  return next();
};
