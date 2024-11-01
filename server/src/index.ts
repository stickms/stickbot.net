import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import lookup_route from './routes/lookup.js';
import { cors } from 'hono/cors';
import { API_ORIGIN } from './env.js';

const app = new Hono();

app.use('*', cors({
    origin: API_ORIGIN,
    allowHeaders: ['Origin', 'Content-Type', 'Authorization'],
    allowMethods: ['GET'],
    credentials: true
  })
);

app.route('/', lookup_route);

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
