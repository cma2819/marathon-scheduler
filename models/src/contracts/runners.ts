export type AvailabilityResponse = {
    start: string;
    end: string;
}

export type CreateRunnerRequest = {
    
    name:string;
    availabilities: {
      unit: number,
      slots: {
          datetime: string,
        }[],
    },
    discord: string,
    twitch?: string,
    twitter?: string,
    youtube?: string,
}

export type RunnerResponse = {
    id: string;
    name: string;
    discord: string;
    twitch?: string;
    twitter?: string;
    youtube?: string;
    availabilities: AvailabilityResponse[];
}