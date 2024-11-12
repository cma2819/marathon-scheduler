import { Args, Command, Flags } from '@oclif/core';
import { getPublicSchedule } from '../../manage-schedules/services/public';
import { ok, okAsync, ResultAsync } from 'neverthrow';
import { PublicSchedule, Run, Runner, UtcDateTime } from '@marathon-scheduler/models';
import { listRunsOnEvent } from '../../init-events/services/runs';
import { loginTracker } from '../../tracker/services/login';
import { exportSchedules, findEvent } from '../../tracker/services/schedules';
import { listRunnersOnEvent } from '../../init-events/services/runners';

const summarySchedule = (runs: Run[], schedule: PublicSchedule): {
  counts: {
    runs: number;
    onSchedule: number;
  };
  published: string;
} => {
  return {
    counts: {
      runs: runs.length,
      onSchedule: schedule.rows.length,
    },
    published: UtcDateTime.toDate(schedule.meta.publishedAt).toLocaleString(),
  };
};

const summaryRunners = (runners: Runner[]): {
  counts: number;
} => {
  return {
    counts: runners.length,
  };
};

export default class TrackerExport extends Command {
  static override args = {
    event: Args.string({ description: 'slug of event', required: true }),
    slug: Args.string({ description: 'schedule\'s slug', required: true }),
  };

  static override description = 'import schedules to tracker';

  static override examples = [
    '<%= config.bin %> <%= command.id %> rtaijs2024 main',
  ];

  static override flags = {
    dry: Flags.boolean({ description: 'login and make payload only' }),
    tracker: Flags.string({
      char: 'f',
      description: 'donation tracker url',
      env: 'TRACKER_URL',
      required: true,
    }),
    username: Flags.string({
      char: 'u',
      description: 'login username for donation tracker',
      env: 'TRACKER_USERNAME',
      required: true,
    }),
    password: Flags.string({
      char: 'p',
      description: 'password for donation tracker',
      env: 'TRACKER_PASSWORD',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(TrackerExport);
    const { event, slug } = args;
    const { dry, tracker, username, password } = flags;

    const fetchRuns = async (current: Run[], after?: string): Promise<Run[]> => {
      return await listRunsOnEvent(event, after ? { after } : undefined)
        .match((runs) => {
          const after = runs.at(-1);
          return after
            ? fetchRuns([
              ...current,
              ...runs,
            ], after.id)
            : current;
        }, () => {
          return current;
        });
    };

    const fetchRunners = async (current: Runner[], after?: string): Promise<Runner[]> => {
      return await listRunnersOnEvent(event, after ? { after } : undefined)
        .match((runners) => {
          const after = runners.at(-1);
          return after
            ? fetchRunners([
              ...current,
              ...runners,
            ], after.id)
            : current;
        }, () => {
          return current;
        });
    };

    return await ResultAsync.combine([
      ResultAsync.fromSafePromise(fetchRuns([])),
      ResultAsync.fromSafePromise(fetchRunners([])),
      getPublicSchedule(event, slug),
      loginTracker(tracker, { username, password }),
    ])
      .andThen(([runs, runners, schedule, login]) => {
        this.log('Going to import to tracker...');
        this.log('Summary - Runs:');
        this.logJson(summarySchedule(runs, schedule));
        this.log('Summary - Runners:');
        this.logJson(summaryRunners(runners));
        return ok([runs, runners, schedule, login] as const);
      })
      .andThen(([runs, runners, schedule, login]) => {
        return ResultAsync.combine([
          okAsync(runs),
          okAsync(runners),
          okAsync(schedule),
          okAsync(login),
          findEvent(tracker, event, login),
        ] as const);
      })
      .andThen(([runs, runners, schedule, login, eventPk]) => {
        return dry
          ? ok(false)
          : exportSchedules(tracker, login, {
            eventPk,
            runs,
            runners,
            schedule,
          });
      })
      .match((success) => {
        if (success) {
          this.log('Success to import to tracker!');
        }
        else {
          this.error('Failed or skipped to import!');
        }
        return;
      }, (err) => {
        this.error(err);
      });
  }
}
