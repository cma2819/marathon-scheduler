import { Hono } from 'hono';
import { z } from 'zod';
import {
  joinRunnerToEvent,
  leaveRunnerFromEvent,
  listRunnersOnEvent,
  modifyRunner,
  RunnerErrors,
} from '../services/runners';
import { zValidator } from '@hono/zod-validator';
import { Availability, PaginationResponse, UtcDateTime } from '@marathon-scheduler/models';
import { ErrorResponse, RunnerResponse } from '@marathon-scheduler/models';
import { generalZodHook } from '../../common/validators/hooks';
import { presentRunner } from '../presenters/runners';
import { jwtGuard } from '../../common/infra/middlewares';

const app = new Hono().basePath('/events/:slug/runners');

const schemas = {
  runner: {
    name: z.string({ message: 'Runner name is required.' })
      .min(3, { message: 'Runner name must have length between 3 and 255.' })
      .max(255, { message: 'Runner name must have length between 3 and 255.' }),
    availabilities: z.object({
      unit: z.number().min(1),
      slots: z.array(
        z.object({
          datetime: z.string().datetime({ offset: true }),
        }),
      ),
    }),
    discord: z.string(),
    twitch: z.string().optional(),
    twitter: z.string().optional(),
    youtube: z.string().optional(),
  },
};

app.get('/',
  async (c) => {
    const slug = c.req.param('slug');

    const runnersResult = await listRunnersOnEvent(slug);
    if (runnersResult.isErr()) {
      return c.json<ErrorResponse>({
        code: runnersResult.error,
        message: 'Event is not found',
      });
    }

    return c.json<PaginationResponse<RunnerResponse>>({
      data: runnersResult.value.map(runner => presentRunner(runner)),
    });
  },
);

app.post('/',
  jwtGuard,
  zValidator('json',
    z.object(schemas.runner),
    generalZodHook(),
  ),
  async (c) => {
    const slug = c.req.param('slug');
    const body = c.req.valid('json');

    return joinRunnerToEvent({
      name: body.name,
      availabilities: Availability.fromTimeSlots(
        body.availabilities.slots.map(
          ({ datetime }) => UtcDateTime.parse(datetime),
        ), body.availabilities.unit),
      connections: {
        discord: body.discord,
        twitch: body.twitch,
        twitter: body.twitter,
        youtube: body.youtube,
      },
    }, slug).match(runner => c.json<RunnerResponse>(presentRunner(runner)), (err) => {
      if (err === RunnerErrors.JoinEventNotExists) {
        return c.json<ErrorResponse>({
          code: err,
          message: 'Join event is not found',
        }, 404);
      }
      if (err === RunnerErrors.DiscordUsernameConflicted) {
        return c.json<ErrorResponse>({
          code: err,
          message: 'Runner\'s discord username conflicted',
        }, 409);
      }
    });
  },
);

app.patch(
  '/:id',
  jwtGuard,
  zValidator(
    'json',
    z.object(schemas.runner).omit({
      discord: true,
    }).merge(
      z.object({
        availabilities: z.array(
          z.object({
            start: z.string().datetime({ offset: true }),
            end: z.string().datetime({ offset: true }),
          }),
        ),
      }),
    ),
    generalZodHook(),
  ),
  async (c) => {
    const { slug, id } = c.req.param();
    const body = c.req.valid('json');

    return modifyRunner(id, slug, {
      name: body.name,
      connections: {
        twitch: body.twitch,
        twitter: body.twitter,
        youtube: body.youtube,
      },
      availabilities: Availability.fromPartials(body.availabilities.map((ava) => {
        return {
          start: UtcDateTime.parse(ava.start),
          end: UtcDateTime.parse(ava.end),
        };
      })),
    }).match(runner => c.json<RunnerResponse>(presentRunner(runner)), (err) => {
      if (err === 'runner_not_found') {
        return c.json<ErrorResponse>({
          code: err,
          message: 'Runner is not found',
        }, 404);
      }
      throw err;
    });
  },
);

app.delete(
  '/:id',
  jwtGuard,
  async (c) => {
    const { slug, id } = c.req.param();

    return leaveRunnerFromEvent(id, slug)
      .match(() => {
        return c.body(null, 204);
      }, (err) => {
        if (err === 'runner_not_found') {
          return c.json<ErrorResponse>({
            code: err,
            message: 'Runner is not found',
          }, 404);
        }
        throw err;
      });
  },
);

export default app;
