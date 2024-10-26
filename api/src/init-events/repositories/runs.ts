import { Duration, PaginationRequest, Run, RunType } from '@marathon-scheduler/models';
import prisma, { makeCursors } from '../../common/infra/prisma';
import { Run as DbRun, RunType as DbRunType, User } from '@prisma/client';

const RunTypeToDbEnum: { [k in RunType]: DbRunType } = {
  single: DbRunType.Single,
  coop: DbRunType.Coop,
  race: DbRunType.Race,
  relay: DbRunType.Relay,
} as const;

const DbEnumToRunType: { [k in DbRunType]: RunType } = {
  [DbRunType.Single]: 'single',
  [DbRunType.Coop]: 'coop',
  [DbRunType.Race]: 'race',
  [DbRunType.Relay]: 'relay',
} as const;

const Runs = {
  toModel: (run: DbRun, participants: User['id'][]): Run => ({
    id: run.id,
    game: run.game,
    category: run.category,
    console: run.console,
    estimate: Duration.fromSeconds(run.estimateInSec),
    type: DbEnumToRunType[run.type],
    eventId: run.eventId,
    runners: participants,
  }),
};

export type RunQueries = {
  eventId: Run['eventId'];
};

export const RunRepository = {
  async find(id: Run['id']): Promise<Run | null> {
    const row = await prisma.run.findUnique({
      where: { id },
      include: {
        runParticipant: {
          include: {
            runner: true,
          },
        },
      },
    });
    if (!row) {
      return null;
    }

    return Runs.toModel(row, row.runParticipant.map(p => p.runner.userId));
  },

  async search(query: RunQueries, page?: PaginationRequest<Run['id']>): Promise<Run[]> {
    const cursors = page ? makeCursors<'id', string>('id', page) : null;
    const rows = await prisma.run.findMany({
      where: {
        eventId: query.eventId,
      },
      include: {
        runParticipant: {
          include: {
            runner: true,
          },
        },
      },
      cursor: cursors?.cursor,
      orderBy: cursors?.orderBy,
    });

    return rows.map(r => Runs.toModel(r, r.runParticipant.map(p => p.runner.userId)));
  },

  async save(run: Run): Promise<Run> {
    const runnerPromises = run.runners.map(async (runner) => {
      return await prisma.user.findUniqueOrThrow({
        where: { id: runner },
      });
    });
    const runners = await Promise.all(runnerPromises);

    const saved = await prisma.$transaction(async (tx) => {
      await tx.runParticipant.deleteMany({ where: { runId: run.id } });
      return await tx.run.upsert({
        where: { id: run.id },
        include: { runParticipant: true },
        create: {
          id: run.id,
          eventId: run.eventId,
          game: run.game,
          category: run.category,
          console: run.console,
          estimateInSec: run.estimate.seconds,
          type: RunTypeToDbEnum[run.type],
          runParticipant: {
            create: runners.map(runner => ({
              runner: {
                connect: {
                  userId_eventId: {
                    userId: runner.id,
                    eventId: run.eventId,
                  },
                },
              },
            })),
          },
        },
        update: {
          game: run.game,
          category: run.category,
          console: run.console,
          estimateInSec: run.estimate.seconds,
          type: RunTypeToDbEnum[run.type],
          runParticipant: {
            create: runners.map(runner => ({
              runner: {
                connect: {
                  userId_eventId: {
                    userId: runner.id,
                    eventId: run.eventId,
                  },
                },
              },
            })),
          },
        },
      });
    });

    return {
      id: saved.id,
      game: saved.game,
      category: saved.category,
      console: saved.console,
      estimate: Duration.fromSeconds(saved.estimateInSec),
      type: DbEnumToRunType[saved.type],
      eventId: saved.eventId,
      runners: saved.runParticipant.map(({ runnerId }) => runnerId),
    };
  },

  async delete(id: Run['id']) {
    return await prisma.$transaction(async (tx) => {
      await tx.runParticipant.deleteMany({
        where: { runId: id },
      });
      await tx.run.delete({ where: { id: id } });
    });
  },
};
