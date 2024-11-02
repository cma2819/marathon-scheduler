import { Hook } from '@hono/zod-validator';
import { Env } from 'hono';

export const generalZodHook: <
  T, E extends Env, P extends string, O = object,
>() => Hook<T, E, P, O> = () => {
  return (result, c) => {
    if (!result.success) {
      return c.json({
        messages: result.error.issues.map(i => i.message),
      }, 400);
    }
  };
};
