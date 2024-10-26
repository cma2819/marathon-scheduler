import { PaginationRequest, SpeedrunEvent } from '@marathon-scheduler/models';
import prisma from '../../common/infra/prisma';

const EventRepository = {
  async save(model: SpeedrunEvent): Promise<SpeedrunEvent> {
    return await prisma.event.upsert({
      where: { slug: model.slug },
      create: { id: model.id, slug: model.slug, name: model.name },
      update: { name: model.name },
      select: { id: true, slug: true, name: true },
    });
  },

  async find(slug: string): Promise<SpeedrunEvent | null> {
    return await prisma.event.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true },
    });
  },

  async list(page?: PaginationRequest<SpeedrunEvent['slug']>): Promise<SpeedrunEvent[]> {
    if (page && 'before' in page) {
      return prisma.event.findMany(
        { take: 10, skip: 1, cursor: { id: page.before }, orderBy: { id: 'desc' } },
      );
    }
    if (page && 'after' in page) {
      return prisma.event.findMany(
        { take: 10, skip: 1, cursor: { id: page.after }, orderBy: { id: 'asc' } },
      );
    }
    return prisma.event.findMany({ take: 10, orderBy: { id: 'asc' } });
  },

  async delete(slug: string): Promise<boolean> {
    const event = await prisma.event.findUnique({ where: { slug } });

    if (!event) {
      return false;
    }

    await prisma.$transaction(async (tx) => {
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
