import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import lookup_route from './routes/lookup.js';

const app = new Hono();

app.route('/api/', lookup_route);

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port
});
