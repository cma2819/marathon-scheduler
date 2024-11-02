import { env } from 'hono/adapter';
import { MiddlewareHandler } from 'hono/types';
import { AppEnv } from './env';
import { jwt } from 'hono/jwt';

export const jwtGuard: MiddlewareHandler = (c, next) => {
  const appEnv = env<AppEnv>(c);

  const honoJwt = jwt({
    cookie: 'marathon_scheduler_token',
    secret: appEnv.APPLICATION_SECRET,
  });

  return honoJwt(c, next);
};
