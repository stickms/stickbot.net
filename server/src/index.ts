import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { API_PORT } from './env.js';

import lookup_route from './routes/lookup.js';

const app = new Hono();

app.use('/*', cors());
app.route('/', lookup_route);

app.onError((error, c) => {
  return c.json({ 'error': error.message }, 500);
});

const port = parseInt(API_PORT ?? '3000');
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
