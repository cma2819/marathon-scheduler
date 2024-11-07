import { Hono } from 'hono';
import { z } from 'zod';
import { adminGuard, jwtGuard } from '../../common/infra/middlewares';
import { zValidator } from '@hono/zod-validator';
import { generalZodHook } from '../../common/validators/hooks';
import {
  addFirstRun,
  assignRunAfter,
  getSchedule,
  listAllRow,
  removeRow,
} from '../services/schedules';
import { Duration, ErrorResponse, ScheduleRowResponse } from '@marathon-scheduler/models';

const app = new Hono().basePath('/events/:event/schedules/:slug/rows');

const schemas = {
  row: z.object({
    run: z.object({
      id: z.string(),
    }),
    setup: z.string().time(),
  }),
};

app.get(
  '/',
  jwtGuard,
  adminGuard,
  async (c) => {
    const { event, slug } = c.req.param();

    return getSchedule(event, slug)
      .andThen(schedule => listAllRow(schedule.id))
      .match(rows => c.json<ScheduleRowResponse[]>(
        rows.map(r => ({
          id: r.id,
          run: {
            id: r.runId,
          },
          setup: r.setupTime.formatted,
        })),
      ), (err) => {
        switch (err) {
          case 'schedule_not_found':
            return c.json<ErrorResponse>({
              code: err,
              message: 'Schedule is not found',
            }, 404);
          case 'beginning_row_not_found':
          default:
            throw err;
        }
      });
  },
);

app.post(
  '/first',
  jwtGuard,
  adminGuard,
  zValidator(
    'json',
    schemas.row,
    generalZodHook(),
  ),
  async (c) => {
    const { event, slug } = c.req.param();
    const body = c.req.valid('json');

    return getSchedule(event, slug)
      .andThen(schedule => addFirstRun(
        schedule.id, { run: body.run.id, setup: Duration.parse(body.setup)! }))
      .match(row => c.json<ScheduleRowResponse>({
        id: row.id,
        run: {
          id: row.runId,
        },
        setup: row.setupTime.formatted,
      }), (err) => {
        switch (err) {
          case 'run_not_found':
          case 'schedule_not_found':
            return c.json<ErrorResponse>({
              code: err,
              message: 'Relationship is not found',
            }, 404);
          default:
            throw err;
        }
      });
  },
);

app.put(
  '/:row/next',
  jwtGuard,
  adminGuard,
  zValidator(
    'json',
    schemas.row,
    generalZodHook(),
  ),
  async (c) => {
    const { event, slug, row } = c.req.param();
    const body = c.req.valid('json');

    return getSchedule(event, slug)
      .andThen(schedule => assignRunAfter(schedule.id, {
        run: body.run.id,
        setup: Duration.parse(body.setup)!,
      }, row))
      .match(result => c.json<ScheduleRowResponse>({
        id: result.id,
        run: {
          id: result.runId,
        },
        setup: result.setupTime.formatted,
      }), (err) => {
        switch (err) {
          case 'run_not_found':
          case 'schedule_not_found':
          case 'prev_row_not_found':
            return c.json<ErrorResponse>({
              code: err,
              message: 'Relationship is not found',
            }, 404);
          default:
            throw err;
        }
      });
  },
);

app.delete(
  '/:row',
  jwtGuard,
  adminGuard,
  async (c) => {
    const { row } = c.req.param();

    return removeRow(row).match(() => {
      return c.body(null, 204);
    }, (err) => {
      return c.json<ErrorResponse>({
        code: err,
        message: 'Schedule row is not found',
      });
    });
  },
);

export default app;
