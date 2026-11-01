FROM node:22-trixie-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update -y \
  && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@10.6.5 --activate
WORKDIR /app

FROM base AS production-dependencies
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/prisma apps/api/prisma
RUN pnpm install --prod --frozen-lockfile
RUN pnpm --filter @al-ahmadi/api db:generate

FROM base AS build
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/prisma apps/api/prisma
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY apps/api apps/api
COPY packages/shared packages/shared
RUN pnpm --filter @al-ahmadi/api db:generate \
    && pnpm --filter @al-ahmadi/api typecheck

FROM base AS runtime
ENV NODE_ENV=production
ENV API_PORT=4000
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY --from=production-dependencies /app/node_modules node_modules
COPY --from=production-dependencies /app/apps/api/node_modules apps/api/node_modules
COPY --from=production-dependencies /app/packages/shared/node_modules packages/shared/node_modules
COPY --from=build /app/apps/api/src apps/api/src
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/packages/shared/src packages/shared/src
WORKDIR /app
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:4000/readyz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "pnpm --filter @al-ahmadi/api migrate:deploy && pnpm --filter @al-ahmadi/api start"]
