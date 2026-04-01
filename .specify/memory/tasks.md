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
- [ ] T005 [P] Implement Socket.IO server in `backend/src/api/socket.js`.
- [ ] T006 [P] Create message handling logic in `backend/src/services/messageService.js`.
- [ ] T007 [P] Integrate Azure OpenAI GPT-4o for text responses in `backend/src/services/aiService.js`.

### Media Generation
- [ ] T008 [P] Implement ElevenLabs voice synthesis integration in `backend/src/services/voiceService.js`.
- [ ] T009 [P] Implement D-ID video generation integration in `backend/src/services/videoService.js`.
- [ ] T010 [P] Create fallback logic for media generation failures in `backend/src/services/fallbackService.js`.

### Static File Serving
- [ ] T011 Serve `frontend/` via Express static routes in `backend/src/api/staticRoutes.js`.
- [ ] T012 Serve media files from `temp/` directory via Express static routes.

## Phase 3: Frontend Development

### UI Implementation
- [ ] T013 [P] Create single-screen layout in `frontend/src/pages/index.html`.
- [ ] T014 [P] Implement input bar with semi-transparent backdrop and typing indicator in `frontend/src/components/inputBar.js`.
- [ ] T015 [P] Display influencer character with idle photo and video overlay in `frontend/src/components/influencerDisplay.js`.

### Responsiveness
- [ ] T016 [P] Ensure mobile-first design with max-width ~500px on desktop.
- [ ] T017 [P] Add "AI Generated" disclosure in the top-left corner.

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

**Version**: 1.0.0 | **Created**: 2026-04-01