# Walkable V1 Production-Ready Completion Plan

> **This document is the authoritative V1 contract for Walkable.**
> Last Updated: January 2026

---

## Executive Summary

Walkable is approximately **75% complete** for a production V1. Core features (auth, discovery, tour creation, playback, profiles) are functional. The remaining work focuses on **security hardening**, **critical bug fixes**, and **production infrastructure** - not new features.

---

## Table of Contents

1. [Minimum Viable Feature Set for V1](#part-1-minimum-viable-feature-set-for-v1)
2. [V1 Non-Goals (Explicitly Out of Scope)](#part-2-v1-non-goals-explicitly-out-of-scope)
3. [Technical Debt Triage](#part-3-technical-debt-triage)
4. [Step-by-Step Execution Plan](#part-4-step-by-step-execution-plan)
5. [Execution Order Summary](#execution-order-summary)
6. [Risk Assessment](#risk-assessment)
7. [Known Sharp Edges (V1 Limitations)](#known-sharp-edges-v1-limitations)
8. [Post-V1 Roadmap](#post-v1-roadmap-v11--v2)

---

## Part 1: Minimum Viable Feature Set for V1

### Core Features (Already Implemented)

| Feature | Status | Notes |
|---------|--------|-------|
| User registration/login | Complete | JWT-based, bcrypt hashing |
| Tour discovery on map | Complete | Leaflet + geolocation |
| Tour creation with stops | Complete | Multi-step wizard |
| Audio/video playback | Complete | Recently added video support |
| User profiles | Complete | Created/completed tours |
| Tour editing/deletion | Complete | Owner-only access |
| Location search | Complete | Google Geocoding API |

### Features to DEFER to V2 (Not Required for V1)

| Feature | Reason to Defer |
|---------|-----------------|
| Password reset via email | Nice-to-have; users can re-register |
| Email verification | Nice-to-have for MVP |
| Social sharing | Marketing feature, not core |
| Tour ratings/reviews | Community feature, not core |
| Offline mode/PWA | Complex; requires service worker |
| Tour favorites/bookmarks | UX enhancement, not critical |
| Advanced search (text) | Location-based search is sufficient |
| PostGIS spatial queries | In-memory Haversine works for <1000 tours |

---

## Part 2: V1 Non-Goals (Explicitly Out of Scope)

The following are **explicitly not goals** for V1. These items will not be addressed, and no effort should be spent on them until V1 ships successfully.

| Non-Goal | Rationale |
|----------|-----------|
| **No password recovery or email verification** | Users can re-register; email infrastructure is out of scope for V1 |
| **No offline mode or PWA support** | Requires service worker complexity; network connectivity is assumed |
| **No SEO or search engine optimization guarantees** | V1 is functional MVP; SEO is a V2 marketing concern |
| **No analytics accuracy guarantees** | Basic tracking only; detailed analytics are post-launch |
| **No backward compatibility guarantees for unpublished tours** | Draft/unpublished tour data may change without migration |
| **No data migration or recovery for deleted tours** | Deletion is permanent; no soft-delete or recovery mechanism |
| **No social features (ratings, reviews, sharing)** | Community features are explicitly V2 scope |
| **No performance guarantees beyond "reasonable for early production"** | No SLAs; performance optimization is iterative post-launch |

This list is **explicit and non-negotiable** for V1 scope.

---

## Part 3: Technical Debt Triage

### FIX NOW (Blocking Production)

| Issue | File | Risk | Effort |
|-------|------|------|--------|
| Hardcoded JWT secret fallback | `server/routes.ts:12` | **Critical** - Security vulnerability | Small |
| CORS `*` on uploads | `server/routes.ts:127-128` | High - Unrestricted access | Small |
| No API rate limiting | `server/routes.ts` | High - DoS vulnerability | Medium |
| No input sanitization | Multiple | High - XSS risk | Medium |
| No React error boundary | `client/src/App.tsx` | Medium - Crash = blank screen | Small |
| Missing database indexes | `shared/schema.ts` | Medium - Slow queries at scale | Small |

### FIX LATER (V1.1 or V2)

| Issue | File | Reason to Defer |
|-------|------|-----------------|
| Route file is 930 lines | `server/routes.ts` | Functional; refactor later |
| Tour creation is 1126 lines | `create-tour-new.tsx` | Works; refactor for maintainability |
| Duplicate upload handlers | `server/routes.ts` | DRY violation but functional |
| No pagination | API routes | Works for <100 tours; add when needed |
| Map clustering | `interactive-map.tsx` | Only needed with many tours |
| Image optimization | Multiple | Performance; not blocking |

---

## Part 4: Step-by-Step Execution Plan

### Phase A: Security Hardening (Priority 1)

#### A1. Remove JWT Secret Fallback
- **File**: `server/routes.ts:12`
- **Change**: Remove fallback, require `JWT_SECRET` env var
- **Add**: Startup validation that throws if missing
- **Risk**: Low (env var change only)

#### A2. Restrict CORS on Uploads
- **File**: `server/routes.ts:127-128`
- **Change**: Replace `*` with specific allowed origins
- **Add**: Environment-based origin configuration
- **Risk**: Low

#### A3. Add Rate Limiting
- **Install**: `express-rate-limit` package
- **Add**: Global rate limiter (100 req/min per IP)
- **Add**: Stricter limits for auth routes (5 req/min)
- **Files**: `server/routes.ts` or new `middleware/rateLimit.ts`
- **Risk**: Low

**Rate Limiting Guidance (Clarification):**

| Endpoint Category | Rate Limit | Rationale |
|-------------------|------------|-----------|
| **Public read-only endpoints** (tour discovery, map data, tour details) | Higher limits (e.g., 200 req/min) | These are read-only and cacheable; legitimate users may browse frequently |
| **Authentication routes** (login, register) | Strict limits (e.g., 5 req/min) | Prevent brute-force attacks on credentials |
| **Upload routes** (audio, video, images) | Moderate limits (e.g., 10 req/min) + size limits | Already size-limited by multer; rate limiting prevents abuse of storage |
| **Write operations** (create/update/delete tours) | Moderate limits (e.g., 30 req/min) | Prevent spam creation while allowing legitimate use |

#### A4. Add Input Sanitization
- **Install**: `xss` or `sanitize-html` package
- **Add**: Sanitize tour titles, descriptions, user input
- **Files**: `server/routes.ts` (POST/PUT handlers)
- **Risk**: Low

**Input Sanitization Strategy (Clarification):**

| Principle | Implementation |
|-----------|----------------|
| **Sanitization occurs on write, not on read** | All user-submitted text is sanitized before database insertion |
| **Clean data is stored in the database** | The database contains only sanitized content; no runtime sanitization on read |
| **System-generated URLs are excluded** | Media file URLs (`/uploads/...`) generated by the server are not sanitized as they are controlled by the system |
| **User-provided URLs are sanitized** | Any URLs submitted by users (if applicable) must be validated and sanitized |

#### A5. Add Helmet Security Headers
- **Install**: `helmet` package
- **Add**: Security headers middleware
- **File**: `server/index.ts`
- **Risk**: Low

#### A6. Add Upload Kill-Switch (Environment Control)
- **Add**: Environment variable `DISABLE_UPLOADS`
- **Behavior**: When `DISABLE_UPLOADS=true`, all upload endpoints (`/api/upload/audio`, `/api/upload/video`, `/api/upload/cover-image`) return HTTP 503 Service Unavailable
- **Response**: `{ "error": "Service temporarily unavailable", "details": "File uploads are currently disabled" }`
- **Use Case**: Emergency toggle if storage is compromised or quota exceeded
- **UI**: No UI required for V1; admin-only environment control
- **Risk**: Low

---

### Phase B: Error Handling & Stability (Priority 2)

#### B1. Add React Error Boundary
- **File**: New `client/src/components/error-boundary.tsx`
- **Wrap**: `App.tsx` main routes
- **Add**: User-friendly error UI with retry button
- **Risk**: Low

#### B2. Add API Error Handler Middleware
- **File**: New `server/middleware/errorHandler.ts`
- **Add**: Centralized error formatting
- **Remove**: Duplicate try-catch patterns
- **Risk**: Low

#### B3. Fix Completed Tours Cascade Delete
- **File**: `shared/schema.ts:48`
- **Add**: `onDelete: 'cascade'` to `completedTours.tourId`
- **Run**: `npm run db:push`
- **Risk**: Low (schema change)

#### B4. Add Database Indexes
- **File**: `shared/schema.ts`
- **Add**: Index on `tours.creatorId`
- **Add**: Index on `tours.latitude, tours.longitude`
- **Add**: Index on `completedTours.userId`
- **Run**: `npm run db:push`
- **Risk**: Low

---

### Phase C: Configuration & Environment (Priority 3)

#### C1. Create Environment Validation
- **File**: New `server/config.ts`
- **Add**: Zod schema for required env vars
- **Validate**: `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_API_KEY`
- **Fail fast**: Throw on missing required vars
- **Risk**: Low

#### C2. Add Production Logging
- **Option**: Use `pino` for structured JSON logging
- **File**: `server/index.ts` + routes
- **Add**: Request ID, user ID, latency in logs
- **Remove**: `console.log` statements
- **Risk**: Low

#### C3. Add Health Check Endpoint
- **File**: `server/routes.ts`
- **Add**: `GET /api/health` with DB connectivity check
- **Use**: For deployment health probes
- **Risk**: Low

#### C4. Configure Production CORS
- **File**: `server/index.ts`
- **Add**: Environment-based allowed origins
- **Dev**: `localhost:5000`
- **Prod**: Actual domain
- **Risk**: Low

#### C5. Database Backup & Restore Sanity Check
- **Verify**: Automated database backups exist at the provider level (Neon PostgreSQL)
- **Confirm**: A restore can be performed into a local or staging environment
- **Test**: Perform one manual restore test before V1 launch
- **Document**: Record backup schedule and restore procedure
- **Scope**: No custom backup tooling required for V1; rely on provider-level backups
- **Risk**: Low

---

### Phase D: Frontend Hardening (Priority 4)

#### D1. Add Loading States Consistency
- **Files**: All page components
- **Check**: Every async operation has loading indicator
- **Risk**: Low

#### D2. Improve Form Validation Feedback
- **Files**: Login, Register, Create Tour pages
- **Add**: Inline field errors (not just toast)
- **Risk**: Low

#### D3. Handle Token Expiration Gracefully
- **File**: `client/src/lib/queryClient.ts`
- **Add**: 401 response interceptor
- **Action**: Redirect to login, clear stale token
- **Risk**: Low

#### D4. Add Mobile Navigation Fix
- **File**: `client/src/components/navbar.tsx`
- **Test**: Mobile menu closes after navigation
- **Fix**: Any mobile UX issues
- **Risk**: Low

---

### Phase E: Testing & Validation (Priority 5)

#### E1. Run Existing Auth Tests
- **Command**: `npm test`
- **Ensure**: All 451 lines of auth tests pass
- **Risk**: Low

#### E2. Manual Smoke Test Checklist
- [ ] Register new user
- [ ] Login/logout
- [ ] Create tour with 3 stops (audio + video)
- [ ] View tour on discover map
- [ ] Play audio/video content
- [ ] Edit existing tour
- [ ] Delete tour
- [ ] Update profile
- [ ] Mark tour as completed

#### E3. Test Edge Cases
- [ ] Create tour with no stops
- [ ] Upload max-size files (50MB audio, 100MB video)
- [ ] Test with location permissions denied
- [ ] Test with slow network (Chrome DevTools throttling)
- [ ] Test upload kill-switch behavior

---

### Phase F: Documentation & Deployment Prep (Priority 6)

#### F1. Update Environment Variables Doc
- **Document**: All required env vars
- **Create**: `.env.example` file

#### F2. Verify Build Process
- **Run**: `npm run build`
- **Test**: `npm run start` in production mode
- **Verify**: Static assets serve correctly

#### F3. Database Migration Check
- **Verify**: `npm run db:push` works cleanly
- **Document**: Migration process

---

## Execution Order Summary

| Phase | Tasks | Est. Complexity | Dependencies |
|-------|-------|-----------------|--------------|
| **A** | Security (6 tasks) | Low-Medium | None |
| **B** | Stability (4 tasks) | Low | None |
| **C** | Config (5 tasks) | Low | A1 (JWT removal) |
| **D** | Frontend (4 tasks) | Low | None |
| **E** | Testing (3 tasks) | Low | A, B, C, D |
| **F** | Deploy Prep (3 tasks) | Low | E |

**Recommended Approach**: Execute phases A, B, C, D in parallel where possible, then E, then F.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing functionality | Low | High | Run tests after each change |
| Database migration issues | Low | High | Back up DB before schema changes |
| Auth regression | Medium | High | Auth tests already exist (451 lines) |
| File upload issues | Low | Medium | Test with real files after CORS changes |

---

## Known Sharp Edges (V1 Limitations)

The following are **known limitations** in V1. These are documented for internal awareness and should be communicated to early users as appropriate. This list is expected to evolve post-launch.

| Limitation | Description |
|------------|-------------|
| **Tour deletion is permanent** | Deleted tours cannot be recovered. There is no soft-delete, trash, or undo functionality. |
| **No undo functionality** | Actions like tour deletion, stop removal, and profile changes are immediate and irreversible. |
| **Large uploads may be slow on mobile networks** | Audio files up to 50MB and video files up to 100MB may take significant time on slow connections. No progress indicator beyond browser default. |
| **No offline playback** | Tours require an active network connection. Downloaded media cannot be played offline. |
| **Limited graceful recovery from network interruptions** | If network is lost during tour creation or upload, partial data may be lost. Users should save frequently. |
| **Geolocation accuracy varies by device** | Location detection depends on device GPS/network. Indoor or low-signal areas may have degraded accuracy. |
| **No tour versioning** | Edits to a tour overwrite the previous version. There is no revision history. |
| **Session expires after 7 days** | JWT tokens expire after 7 days. Users must re-login after expiration. |

---

## Post-V1 Roadmap (V1.1 / V2)

After V1 ships, prioritize:

1. **Code refactoring** - Split routes.ts, break up large components
2. **Pagination** - Add when tours exceed 100
3. **Password reset** - Email integration
4. **Search** - Full-text search on tour titles/descriptions
5. **Performance** - Image optimization, lazy loading
6. **Analytics** - Tour play/completion tracking
7. **Offline support** - Service worker for PWA
8. **Social features** - Ratings, reviews, sharing

---

---

## Appendix: Database Backup Procedures (C5)

### Provider: Neon PostgreSQL

**Backup Type:** Neon provides automatic point-in-time recovery (PITR) for all databases.

**Backup Schedule:**
- Continuous WAL archiving (Write-Ahead Logging)
- Point-in-time recovery available within retention window
- Default retention: 7 days (Free tier) / 30 days (Pro tier)

**Restore Procedure:**
1. Log into Neon Console (console.neon.tech)
2. Navigate to project → Branches
3. Create a new branch from a specific point in time
4. Connect to the restored branch to verify data
5. If verified, promote the branch or migrate data as needed

**Pre-Launch Checklist:**
- [ ] Verify Neon project has automatic backups enabled
- [ ] Confirm retention period meets requirements
- [ ] Test restore by creating a branch from 24 hours ago
- [ ] Document connection string format for restored branches

**V1 Scope:** No custom backup tooling. Rely on Neon's built-in PITR capabilities.

---

## Conclusion

Walkable V1 requires **~25 focused tasks** to reach production readiness. The majority are small, low-risk changes focused on security and stability. No new features are needed - the core product is complete. The biggest wins are:

1. **Removing the JWT secret fallback** (critical security fix)
2. **Adding rate limiting** (prevent abuse)
3. **Adding error boundary** (prevent blank screen crashes)
4. **Adding health check** (deployment monitoring)
5. **Verifying backup/restore** (data safety)

---

*This document serves as the authoritative V1 contract for Walkable. All implementation work should reference this plan.*
