import { env } from 'hono/adapter';
import { MiddlewareHandler } from 'hono/types';
import { AppEnv } from './env';
import { jwt } from 'hono/jwt';

export const jwtGuard: MiddlewareHandler = (c, next) => {
  const appEnv = env<AppEnv>(c);

  const honoJwt = jwt({
    secret: appEnv.APPLICATION_SECRET,
  });

  return honoJwt(c, next);
};
