import { PublicSchedule, PublicScheduleRow, UtcDateTime } from '@marathon-scheduler/models';
import prisma from '../../common/infra/prisma';
import { PublicSchedule as PrismaPublicSchedule, Schedule } from '@prisma/client';

const PublicSchedules = {
  toModel(row: PrismaPublicSchedule, schedule: Schedule): PublicSchedule {
    return ({
      scheduleId: schedule.id,
      rows: row.data as PublicScheduleRow[],
      meta: {
        publishedAt: UtcDateTime.fromDate(row.publishedAt),
        revision: row.revision,
      },
    });
  },
};

export const PublicScheduleRepository = {
  async find(
    schedule: PublicSchedule['scheduleId'],
    revision?: PublicSchedule['meta']['revision']): Promise<PublicSchedule | null> {
    const maxRevision = await prisma.publicSchedule.aggregate({
      where: {
        scheduleId: schedule,
      },
      _max: {
        revision: true,
      },
    });

    if (maxRevision._max.revision === null) {
      return null;
    }

    const publicSchedule = await prisma.publicSchedule.findUnique({
      where: {
        scheduleId_revision: {
          scheduleId: schedule,
          revision: revision ?? maxRevision._max.revision,
        },
      },
      include: {
        schedule: true,
      },
    });

    if (!publicSchedule) {
      return null;
    }

    return PublicSchedules.toModel(
      publicSchedule, publicSchedule.schedule,
    );
  },

  async save(
    publicSchedule: PublicSchedule,
  ): Promise<PublicSchedule> {
    const exists = await prisma.publicSchedule.findUnique({
      where: {
        scheduleId_revision: {
          scheduleId: publicSchedule.scheduleId,
          revision: publicSchedule.meta.revision,
        },
      },
    });

    if (exists) {
      throw new Error('Same revision public schedule exists.');
    }

    const saved = await prisma.publicSchedule.create({
      data: {
        scheduleId: publicSchedule.scheduleId,
        data: publicSchedule.rows,
        revision: publicSchedule.meta.revision,
        publishedAt: UtcDateTime.toISOString(publicSchedule.meta.publishedAt),
      },
      include: {
        schedule: true,
      },
    });

    return PublicSchedules.toModel(saved, saved.schedule);
  },
};
