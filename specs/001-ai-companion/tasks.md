# Tasks: AI Influencer Chat App

**Feature Branch**: `[001-ai-influencer-chat]`  
**Created**: 2026-04-01  
**Spec**: [spec.md](./spec.md)  
**Plan**: [plan.md](./plan.md)

## Phase 1: Setup

- [ ] T001 Initialize Node.js project with `express`, `socket.io`, and other dependencies.
- [ ] T002 Set up environment variables: `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `DID_API_KEY`, `PORT`.
- [ ] T003 Create project structure: `backend/`, `frontend/`, `specs/`.
- [ ] T004 Configure Jest and Supertest for testing.

## Phase 2: Backend Development

### Real-Time Chat
- [ ] T005 [P] Implement Socket.IO server in `backend/src/api/socket.js`. (FR-001)
- [ ] T006 [P] Create message handling logic in `backend/src/services/messageService.js`. (FR-001)
- [ ] T007 [P] Integrate Azure OpenAI GPT-4o for text responses in `backend/src/services/aiService.js`. (FR-001)

### Persona Configuration
- [ ] T031 [P] Define persona config structure (name, type, personality traits, speaking style, tone, catchphrases, expertise, boundaries with off-limits topics + redirect phrase). Hardcode MrBeast persona for MVP. (FR-003)
- [ ] T032 [P] Inject persona as system prompt into Azure OpenAI calls. (FR-003)

### Content Moderation
- [ ] T033 [P] Implement input moderation — keyword/regex blocklist for hate speech, explicit content, threats, personal info requests (SSN, phone, address patterns). Return friendly redirect when blocked. (FR-004)
- [ ] T034 Implement output moderation — check AI responses for off-limits content, AI self-references, real URLs/phone numbers. Regenerate once on violation, then use redirect phrase. (FR-004)

### Conversation History
- [ ] T035 [P] Implement in-memory session storage keyed by sessionId. Store {role, content} message arrays. Send last 10 messages as context to Azure OpenAI. Cap at 20 messages per session (sliding window). Auto-create sessions on first message. (FR-006)

### Emotion Detection
- [ ] T036 [P] Implement emotion detection function — keyword matching on AI response text, evaluated top-to-bottom, first match wins: excited (!! / let's go, fire, insane, crazy), laughing (😂 🤣 haha lol lmao), thinking (? / hmm maybe wonder), surprised (oh wow omg no way), sad (sorry rough tough), happy (😊 nice great awesome love), neutral (default). Return emotion enum. (FR-007)

### Media Generation
- [ ] T008 [P] Implement ElevenLabs voice synthesis integration in `backend/src/services/voiceService.js`. (FR-002, FR-013)
- [ ] T009 [P] Implement D-ID video generation integration in `backend/src/services/videoService.js`. (FR-002)
- [ ] T010 [P] Create graceful degradation fallback chain: text delivered immediately via Socket.IO → audio upgrade when ElevenLabs completes → video upgrade when D-ID completes. If voice fails (>3 sec timeout), skip audio+video. If video fails (>8 sec timeout), keep audio with static avatar. Each stage independent. (FR-007)

### Static File Serving
- [ ] T011 Serve `frontend/` via Express static routes in `backend/src/api/staticRoutes.js`.
- [ ] T012 Serve media files from `temp/` directory via Express static routes.

## Phase 3: Frontend Development

### UI Implementation
- [ ] T013 [P] Create single-screen layout with three layers: full-bleed background, centered character (60-70% viewport height), bottom input bar. (FR-008, FR-009)
- [ ] T014 [P] Implement input bar with semi-transparent dark backdrop, rounded field, send button, placeholder "Say something...", disabled state with typing indicator during generation. (FR-009, FR-010)
- [ ] T015 [P] Display influencer character — static photo when idle, pulse/recording overlay when generating, D-ID video playback when ready. Auto-play audio, video replaces static photo inline. (FR-008, FR-013)
- [ ] T037 [P] Add influencer name + "AI" badge in top-left corner. (FR-011)
- [ ] T038 [P] Add "AI Generated" disclosure — visible text "Powered by AI — responses are generated, not from [influencer name] directly" at top or bottom edge of UI. Always visible. (FR-005)

### Responsiveness
- [ ] T016 [P] Mobile-first responsive design — base layout targets 375px-428px width, max-width ~500px centered on desktop, background extends full viewport width, minimum 44px tap targets. (FR-012)

## Phase 4: Testing

### Unit Tests
- [ ] T018 Write unit tests for `messageService.js`.
- [ ] T019 Write unit tests for `aiService.js`.
- [ ] T020 Write unit tests for `voiceService.js`.
- [ ] T021 Write unit tests for `videoService.js`.

### Integration Tests
- [ ] T022 Test end-to-end message flow: fan message → AI response → video generation.
- [ ] T023 Test fallback scenarios for media generation failures.

## Phase 5: Deployment

- [ ] T024 Set up deployment pipeline for Node.js backend.
- [ ] T025 Deploy app to staging environment.
- [ ] T026 Perform load testing for 10k concurrent users.
- [ ] T027 Deploy app to production.

## Phase 6: Polish

- [ ] T028 Optimize media generation performance.
- [ ] T029 Improve error handling and logging.
- [ ] T030 Conduct final UI/UX review and make adjustments.
- [ ] T039 Add basic engagement metrics logging — messages per session, response times, media generation success/failure rates. (SC-004)

**Version**: 1.0.0 | **Created**: 2026-04-01