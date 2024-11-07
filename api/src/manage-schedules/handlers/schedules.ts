import { Hono } from 'hono';
import { adminGuard, jwtGuard } from '../../common/infra/middlewares';
import { getSchedule } from '../services/schedules';
import {
  ErrorResponse,
  PublicScheduleResponse,
  ScheduleResponse,
  UtcDateTime,
} from '@marathon-scheduler/models';
import { okAsync, ResultAsync } from 'neverthrow';
import { convertToHoraro, getPublicSchedule, publishSchedule } from '../services/public';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono().basePath('/events/:event/schedules');

app.get(
  '/:slug',
  jwtGuard,
  adminGuard,
  async (c) => {
    const { event, slug } = c.req.param();
    return getSchedule(event, slug)
      .match((schedule) => {
        return c.json<ScheduleResponse>({
          slug: schedule.slug,
          description: schedule.description,
          beginAt: UtcDateTime.toISOString(schedule.beginAt),
        });
      }, (err) => {
        if (err === 'schedule_not_found') {
          return c.json<ErrorResponse>({
            code: err,
            message: 'Schedule is not found',
          }, 404);
        }
        throw err;
      });
  });

app.get(
  '/:slug/public',
  async (c) => {
    const { event, slug } = c.req.param();
    return ResultAsync.combine([
      getSchedule(event, slug),
      getPublicSchedule(event, slug),
    ]).match(([schedule, published]) => {
      return c.json<PublicScheduleResponse>({
        slug: schedule.slug,
        description: schedule.description,
        beginAt: UtcDateTime.toISOString(schedule.beginAt),
        rows: published.rows,
      });
    }, (err) => {
      switch (err) {
        case 'revision_not_found':
        case 'schedule_not_found':
        case 'schedule_not_published':
          return c.json<ErrorResponse>({
            code: err,
            message: 'Schedule is not found',
          });
        default:
          throw err;
      }
    });
  },
);

app.post(
  '/:slug/public',
  jwtGuard,
  adminGuard,
  zValidator(
    'query',
    z.object({
      type: z.enum(['horaro']).optional(),
    }),
  ),
  async (c) => {
    const { event, slug } = c.req.param();
    const { type } = c.req.valid('query');
    return getSchedule(event, slug)
      .andThen(schedule => ResultAsync.combine([
        okAsync(schedule),
        publishSchedule(event, slug, UtcDateTime.fromDate(new Date())),
      ]))
      .match(
        ([schedule, published]) => {
          if (type === 'horaro') {
            return c.json(convertToHoraro(published)._unsafeUnwrap());
          }

          return c.json<PublicScheduleResponse>({
            slug: schedule.slug,
            description: schedule.description,
            beginAt: UtcDateTime.toISOString(schedule.beginAt),
            rows: published.rows,
          });
        },
        err => c.json<ErrorResponse>({
          code: err,
          message: 'Error happened. Refs code',
        }, 400),
      );
  },
);

export default app;
