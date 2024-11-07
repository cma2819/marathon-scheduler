import { env } from 'hono/adapter';
import { MiddlewareHandler } from 'hono/types';
import { AppEnv } from './env';
import { jwt } from 'hono/jwt';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';

export const jwtGuard: MiddlewareHandler = (c, next) => {
  const appEnv = env<AppEnv>(c);

  const honoJwt = jwt({
    cookie: 'marathon_scheduler_token',
    secret: appEnv.APPLICATION_SECRET,
  });

  return honoJwt(c, next);
};

const jwtSchema = z.object({
  roles: z.array(z.string()),
});

export const adminGuard: MiddlewareHandler = (c, next) => {
  const appEnv = env<AppEnv>(c);
  const jwtPayload = c.get('jwtPayload');

  try {
    const parsed = jwtSchema.parse(jwtPayload);

    const allowedRoles = appEnv.DISCORD_ROLE_IDS.split(',');
    if (!allowedRoles.some(role => parsed.roles.includes(role))) {
      throw new HTTPException(401);
    }
    return next();
  }
  catch {
    throw new HTTPException(401);
  }
};
