import { PaginationRequest, Run, SpeedrunEvent } from '@marathon-scheduler/models';
import { err, ok, ResultAsync } from 'neverthrow';
import EventRepository from '../repositories/events';
import { RunRepository } from '../repositories/runs';
import { decodeTime, ulid } from 'ulid';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

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

export const deleteRun = (
  runId: Run['id'],
  slug: SpeedrunEvent['slug'],
): ResultAsync<true, Extract<RunErrors, 'assigned_event_not_found' | 'run_not_found'>> => {
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
        .map(run => RunRepository.delete(run.id));
    })
    .map(() => true);
};
