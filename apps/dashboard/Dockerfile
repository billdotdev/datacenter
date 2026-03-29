FROM node:24-bookworm-slim AS build
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:24-bookworm-slim
WORKDIR /app

RUN corepack enable

COPY --from=build /app ./

EXPOSE 3000

CMD ["sh", "-c", "pnpm db:migrate && pnpm start"]
