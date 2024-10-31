import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import lookup_route from './routes/lookup.js';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('/api/*', cors({
    origin: [ 'http://localhost:5173', 'https://stickbot.net' ],
    allowHeaders: ['Origin', 'Content-Type', 'Authorization'],
    allowMethods: ['GET'],
    credentials: true
  })
);

app.route('/api/', lookup_route);

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port
});
