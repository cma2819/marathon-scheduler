import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import bootstrap from './bootstrap';

const app = new Hono();

const port = 3000;
console.log(`Server is running on port ${port}`);

bootstrap(app);

serve({
  fetch: app.fetch,
  port,
});
