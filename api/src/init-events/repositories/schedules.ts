import prisma from '../../common/infra/prisma';

export const ScheduleRepository = {
  async existsAssignedRow(run: string): Promise<boolean> {
    return Boolean(await prisma.scheduleRow.findUnique({
      where: {
        runId: run,
      },
      select: {
        id: true,
      },
    }));
  },
};
