import { Context } from 'hono';
import { ZodError } from 'zod';

const handleError = (err: unknown, c: Context) => {
  if (err instanceof ZodError) {
    return c.json({
      messages: err.issues.map(i => i.message),
    }, 400);
  }
};

export default handleError;
