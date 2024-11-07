import { Hono } from 'hono';
import schedules from './handlers/schedules';
import rows from './handlers/rows';

const app = new Hono();

app.route('/', schedules);
app.route('/', rows);

export default app;
