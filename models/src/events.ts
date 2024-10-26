export type SpeedrunEvent = {
    id: string;
    slug: string;
    name: string;
};

export const SpeedrunEvent = {
    edit(self: SpeedrunEvent, data: Omit<SpeedrunEvent, 'id' | 'slug'>): SpeedrunEvent {
        return {
            ... self,
            name: data.name,
        };
    },
}