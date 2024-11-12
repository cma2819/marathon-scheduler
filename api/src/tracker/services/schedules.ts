import { PublicSchedule, Run, Runner } from '@marathon-scheduler/models';
import { LoginResult } from './login';
import { err, ok, ResultAsync } from 'neverthrow';
import got, { HTTPError } from 'got';
import { CookieJar } from 'tough-cookie';

type TrackerModel = {
  pk: number;
};

type TrackerRun = {
  pk: -1;
  model: 'tracker.speedrun';
  canReorder: true;
  fields: {
    display_name: string;
    name: string;
    category: string;
    console: string;
    run_time: string;
    setup_time: string;
    order?: number;
    event: number;
    runners: number[];
  };
};

type TrackerRunner = {
  pk: number;
  model: 'tracker.runner';
  canReorder: false;
  fields: {
    name: string;
    twitter?: string;
    twitch?: string;
    nico?: string;
    youtube?: string;
    platform: 'TWITCH';
  };
};

export const findEvent = (
  url: string, slug: string, login: LoginResult,
): ResultAsync<number, 'event_not_found'> => {
  const getUrl = new URL('/api/v1/search/', url);
  const query = new URLSearchParams({
    type: 'event',
    short: slug,
  });
  getUrl.search = query.toString();
  const cookieJar = new CookieJar();
  cookieJar.setCookie(`sessionid=${login.sessionId}`, getUrl);

  return ResultAsync.fromPromise(
    got.get(getUrl, {
      cookieJar: cookieJar,
    }).json<TrackerModel[]>(),
    (error) => {
      if (error instanceof HTTPError && error.response.statusCode === 404) {
        return 'event_not_found' as const;
      }
      throw error;
    })
    .andThen((response) => {
      const [first] = response;
      if (!first) {
        return err('event_not_found');
      }
      return ok(first.pk);
    });
};

const makeRunner = (runner: Runner): { model: TrackerRunner; origin: Runner } => ({
  model: {
    pk: -1,
    canReorder: false,
    model: 'tracker.runner',
    fields: {
      name: runner.name,
      platform: 'TWITCH',
      twitch: runner.connections.twitch,
      twitter: runner.connections.twitter,
      // youtube: runner.connections.youtube?.replace('@', 'あ'),
      // ignore youtube handle because it includes Japanese
    },
  },
  origin: runner,
});

const makeRun = (
  run: Run, event: number, row?: { setup: string; order: number },
): Omit<TrackerRun, 'fields'> & { fields: Omit<TrackerRun['fields'], 'runners'> } => ({
  pk: -1,
  canReorder: true,
  model: 'tracker.speedrun',
  fields: {
    display_name: `${run.game} ${run.category}`,
    name: run.game,
    category: run.category,
    console: run.console,
    run_time: run.estimate.formatted,
    setup_time: row?.setup ?? '00:00:00',
    event: event,
    ...row ? { order: row.order } : {},
  },
});

export const exportSchedules = (
  url: string,
  login: LoginResult,
  { eventPk, runners, runs, schedule }: {
    eventPk: number;
    runners: Runner[];
    runs: Run[];
    schedule: PublicSchedule;
  },
): ResultAsync<true, never> => {
  const cookieJar = new CookieJar();
  cookieJar.setCookie(`sessionid=${login.sessionId}`, url);

  const assignPkToRunner = async (runner: TrackerRunner): Promise<TrackerRunner> => {
    const getUrl = new URL('/api/v1/search/', url);
    const query = new URLSearchParams({
      type: 'runner',
      name: runner.fields.name,
    });
    getUrl.search = query.toString();

    try {
      const response = await got.get(getUrl, { cookieJar }).json<TrackerRunner[]>();
      const [first] = response;
      if (!first) {
        return runner;
      }
      return {
        ...runner,
        pk: first.pk,
      };
    }
    catch (err) {
      if (err instanceof HTTPError && err.response.statusCode === 404) {
        return runner;
      }
      throw err;
    }
  };

  const runnerModels = Promise.all(
    runners.map(runner => makeRunner(runner)).map(
      (async runner => ({ ...runner, model: await assignPkToRunner(runner.model) })),
    ));

  const saveModel = async <T extends TrackerRun | TrackerRunner>(model: T): Promise<T> => {
    const postUrl = new URL(`/api/v1/${model.pk < 0 ? 'add' : 'edit'}/`, url);
    try {
      console.log(`Importing [${model.model}] with ${model.fields.name}`);
      const response = await got.post(postUrl, {
        cookieJar,
        form: {
          type: model.model === 'tracker.runner' ? 'runner' : 'run',
          id: model.pk,
          ...model.fields,
        },
      }).json<[T]>();
      return response[0];
    }
    catch (err) {
      if (err instanceof HTTPError) {
        console.error(err.response.statusCode);
        console.error(err.response.statusMessage);
        console.error(err.response.body);
        return model;
      }
      throw err;
    }
  };

  return ResultAsync.fromSafePromise(runnerModels)
    .andThen((runnerModels) => {
      return ResultAsync.fromSafePromise(
        (async () => {
          const runners = await Promise.all(runnerModels.map(async ({ model, origin }) => {
            const saved = await saveModel(model);
            return {
              saved, origin,
            };
          }));
          for await (const run of runs) {
            const rowIndex = schedule.rows.findIndex(row => row.run.id === run.id);
            const row = schedule.rows[rowIndex];
            const model = makeRun(run, eventPk, row && { setup: row.setup, order: rowIndex + 1 });

            await saveModel({
              ...model,
              fields: {
                ...model.fields,
                runners: run.runners.map(
                  runner => runners.find(({ origin }) => runner === origin.id)?.saved,
                ).filter((saved): saved is TrackerRunner => Boolean(saved)).map(saved => saved.pk),
              },
            });
          }
        })(),
      );
    }).map(() => true);
};
