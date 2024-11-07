import { RunnerResponse, RunResponse } from './contracts';
import { SpeedrunEvent } from './events';
import { Run, RunType } from './runs';
import { Duration, UtcDateTime } from './values';

export type Schedule = {
    id: string;
    slug: string;
    description: string;
    beginAt: UtcDateTime;
    eventId: SpeedrunEvent['id']
}

export type ScheduleRow = {
    id: string;
    scheduleId: Schedule['id'];
    runId: Run['id'];
    next: ScheduleRow['id'] | null;
    isFirst: boolean;
    setupTime: Duration;
}

// export const ScheduleRow = {
//     insertAfter: (self: ScheduleRow, prev: ScheduleRow): ScheduleRow => {
//         if (self.id === prev.id) {
//             return self;
//         }
        
//     }
// }

export type PublicationMeta = {
    publishedAt: UtcDateTime;
    revision: number;
}

export type PublicScheduleRunner = {
    id: string;
    name: string;
    discord: string;
    twitch?: string;
    twitter?: string;
    youtube?: string;
}

export type PublicScheduleRun = {
    id: string;
    game: string;
    category: string;
    runners: PublicScheduleRunner[];
    type: RunType;
    estimate: string;
    console: string;
}

export type PublicScheduleRow = {
    id: ScheduleRow['id'];
    run: PublicScheduleRun;
    setup: string;
}

export type PublicSchedule = {
    scheduleId: string;
    meta: PublicationMeta;
    rows: PublicScheduleRow[];
}
