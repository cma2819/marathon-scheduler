import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { generalZodHook } from '../../common/validators/hooks';
import { ErrorResponse, PaginationResponse } from '@marathon-scheduler/models';
import {
  createEvent,
  deleteEvent,
  editEvent,
  EventErrors,
  getEvent,
  listEvents,
} from '../services/events';
import { EventResponse } from '../contracts/responses';
import { jwtGuard } from '../../common/infra/middlewares';

const app = new Hono().basePath('/events');

const schemas = {
  event: {
    name: z.string({ message: 'Event name is required.' })
      .min(3, { message: 'Event name must be 3 characters or more.' }),
    slug: z.string({ message: 'Event slug is required.' })
      .min(3, { message: 'Event slug must have length between 3 and 255.' })
      .max(255, { message: 'Event slug must have length between 3 and 255.' }),
  },
} as const;

app.get(
  '/',
  zValidator(
    'query',
    z.union([
      z.object({ before: z.string() }),
      z.object({ after: z.string() }),
      z.object({}),
    ]),
  ),
  async (c) => {
    const queries = c.req.valid('query');

    const events = listEvents(('before' in queries || 'after' in queries) ? queries : undefined);

    return events.match(events => c.json<PaginationResponse<EventResponse>>({
      data: events.map(event => ({
        slug: event.slug,
        name: event.name,
      })),
    }), (e) => {
      throw e;
    });
  },
);

app.post(
  '/',
  jwtGuard,
  zValidator(
    'json',
    z.object({
      name: schemas.event.name,
      slug: schemas.event.slug,
    }),
    generalZodHook(),
  ),
  async (c) => {
    const body = c.req.valid('json');
    return createEvent(body).match(event => c.json<EventResponse>({
      name: event.name,
      slug: event.slug,
    }), (err) => {
      if (err === EventErrors.EventAlreadyExists) {
        return c.json<ErrorResponse>({
          code: err,
          message: `Event with slug ${body.slug} is already exists.`,
        }, 409);
      }
      throw err;
    });
  },
);

app.get(
  '/:slug',
  async (c) => {
    const slug = c.req.param('slug');
    return getEvent(slug).match(event => c.json<EventResponse>({
      name: event.name,
      slug: event.slug,
    }), (err) => {
      if (err === EventErrors.EventNotFound) {
        return c.notFound();
      }
      throw err;
    });
  },
);

app.patch(
  '/:slug',
  jwtGuard,
  zValidator(
    'json',
    z.object(schemas.event).omit({
      slug: true,
    }),
    generalZodHook(),
  ),
  async (c) => {
    const slug = c.req.param('slug');
    const body = c.req.valid('json');
    return editEvent(slug, {
      name: body.name,
    }).match(event => c.json<EventResponse>({
      name: event.name,
      slug: event.slug,
    }), (err) => {
      if (err === EventErrors.EventNotFound) {
        return c.json<ErrorResponse>({
          code: err,
          message: 'Event is not found',
        }, 404);
      }
      throw err;
    });
  },
);

app.delete(
  '/:slug',
  jwtGuard,
  async (c) => {
    const slug = c.req.param('slug');
    return deleteEvent(slug).match(() => c.body(null, 204), (err) => {
      if (err === EventErrors.EventNotFound) {
        return c.notFound();
      }
      if (err === 'run_assigned_to_event') {
        return c.json<ErrorResponse>({
          code: err,
          message: 'Run is assigned to this event.',
        }, 400);
      }
      throw err;
    });
  },
);

export default app;
