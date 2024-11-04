import { CreateEventRequest, PaginationRequest, PaginationResponse, CreateRunnerRequest, RunnerResponse, RunResponse, SpeedrunEvent, UpdateEventRequest, ErrorResponse, CreateRunRequest } from '@marathon-scheduler/models';
import { Tags } from './tags';

export type MarathonApi = ReturnType<typeof marathonApi>;

export const marathonApi = (url: string = 'http://localhost:13000') => {

    type RequestParams = {
        query?: ConstructorParameters<typeof URLSearchParams>[0],
        body?: Parameters<typeof JSON.stringify>[0],
        tags?: string[],
    };

    type RequestMethods = 'GET' | 'POST' | 'PATCH' | 'DELETE'

    const request = async (method: RequestMethods, path: string, params: RequestParams = {}) => {
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
            ... method !== 'GET' ? credentialOptions : {},
            next: { tags: params.tags }
        });
        if (data.status === 204) {
            return;
        }
        if (!data.ok) {
            const err = await data.json() as ErrorResponse;
            throw new Error(`[${err.code}] ${err.message}`);
        }
        return await data.json();
    }

    return {
        async listEvents(): Promise<PaginationResponse<SpeedrunEvent>> {
            return await request('GET', '/events', { tags: [Tags.events()] });
        },

        async getEvent(slug: string): Promise<SpeedrunEvent> {
            return await request('GET', `/events/${slug}`);
        },

        async createEvent(payload: CreateEventRequest): Promise<SpeedrunEvent> {
            return await request('POST', '/events', {
                body: payload
            });
        },

        async editEvent(slug: string, payload: UpdateEventRequest): Promise<SpeedrunEvent> {
            return await request('PATCH', `/events/${slug}`, {
                body: payload,
            });
        },

        async listRunners(slug: string, paginate?: PaginationRequest<RunnerResponse['id']>): Promise<PaginationResponse<RunnerResponse>> {
            return await request('GET', `/events/${slug}/runners`, {
                query: {
                    ... paginate
                },
                tags: [Tags.runners(slug)]
            });
        },

        async createRunner(slug: string, payload: CreateRunnerRequest): Promise<RunnerResponse> {
            return await request('POST', `/events/${slug}/runners`, {
                body: payload,
            });
        },

        async deleteRunner(slug: string, runnerId: RunnerResponse['id']): Promise<boolean> {
            try {
                await request('DELETE', `/events/${slug}/runners/${runnerId}`);
                return true;
            } catch (e) {
                console.error(e);
                return false;
            }
        },

        async listRuns(slug: string, paginate?: PaginationRequest<RunResponse['id']>): Promise<PaginationResponse<RunResponse>> {
            return await request('GET', `/events/${slug}/runs`, {
                query: {
                    ... paginate
                },
                tags: [Tags.runs(slug)]
            });
        },

        async createRun(slug: string, payload: CreateRunRequest): Promise<RunResponse> {
            return await request('POST', `/events/${slug}/runs`, {
                body: payload
            });
        },

        async deleteRun(slug: string, runId: RunResponse['id']): Promise<boolean> {
            try {
                await request('DELETE', `/events/${slug}/runs/${runId}`);
                return true;
            } catch (e) {
                console.error(e);
                return false;
            }
        }
    }
}
