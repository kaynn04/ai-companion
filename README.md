# AI Companion — Influencer AI Chat with Onboarding

Create an AI companion from any influencer's social profiles. Users paste their social links, the system crawls public data (photos, bio, style), and generates a personalized AI chat with voice responses.

## Pipeline

```
Onboarding:   Social URLs → Puppeteer/Cheerio Crawl → Avatar + Persona

Chat:         User Message → Azure OpenAI (GPT-4o) → Text + Emotion
                                                          ↓
                                                     ElevenLabs TTS → Voice Playback
```

D-ID video generation is built and wired in the backend (`videoService`) but currently bypassed in the frontend — the active flow uses ElevenLabs TTS with auto-play.

## Tech Stack

| Layer | Tech |
|-------|------|
| LLM | Azure OpenAI GPT-4o (via DefaultAzureCredential) |
| Voice | ElevenLabs TTS (active — `/api/tts` endpoint) |
| Video | D-ID Talks API (built, not active in frontend) |
| Scraping | Puppeteer + Cheerio (social profile crawling) |
| Backend | Node.js, Express, Socket.IO |
| Frontend | React 19, Vite 8, Socket.IO Client |

## Project Structure

```
ai-companion/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   └── socket.js           ← Express + Socket.IO server (chat + onboarding endpoints)
│   │   └── services/
│   │       ├── aiService.js         ← Azure OpenAI client wrapper
│   │       ├── emotionService.js    ← Detects emotion from AI text response
│   │       ├── inputFilterService.js← Blocks prohibited content (hate speech, PII)
│   │       ├── voiceService.js      ← ElevenLabs TTS (active)
│   │       ├── videoService.js      ← D-ID video generation (built, not in active pipeline)
│   │       ├── fallbackService.js   ← Timeout/fallback handling for media generation
│   │       └── loggingService.js    ← In-memory logging for sessions
│   └── tests/
│       ├── jest.config.js
│       └── messageRoutes.test.js
├── frontend/
│   └── src/
│       ├── App.jsx                  ← Main app — routing, socket, TTS playback
│       ├── main.jsx                 ← React entry point
│       ├── components/
│       │   ├── CharacterDisplay.jsx ← Avatar display with audio state animations
│       │   ├── Disclosure.jsx       ← AI disclosure footer
│       │   ├── InputBar.jsx/.css    ← Message input with voice indicator
│       │   ├── PlatformSelector.jsx/.css ← Shows detected social platforms
│       │   └── UI.jsx               ← Top UI bar
│       └── pages/
│           ├── Onboarding.jsx/.css  ← Social link onboarding flow
│           └── (chat view in App.jsx)
├── assets/
│   └── avatar.jpg                   ← Default avatar (uploaded to D-ID for lip-sync)
├── specs/
│   ├── 001-ai-companion/           ← Spec-kit: AI companion chat feature
│   └── 002-onboarding-crawler/     ← Spec-kit: social profile onboarding crawler
├── .specify/                        ← Spec-kit config
├── .github/                         ← GitHub agents config
├── vite.config.js                   ← Vite dev server + proxy to backend
├── package.json
├── .env.example
└── .gitignore
```

## How It Works

### Onboarding
1. User enters name + up to 4 social profile URLs (Facebook, Instagram, X, TikTok)
2. Platform auto-detected from URL
3. Backend crawls profiles via Puppeteer, extracts photos/bio
4. Session created with generated avatar + persona
5. Redirects to chat

### Chat
1. Messages sent via Socket.IO
2. Azure OpenAI generates response (with persona system prompt)
3. Emotion detected from response text
4. Text response sent immediately to client
5. ElevenLabs TTS generates audio, auto-plays in browser

### Voice
- `/api/tts` endpoint generates speech from AI text
- Audio auto-plays after each AI response
- States: idle → loading → playing (shown in UI)

## Setup

1. Clone the repo
2. `npm install`
3. Copy `.env.example` → `.env` and fill in your API keys:
   - **Azure OpenAI** — endpoint, deployment name, and API key
   - **ElevenLabs** — API key and voice ID (for TTS)
   - **D-ID** — API key (optional, video not active)
   - **GitHub** — token (for onboarding crawler)
4. Start the backend (Terminal 1):
   ```
   npm run dev:backend
   ```
5. Start the frontend (Terminal 2):
   ```
   npm run dev
   ```
6. Open `http://localhost:5173`

> **Note:** If using `DefaultAzureCredential` instead of an API key, run `az login` first and remove `AZURE_OPENAI_API_KEY` from `.env`. The app supports both auth methods.

## Notes

- Text response is instant; TTS adds ~1-2s for voice playback
- D-ID video generation is fully built but bypassed — can be re-enabled in the socket handler
- Sessions are in-memory (demo only, no database)
- Input filter blocks hate speech and PII patterns
- Emotion detection drives future avatar expression changes
- Vite proxies `/api`, `/temp`, and `/socket.io` to the backend in dev mode
