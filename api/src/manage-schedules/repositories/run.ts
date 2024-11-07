import prisma from '../../common/infra/prisma';

export const RunRepository = {
  async exists(id: string): Promise<boolean> {
    return Boolean(await prisma.run.findUnique({
      where: {
        id: id,
      },
    }));
  },
};
