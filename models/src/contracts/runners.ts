type Availability = {
    start: string;
    end: string;
}

export type RunnerResponse = {
    id: string;
    name: string;
    discord: string;
    twitch?: string;
    twitter?: string;
    youtube?: string;
    availabilities: Availability[];
}