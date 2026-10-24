# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS dependencies

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl clamav clamav-freshclam poppler-utils \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY tools/next-eslint-glob ./tools/next-eslint-glob
RUN npm ci && npm cache clean --force

FROM dependencies AS builder

ARG RELEASE_SHA=unversioned
LABEL org.opencontainers.image.revision=${RELEASE_SHA}
COPY . .

# Prisma generation needs a syntactically valid datasource URL, but the image
# build must not depend on a reachable production database.
ARG BUILD_DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build?schema=public
ENV DATABASE_URL=${BUILD_DATABASE_URL}
ENV NODE_OPTIONS=--max-old-space-size=4096

RUN node -e "const fs=require('fs');const p='next-env.d.ts';if(fs.existsSync(p)){const s=fs.readFileSync(p,'utf8');fs.writeFileSync(p,s.split(/\\r?\\n/).filter((line)=>!line.includes('routes.d.ts')).join('\\n'));}"
RUN npm run build && rm -rf .next/cache

FROM dependencies AS tooling

ARG RELEASE_SHA=unversioned
LABEL org.opencontainers.image.revision=${RELEASE_SHA}
COPY . .

ARG BUILD_DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build?schema=public
ENV DATABASE_URL=${BUILD_DATABASE_URL}

RUN npm run db:generate

FROM dependencies AS website-review-builder
COPY package.json package-lock.json ./
COPY apps/dealership ./apps/dealership
ENV NEXT_PUBLIC_REVIEW_BASE_PATH=/website-review
ENV DEALERSHIP_ENVIRONMENT=private-review
ENV DEALERSHIP_HOSTED_REVIEW=1
RUN npm --prefix apps/dealership run build && rm -rf apps/dealership/.next/cache

FROM node:24-bookworm-slim AS website-review-runner
WORKDIR /app
ENV DEALERSHIP_ENVIRONMENT=private-review
ENV DEALERSHIP_HOSTED_REVIEW=1
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_REVIEW_BASE_PATH=/website-review
COPY package.json package-lock.json ./
COPY tools/next-eslint-glob ./tools/next-eslint-glob
RUN npm ci --omit=dev && npm cache clean --force
ARG RELEASE_SHA=unversioned
LABEL org.opencontainers.image.revision=${RELEASE_SHA}
ENV APP_RELEASE_SHA=${RELEASE_SHA}
COPY --from=website-review-builder --chown=node:node /app/apps/dealership/.next ./apps/dealership/.next
COPY --from=website-review-builder --chown=node:node /app/apps/dealership/public ./apps/dealership/public
COPY --from=website-review-builder --chown=node:node /app/apps/dealership/package.json ./apps/dealership/package.json
COPY --from=website-review-builder --chown=node:node /app/apps/dealership/next.config.mjs ./apps/dealership/next.config.mjs
COPY --from=website-review-builder --chown=node:node /app/apps/dealership/config ./apps/dealership/config
COPY --from=website-review-builder --chown=node:node /app/apps/dealership/fixtures ./apps/dealership/fixtures
RUN mkdir -p /app/apps/dealership/.data && chown -R node:node /app/apps/dealership
USER node
WORKDIR /app/apps/dealership
EXPOSE 3100
CMD ["node", "/app/node_modules/next/dist/bin/next", "start", ".", "-H", "0.0.0.0", "-p", "3100"]

FROM dependencies AS website-production-builder
COPY apps/dealership ./apps/dealership
ENV DEALERSHIP_ENVIRONMENT=public-production
ENV DEALERSHIP_PREVIEW_DATA=0
RUN rm -rf apps/dealership/fixtures && npm --prefix apps/dealership run build && rm -rf apps/dealership/.next/cache

FROM node:24-bookworm-slim AS website-production-runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DEALERSHIP_ENVIRONMENT=public-production
ENV DEALERSHIP_PREVIEW_DATA=0
COPY package.json package-lock.json ./
COPY tools/next-eslint-glob ./tools/next-eslint-glob
RUN npm ci --omit=dev && npm cache clean --force
ARG RELEASE_SHA=unversioned
ENV APP_RELEASE_SHA=${RELEASE_SHA}
LABEL org.opencontainers.image.revision=${RELEASE_SHA}
COPY --from=website-production-builder --chown=node:node /app/apps/dealership/.next ./apps/dealership/.next
COPY --from=website-production-builder --chown=node:node /app/apps/dealership/public ./apps/dealership/public
COPY --from=website-production-builder --chown=node:node /app/apps/dealership/package.json ./apps/dealership/package.json
COPY --from=website-production-builder --chown=node:node /app/apps/dealership/next.config.mjs ./apps/dealership/next.config.mjs
COPY --from=website-production-builder --chown=node:node /app/apps/dealership/config ./apps/dealership/config
USER node
WORKDIR /app/apps/dealership
EXPOSE 3100
CMD ["node", "/app/node_modules/next/dist/bin/next", "start", ".", "-H", "0.0.0.0", "-p", "3100"]

FROM node:24-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl clamav poppler-utils \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY tools/next-eslint-glob ./tools/next-eslint-glob
RUN npm ci --omit=dev && npm cache clean --force

ARG RELEASE_SHA=unversioned
LABEL org.opencontainers.image.revision=${RELEASE_SHA}
ENV APP_RELEASE_SHA=${RELEASE_SHA}

COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=node:node /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder --chown=node:node /app/deploy/docker/scripts/run-production-scheduler.mjs ./scripts/run-production-scheduler.mjs

RUN mkdir -p /app/data/document-library /app/data/tesseract-cache \
  && chown -R node:node /app/data

USER node

EXPOSE 3000

CMD ["npm", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]
