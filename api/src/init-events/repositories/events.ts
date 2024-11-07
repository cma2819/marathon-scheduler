import { PaginationRequest, SpeedrunEvent, UtcDateTime } from '@marathon-scheduler/models';
import prisma from '../../common/infra/prisma';
import { Event as PrismaEvent } from '@prisma/client';

const Events = {
  toModel: (row: PrismaEvent): SpeedrunEvent => {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      beginAt: UtcDateTime.fromDate(row.beginAt),
    };
  },
};

const EventRepository = {
  async save(model: SpeedrunEvent): Promise<SpeedrunEvent> {
    const saved = await prisma.event.upsert({
      where: { slug: model.slug },
      create: {
        id: model.id,
        slug: model.slug,
        name: model.name,
        beginAt: UtcDateTime.toDate(model.beginAt),
      },
      update: { name: model.name, beginAt: UtcDateTime.toDate(model.beginAt) },
    });

    return Events.toModel(saved);
  },

  async find(slug: string): Promise<SpeedrunEvent | null> {
    const row = await prisma.event.findUnique({
      where: { slug },
    });

    return row && Events.toModel(row);
  },

  async list(page?: PaginationRequest<SpeedrunEvent['slug']>): Promise<SpeedrunEvent[]> {
    if (page && 'before' in page) {
      const rows = await prisma.event.findMany(
        { take: 10, skip: 1, cursor: { slug: page.before }, orderBy: { id: 'desc' } },
      );
      return rows.map(Events.toModel);
    }
    if (page && 'after' in page) {
      const rows = await prisma.event.findMany(
        { take: 10, skip: 1, cursor: { slug: page.after }, orderBy: { id: 'asc' } },
      );
      return rows.map(Events.toModel);
    }
    const rows = await prisma.event.findMany({ take: 10, orderBy: { id: 'asc' } });
    return rows.map(Events.toModel);
  },

  async delete(slug: string): Promise<boolean> {
    const event = await prisma.event.findUnique({ where: { slug } });

    if (!event) {
      return false;
    }

    await prisma.$transaction(async (tx) => {
      await tx.publicSchedule.deleteMany({
        where: {
          schedule: {
            eventId: event.id,
          },
        },
      });
      await tx.scheduleRow.deleteMany({
        where: {
          schedule: {
            eventId: event.id,
          },
        },
      });
      await tx.scheduleBeginning.deleteMany({
        where: {
          schedule: {
            eventId: event.id,
          },
        },
      });
      await tx.schedule.deleteMany({
        where: {
          eventId: event.id,
        },
      });

      const runners = await tx.runner.findMany({
        where: {
          eventId: event.id,
        },
      });
      await tx.availability.deleteMany({
        where: {
          runnerId: {
            in: runners.map(runner => runner.id),
          },
        },
      });
      await tx.runner.deleteMany({
        where: {
          eventId: event.id,
        },
      });
      await tx.event.delete({ where: { slug } });
    });

    return true;
  },
};

export default EventRepository;
