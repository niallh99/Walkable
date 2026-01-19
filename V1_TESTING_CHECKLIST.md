# Walkable V1 Testing Checklist

This checklist covers all verification tasks for V1 release readiness.

---

## E1: Automated Tests

### Running the Test Suite

```bash
# Install dependencies (if not already done)
npm install

# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage
```

### Expected Test Coverage

The auth test suite (`tests/auth.test.ts`) covers:

- [ ] User registration (success, validation, duplicates)
- [ ] User login (success, invalid credentials)
- [ ] Protected route access (valid/invalid tokens)
- [ ] Logout functionality
- [ ] JWT token structure validation
- [ ] Password security verification (bcrypt)
- [ ] Error handling scenarios

**Pass Criteria:** All tests pass with no failures.

---

## E2: Manual Smoke Test Checklist

Perform each test in a browser. Check the box when verified.

### Authentication Flow

- [ ] **Register new user**
  - Go to `/register`
  - Enter valid username, email, password
  - Verify redirect to `/discover`
  - Verify user appears in navbar

- [ ] **Login/Logout**
  - Logout via navbar dropdown
  - Go to `/login`
  - Enter credentials
  - Verify redirect to `/discover`
  - Verify logout clears session

### Tour Creation

- [ ] **Create tour with 3 stops (audio + video)**
  - Go to `/create-tour`
  - Fill in tour details (title, description, category)
  - Upload cover image
  - Add Stop 1: Enter details, upload audio file, set location on map
  - Add Stop 2: Enter details, upload video file, set location on map
  - Add Stop 3: Enter details, upload audio file, set location on map
  - Submit and verify success toast
  - Verify redirect to profile

### Tour Discovery

- [ ] **View tour on discover map**
  - Go to `/discover`
  - Verify map loads with tour markers
  - Click a tour marker
  - Verify tour details appear in sidebar

- [ ] **Use location detection**
  - Click "Use My Location" (allow permission if prompted)
  - Verify map centers on location
  - Verify nearby tours filter applies

### Tour Playback

- [ ] **Play audio/video content**
  - Click a tour to open detail page
  - Click play on an audio stop
  - Verify audio plays
  - Click play on a video stop
  - Verify video displays and plays

### Tour Management

- [ ] **Edit existing tour**
  - Go to profile
  - Click edit on a tour
  - Change title or description
  - Save and verify changes persist

- [ ] **Delete tour**
  - Go to profile
  - Click delete on a tour
  - Confirm deletion
  - Verify tour removed from list

### Profile Management

- [ ] **Update profile**
  - Go to `/profile`
  - Click edit profile
  - Change username
  - Save and verify update

- [ ] **Mark tour as completed**
  - View a tour detail page
  - Complete/listen to the tour
  - Verify it appears in "Completed Tours" on profile

---

## E3: Edge Case Tests

### File Uploads

- [ ] **Create tour with no stops**
  - Attempt to create tour without adding stops
  - Verify appropriate error or handling

- [ ] **Upload max-size audio file (50MB)**
  - Create stop with ~50MB audio file
  - Verify upload completes or shows size error if exceeded

- [ ] **Upload max-size video file (100MB)**
  - Create stop with ~100MB video file
  - Verify upload completes or shows size error if exceeded

### Permission Handling

- [ ] **Test with location permissions denied**
  - Go to `/discover`
  - Deny location permission when prompted
  - Verify graceful fallback (shows all tours or error message)

### Network Conditions

- [ ] **Test with slow network**
  - Open Chrome DevTools → Network → Throttle to "Slow 3G"
  - Navigate through app
  - Verify loading spinners appear
  - Verify no UI breaks during slow loads

### Error Handling

- [ ] **Test upload kill-switch** (if configured)
  - Set `DISABLE_UPLOADS=true` in environment
  - Restart server
  - Attempt file upload
  - Verify 503 response

- [ ] **Test invalid tour ID**
  - Navigate to `/tour/99999` (non-existent ID)
  - Verify "Tour not found" message displays

- [ ] **Test expired token**
  - Login, then manually clear/corrupt token in localStorage
  - Attempt protected action
  - Verify redirect to login page

---

## E4: API Health Check

```bash
# Verify health endpoint
curl http://localhost:5000/api/health

# Expected response (when DB is connected):
# {"status":"healthy","timestamp":"...","database":"connected"}
```

---

## Pre-Launch Verification

Before deploying V1:

- [ ] All automated tests pass
- [ ] All smoke tests pass
- [ ] All edge case tests handled gracefully
- [ ] Health check returns "healthy"
- [ ] Environment variables properly configured (see below)

### Required Environment Variables

```bash
DATABASE_URL=<neon-connection-string>
JWT_SECRET=<secure-random-string>
GOOGLE_API_KEY=<google-maps-api-key>

# Optional
CORS_ORIGIN=<production-domain>
DISABLE_UPLOADS=false
NODE_ENV=production
```

---

## Sign-Off

| Tester | Date | All Tests Pass |
|--------|------|----------------|
| | | [ ] Yes |

---

*This checklist is part of the Walkable V1 release process.*
