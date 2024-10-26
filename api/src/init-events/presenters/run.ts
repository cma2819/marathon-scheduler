import { Run, Runner, RunResponse } from '@marathon-scheduler/models';
import { presentRunner } from './runners';

export const presentRun = (slug: string, run: Run, runners: Runner[]): RunResponse => {
  return {
    event: slug,
    id: run.id,
    game: run.game,
    category: run.category,
    runners: runners.map(runner => presentRunner(runner)),
    type: run.type,
    console: run.console,
    estimate: run.estimate.formatted,
  };
};
