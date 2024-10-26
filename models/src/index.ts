
export type PaginationRequest<TIdentifier> = {
    before: TIdentifier;
  } | {
    after: TIdentifier;
  };

export type PaginationResponse<TData> = {
data: TData[];
};

export * from './auth';
export * from './events';
export * from './participants';
export * from './runs';
export * from './values';
export * from './contracts';