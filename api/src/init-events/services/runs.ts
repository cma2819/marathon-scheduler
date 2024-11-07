import { PaginationRequest, Run, SpeedrunEvent } from '@marathon-scheduler/models';
import { err, ok, ResultAsync } from 'neverthrow';
import EventRepository from '../repositories/events';
import { RunRepository } from '../repositories/runs';
import { decodeTime, ulid } from 'ulid';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ScheduleRepository } from '../repositories/schedules';

export const RunErrors = {
  EventNotFound: 'assigned_event_not_found',
  RunnerNotFound: 'runner_user_not_found',
  RunNotFound: 'run_not_found',
} as const;
type RunErrors = typeof RunErrors[keyof typeof RunErrors];

export const listRunsOnEvent = (
  slug: string,
  page?: PaginationRequest<Run['id']>,
): ResultAsync<Run[], Extract<RunErrors, 'assigned_event_not_found'>> => {
  return ResultAsync.fromSafePromise(EventRepository.find(slug))
    .andThen((event) => {
      if (!event) {
        return err(RunErrors.EventNotFound);
      }
      return ok(event);
    })
    .andThen(event => ResultAsync.fromSafePromise(RunRepository.search({
      eventId: event.id,
    }, page)))
    .map(runs => runs.toSorted((a, b) => decodeTime(a.id) - decodeTime(b.id)));
};

export const getRun = (
  slug: string,
  id: Run['id'],
): ResultAsync<Run, 'run_not_found' | 'assigned_event_not_found'> => {
  return ResultAsync.fromSafePromise(EventRepository.find(slug))
    .andThen((event) => {
      if (!event) {
        return err(RunErrors.EventNotFound);
      }
      return ok(event);
    })
    .andThen(() => {
      return ResultAsync.fromSafePromise(RunRepository.find(id))
        .andThen((run) => {
          if (!run) {
            return err('run_not_found');
          }
          return ok(run);
        });
    });
};

export const addRunToEvent = (
  run: Omit<Run, 'id' | 'eventId'>, slug: string,
): ResultAsync<Run, Extract<RunErrors, 'assigned_event_not_found' | 'runner_user_not_found'>> => {
  return ResultAsync.fromSafePromise(EventRepository.find(slug))
    .andThen((event) => {
      if (!event) {
        return err(RunErrors.EventNotFound);
      }
      return ResultAsync.fromPromise(RunRepository.save({
        ...run,
        id: ulid(),
        eventId: event.id,
      }), (err) => {
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
          return RunErrors.RunnerNotFound;
        }
        throw err;
      });
    });
};

export const modifyRun = (
  run: Omit<Run, 'eventId'>, slug: string,
): ResultAsync<
  Run,
  Extract<RunErrors, 'assigned_event_not_found' | 'runner_user_not_found' | 'run_not_found'>
> => {
  return ResultAsync.fromSafePromise(EventRepository.find(slug))
    .andThen((event) => {
      if (!event) {
        return err(RunErrors.EventNotFound);
      }
      return ok(event);
    })
    .andThen((event) => {
      return ResultAsync.fromSafePromise(RunRepository.find(run.id))
        .andThen((exists) => {
          if (!exists) {
            return err(RunErrors.RunNotFound);
          }
          if (exists.eventId !== event.id) {
            return err(RunErrors.RunNotFound);
          }
          return ok(exists);
        })
        .map(exists => RunRepository.save(Run.edit(exists, run)));
    });
};

type DeleteRunError =
| 'assigned_event_not_found' | 'run_not_found' | 'some_schedule_assigned';

export const deleteRun = (
  runId: Run['id'],
  slug: SpeedrunEvent['slug'],
): ResultAsync<true, DeleteRunError> => {
  return ResultAsync.fromSafePromise(EventRepository.find(slug))
    .andThen((event) => {
      if (!event) {
        return err(RunErrors.EventNotFound);
      }
      return ok(event);
    })
    .andThen((event) => {
      return ResultAsync.fromSafePromise(RunRepository.find(runId))
        .andThen((exists) => {
          if (!exists) {
            return err(RunErrors.RunNotFound);
          }
          if (exists.eventId !== event.id) {
            return err(RunErrors.RunNotFound);
          }
          return ok(exists);
        })
        .andThen((run) => {
          return ResultAsync.fromSafePromise(
            ScheduleRepository.existsAssignedRow(run.id),
          ).andThen((exists) => {
            if (exists) {
              return err('some_schedule_assigned');
            }
            return ok(run);
          });
        })
        .map(run => RunRepository.delete(run.id));
    })
    .map(() => true);
};
