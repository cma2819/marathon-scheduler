import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { generalZodHook } from '../../common/validators/hooks';
import {
  Duration, PaginationResponse, RunTypes,
  ErrorResponse, RunResponse,
} from '@marathon-scheduler/models';
import { addRunToEvent, deleteRun, listRunsOnEvent, modifyRun } from '../services/runs';
import { listParticipantRunners } from '../services/runners';
import { ResultAsync } from 'neverthrow';
import { presentRunner } from '../presenters/runners';
import { presentRun } from '../presenters/run';
import { jwtGuard } from '../../common/infra/middlewares';
import cSchema from '../../common/schemas';

const app = new Hono().basePath('/events/:slug/runs');

const schemas = {
  run: {
    game: z.string(),
    category: z.string(),
    runners: z.array(
      z.object({
        id: z.string(),
      }),
    ),
    type: z.enum([RunTypes.Single, RunTypes.Coop, RunTypes.Race, RunTypes.Relay]),
    estimate: z.string().time(),
    console: z.string(),
  },
} as const;

app.get(
  '/',
  zValidator(
    'query',
    cSchema.paginate(z.string()),
  ),
  async (c) => {
    const slug = c.req.param('slug');
    const query = c.req.valid('query');

    const runsResult = await listRunsOnEvent(
      slug,
      ('before' in query || 'after' in query) ? query : undefined,
    );
    if (runsResult.isErr()) {
      return c.json<ErrorResponse>({
        code: runsResult.error,
        message: 'Event is not found',
      });
    }

    const runnersResult = await ResultAsync.combine(
      runsResult.value.map(r => listParticipantRunners(r.id).map(
        runners => [r.id, runners] as const,
      )),
    );
    if (runnersResult.isErr()) {
      return c.json<ErrorResponse>({
        code: runnersResult.error,
        message: 'Participant run is not found',
      });
    }

    return c.json<PaginationResponse<RunResponse>>({
      data: runsResult.value.map((r) => {
        const runners = runnersResult.value.find(([runId]) => runId === r.id);
        return {
          id: r.id,
          category: r.category,
          game: r.game,
          console: r.console,
          estimate: r.estimate.formatted,
          event: slug,
          type: r.type,
          runners: runners?.[1].map(runner => presentRunner(runner)) ?? [],
        };
      }),
    });
  },
);

app.post(
  '/',
  jwtGuard,
  zValidator(
    'json',
    z.object(schemas.run),
    generalZodHook(),
  ),
  async (c) => {
    const slug = c.req.param('slug');
    const body = c.req.valid('json');
    const validEstimate = Duration.parse(body.estimate);
    if (!validEstimate) {
      return c.json<ErrorResponse>({
        code: 'general_invalid_request',
        message: 'estimate has invalid format',
      });
    }

    const addRunResult = await addRunToEvent({
      game: body.game,
      category: body.category,
      runners: body.runners.map(runner => runner.id),
      type: body.type,
      estimate: validEstimate,
      console: body.console,
    }, slug);
    if (addRunResult.isErr()) {
      const error = addRunResult.error;

      if (error === 'assigned_event_not_found') {
        return c.json<ErrorResponse>({
          code: error,
          message: 'Event is not found',
        }, 404);
      }
      if (error === 'runner_user_not_found') {
        return c.json<ErrorResponse>({
          code: error,
          message: 'Some runner is not found',
        }, 404);
      }

      throw error;
    }

    const run = addRunResult.value;
    const runners = (await listParticipantRunners(run.id))._unsafeUnwrap();

    return c.json<RunResponse>(presentRun(
      slug,
      run,
      runners,
    ));
  },
);

app.patch(
  '/:id',
  jwtGuard,
  zValidator(
    'json',
    z.object(schemas.run),
    generalZodHook(),
  ),
  async (c) => {
    const slug = c.req.param('slug');
    const runId = c.req.param('id');
    const body = c.req.valid('json');
    const validEstimate = Duration.parse(body.estimate);
    if (!validEstimate) {
      return c.json<ErrorResponse>({
        code: 'general_invalid_request',
        message: 'estimate has invalid format',
      });
    }

    const modifyResult = await modifyRun({
      id: runId,
      game: body.game,
      category: body.category,
      runners: body.runners.map(runner => runner.id),
      type: body.type,
      estimate: validEstimate,
      console: body.console,
    }, slug);

    if (modifyResult.isErr()) {
      const error = modifyResult.error;
      if (error === 'assigned_event_not_found') {
        return c.json<ErrorResponse>({
          code: error,
          message: 'Event is not found',
        }, 404);
      }
      if (error === 'runner_user_not_found') {
        return c.json<ErrorResponse>({
          code: error,
          message: 'Some runner is not found',
        }, 404);
      }
      if (error === 'run_not_found') {
        return c.json<ErrorResponse>({
          code: error,
          message: 'Target run is not found',
        }, 404);
      }

      throw error;
    }

    return c.body(null, 204);
  },
);

app.delete(
  '/:id',
  jwtGuard,
  async (c) => {
    const slug = c.req.param('slug');
    const runId = c.req.param('id');

    const deleteResult = await deleteRun(runId, slug);

    if (deleteResult.isErr()) {
      const error = deleteResult.error;
      if (error === 'assigned_event_not_found') {
        return c.json<ErrorResponse>({
          code: error,
          message: 'Event is not found',
        }, 404);
      }
      if (error === 'run_not_found') {
        return c.json<ErrorResponse>({
          code: error,
          message: 'Target run is not found',
        }, 404);
      }

      throw error;
    }

    return c.body(null, 204);
  },
);

export default app;
