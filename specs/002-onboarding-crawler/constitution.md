# AI Companion Constitution (Revised)

## Core Principles

### I. Pipeline Architecture (NON-NEGOTIABLE)
Every fan message flows through a sequential pipeline: AI text → voice synthesis → video generation. This ensures modularity, scalability, and clear responsibility at each stage.

### II. Onboarding Feeds the Pipeline (NEW)
The social profile crawler is the single source of truth for avatar image and persona seed. No hardcoded personas or static images — the onboarding output drives D-ID (image) and the AI system prompt (persona). Manual fallback is allowed only when crawling fails.

### III. Real-Time Responsiveness
The system prioritizes real-time responsiveness. Text is delivered first, with media upgrades (audio, video) processed asynchronously to maintain user engagement.

### IV. Minimalist Frontend Design
The frontend is designed to be immersive and distraction-free. Onboarding is a single-step form. Chat is a single-screen interface with no complex navigation.

### V. Graceful Degradation
Error handling follows a graceful degradation pattern:
- **Crawling**: If scrape fails → allow manual image upload + name entry.
- **Media pipeline**: If video generation fails → fall back to audio; if audio fails → fall back to text.
This ensures uninterrupted user experience at every stage.

### VI. Server-Side Media Generation
All media (text, audio, video) is generated server-side using Azure OpenAI for LLM, ElevenLabs for voice synthesis, and D-ID for video. Media is served via Express static routes for efficiency and reliability.

### VII. Demo-Grade Storage
No database. All state is in-memory and session-scoped. This is a demo, not a production system. Simplicity over durability.

## Additional Constraints

### Technology Stack
- Azure OpenAI for language model processing.
- ElevenLabs for voice synthesis.
- D-ID for video generation.
- Puppeteer for social profile crawling (JS-rendered pages).
- Cheerio as lightweight fallback for static pages.
- Express.js for server-side routing and static file serving.

### Performance Standards
- Text responses must be delivered within 500ms.
- Audio and video upgrades must not exceed 2 seconds for processing.
- Onboarding (submit → crawl → chat redirect) must complete within 15 seconds.

## Development Workflow

### Testing and Quality Gates
- Unit tests for each pipeline stage.
- Unit tests for crawler (mock HTML responses).
- Integration tests for end-to-end: onboarding → crawl → chat → response.
- Load testing to ensure real-time performance under peak conditions.

### Code Review Process
- All pull requests must include test results.
- Code must adhere to the principles outlined in this constitution.

## Governance

This constitution supersedes all other practices. Amendments require:
- Documentation of proposed changes.
- Approval from the project lead.
- A migration plan to ensure compliance with updated principles.

**Version**: 2.0.0 | **Ratified**: 2026-04-01 | **Last Amended**: 2026-04-06
