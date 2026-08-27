# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS dependencies

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder

COPY . .

# Prisma generation needs a syntactically valid datasource URL, but the image
# build must not depend on a reachable production database.
ARG BUILD_DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build?schema=public
ENV DATABASE_URL=${BUILD_DATABASE_URL}
ENV NODE_OPTIONS=--max-old-space-size=4096

RUN node -e "const fs=require('fs');const p='next-env.d.ts';if(fs.existsSync(p)){const s=fs.readFileSync(p,'utf8');fs.writeFileSync(p,s.split(/\\r?\\n/).filter((line)=>!line.includes('routes.d.ts')).join('\\n'));}"
RUN npm run build

FROM dependencies AS tooling

COPY . .

ARG BUILD_DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build?schema=public
ENV DATABASE_URL=${BUILD_DATABASE_URL}

RUN npm run db:generate

FROM node:24-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=node:node /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder --chown=node:node /app/deploy/docker/scripts/run-production-scheduler.mjs ./scripts/run-production-scheduler.mjs

USER node

EXPOSE 3000

CMD ["npm", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]
