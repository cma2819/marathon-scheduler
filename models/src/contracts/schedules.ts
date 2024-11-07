import { PublicScheduleRow } from '../schedules';
import { RunResponse } from './runs';

export type CreateScheduleRowRequest = {
    run: {id: string};
    setup: string;
}

export type ScheduleRowResponse = {
    id: string;
    run: {
        id: string;
    };
    setup: string;
}

export type ScheduleResponse = {
    slug: string;
    description: string;
    beginAt: string;
}

export type PublicScheduleResponse = {
    slug: string;
    description: string;
    beginAt: string;
    rows: PublicScheduleRow[];
}