# Tasks: Social Onboarding + Profile Crawler

**Feature Branch**: `[002-onboarding-crawler]`  
**Created**: 2026-04-06  
**Spec**: [spec.md](./spec.md)  
**Plan**: [plan.md](./plan.md)

## Phase 1: Backend — Crawler Foundation

- [ ] T101 Install new dependencies: `puppeteer`, `cheerio`, `sharp`. Update package.json.
- [ ] T102 Create `backend/src/models/onboardingSession.js` — in-memory store for onboarding sessions. Map keyed by sessionId. Shape: `{ sessionId, userName, socialUrl, platform, status, crawlResult, persona, createdAt }`.
- [ ] T103 Create `backend/src/services/crawlerService.js` — main crawler module.
  - `detectPlatform(url)` — regex-based platform detection (facebook.com, instagram.com, x.com/twitter.com, tiktok.com). Returns platform enum or null.
  - `scrapeProfile(url, platform)` — dispatches to platform-specific scraper. Returns `{ imageUrl, displayName, bio }`.
  - Platform scrapers use Puppeteer (headless), fall back to OpenGraph meta tags (`og:image`, `og:description`) if specific selectors fail.
  - 15-second timeout per scrape. (FR-105, FR-111)
- [ ] T104 Create `backend/src/services/imageProcessor.js` — download profile image from URL, validate with sharp (min 256x256, JPEG/PNG), resize if needed, save to `temp/{sessionId}/avatar.jpg`. (FR-106)
- [ ] T105 Create `backend/src/services/personaGenerator.js` — takes `{ displayName, bio, platform }`, returns a system prompt string using the template from plan.md. Handle empty bio gracefully (generic friendly persona). (FR-107)

## Phase 2: Backend — API Routes

- [ ] T106 Create `backend/src/api/onboardingRoutes.js`:
  - `POST /api/onboard` — accepts `{ name, socialUrl }`. Validates URL, detects platform, creates session, kicks off async crawl. Returns `{ sessionId, status: 'crawling' }`. (FR-101, FR-102, FR-104)
  - `GET /api/onboard/status/:sessionId` — returns current onboarding session status + crawl result when done. (FR-110)
  - `POST /api/onboard/fallback/:sessionId` — accepts manual image upload (multipart) + name, for when crawl fails. Processes image, generates generic persona. (FR-109)
- [ ] T107 Wire onboarding routes into Express app (`backend/src/index.js` or wherever app is initialized).
- [ ] T108 Modify `backend/src/services/aiService.js` — accept dynamic persona system prompt from onboarding session instead of hardcoded persona. Session-based lookup: get persona from onboardingSession store by sessionId. (FR-107, FR-108)

## Phase 3: Frontend — Onboarding Page

- [ ] T109 Create `frontend/src/pages/Onboarding.js` + `Onboarding.css`:
  - Clean form: name input, URL input, platform auto-detection indicator (shows detected platform icon).
  - Submit button → `POST /api/onboard` → show loading state ("Building your AI...").
  - Poll `GET /api/onboard/status/:sessionId` every 2 seconds.
  - On success → redirect to chat with sessionId. (FR-101, FR-102, FR-111)
  - On error → show error message + "Try another URL" or "Upload photo instead" button. (FR-109)
- [ ] T110 Create `frontend/src/components/PlatformSelector.js` + `PlatformSelector.css`:
  - Visual icons for Facebook, Instagram, X, TikTok.
  - Auto-highlights detected platform when URL is pasted.
  - Purely visual — platform is detected server-side. (FR-103)
- [ ] T111 Modify `frontend/src/App.js`:
  - Add simple client-side routing (hash-based, no react-router needed for demo).
  - `#/` or `#/onboard` → Onboarding page.
  - `#/chat/:sessionId` → existing chat UI.
  - Default route is onboarding. (FR-101, FR-108)
- [ ] T112 Modify `frontend/src/components/CharacterDisplay.js`:
  - Accept dynamic avatar path from session (e.g., `/temp/{sessionId}/avatar.jpg`).
  - Replace hardcoded `/static/character-idle.png` with session-specific avatar.
  - Idle state shows scraped profile photo. (FR-108)

## Phase 4: Integration

- [ ] T113 Wire the full flow end-to-end:
  - Onboarding submit → crawler → image processing → persona generation → session update → frontend redirect → chat with dynamic avatar + persona.
  - Verify D-ID receives the scraped avatar image (integration point with 001 video pipeline).
- [ ] T114 Implement error flow: crawl failure → show error on frontend → user can retry with different URL or use manual upload fallback → fallback proceeds to chat with uploaded image + generic persona.

## Phase 5: Testing

- [ ] T115 Unit tests for `crawlerService.js` — mock HTTP responses for each platform, test selector extraction, test OpenGraph fallback, test timeout handling.
- [ ] T116 Unit tests for `imageProcessor.js` — test valid image download, test undersized image handling, test corrupt image handling.
- [ ] T117 Unit tests for `personaGenerator.js` — test with full bio, empty bio, various platforms.
- [ ] T118 Unit tests for `onboardingRoutes.js` — test valid/invalid URLs, test status polling, test fallback upload.
- [ ] T119 Integration test: full onboarding → crawl → chat flow with mocked social profile responses.

## Phase 6: Polish

- [ ] T120 Add loading animations to onboarding (progress steps: "Detecting platform..." → "Scraping profile..." → "Building your AI...").
- [ ] T121 Handle edge cases: post URL instead of profile URL (detect and prompt), no profile photo (use default avatar), very long bio (truncate for persona).
- [ ] T122 Puppeteer resource cleanup — ensure browser closes after each scrape, handle zombie processes.

**Version**: 1.0.0 | **Created**: 2026-04-06
