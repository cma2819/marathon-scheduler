import { Hono } from 'hono';
import authApp from './auth';
import initEventsApp from './init-events';
import manageScheduleApp from './manage-schedules';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { env } from 'hono/adapter';
import { AppEnv } from './common/infra/env';

export default (app: Hono): void => {
  app.use(logger());
  app.use('*', async (c, next) => {
    const handler = cors({
      origin: env<AppEnv>(c).WEBAPP_ORIGIN,
      allowHeaders: ['Content-Type'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    });
    return handler(c, next);
  });

  // load modules
  app.route('/', authApp);
  app.route('/', initEventsApp);
  app.route('/', manageScheduleApp);
};
