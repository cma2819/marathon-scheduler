import { Hono } from 'hono';
import events from './handlers/events';
import runners from './handlers/runners';
import runs from './handlers/runs';

const app = new Hono();

app.route('/', events);
app.route('/', runners);
app.route('/', runs);

export default app;
