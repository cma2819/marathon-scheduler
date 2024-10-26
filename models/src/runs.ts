import { SpeedrunEvent } from './events';
import { Runner } from './participants';
import { Duration } from './values';

export const RunTypes = {
    Single: 'single',
    Race: 'race',
    Coop: 'coop',
    Relay: 'relay',
} as const;

export type RunType = typeof RunTypes[keyof typeof RunTypes];

export type Run = {
    id: string;
    game: string;
    category: string;
    runners: Runner['id'][];
    type: RunType;
    estimate: Duration;
    console: string;
    eventId: SpeedrunEvent['id'];
};

export const Run = {
    edit(
        self: Run,
        data: Omit<Run, 'id' | 'eventId'>
    ) {
        return {
            id: self.id,
            eventId: self.eventId,
            ... data,
        }
    }
}
