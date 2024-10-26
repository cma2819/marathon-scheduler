import { Context, Hono } from 'hono';
import { login, makeOAuthUrl, StateStorageProvider } from '../services/discord';
import { env } from 'hono/adapter';
import { AppEnv } from '../../common/infra/env';
import { getSignedCookie, setSignedCookie } from 'hono/cookie';
import { ErrorResponse } from '@marathon-scheduler/models';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { generalZodHook } from '../../common/validators/hooks';

const app = new Hono();

const sessionProvider = (c: Context): StateStorageProvider => {
  const { APPLICATION_SECRET: secret } = env<AppEnv>(c);

  return {
    save: async (state) => {
      await setSignedCookie(c, 'discord_session_state', state, secret);
    },

    fetch: async () => {
      const state = await getSignedCookie(c, 'discord_session_state', secret);
      return state || null;
    },
  };
};

app.get(
  '/login/discord',
  async (c) => {
    const appEnv = env<AppEnv>(c);
    const redirectUrl = new URL('/auth/discord', c.req.url);

    const result = makeOAuthUrl({
      clientId: appEnv.DISCORD_CLIENT_ID,
      redirectUrl: redirectUrl.toString(),
    }, sessionProvider(c));

    return result.match(
      (url) => {
        return c.redirect(url);
      },
      (err) => {
        return c.json<ErrorResponse>({
          code: err,
          message: 'Failed to make login.',
        }, 400);
      },
    );
  },
);

app.get(
  '/auth/discord',
  zValidator(
    'query',
    z.object({
      code: z.string(),
      state: z.string(),
    }),
    generalZodHook(),
  ),
  async (c) => {
    const appEnv = env<AppEnv>(c);
    const redirectUrl = new URL('/auth/discord', c.req.url);

    const { code, state } = c.req.valid('query');
    return login({
      clientId: appEnv.DISCORD_CLIENT_ID,
      clientSecret: appEnv.DISCORD_CLIENT_SECRET,
      redirectUrl: redirectUrl.toString(),
    }, state, code, sessionProvider(c));
  },
);

export default app;
