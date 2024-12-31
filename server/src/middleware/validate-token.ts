import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { db, users } from '../db/schema.js';
import { eq, and, isNotNull } from 'drizzle-orm';

export const validateToken = async (c: Context, next: Next) => {
  const token = c.req.query('token');

  if (!token) {
    throw new HTTPException(401, { message: 'Please specify an API token' });
  }

  const user = db
    .select()
    .from(users)
    .where(and(eq(users.apiToken, token), isNotNull(users.apiGuild)))
    .get();

  if (!user) {
    throw new HTTPException(401, { message: 'Invalid API token' });
  }
  
  // Set user for future usage
  c.set('user', user);

  return next();
};
