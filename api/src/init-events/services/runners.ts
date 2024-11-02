import { Connections, PaginationRequest, Run, Runner } from '@marathon-scheduler/models';
import { err, ok, ResultAsync } from 'neverthrow';
import EventRepository from '../repositories/events';
import RunnerRepository from '../repositories/runners';
import { decodeTime, ulid } from 'ulid';
import { RunRepository } from '../repositories/runs';

export const RunnerErrors = {
  JoinEventNotExists: 'join_event_not_exists',
  DiscordUsernameConflicted: 'discord_username_conflicted',
  ParticipateRunNotExists: 'participate_run_not_exists',
  ParticipateEventNotExists: 'participate_event_not_exists',
  RunnerNotFound: 'runner_not_found',
} as const;
type RunnerErrors = typeof RunnerErrors[keyof typeof RunnerErrors];

export const listParticipantRunners = (
  run: Run['id'],
): ResultAsync<Runner[], Extract<RunnerErrors, 'participate_run_not_exists'>> => {
  return ResultAsync.fromSafePromise(RunRepository.find(run))
    .andThen((run) => {
      if (!run) {
        return err(RunnerErrors.ParticipateRunNotExists);
      }
      return ok(run);
    })
    .andThen((run) => {
      return ResultAsync.fromSafePromise(
        RunnerRepository.list(run.eventId, { id: run.runners }),
      );
    });
};

export const listRunnersOnEvent = (
  slug: string,
  page?: PaginationRequest<Runner['id']>,
): ResultAsync<Runner[], Extract<RunnerErrors, 'participate_event_not_exists'>> => {
  return ResultAsync.fromSafePromise(EventRepository.find(slug))
    .andThen((event) => {
      if (!event) {
        return err(RunnerErrors.ParticipateEventNotExists);
      }
      return ok(event);
    })
    .andThen((event) => {
      return ResultAsync.fromSafePromise(RunnerRepository.list(event.id, {}, page))
        .map(runners => runners.toSorted((a, b) => decodeTime(a.id) - decodeTime(b.id)));
    });
};

export const joinRunnerToEvent = (
  runner: Omit<Runner, 'id' | 'eventId'>,
  slug: string,
): ResultAsync<
  Runner, Extract<RunnerErrors, 'join_event_not_exists' | 'discord_username_conflicted'>
> => {
  return ResultAsync.fromSafePromise(EventRepository.find(slug))
    .andThen((event) => {
      if (!event) {
        return err(RunnerErrors.JoinEventNotExists);
      }
      return ok(event);
    }).andThen((event) => {
      return ResultAsync.fromSafePromise(
        RunnerRepository.findByDiscord(runner.connections.discord, event.slug),
      ).andThen((exists) => {
        if (exists) {
          return err(RunnerErrors.DiscordUsernameConflicted);
        }
        return ok(event);
      });
    }).map(event => (RunnerRepository.save({
      id: ulid(),
      eventId: event.id,
      ...runner,
    })));
};

export const modifyRunner = (
  id: Runner['id'],
  slug: string,
  runner: Omit<Runner, 'id' | 'eventId' | 'connections'> & {
    connections: Omit<Connections, 'discord'>;
  },
): ResultAsync<Runner, Extract<RunnerErrors, 'runner_not_found'>> => {
  return ResultAsync.fromSafePromise(RunnerRepository.findById(id, slug))
    .andThen((runner) => {
      if (!runner) {
        return err(RunnerErrors.RunnerNotFound);
      }
      return ok(runner);
    })
    .andThen((exists) => {
      return ResultAsync.fromSafePromise(RunnerRepository.save(
        Runner.edit(exists, runner),
      ));
    });
};

export const leaveRunnerFromEvent = (
  id: Runner['id'],
  slug: string,
): ResultAsync<true, Extract<RunnerErrors, 'runner_not_found'>> => {
  return ResultAsync.fromSafePromise(RunnerRepository.findById(id, slug))
    .andThen((runner) => {
      if (!runner) {
        return err(RunnerErrors.RunnerNotFound);
      }
      return ok(runner);
    })
    .andThen((runner) => {
      return ResultAsync.fromSafePromise(RunnerRepository.delete(
        runner.id,
        slug,
      ));
    })
    .map(() => true);
};
