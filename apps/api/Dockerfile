# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS deps
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN corepack enable && pnpm install --frozen-lockfile

FROM deps AS build
WORKDIR /workspace

COPY apps/api apps/api
COPY packages/shared packages/shared

RUN pnpm --filter @brokerops/api build
RUN pnpm prune --prod

FROM node:20-alpine AS runtime
WORKDIR /workspace

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=build /workspace/package.json ./package.json
COPY --from=build /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=build /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
COPY --from=build /workspace/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /workspace/packages/shared/src ./packages/shared/src

EXPOSE 8080

CMD ["node", "apps/api/dist/index.js"]
