# Implementation Plan: Social Onboarding + Profile Crawler

**Branch**: `[002-onboarding-crawler]` | **Date**: 2026-04-06 | **Spec**: [spec.md](./spec.md)

## Summary

Adds a social onboarding flow and profile crawler to the AI Companion app. Users paste a public social profile URL, the system scrapes their profile photo and bio, auto-generates an AI persona, and feeds the existing chat + media pipeline. Demo-grade — no database, no OAuth, everything in-memory.

## Technical Context

**Language/Version**: Node.js 18.x  
**New Dependencies**: puppeteer, cheerio, sharp (image processing/validation)  
**Existing Dependencies**: express, socket.io, openai, axios, dotenv  
**Storage**: In-memory (extends existing session storage)  
**Testing**: Jest for unit tests, Supertest for API tests  
**Target Platform**: Web browsers (mobile-first)  
**Constraints**: Public profiles only, no auth, 15-second onboarding target  
**Scale/Scope**: Demo — single user at a time is fine

## Constitution Check

- **Pipeline Architecture**: ✅ Crawler feeds into existing pipeline, doesn't replace it.
- **Onboarding Feeds the Pipeline**: ✅ This spec implements that principle.
- **Real-Time Responsiveness**: ✅ Onboarding is async with loading state; chat remains real-time.
- **Minimalist Frontend Design**: ✅ Single form page, then redirect to existing chat UI.
- **Graceful Degradation**: ✅ Manual upload fallback if crawler fails.
- **Demo-Grade Storage**: ✅ All in-memory.

## Project Structure

### New Files

```text
backend/src/
├── services/
│   ├── crawlerService.js       # Social profile scraping (Puppeteer + Cheerio)
│   ├── personaGenerator.js     # Auto-generate persona from crawl result
│   └── imageProcessor.js       # Validate/resize profile image for D-ID
├── api/
│   └── onboardingRoutes.js     # POST /api/onboard, GET /api/onboard/status/:id
└── models/
    └── onboardingSession.js    # In-memory session store

frontend/src/
├── pages/
│   └── Onboarding.js           # Onboarding form page
│   └── Onboarding.css
└── components/
    └── PlatformSelector.js     # Platform icon selector (FB, IG, X, TikTok)
    └── PlatformSelector.css
```

### Modified Files

```text
frontend/src/App.js             # Add routing: onboarding → chat
frontend/src/components/CharacterDisplay.js  # Use dynamic avatar from crawl result
backend/src/services/aiService.js            # Accept dynamic persona instead of hardcoded
```

## Architecture Flow

```
[Onboarding Page]
    ↓ POST /api/onboard { name, socialUrl }
[URL Validation + Platform Detection]
    ↓
[Crawler Service]
    ├─ Puppeteer: launch headless browser
    ├─ Navigate to profile URL
    ├─ Extract: profile image URL, display name, bio text
    ├─ Download profile image → sharp → validate/resize
    └─ Save to temp/{sessionId}/avatar.jpg
    ↓
[Persona Generator]
    ├─ Input: { displayName, bio, platform }
    ├─ Template: "You are {name}, a {platform} creator. {bio-derived traits}..."
    └─ Output: system prompt string
    ↓
[Session Update]
    ├─ Store: avatarPath, persona, displayName
    └─ Status: done
    ↓
[Redirect to Chat]
    ├─ CharacterDisplay uses temp/{sessionId}/avatar.jpg
    ├─ AI Service uses generated persona as system prompt
    └─ D-ID uses avatar.jpg as source image
```

## Crawler Strategy by Platform

| Platform  | Method    | Profile Photo Selector | Bio Selector |
|-----------|-----------|----------------------|--------------|
| Facebook  | Puppeteer | `img[data-imgperflogname="profilePhoto"]` or og:image meta | `.bio` div or meta description |
| Instagram | Puppeteer | og:image meta tag | meta description |
| X/Twitter | Cheerio   | `img` with `profile_images` in src, or og:image | meta description |
| TikTok    | Puppeteer | og:image meta tag | meta description |

**Fallback strategy**: If specific selectors fail, try OpenGraph meta tags (`og:image`, `og:description`) which most platforms expose.

## Persona Generation Template

```
You are {displayName}, a content creator on {platform}.
Based on your profile: {bio}

Personality guidelines:
- Speak naturally and casually, as {displayName} would
- Reference your content style and interests from your bio
- Be friendly, engaging, and authentic
- Keep responses concise (2-3 sentences for casual chat)
- If asked about something outside your profile context, be honest but creative

You are an AI companion inspired by {displayName}, not the real person.
```

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Social platform blocks scrape | High | Fallback to og:image meta tags; manual upload as last resort |
| Profile is private | Medium | Detect and show clear error message |
| Low-res profile image | Medium | sharp validates minimum 256x256; upscale or prompt user |
| Rate limiting | Low (demo) | Single user at a time; add delays between requests |
| Puppeteer memory usage | Medium | Close browser after each scrape; single instance |

## Complexity Tracking

No constitution violations. Moderate complexity — Puppeteer adds weight but is necessary for JS-rendered social profiles.
