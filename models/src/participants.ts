import { SpeedrunEvent } from './events';
import { UtcDateTime } from './values';

export type Availability = {
    sort: number;
    start: UtcDateTime;
    end: UtcDateTime;
}

type PartialAvailability = Omit<Availability, 'sort'>;

export const Availability = {
    fromPartials(partials: PartialAvailability[]): Availability[] {
        const [first, ...rest] = partials;
        if (!first) {
            return [];
        }
        if (rest.length === 0) {
            return [{
                ...first,
                sort: 1,
            }];
        }

        const merged: PartialAvailability[] = [];
        rest.reduce((prev, current, index, src) => {
            const returnOrPushLast = (ava: PartialAvailability) => {
                if (index === src.length - 1) {
                    merged.push(ava);
                }
                return ava;
            }

            if (UtcDateTime.isBefore(prev.end, current.start)) {
                merged.push(prev);
                return returnOrPushLast(current);
            }
            return returnOrPushLast({
                start: prev.start,
                end: current.end,
            });
        }, first);

        return merged.map((p, index) => ({ ...p, sort: index + 1 }));
    },

    fromTimeSlots(starts: UtcDateTime[], unitInMinutes: number): Availability[] {
        const dates = starts.map(start => UtcDateTime.toDate(start));
        dates.sort((a, b) => a.getTime() - b.getTime());
        const availabilities = dates.map((d): PartialAvailability => ({
            start: UtcDateTime.fromDate(d),
            end: UtcDateTime.fromDate(new Date(d.getTime() + unitInMinutes * 60 * 1000)),
        }));

        return this.fromPartials(availabilities);
    }
}

export type Connections = {
    discord: string;
    twitter?: string;
    twitch?: string;
    youtube?: string;
}

export type Runner = {
    id: string;
    name: string;
    connections: Connections;
    availabilities: Availability[];
    eventId: SpeedrunEvent['id'];
}

export const Runner = {
    edit(
        self: Runner,
        data: Omit<
            Runner, 'id' | 'eventId' | 'connections'
        > & { connections: Omit<Connections, 'discord'>}
    ): Runner {
        return {
            ... self,
            name: data.name,
            connections: {
                ... self.connections,
                twitch: data.connections.twitch,
                twitter: data.connections.twitter,
                youtube: data.connections.youtube,
            },
            availabilities: data.availabilities,
        }
    }
}