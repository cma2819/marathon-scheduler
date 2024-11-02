import { z, ZodTypeAny } from 'zod';

export default {
  paginate: <T extends ZodTypeAny>(identifier: T) => z.union([
    z.object({ before: identifier }),
    z.object({ after: identifier }),
    z.object({}),
  ]),
};
