import { RunType } from '../runs';
import { RunnerResponse } from './runners';

export type CreateRunRequest = {
    game: string,
    category: string,
    console: string,
    runners: {
        id: string
    }[],
    type: RunType,
    estimate: string
}

export type RunResponse = {
    event: string;
    id: string;
    game: string;
    category: string;
    runners: RunnerResponse[];
    type: RunType;
    estimate: string;
    console: string;
}