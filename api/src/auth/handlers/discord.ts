import { Context, Hono } from 'hono';
import { getProfile, login, makeOAuthUrl, StateStorageProvider } from '../services/discord';
import { env } from 'hono/adapter';
import { AppEnv } from '../../common/infra/env';
import { getSignedCookie, setSignedCookie } from 'hono/cookie';
import { ErrorResponse, JwtPayload } from '@marathon-scheduler/models';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { generalZodHook } from '../../common/validators/hooks';
import { JwtProvider, signIn, validateRedirectUrl } from '../services/authenticate';
import { sign, verify } from 'hono/jwt';
import { ok } from 'neverthrow';
import { setAuthorizationCookie } from '../../common/infra/auth';

const app = new Hono();

const jwtProvider = (c: Context): JwtProvider => {
  const appEnv = env<AppEnv>(c);
  return {
    sign: (payload) => {
      return sign(
        payload,
        appEnv.APPLICATION_SECRET,
      );
    },
    verify: async (token) => {
      const payload = await verify(
        token,
        appEnv.APPLICATION_SECRET,
      );
      return payload as Partial<JwtPayload>;
    },
  };
};

const sessionProvider = (c: Context): StateStorageProvider => {
  const { APPLICATION_SECRET: secret } = env<AppEnv>(c);

  return {
    save: async (state) => {
      await setSignedCookie(c, 'discord_session_state', JSON.stringify(state), secret);
    },

    fetch: async () => {
      const state = await getSignedCookie(c, secret, 'discord_session_state');
      return state ? JSON.parse(state) : null;
    },
  };
};

app.get(
  '/login/discord',
  zValidator('query', z.object({
    redirect_url: z.string().url(),
  }), generalZodHook(),
  ),
  async (c) => {
    const appEnv = env<AppEnv>(c);

    const { redirect_url: redirectUrl } = c.req.valid('query');

    return validateRedirectUrl(redirectUrl, appEnv.ALLOWED_REDIRECT_DOMAIN)
      .asyncAndThen(() => {
        const discordCredential = {
          clientId: appEnv.DISCORD_CLIENT_ID,
          redirectUrl: new URL('/auth/discord', c.req.url).toString(),
        };
        return makeOAuthUrl(
          discordCredential,
          redirectUrl,
          sessionProvider(c),
        );
      })
      .match(
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
    const now = new Date();
    return login({
      clientId: appEnv.DISCORD_CLIENT_ID,
      clientSecret: appEnv.DISCORD_CLIENT_SECRET,
      redirectUrl: redirectUrl.toString(),
    }, state, code, sessionProvider(c))
      .andThen(({ tokens, redirect }) => {
        return getProfile(
          tokens.accessToken,
          appEnv.DISCORD_GUILD_ID,
        )
          .andThen((profile) => {
            return signIn(
              now,
              {
                id: profile.id,
                username: profile.displayName,
                roles: profile.roles,
              },
              jwtProvider(c),
            );
          })
          .andThen((token) => {
            return ok(setAuthorizationCookie(c, token));
          })
          .map(() => {
            return redirect;
          });
      })
      .match((redirect) => {
        return c.redirect(redirect);
      }, (err) => {
        return c.json<ErrorResponse>({
          code: err,
          message: 'Failed to login with discord.',
        }, 400);
      });
  },
);

export default app;
