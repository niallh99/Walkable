FROM node:20-slim AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build frontend (Vite) and backend (esbuild)
RUN npm run build

# Production stage
FROM node:20-slim AS production
WORKDIR /app

# Copy package files and install production deps only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built output from build stage
COPY --from=base /app/dist ./dist

# Create uploads directory for local fallback
RUN mkdir -p uploads

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
