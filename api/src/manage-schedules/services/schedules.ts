import { Duration, Run, Schedule, ScheduleRow, SpeedrunEvent } from '@marathon-scheduler/models';
import { err, ok, ResultAsync } from 'neverthrow';
import { ScheduleRepository, ScheduleRowRepository } from '../repositories/schedule';
import { RunRepository } from '../repositories/run';
import { ulid } from '../../common/infra/random';

export const initDefaultSchedule = (
  event: SpeedrunEvent,
): ResultAsync<
  Schedule, never> => {
  return ResultAsync.fromSafePromise(
    ScheduleRepository.save({
      id: ulid(),
      slug: 'main',
      description: 'This is main category created as default,',
      beginAt: event.beginAt,
      eventId: event.id,
    }),
  );
};

type GetScheduleError = 'schedule_not_found';

export const getSchedule = (
  event: SpeedrunEvent['slug'],
  slug: Schedule['slug'],
): ResultAsync<Schedule, GetScheduleError> => {
  return ResultAsync.fromSafePromise(
    ScheduleRepository.find(event, slug),
  ).andThen((schedule) => {
    if (!schedule) {
      return err('schedule_not_found' as const);
    }
    return ok(schedule);
  });
};

type PartialRow = {
  run: Run['id'];
  setup: Duration;
};

type AddRunToScheduleError = 'run_not_found';

export const addFirstRun = (
  schedule: Schedule['id'],
  { run, setup }: PartialRow,
): ResultAsync<ScheduleRow, AddRunToScheduleError> => {
  return ResultAsync.fromSafePromise(RunRepository.exists(run))
    .andThen((exists) => {
      return exists ? ok(undefined) : err('run_not_found' as const);
    })
    .andThen(() => {
      return ResultAsync.combine([
        ResultAsync.fromSafePromise(ScheduleRowRepository.findBeginning(schedule)),
        ResultAsync.fromSafePromise(ScheduleRowRepository.findForRun(schedule, run)),
      ]);
    })
    .map(([first, exists]): ScheduleRow => {
      return {
        id: exists?.id ?? ulid(),
        scheduleId: schedule,
        runId: run,
        isFirst: true,
        next: !first
          ? null
          : first.id === exists?.id ? exists.next : first.id,
        setupTime: setup,
      };
    })
    .andThen((row) => {
      return ResultAsync.fromSafePromise(
        ScheduleRowRepository.save(row),
      );
    });
};

type AssignRunErrors = 'run_not_found' | 'prev_row_not_found' | 'run_conflicted';

export const assignRunAfter = (
  schedule: Schedule['id'],
  { run, setup }: PartialRow,
  prev: ScheduleRow['id'],
): ResultAsync<ScheduleRow, AssignRunErrors> => {
  return ResultAsync.fromSafePromise(RunRepository.exists(run))
    .andThen((exists) => {
      return exists ? ok(undefined) : err('run_not_found' as const);
    })
    .andThen(() => {
      return ResultAsync.combine([
        ResultAsync.fromSafePromise(ScheduleRowRepository.findForRun(schedule, run)),
        ResultAsync.fromSafePromise(ScheduleRowRepository.find(schedule, prev)),
      ]);
    })
    .andThen(([exists, prev]) => {
      if (!prev) {
        return err('prev_row_not_found' as const);
      }
      if (prev.id === exists?.id) {
        return err('run_conflicted' as const);
      }

      return ResultAsync.fromSafePromise(ScheduleRowRepository.save({
        id: exists?.id ?? ulid(),
        isFirst: false,
        setupTime: setup,
        next: prev.next,
        runId: run,
        scheduleId: schedule,
      }));
    });
};

export const removeRow = (
  row: ScheduleRow['id'],
): ResultAsync<true, 'row_not_found'> => {
  return ResultAsync.fromSafePromise(
    ScheduleRowRepository.delete(row),
  ).andThen(result => result ? ok(true as const) : err('row_not_found' as const));
};

type ListAllRowsError = 'beginning_row_not_found';

export const listAllRow = (
  schedule: Schedule['id'],
): ResultAsync<ScheduleRow[], ListAllRowsError> => {
  return ResultAsync.fromSafePromise(
    ScheduleRowRepository.list(schedule),
  ).andThen((rows) => {
    const first = rows.find(row => row.isFirst);

    if (!first) {
      return ok([]);
    }

    const withNext = (current: ScheduleRow): ScheduleRow[] => {
      const next = rows.find(r => r.id === current.next);
      return next ? [current, ...withNext(next)] : [current];
    };

    return ok(withNext(first));
  });
};
