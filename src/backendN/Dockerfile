# ---------- Base ----------
  FROM node:18-alpine AS base
  WORKDIR /app
  ENV NODE_ENV=production
  RUN apk add --no-cache dumb-init
  RUN addgroup -g 1001 -S nodejs && adduser -S appuser -u 1001
  
  # Paketler ve Prisma şeması
  COPY package*.json ./
  COPY prisma ./prisma/
  
  # ---------- Prod deps ----------
  FROM base AS deps
  RUN npm ci --omit=dev && npm cache clean --force
  
  # ---------- Build deps ----------
  FROM node:18-alpine AS build-deps
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npx prisma generate
  RUN npm run build
  
  # ---------- Production image ----------
  FROM base AS production
  
  # prod dependency'leri kopyala
  COPY --from=deps /app/node_modules ./node_modules
  
  # build çıktıları
COPY --from=build-deps /app/dist ./dist
COPY --from=build-deps /app/prisma ./prisma
COPY --from=build-deps /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build-deps /app/package*.json ./
  
  # upload klasörleri
RUN mkdir -p uploads/banners uploads/avatars uploads/events

# Prisma generate (güvenlik için)
RUN npx prisma generate
  
  # güvenlik
  RUN chown -R appuser:nodejs /app
  USER appuser
  
  EXPOSE 3000
  
  # Healthcheck (3000!)
  HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
  
  ENTRYPOINT ["dumb-init","--"]
  
  # Önemli: migration + start
  CMD ["sh","-c","npx prisma migrate deploy && node dist/src/index.js"]
  