import { CreateEventRequest, PaginationRequest, PaginationResponse, CreateRunnerRequest, RunnerResponse, RunResponse, SpeedrunEvent, UpdateEventRequest, ErrorResponse, CreateRunRequest, ScheduleRowResponse, CreateScheduleRowRequest, ScheduleResponse } from '@marathon-scheduler/models';
import { Tags } from './tags';
import { cache } from 'react';

export type MarathonApi = ReturnType<typeof marathonApi>;

type Success<R> = {
    success: true;
    data: R
};

type Failure = {
    success: false;
    error: ErrorResponse;
}

type ApiResult<R> = Success<R> | Failure

const success = <R>(data: R): Success<R> => ({
    success: true,
    data,
})

const failure = (error: ErrorResponse): Failure => ({
    success: false,
    error,
})

export const marathonApi = (url: string = 'http://localhost:13000') => {

    type RequestParams = {
        query?: ConstructorParameters<typeof URLSearchParams>[0],
        body?: Parameters<typeof JSON.stringify>[0],
        tags?: string[],
    };

    type RequestMethods = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

    const request = async <R>(method: RequestMethods, path: string, params: RequestParams = {}): Promise<ApiResult<R>> => {
        const credentialOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        } as const;
        const requestUrl = new URL(path, url);
        if (params.query) {
            requestUrl.search = new URLSearchParams(params.query).toString();
        }
        const data = await fetch(requestUrl, {
            method,
            ... params.body ? { body: JSON.stringify(params.body) } : {},
            ... credentialOptions,
            next: { tags: params.tags }
        });
        if (!data.ok) {
            const err = await data.json() as ErrorResponse;
            return failure(err);
        }
        const result = data.status === 204 ? null : await data.json();
        return success(result as R)
    }

    return {
        async listEvents() {
            return await request<PaginationResponse<SpeedrunEvent>>('GET', '/events', { tags: [Tags.events()] });
        },

        async getEvent(slug: string) {
            return await request<SpeedrunEvent>('GET', `/events/${slug}`);
        },

        async createEvent(payload: CreateEventRequest) {
            return await request<SpeedrunEvent>('POST', '/events', {
                body: payload
            });
        },

        async editEvent(slug: string, payload: UpdateEventRequest) {
            return await request<SpeedrunEvent>('PATCH', `/events/${slug}`, {
                body: payload,
            });
        },

        async listRunners(slug: string, paginate?: PaginationRequest<RunnerResponse['id']>) {
            return await request<PaginationResponse<RunnerResponse>>('GET', `/events/${slug}/runners`, {
                query: {
                    ... paginate
                },
                tags: [Tags.runners(slug)]
            });
        },

        async createRunner(slug: string, payload: CreateRunnerRequest) {
            return await request<RunnerResponse>('POST', `/events/${slug}/runners`, {
                body: payload,
            });
        },

        async deleteRunner(slug: string, runnerId: RunnerResponse['id']) {
            return await request<null>('DELETE', `/events/${slug}/runners/${runnerId}`);
        },

        async listRuns(slug: string, paginate?: PaginationRequest<RunResponse['id']>) {
            return await request<PaginationResponse<RunResponse>>('GET', `/events/${slug}/runs`, {
                query: {
                    ... paginate
                },
                tags: [Tags.runs(slug)]
            });
        },

        async createRun(slug: string, payload: CreateRunRequest) {
            return await request<RunResponse>('POST', `/events/${slug}/runs`, {
                body: payload
            });
        },

        async deleteRun(slug: string, runId: RunResponse['id']) {
            return await request<null>('DELETE', `/events/${slug}/runs/${runId}`);
        },

        async getSchedule(event: string, slug: string) {
            return await request<ScheduleResponse>('GET', `/events/${event}/schedules/${slug}`);
        },

        async listScheduleRows(event: string, slug: string) {
            return await request<ScheduleRowResponse[]>('GET', `/events/${event}/schedules/${slug}/rows`);
        },

        async addRunFirstToSchedule(event: string, slug: string, payload: CreateScheduleRowRequest) {
            return await request<ScheduleRowResponse>('POST', `/events/${event}/schedules/${slug}/rows/first`, {
                body: payload,
            });
        },

        async addRunNextTo(event: string, slug: string, row: string, payload: CreateScheduleRowRequest) {
            return await request<ScheduleRowResponse>('PUT', `/events/${event}/schedules/${slug}/rows/${row}/next`, {
                body: payload,
            });
        },

        async deleteRow(event: string, slug: string, row: string) {
            return await request<null>('DELETE', `/events/${event}/schedules/${slug}/rows/${row}`);
        }
    }
}

export const ApiService = (api: MarathonApi) => ({
    getAllRuns: cache(async (slug: string) => {
        const runs: RunResponse[] = [];
        let last: RunResponse["id"] | undefined = undefined;
        do {
          const result = await api.listRuns(
            slug,
            last ? { after: last } : undefined
          );
          if (!result.success) {
            throw result.error;
          }
          const { data } = result.data;
          runs.push(...data);
          last = data.at(-1)?.id;
        } while (last);
        return runs;
      }),
})
