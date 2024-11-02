import { Hono } from 'hono';
import auth from './handlers/auth';
import discord from './handlers/discord';

const app = new Hono();

app.route('/', auth);
app.route('/', discord);

export default app;
