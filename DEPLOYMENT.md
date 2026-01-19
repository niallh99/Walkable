# Walkable V1 Deployment Guide

## Prerequisites

- Node.js 20+
- PostgreSQL database (Neon recommended)
- Google Maps API key with Geocoding and Directions APIs enabled

---

## Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Fill in required values:
   ```bash
   DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
   JWT_SECRET=<generate-with-openssl-rand-base64-32>
   GOOGLE_API_KEY=<your-google-api-key>
   ```

3. Set optional values for production:
   ```bash
   CORS_ORIGIN=https://your-domain.com
   NODE_ENV=production
   ```

---

## Database Setup

### Initial Setup (First Deployment)

```bash
# Install dependencies
npm install

# Push schema to database
npm run db:push
```

### Schema Updates (Subsequent Deployments)

```bash
# Push any schema changes
npm run db:push
```

**Note:** `db:push` is safe for additive changes (new tables, columns, indexes). For destructive changes, review the Drizzle output carefully.

### V1 Schema Includes

- `users` table with indexes on `username`, `email`
- `tours` table with indexes on `creatorId`, `latitude/longitude`
- `tour_stops` table with cascade delete on `tourId`
- `completed_tours` table with cascade delete on `tourId`, index on `userId`

---

## Build Process

### Development

```bash
# Start development server with hot reload
npm run dev
```

Server runs on `http://localhost:5000`

### Production Build

```bash
# Build frontend and bundle server
npm run build
```

This creates:
- `dist/public/` - Frontend static assets
- `dist/index.js` - Bundled server

### Production Start

```bash
# Start production server
npm run start
```

### Type Check (Optional)

```bash
# Verify TypeScript types
npm run check
```

---

## Verification

### Health Check

After deployment, verify the server is healthy:

```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-19T...",
  "database": "connected"
}
```

### Smoke Test

1. Visit the homepage
2. Register a new account
3. Create a test tour
4. Verify tour appears on discover map

---

## Deployment Platforms

### Replit (Current)

The app is configured for Replit deployment:
- Uses port 5000 (required by Replit)
- Includes Replit Vite plugins for development
- `.replit` configuration file present

### Other Platforms

For other platforms (Railway, Render, Fly.io):

1. Set environment variables in platform dashboard
2. Set build command: `npm run build`
3. Set start command: `npm run start`
4. Ensure port 5000 is exposed (or update code if platform requires different port)

---

## Troubleshooting

### Server Won't Start

```
FATAL: JWT_SECRET environment variable is required but not set
```
→ Set `JWT_SECRET` in your environment

```
Environment validation failed:
  - DATABASE_URL: DATABASE_URL is required
```
→ Set `DATABASE_URL` in your environment

### Database Connection Failed

```
{"status":"unhealthy","database":"disconnected"}
```
→ Check `DATABASE_URL` is correct and database is accessible

### Uploads Not Working

If uploads return 503:
→ Check `DISABLE_UPLOADS` is not set to `true`

---

## Post-Deployment

- [ ] Verify health endpoint returns "healthy"
- [ ] Test user registration flow
- [ ] Test tour creation with file uploads
- [ ] Verify map displays tours correctly
- [ ] Check browser console for errors

---

*For testing procedures, see `V1_TESTING_CHECKLIST.md`*
*For V1 scope and plan, see `WALKABLE_V1_PLAN.md`*
