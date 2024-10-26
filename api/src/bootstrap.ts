import { Hono } from 'hono';
import authApp from './auth';
import initEventsApp from './init-events';
import { logger } from 'hono/logger';

export default (app: Hono): void => {
  app.use(logger());

  // load modules
  app.route('/', authApp);
  app.route('/', initEventsApp);
};
