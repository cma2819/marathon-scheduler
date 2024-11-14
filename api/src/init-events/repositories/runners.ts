import { PaginationRequest, Runner, SpeedrunEvent, UtcDateTime } from '@marathon-scheduler/models';
import prisma from '../../common/infra/prisma';
import { Availability, Connection, Runner as PrismaRunner, User } from '@prisma/client';
import { ulid } from '../../common/infra/random';

const Connections = {
  toRows: (models: Runner['connections']): Omit<Connection, 'userId'>[] => {
    return [
      { service: 'twitch', username: models.twitch },
      { service: 'twitter', username: models.twitter },
      { service: 'youtube', username: models.youtube },
    ].filter((conn): conn is { service: string; username: string } => conn.username !== undefined);
  },
  toModels: (rows: Connection[]): Omit<Runner['connections'], 'discord'> => {
    const [
      rTwitch,
      rTwitter,
      rYoutube,
    ] = [
      rows.find(r => r.service === 'twitch'),
      rows.find(r => r.service === 'twitter'),
      rows.find(r => r.service === 'youtube'),
    ];
    return {
      twitch: rTwitch && rTwitch.username,
      twitter: rTwitter && rTwitter.username,
      youtube: rYoutube && rYoutube.username,
    };
  },
};

export type RunnerQueries = {
  id?: Runner['id'][];
};

const Runners = {
  toModels: (
    runner: PrismaRunner, user: User, conns: Connection[], availabilities: Availability[],
  ): Runner => ({
    id: user.id,
    eventId: runner.eventId,
    name: user.name,
    connections: {
      discord: user.discord,
      ...Connections.toModels(conns),
    },
    availabilities: availabilities.map(ava => ({
      sort: ava.sort,
      start: UtcDateTime.fromDate(ava.beginAt),
      end: UtcDateTime.fromDate(ava.endAt),
    })),
  }),
};

const RunnerRepository = {

  async findById(
    id: Runner['id'],
    slug: SpeedrunEvent['slug'],
  ): Promise<Runner | null> {
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: { connections: true },
    });
    if (!user) {
      return null;
    }

    const runner = await prisma.runner.findUnique({
      where: {
        userId_eventId: {
          userId: user.id,
          eventId: event.id,
        },
      },
      include: { availabilities: true },
    });

    return runner ? Runners.toModels(runner, user, user.connections, runner.availabilities) : null;
  },

  async findByDiscord(
    discord: Runner['connections']['discord'], slug: SpeedrunEvent['slug'],
  ): Promise<Runner | null> {
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { discord },
      include: { connections: true },
    });
    if (!user) {
      return null;
    }

    const runner = await prisma.runner.findUnique({
      where: {
        userId_eventId: {
          userId: user.id,
          eventId: event.id,
        },
      },
      include: { availabilities: true },
    });

    return runner ? Runners.toModels(runner, user, user.connections, runner.availabilities) : null;
  },

  async list(
    event: SpeedrunEvent['id'],
    queries: RunnerQueries = {},
    page?: PaginationRequest<Runner['id']>): Promise<Runner[]> {
    const cursor = !page
      ? null
      : 'before' in page
        ? page.before
        : page.after;

    const users = await prisma.user.findMany({
      cursor: cursor
        ? { id: cursor }
        : undefined,
      skip: cursor ? 1 : 0,
      take: 100,
      where: {
        id: { in: queries.id },
        runners: {
          some: {
            eventId: event,
          },
        },
      },
      include: {
        runners: {
          include: {
            availabilities: true,
          },
        },
        connections: true,
      },
      orderBy: {
        id: page && 'before' in page ? 'desc' : 'asc',
      },
    });

    return users.map((user) => {
      const runner = user.runners.find(r => r.eventId === event)!;
      return Runners.toModels(
        runner,
        user,
        user.connections,
        runner.availabilities,
      );
    });
  },

  async save(runner: Runner): Promise<Runner> {
    const connections = Connections.toRows(runner.connections);

    const [saved, user] = await prisma.$transaction(async (tx) => {
      await tx.connection.deleteMany({
        where: {
          user: {
            discord: runner.connections.discord,
          },
        },
      });

      const user = await tx.user.upsert({
        where: {
          discord: runner.connections.discord,
        },
        create: {
          id: runner.id,
          name: runner.name,
          discord: runner.connections.discord,
          connections: {
            create: connections,
          },
        },
        update: {
          name: runner.name,
          connections: {
            create: connections,
          },
        },
        include: {
          connections: true,
        },
      });

      const exists = await tx.runner.findUnique(
        { where: { userId_eventId: { userId: user.id, eventId: runner.eventId } } },
      );

      if (exists) {
        await tx.availability.deleteMany({
          where: { runnerId: exists.id },
        });

        const saved = await tx.runner.update({
          where: {
            userId_eventId: { userId: user.id, eventId: runner.eventId },
          },
          data: {
            availabilities: {
              create: runner.availabilities.map(ava => ({
                sort: ava.sort,
                beginAt: UtcDateTime.toDate(ava.start),
                endAt: UtcDateTime.toDate(ava.end),
              })),
            },
          },
          include: {
            availabilities: true,
          },
        });

        return [saved, user];
      }

      const saved = await tx.runner.create({
        data: {
          id: ulid(),
          userId: user.id,
          eventId: runner.eventId,
          availabilities: {
            create: runner.availabilities.map(ava => ({
              sort: ava.sort,
              beginAt: UtcDateTime.toDate(ava.start),
              endAt: UtcDateTime.toDate(ava.end),
            })),
          },
        },
        include: {
          availabilities: true,
        },
      });

      return [saved, user];
    });

    return Runners.toModels(saved, user, user.connections, saved.availabilities);
  },

  async delete(
    id: Runner['id'],
    slug: SpeedrunEvent['id'],
  ) {
    const event = await prisma.event.findUnique({ where: { slug: slug } });
    if (!event) {
      return;
    }

    const runner = await prisma.runner.findUnique({
      where: {
        userId_eventId: {
          userId: id,
          eventId: event.id,
        },
      },
      include: {
        availabilities: true,
      },
    });
    if (!runner) {
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.availability.deleteMany({ where: { runnerId: runner.id } });
      await tx.runParticipant.deleteMany({ where: { runnerId: runner.id } });
      await tx.runner.delete({ where: { id: runner.id } });
    });
  },
};

export default RunnerRepository;
