import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { deleteSessionTokenCookie, setSessionTokenCookie, validateSessionToken } from '../db/session.js';

export const auth = async (c: Context, next: Next) => {
  const cookie = getCookie(c);
  const { session, user } = await validateSessionToken(cookie['session']);

  if (!session || !user) {
    c.set('session', null);
    c.set('user', null);
    deleteSessionTokenCookie(c);
    return next();
  }

  setSessionTokenCookie(c, cookie['session'], session.expiresAt);

  c.set('session', session);
  c.set('user', user);

  return next();
};
