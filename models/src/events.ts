import { UtcDateTime } from './values';

export type SpeedrunEvent = {
    id: string;
    slug: string;
    name: string;
    beginAt: UtcDateTime;
};

export const SpeedrunEvent = {
    edit(self: SpeedrunEvent, data: Omit<SpeedrunEvent, 'id' | 'slug'>): SpeedrunEvent {
        return {
            ... self,
            ... data,
        };
    },
}