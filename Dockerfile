FROM node:22-alpine AS base
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate

FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM deps AS migrator
ENV NODE_ENV=production
COPY --chown=nextjs:nodejs prisma ./prisma
COPY --chown=nextjs:nodejs scripts ./scripts
USER nextjs
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

FROM deps AS worker
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --chown=nextjs:nodejs . .
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads
USER nextjs
CMD ["npm", "run", "worker"]

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads
USER nextjs

EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
