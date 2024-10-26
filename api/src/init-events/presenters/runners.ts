import { Runner, RunnerResponse, UtcDateTime } from '@marathon-scheduler/models';

export const presentRunner = (runner: Runner): RunnerResponse => {
  return {
    id: runner.id,
    name: runner.name,
    discord: runner.connections.discord,
    twitch: runner.connections.twitch,
    twitter: runner.connections.twitter,
    youtube: runner.connections.youtube,
    availabilities: runner.availabilities.map(ava => ({
      start: UtcDateTime.toISOString(ava.start),
      end: UtcDateTime.toISOString(ava.end),
    })),
  };
};
