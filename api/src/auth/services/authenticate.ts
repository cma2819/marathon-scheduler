import { JwtPayload } from '@marathon-scheduler/models';
import { err, ok, Result, ResultAsync } from 'neverthrow';

type Profile = {
  id: string;
  username: string;
  roles: string[];
};

export type JwtProvider = {
  sign: (payload: JwtPayload) => Promise<string>;
  verify: (token: string) => Promise<Partial<JwtPayload>>;
};

const JWT_EXPIRE_MINUTES = 60 * 24 * 7;

export const signIn = (
  now: Date, profile: Profile, provider: JwtProvider,
): ResultAsync<string, never> => {
  const payload: JwtPayload = {
    sub: profile.id,
    exp: now.getTime() + (JWT_EXPIRE_MINUTES * 60 * 1000),
    username: profile.username,
    roles: profile.roles,
  };

  return ResultAsync.fromSafePromise(provider.sign(payload));
};

type AuthenticateError = 'token_expired' | 'invalid_payload';

export const authenticate = (
  now: Date, jwt: string, provider: JwtProvider,
): ResultAsync<Profile, AuthenticateError> => {
  return ResultAsync.fromSafePromise(provider.verify(jwt))
    .andThen((payload) => {
      if (!(payload.username && payload.roles && payload.sub && payload.exp)) {
        return err('invalid_payload' as const);
      }
      if (payload.exp < now.getTime()) {
        return err('token_expired' as const);
      }

      return ok({
        id: payload.sub,
        username: payload.username,
        roles: payload.roles,
      });
    });
};

export const validateRedirectUrl = (
  redirectUrl: string,
  allowedDomain: string,
): Result<true, 'invalid_redirect_url'> => {
  const redirect = new URL(redirectUrl);
  return redirect.hostname === allowedDomain ? ok(true) : err('invalid_redirect_url');
};
