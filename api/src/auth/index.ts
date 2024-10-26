import { Hono } from 'hono';
import discord from './handlers/discord';

const app = new Hono();

app.route('/', discord);

export default app;
