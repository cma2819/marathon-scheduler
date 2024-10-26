import { RunType } from '../runs';
import { RunnerResponse } from './runners';

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