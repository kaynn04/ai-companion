# Feature Specification: Social Onboarding + Profile Crawler

**Feature Branch**: `[002-onboarding-crawler]`  
**Created**: 2026-04-06  
**Status**: Draft  
**Depends On**: 001-ai-companion (chat UI, media pipeline)  
**Input**: Demo requires avatar image and persona to come from social profile scraping, not manual input. User links their social account, crawler extracts profile photo and bio, then feeds the existing chat pipeline.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Link Social Account (Priority: P0)
User pastes a public social profile URL so the system can build their AI companion automatically.

**Why this priority**: Without onboarding, the demo has no way to create a companion dynamically.

**Independent Test**: Verify that a user can submit a Facebook/IG/X/TikTok profile URL and be redirected to the chat screen.

**Acceptance Scenarios**:
1. **Given** the onboarding page is loaded, **When** a user enters their name and a valid Facebook profile URL, **Then** the system accepts the input and shows a "Building your AI..." loading state.
2. **Given** the user submits a profile URL, **When** the crawler finishes, **Then** the user is redirected to the chat screen with their scraped avatar visible.
3. **Given** the user enters an invalid or unsupported URL, **When** they hit submit, **Then** a clear error message is shown ("Please enter a valid social profile URL").

---

### User Story 2 — Profile Crawling (Priority: P0)
System scrapes the public social profile to extract avatar image and bio text.

**Why this priority**: The crawler is the bridge between onboarding and the AI pipeline — no crawler, no demo.

**Independent Test**: Verify that given a valid public Facebook profile URL, the crawler returns a profile image URL and bio text within 10 seconds.

**Acceptance Scenarios**:
1. **Given** a valid public Facebook profile URL, **When** the crawler runs, **Then** it extracts the profile photo (highest resolution available) and bio/description text.
2. **Given** a valid public Instagram profile URL, **When** the crawler runs, **Then** it extracts the profile photo and bio text.
3. **Given** a private or inaccessible profile, **When** the crawler runs, **Then** it returns a clear error ("Profile is private or inaccessible") and the user is prompted to try another URL or upload manually.
4. **Given** the crawler extracts a profile photo, **When** the image is saved, **Then** it is stored locally in a format suitable for D-ID (JPEG/PNG, minimum 256x256).

---

### User Story 3 — Auto-Generated Persona (Priority: P1)
The AI persona is automatically generated from the scraped profile data instead of being hardcoded.

**Why this priority**: Eliminates manual persona configuration for the demo.

**Independent Test**: Verify that the generated persona system prompt includes the scraped display name and reflects the bio content.

**Acceptance Scenarios**:
1. **Given** the crawler returns a display name and bio, **When** the persona is generated, **Then** the system prompt includes the name, references the bio content, and sets a conversational tone.
2. **Given** the crawler returns a name but no bio (empty bio), **When** the persona is generated, **Then** a generic friendly persona is created using just the name.

---

### Edge Cases

- What if the social platform blocks the scrape (rate limit, captcha)?
- What if the profile photo is too low resolution for D-ID?
- What if the user pastes a post URL instead of a profile URL?
- What if the user has no profile photo set?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-101**: System MUST display an onboarding page as the entry point (before chat).
- **FR-102**: Onboarding page MUST accept: user's display name and one social profile URL.
- **FR-103**: Supported platforms: Facebook, Instagram, X (Twitter), TikTok.
- **FR-104**: System MUST validate the URL format before triggering the crawler.
- **FR-105**: Crawler MUST extract: profile photo (highest available resolution) and bio/description text.
- **FR-106**: Crawler MUST save the profile photo locally in JPEG or PNG format, minimum 256x256 pixels.
- **FR-107**: System MUST auto-generate an AI persona system prompt from the scraped display name and bio.
- **FR-108**: After successful crawl, system MUST redirect user to the chat screen with the scraped avatar as the D-ID source image.
- **FR-109**: If crawl fails, system MUST show an error and allow retry or manual image upload as fallback.
- **FR-110**: Onboarding state MUST be stored in-memory (session-based, no database) — demo grade.
- **FR-111**: The entire onboarding flow (submit → crawl → redirect) SHOULD complete within 15 seconds.

### Key Entities

- **OnboardingSession**: { sessionId, userName, socialUrl, platform, status (pending|crawling|done|error) }
- **CrawlResult**: { profileImagePath, displayName, bio, platform, scrapedAt }
- **GeneratedPersona**: { name, systemPrompt, sourceUrl }

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-101**: 80%+ of valid public profile URLs successfully scraped on first attempt.
- **SC-102**: Onboarding-to-chat redirect completes within 15 seconds for 90% of users.
- **SC-103**: Generated persona produces coherent, in-character AI responses in first chat message.

## Assumptions

- Social profiles are public (no OAuth/login required for demo).
- Scraping public profiles is acceptable for demo purposes (not production-scale).
- Puppeteer is available for JS-rendered pages (Facebook, IG); Cheerio as fallback for static pages.
- D-ID accepts the scraped profile photo format without additional processing.
- No persistent storage — everything is in-memory per session.
