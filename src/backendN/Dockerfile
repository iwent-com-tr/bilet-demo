# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig.json ./
COPY json-loader.mjs ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
COPY json-loader.mjs ./
RUN npm ci --only=production

# Copy built files and prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "--import", "data:text/javascript,import { register } from \"node:module\"; import { pathToFileURL } from \"node:url\"; register(\"./json-loader.mjs\", pathToFileURL(\"./\"));", "dist/src/index.js"]
