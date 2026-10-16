# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -s /run/secrets/proxy_ca ]; then NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca npm ci --no-audit --no-fund; else npm ci --no-audit --no-fund; fi
FROM dependencies AS build
COPY next.config.ts tsconfig.json next-env.d.ts postcss.config.mjs ./
COPY app ./app
COPY lib ./lib
COPY prisma ./prisma
RUN npx --no-install prisma generate && npm run build
FROM dependencies AS operations
COPY prisma ./prisma
COPY lib ./lib
COPY scripts/create-user.ts scripts/reset-password.ts scripts/data-inventory.ts ./scripts/
RUN npx --no-install prisma generate
ENV NODE_ENV=production
USER node
CMD ["npm", "run", "db:migrate"]
FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3100 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --chown=node:node scripts/start-production.mjs ./scripts/
COPY --chown=node:node lib/config.mjs ./lib/
USER node
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:3100/api/health/ready',{signal:AbortSignal.timeout(4000)}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "scripts/start-production.mjs"]
