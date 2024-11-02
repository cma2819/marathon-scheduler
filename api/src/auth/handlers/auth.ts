import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { logout } from '../../common/infra/auth';

const app = new Hono();

app.get(
  '/logout',
  zValidator(
    'query',
    z.object({
      redirect_url: z.string().url(),
    }),
  ),
  (c) => {
    const { redirect_url: redirectUrl } = c.req.valid('query');
    logout(c);
    return c.redirect(redirectUrl);
  });

export default app;
