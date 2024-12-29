import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { API_PORT, CLIENT_URL } from './env.js';
import { auth } from './middleware/auth.js';
import type { Context } from './lib/context.js';

import lookup_route from './routes/lookup.js';
import oauth_route from './routes/oauth.js';
import { OAuth2RequestError } from 'arctic';
import { HTTPException } from 'hono/http-exception';
import { csrf } from 'hono/csrf';

const app = new Hono<Context>();

app.use(
  '/*',
  cors({
    origin: (origin) => origin,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Set-Cookie']
  })
);

app.use('/*', csrf({
  origin: CLIENT_URL
}))

app.use('/*', auth);

app.route('/', lookup_route);
app.route('/', oauth_route);

app.onError((error, c) => {
  if (error instanceof OAuth2RequestError) {
    return c.json({ 
      success: false,
      message: 'Bad request' 
    }, 400);
  }

  if (error instanceof HTTPException) {
    return c.json({ 
      success: false,
      message: error.message 
    }, error.status);
  }

  if (error instanceof Error) {
    return c.json({ 
      success: false,
      message: error.message 
    }, 400);
  }

  return c.json({ 
    success: false,
    message: 'An unknown error has occurred' 
  }, 500);
});

const port = parseInt(API_PORT ?? '3000');
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
