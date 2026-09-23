FROM debian:bullseye AS node-base

ARG NODE_VERSION=22.12.0
ARG NODE_ARCH=x64

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl xz-utils \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" \
    && curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt" \
    && grep " node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz$" SHASUMS256.txt | sha256sum -c - \
    && tar -xJf "node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" -C /usr/local --strip-components=1 \
    && rm "node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" SHASUMS256.txt

WORKDIR /app

FROM node-base AS build

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.base.json tsconfig.client.json tsconfig.server.json vite.config.ts ./
COPY client ./client
COPY server ./server
COPY shared ./shared
COPY data ./data

RUN npm run build && npm prune --omit=dev

FROM node-base AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    MAP_DATA_PATH=/data/map.json

RUN useradd --system --uid 10001 --create-home appuser \
    && mkdir -p /data /opt/default-data \
    && chown -R appuser:appuser /data /app /opt/default-data

COPY --from=build --chown=appuser:appuser /app/package.json ./package.json
COPY --from=build --chown=appuser:appuser /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appuser /app/dist ./dist
COPY --from=build --chown=appuser:appuser /app/data/map.json /opt/default-data/map.json

USER appuser
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD curl --fail --silent http://localhost:3000/api/health || exit 1

CMD ["sh", "-c", "if [ ! -f \"$MAP_DATA_PATH\" ]; then cp /opt/default-data/map.json \"$MAP_DATA_PATH\"; fi; exec node dist/server/server/index.js"]
