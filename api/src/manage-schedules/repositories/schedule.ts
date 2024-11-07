import { Duration, Schedule, ScheduleRow, UtcDateTime } from '@marathon-scheduler/models';
import prisma from '../../common/infra/prisma';
import {
  Schedule as PrismaSchedule,
  ScheduleRow as PrismaScheduleRow,
  ScheduleBeginning,
} from '@prisma/client';

const Schedules = {
  toModel: (row: PrismaSchedule): Schedule => {
    return {
      id: row.id,
      slug: row.slug,
      description: row.description,
      beginAt: UtcDateTime.fromDate(row.beginAt),
      eventId: row.eventId,
    };
  },
};

export const ScheduleRepository = {
  async find(
    eventSlug: string,
    slug: string,
  ): Promise<Schedule | null> {
    const event = await prisma.event.findUnique({
      where: { slug: eventSlug },
    });
    if (!event) {
      return null;
    }

    const schedule = await prisma.schedule.findUnique({
      where: {
        eventId_slug: {
          eventId: event.id,
          slug: slug,
        },
      },
    });

    return schedule && Schedules.toModel(schedule);
  },

  async save(schedule: Schedule): Promise<Schedule> {
    const saved = await prisma.schedule.upsert({
      where: {
        id: schedule.id,
      },
      create: {
        id: schedule.id,
        slug: schedule.slug,
        description: schedule.description,
        beginAt: UtcDateTime.toDate(schedule.beginAt),
        eventId: schedule.eventId,
      },
      update: {
        slug: schedule.slug,
        description: schedule.description,
        beginAt: UtcDateTime.toDate(schedule.beginAt),
        eventId: schedule.eventId,
      },
    });

    return Schedules.toModel(saved);
  },
};

const ScheduleRows = {
  toModel(row: PrismaScheduleRow, beginning: ScheduleBeginning | null): ScheduleRow {
    return {
      id: row.id,
      setupTime: Duration.fromSeconds(row.setupInSec),
      isFirst: Boolean(beginning),
      next: row.next,
      runId: row.runId,
      scheduleId: row.scheduleId,
    };
  },
};

export const ScheduleRowRepository = {
  async find(schedule: string, row: string) {
    const exists = await prisma.scheduleRow.findUnique({
      where: {
        scheduleId: schedule,
        id: row,
      },
      include: {
        beginning: true,
      },
    });

    return exists ? ScheduleRows.toModel(exists, exists?.beginning) : null;
  },

  async findBeginning(schedule: string): Promise<ScheduleRow | null> {
    const beginning = await prisma.scheduleBeginning.findUnique({
      where: {
        scheduleId: schedule,
      },
      include: {
        row: true,
      },
    });

    if (!beginning) {
      return null;
    }

    return {
      id: beginning.row.id,
      scheduleId: beginning.scheduleId,
      runId: beginning.row.runId,
      setupTime: Duration.fromSeconds(beginning.row.setupInSec),
      isFirst: true,
      next: beginning.row.next,
    };
  },

  async findForRun(schedule: string, run: string): Promise<ScheduleRow | null> {
    const row = await prisma.scheduleRow.findUnique({
      where: {
        scheduleId: schedule,
        runId: run,
      },
      include: {
        beginning: true,
      },
    });

    return row ? ScheduleRows.toModel(row, row.beginning) : null;
  },

  async list(schedule: string): Promise<ScheduleRow[]> {
    const rows = await prisma.scheduleRow.findMany({
      where: {
        scheduleId: schedule,
      },
      include: {
        beginning: true,
      },
    });

    return rows.map(row => ScheduleRows.toModel(row, row.beginning));
  },

  async save(row: ScheduleRow): Promise<ScheduleRow> {
    const isBeginning = row.isFirst;

    const exists = await prisma.scheduleRow.findUnique({
      where: {
        id: row.id,
      },
    });

    return await prisma.$transaction(async (tx) => {
      // Upsert as next=null for keeping foreign constraint
      const saved = await tx.scheduleRow.upsert({
        where: {
          id: row.id,
          scheduleId: row.scheduleId,
        },
        update: {
          setupInSec: row.setupTime.seconds,
          next: null,
        },
        create: {
          id: row.id,
          setupInSec: row.setupTime.seconds,
          runId: row.runId,
          scheduleId: row.scheduleId,
          next: null,
        },
        include: {
          beginning: true,
        },
      });

      if (exists) {
        await tx.scheduleRow.updateMany({
          where: {
            next: exists.id,
            scheduleId: row.scheduleId,
          },
          data: {
            next: exists.next,
          },
        });

        await tx.scheduleBeginning.updateMany({
          where: {
            rowId: exists.id,
            scheduleId: row.scheduleId,
          },
          data: {
            rowId: exists.next ?? exists.id,
          },
        });
      }

      await tx.scheduleRow.updateMany({
        where: {
          id: {
            not: row.id,
          },
          next: row.next,
          scheduleId: row.scheduleId,
        },
        data: {
          next: row.id,
        },
      });

      await tx.scheduleRow.update({
        where: {
          id: row.id,
          scheduleId: row.scheduleId,
        },
        data: {
          next: row.next,
        },
      });

      if (isBeginning) {
        await tx.scheduleBeginning.upsert({
          where: {
            scheduleId: row.scheduleId,
          },
          create: {
            rowId: row.id,
            scheduleId: row.scheduleId,
          },
          update: {
            rowId: row.id,
          },
        });
      }

      return ScheduleRows.toModel(saved, saved.beginning);
    });
  },

  async delete(row: ScheduleRow['id']): Promise<boolean> {
    const exists = await prisma.scheduleRow.findUnique({
      where: {
        id: row,
      },
      include: {
        beginning: true,
      },
    });

    if (!exists) {
      return false;
    }

    return await prisma.$transaction(async (tx) => {
      if (exists.beginning) {
        if (!exists.next) {
          await tx.scheduleBeginning.delete({
            where: {
              scheduleId: exists.scheduleId,
              rowId: exists.id,
            },
          });
        }
        else {
          await tx.scheduleBeginning.update({
            where: {
              scheduleId: exists.scheduleId,
              rowId: exists.id,
            },
            data: {
              rowId: exists.next,
            },
          });
        }
      }

      await tx.scheduleRow.delete({
        where: {
          id: exists.id,
        },
      });

      await tx.scheduleRow.updateMany({
        where: {
          next: exists.id,
        },
        data: {
          next: exists.next,
        },
      });

      return true;
    });
  },
};
