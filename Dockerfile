FROM node:18 as base

FROM base as build-models

COPY ./models /app/models
COPY ./tsconfig.base.json /app/
WORKDIR /app/models

RUN npm ci && npm run build

FROM base as build-api

COPY ./api/package.json /app/api/
COPY ./api/package-lock.json /app/api/
COPY --from=build-models /app/models /app/models

COPY ./api/prisma /app/api/prisma

WORKDIR /app/api

RUN npm ci
RUN npx prisma generate

FROM base as dev-api

COPY ./api /app/api
COPY ./tsconfig.base.json /app/
COPY --from=build-models /app/models /app/models
COPY --from=build-api /app/api/node_modules /app/api/node_modules

WORKDIR /app/api

CMD ["sh", "-c", "npx prisma migrate dev && npm run dev"]