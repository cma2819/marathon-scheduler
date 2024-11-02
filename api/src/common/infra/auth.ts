import { Context } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';

export const setAuthorizationCookie = (c: Context, token: string) => {
  setCookie(c, 'marathon_scheduler_token', token, {
    sameSite: 'Lax',
  });
};

export const logout = (c: Context) => {
  deleteCookie(c, 'marathon_scheduler_token');
};
