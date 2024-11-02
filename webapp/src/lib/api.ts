import { CreateEventRequest, PaginationRequest, PaginationResponse, RunnerResponse, RunResponse, SpeedrunEvent } from '@marathon-scheduler/models';

export type MarathonApi = ReturnType<typeof marathonApi>;

export const marathonApi = (url: string = 'http://localhost:13000') => {

    type RequestParams = {
        query?: ConstructorParameters<typeof URLSearchParams>[0],
        body?: Parameters<typeof JSON.stringify>[0],
    };

    type RequestMethods = 'GET' | 'POST' | 'DELETE'

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
            ... method !== 'GET' ? credentialOptions : {}
        });
        return await data.json();
    }

    return {
        async listEvents(): Promise<PaginationResponse<SpeedrunEvent>> {
            return await request('GET', '/events');
        },

        async getEvent(slug: string): Promise<SpeedrunEvent> {
            return await request('GET', `/events/${slug}`);
        },

        async createEvent(payload: CreateEventRequest): Promise<SpeedrunEvent> {
            return await request('POST', '/events', {
                body: payload
            });
        },

        async listRunners(slug: string, paginate?: PaginationRequest<RunnerResponse['id']>): Promise<PaginationResponse<RunnerResponse>> {
            return await request('GET', `/events/${slug}/runners`, {
                query: {
                    ... paginate
                }
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
                }
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
