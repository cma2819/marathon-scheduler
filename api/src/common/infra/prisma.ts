import { PaginationRequest } from '@marathon-scheduler/models';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;

type PrismaCursors<UKey extends string, TIdentifier> = {
  cursor: {
    [k in UKey]: TIdentifier | undefined;
  };
  orderBy: {
    [k in UKey]: 'asc' | 'desc';
  };
  skip: 1;
};

export const makeCursors = <UKey extends string, TIdentifier>(
  uniqueKey: UKey,
  req: PaginationRequest<TIdentifier>,
): PrismaCursors<UKey, TIdentifier> => ({
  cursor: {
    [uniqueKey]: 'before' in req
      ? req.before
      : 'after' in req ? req.after : undefined,
  },
  orderBy: {
    [uniqueKey]: 'before' in req ? 'desc' : 'asc',
  },
  skip: 1,
} as PrismaCursors<UKey, TIdentifier>);
