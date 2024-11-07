import {
  Duration,
  PublicSchedule,
  PublicScheduleRow,
  Schedule,
  SpeedrunEvent,
  UtcDateTime,
} from '@marathon-scheduler/models';
import { err, ok, okAsync, Result, ResultAsync } from 'neverthrow';
import { ScheduleRepository } from '../repositories/schedule';
import { PublicScheduleRepository } from '../repositories/public';
import { listAllRow } from './schedules';
import { getRun } from '../../init-events/services/runs';
import { listParticipantRunners } from '../../init-events/services/runners';

type GetPublicScheduleError =
  | 'schedule_not_found'
  | 'schedule_not_published'
  | 'revision_not_found';

export const getPublicSchedule = (
  event: SpeedrunEvent['slug'],
  slug: Schedule['slug'],
  revision?: number,
): ResultAsync<PublicSchedule, GetPublicScheduleError> => {
  return ResultAsync.fromSafePromise(
    ScheduleRepository.find(event, slug),
  ).andThen((schedule) => {
    if (!schedule) {
      return err('schedule_not_found' as const);
    }
    return ok(schedule);
  })
    .andThen((schedule) => {
      return ResultAsync.fromSafePromise(
        PublicScheduleRepository.find(
          schedule.id,
          revision,
        ),
      ).andThen((publicSchedule) => {
        if (!publicSchedule) {
          return err(revision !== undefined ? 'schedule_not_published' : 'revision_not_found');
        }
        return ok(publicSchedule);
      });
    });
};

export const publishSchedule = (
  event: string,
  slug: string,
  now: UtcDateTime,
) => {
  return ResultAsync.fromSafePromise(ScheduleRepository.find(event, slug))
    .andThen((schedule) => {
      if (!schedule) {
        return err('schedule_not_found');
      }
      return ok(schedule);
    })
    .andThen(schedule => ResultAsync.combine([
      okAsync(schedule),
      ResultAsync.fromSafePromise(PublicScheduleRepository.find(schedule.id)),
      listAllRow(schedule.id)
        .andThen(rows => ResultAsync.combine(rows.map(row => ResultAsync.combine([
          okAsync(row),
          getRun(event, row.runId),
        ] as const,
        )))),
    ]))
    .andThen(([schedule, latest, rows]) => {
      return ResultAsync.combine(rows.map(([row, run]) => {
        return listParticipantRunners(run.id).map((runners): PublicScheduleRow => ({
          id: row.id,
          run: {
            id: run.id,
            game: run.game,
            category: run.category,
            console: run.console,
            estimate: run.estimate.formatted,
            type: run.type,
            runners: runners.map(runner => ({
              id: runner.id,
              name: runner.name,
              discord: runner.connections.discord,
              twitch: runner.connections.twitch,
              twitter: runner.connections.twitter,
              youtube: runner.connections.youtube,
            })),
          },
          setup: row.setupTime.formatted,
        }));
      }))
        .map((rows): PublicSchedule => ({
          meta: {
            publishedAt: now,
            revision: (latest?.meta.revision ?? 0) + 1,
          },
          rows,
          scheduleId: schedule.id,
        }));
    })
    .andThen((publicSchedule) => {
      return ResultAsync.fromSafePromise(PublicScheduleRepository.save(publicSchedule));
    });
};

type HoraroImport = {
  schedule: {
    columns: string[];
    items: {
      length: string;
      data: (string | null)[];
    }[];
  };
};

const toIsoDuration = (time: string) => {
  const duration = Duration.parse(time);
  if (!duration) {
    return '';
  }

  const hour = Math.floor(duration.seconds / 3600);
  const minute = Math.floor(duration.seconds / 60 % 60);
  const seconds = Math.floor(duration.seconds % 60);

  return `PT${hour ? `${hour}H` : ''}${minute ? `${minute}M` : ''}${seconds ? `${seconds}S` : ''}`;
};

export const convertToHoraro = (schedule: PublicSchedule): Result<HoraroImport, never> => {
  const columns = ['setup', 'ゲーム', 'カテゴリ', '種類', '機種', '走者'];
  const rows = schedule.rows.map(row => ({
    length: toIsoDuration(row.run.estimate),
    data: [
      row.setup,
      row.run.game,
      row.run.category,
      row.run.type,
      row.run.console,
      row.run.runners.map(r => r.name).join(', '),
    ] }));

  return ok({
    schedule: {
      columns,
      items: rows,
    },
  });
};
