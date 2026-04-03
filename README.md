# AI Companion — MrBeast AI Influencer Chat

Real-time AI chatbot where fans interact with an AI version of **MrBeast**. Text responses come instantly, then a lip-synced talking-head video generates via D-ID.

## Pipeline

```
User Message → Azure OpenAI (GPT-4o) → Text + Emotion Detection
                                              ↓
                                         D-ID Talks API → Lip-synced Video
```

**ElevenLabs voice service** is built and ready but currently bypassed — the socket handler uses D-ID's built-in TTS (`generateVideoFromText`) for the MVP.

## Tech Stack

| Layer | Tech |
|-------|------|
| LLM | Azure OpenAI GPT-4o (via DefaultAzureCredential) |
| Video | D-ID Talks API (uploads image + uses text-to-speech) |
| Voice | ElevenLabs (built, not active in current pipeline) |
| Backend | Node.js, Express, Socket.IO |
| Frontend | Vanilla HTML/CSS/JS (no build step) |

## Project Structure

```
ai-companion/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   └── socket.js           ← ⭐ MAIN ENTRY POINT (Express + Socket.IO server)
│   │   └── services/
│   │       ├── aiService.js         ← Azure OpenAI client wrapper
│   │       ├── emotionService.js    ← Detects emotion from AI text response
│   │       ├── inputFilterService.js← Blocks prohibited content (hate speech, PII)
│   │       ├── voiceService.js      ← ElevenLabs TTS (ready, not in active pipeline)
│   │       ├── videoService.js      ← D-ID video generation (image upload + talks API)
│   │       ├── fallbackService.js   ← Timeout/fallback handling for media generation
│   │       └── loggingService.js    ← In-memory logging for sessions
│   └── tests/
│       ├── jest.config.js
│       └── messageRoutes.test.js
├── frontend/
│   ├── index.html                   ← Main UI (character view + chat input)
│   ├── styles.css                   ← Full-screen character layout styling
│   ├── app.js                       ← Socket.IO client, handles text/audio/video events
│   └── src/components/
│       ├── ChatBubble.js/.css       ← Chat message bubble component
│       ├── Disclosure.js            ← AI disclosure footer
│       ├── InputBar.js/.css         ← Message input bar
│       └── UI.js/.css               ← Main UI orchestrator
├── assets/
│   └── avatar.jpg                   ← MrBeast photo (uploaded to D-ID for lip-sync)
├── specs/
│   └── 001-ai-companion/           ← Spec-kit: constitution, plan, spec, tasks
├── .specify/                        ← Spec-kit config
├── .github/                         ← GitHub agents config
├── package.json
├── .env.example
└── .gitignore
```

## Where to Look

### To understand the full chat flow:
→ **`backend/src/api/socket.js`** — This is the main server file. It:
1. Serves the frontend
2. Handles Socket.IO `chat` events
3. Calls `aiService` for LLM response
4. Calls `emotionService` to detect emotion
5. Calls `videoService.generateVideoFromText()` for D-ID video
6. Streams text → video back to the client

### To understand the AI persona:
→ **`backend/src/api/socket.js`** lines ~30-50 — The `SYSTEM_PROMPT` constant defines MrBeast's personality, speaking style, and rules.

### To understand D-ID integration:
→ **`backend/src/services/videoService.js`** — Two methods:
- `generateVideoFromText()` — Currently used. Sends text to D-ID, which does its own TTS + lip-sync.
- `generateVideo()` — Takes an audio file (from ElevenLabs), uploads to D-ID, generates lip-sync. Ready for Phase 2.

### To understand the frontend:
→ **`frontend/app.js`** — Socket.IO client that handles `message`, `video_ready`, `audio_ready` events. Shows static avatar, swaps to video when D-ID result arrives.

### To understand the spec/planning:
→ **`specs/001-ai-companion/`** — Contains the constitution, implementation plan, spec, and task breakdown.

## Setup

1. Clone the repo
2. `npm install`
3. Copy `.env.example` → `.env` and fill in your keys
4. Azure auth: run `az login` (DefaultAzureCredential)
5. `node backend/src/api/socket.js`
6. Open `http://localhost:3000`

## Notes

- Text response is instant; video takes ~10-30s to generate via D-ID
- Sessions are in-memory (demo only, no database)
- Input filter blocks hate speech, PII patterns (SSN, phone, address)
- Emotion detection drives future avatar expression changes
- The `fallbackService` handles timeouts gracefully (text always delivers, media is best-effort)
