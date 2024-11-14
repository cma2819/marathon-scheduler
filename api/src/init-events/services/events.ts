import { PaginationRequest, SpeedrunEvent } from '@marathon-scheduler/models';
import { err, ok, ResultAsync } from 'neverthrow';
import EventRepository from '../repositories/events';
import { decodeTime } from 'ulid';
import { RunRepository } from '../repositories/runs';
import { initDefaultSchedule } from '../../manage-schedules/services/schedules';
import { ulid } from '../../common/infra/random';

export const EventErrors = {
  EventAlreadyExists: 'event_already_exists',
  EventNotFound: 'event_not_found',
  RunAssignedToEvent: 'run_assigned_to_event',
} as const;
type EventErrors = typeof EventErrors[keyof typeof EventErrors];

export const listEvents = (
  page?: PaginationRequest<SpeedrunEvent['id']>,
): ResultAsync<SpeedrunEvent[], never> => {
  return ResultAsync.fromSafePromise(EventRepository.list(page))
    .map(events => events.toSorted((a, b) => decodeTime(a.id) - decodeTime(b.id)));
};

export const createEvent = (
  event: Omit<SpeedrunEvent, 'id'>,
): ResultAsync<SpeedrunEvent, Extract<EventErrors, 'event_already_exists'>> => {
  return ResultAsync.fromSafePromise(EventRepository.find(event.slug))
    .andThen((exists) => {
      if (exists) {
        return err(EventErrors.EventAlreadyExists);
      }

      return ResultAsync.fromSafePromise(EventRepository.save({
        id: ulid(),
        name: event.name,
        slug: event.slug,
        beginAt: event.beginAt,
      })).andThen((event) => {
        return initDefaultSchedule(event).map(() => event);
      });
    });
};

export const getEvent = (
  slug: string,
): ResultAsync<SpeedrunEvent, Extract<EventErrors, 'event_not_found'>> => {
  return ResultAsync.fromSafePromise(EventRepository.find(slug))
    .andThen((event) => {
      if (!event) {
        return err(EventErrors.EventNotFound);
      }

      return ok(event);
    });
};

export const deleteEvent = (
  slug: string,
): ResultAsync<void, Extract<EventErrors, 'event_not_found' | 'run_assigned_to_event'>> => {
  return ResultAsync.fromSafePromise(EventRepository.find(slug))
    .andThen((event) => {
      if (!event) {
        return err(EventErrors.EventNotFound);
      }
      return ok(event);
    })
    .andThen((event) => {
      return ResultAsync.fromSafePromise(RunRepository.search({ eventId: event.id }))
        .andThen((runs) => {
          if (runs.length > 0) {
            return err(EventErrors.RunAssignedToEvent);
          }
          return ok(event);
        });
    })
    .andThen((event) => {
      return ResultAsync.fromSafePromise(EventRepository.delete(event.slug))
        .andThen((succeeded) => {
          return succeeded ? ok(undefined) : err(EventErrors.EventNotFound);
        });
    });
};

export const editEvent = (
  slug: string,
  event: Omit<SpeedrunEvent, 'id' | 'slug'>,
): ResultAsync<SpeedrunEvent, Extract<EventErrors, 'event_not_found'>> => {
  return ResultAsync.fromSafePromise(EventRepository.find(slug))
    .andThen((exists) => {
      if (!exists) {
        return err(EventErrors.EventNotFound);
      }
      return ok(exists);
    })
    .map(exists => EventRepository.save(SpeedrunEvent.edit(exists, event)));
};
