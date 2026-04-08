# SuperFan AI Companion — Technical Overview

**For:** Product Manager review  
**Date:** April 8, 2026  
**Scope:** How scraping works, how voice chat works, legality considerations, and personality extraction feasibility

---

## 1. How Profile Scraping Works

### What We Scrape

When an influencer onboards, they provide 1–4 social media profile URLs (Facebook, Instagram, X/Twitter, TikTok). Our backend then extracts **publicly visible** information from those profiles:

- **Profile photo** — the avatar/display picture
- **Display name** — the name shown on the profile
- **Bio text** — the short description/about section

We do **not** scrape private messages, follower lists, engagement analytics, or any content behind login walls.

### How It Works (Technical)

1. **User enters profile URLs** on the onboarding page
2. **Backend auto-detects the platform** from the URL pattern (e.g., `instagram.com/username` → Instagram)
3. **Puppeteer** (headless Chrome browser) opens each profile URL and extracts:
   - Profile images from page elements and `<meta og:image>` tags
   - Display name and bio text from the page HTML
4. **Image selection** — candidates from all platforms are scored:
   - Reject images smaller than 100px, banners (aspect ratio > 2:1), or tiny placeholders (< 5KB)
   - Score = `pixels × squareness × source_boost` (profile photos get 10× boost, og:image gets 2×)
   - Top candidates are validated by **D-ID** (confirms a usable human face is detected)
   - Best D-ID-accepted image becomes the avatar
5. **Persona generation** — the scraped bio text is fed to GPT-4o, which auto-generates a persona/personality description used as the AI's system prompt

### What Puppeteer Actually Does

Puppeteer is a standard browser automation library. It opens a real Chrome browser (headless — no visible window) and loads the profile page exactly like a normal user would. It then reads the publicly rendered HTML. There is no API hacking, credential stuffing, or authentication bypass involved.

---

## 2. Is the Scraping Legal?

### Short Answer

Scraping **publicly available** profile information is generally permissible, but platform Terms of Service add nuance.

### Key Legal Considerations

| Factor | Status |
|--------|--------|
| **Public data only** | ✅ We only access what any visitor can see without logging in |
| **No authentication bypass** | ✅ We don't log in, use stolen cookies, or bypass any access controls |
| **No rate abuse** | ✅ We scrape 1–4 profiles per onboarding session, not bulk harvesting |
| **User-initiated** | ✅ The influencer themselves provides their own profile URLs — they're consenting to the data pull |
| **Data minimization** | ✅ We only extract name, bio, and photo — nothing beyond what's needed |

### Legal Precedent

- **hiQ Labs v. LinkedIn (2022, US)** — The Ninth Circuit ruled that scraping publicly accessible data does not violate the Computer Fraud and Abuse Act (CFAA). This is the leading case on public data scraping.
- **GDPR (EU)** — Public data can be processed under "legitimate interest," especially when the data subject (influencer) initiates the process themselves.

### Platform Terms of Service

Most platforms (Meta, X, TikTok) prohibit automated scraping in their ToS. However:

- The influencer is providing **their own** profile URLs — this is essentially self-service data portability
- We're extracting minimal public data (name, photo, bio), not scraping content at scale
- This is functionally similar to what link previews, social login, and embed services already do

### Recommended Safeguards

1. **Get explicit consent** during onboarding ("We'll pull your public profile info to create your AI companion")
2. **Let influencers review and edit** the scraped data before it's used
3. **Offer manual upload** as an alternative (endpoint already exists in our backend)
4. **Don't store raw scraped HTML** — only keep the processed output (name, bio, selected image)
5. **Respect robots.txt** where applicable

---

## 3. Can We Extract an Influencer's Personality from Scraping?

### What We Currently Do

We scrape the influencer's **bio text** from their social profiles and use GPT-4o to generate a persona. For example, if an influencer's bio says *"Tech reviewer | Dad jokes enthusiast | Coffee addict ☕"*, the AI generates a personality that's tech-savvy, humorous, and casual.

### How Good Is This?

**From bio alone:** Decent for a starting point, but limited. Bios are short (150–300 chars) and often just keywords/hashtags. The generated persona captures the *vibe* but not the depth.

### How It Could Be Better (Future)

To build a richer personality profile, we could additionally scrape:

- **Recent public posts/captions** — reveals their actual writing style, humor, and topics they care about
- **Video content** (YouTube/TikTok descriptions, titles) — shows content themes and tone
- **Reply patterns** — how they interact with fans (formal vs. casual, emoji usage, etc.)

This would give GPT-4o much more signal to work with when generating the persona prompt. The more text samples we have, the more accurately the AI can mirror the influencer's voice and personality.

### Current Limitation

Right now we only use the bio, which is a minimal but functional approach for the MVP/demo. Expanding to post content would significantly improve personality accuracy but also increases scraping scope and ToS considerations.

---

## 4. How Voice Chat Works

### Speech-to-Text (Fan → AI)

**Technology:** Web Speech API (built into Chrome/Edge browsers)

**How it works:**
1. Fan clicks the microphone button in the chat interface
2. The browser's native speech recognition engine activates (runs locally on the user's device)
3. As the fan speaks, interim text appears in the input field in real-time
4. When the fan pauses for ~1–2 seconds, the browser finalizes the transcript
5. The finalized text is automatically sent to the AI as a regular chat message via Socket.IO

**Key points:**
- Zero cost — this is a free browser API, no external service needed
- Processing happens on-device (fan's browser), not on our servers
- Works on Chrome and Edge; gracefully hidden on unsupported browsers
- Text chat still works alongside voice — voice is additive, not a replacement

### Text-to-Speech (AI → Fan)

**Technology:** ElevenLabs API

**How it works:**
1. AI generates a text response (via Azure OpenAI / GPT-4o)
2. The text response is sent back to the fan instantly via Socket.IO
3. Simultaneously, the backend calls `POST /api/tts` which sends the text to ElevenLabs
4. ElevenLabs returns an MP3 audio file of the AI speaking the response
5. The audio plays in the fan's browser while the avatar shows a speaking animation (pulsing glow rings)

**Key points:**
- Text response arrives instantly; audio follows moments later
- The avatar shows visual feedback: 🎤 Listening → ⏳ Generating voice → 🔊 Speaking
- Currently uses a default ElevenLabs voice — future plan is voice cloning to match the influencer

### Future: Voice Cloning (Planned, Not Built Yet)

The roadmap includes cloning the influencer's actual voice so the AI companion sounds like them:

1. Scrape video URLs from their YouTube/TikTok/Instagram
2. Download videos using yt-dlp
3. Extract audio tracks using ffmpeg
4. Clean the audio (remove background music/noise)
5. Feed clean voice samples to a voice cloning API (e.g., ElevenLabs Professional Voice Cloning)
6. Get a custom voice ID → use it for all TTS responses

This is **not implemented yet** — currently using D-ID's built-in Microsoft TTS voice (`en-US-GuyNeural`) as a placeholder.

---

## 5. Architecture Summary

```
ONBOARDING FLOW:
Fan opens app → Enters influencer name + 1-4 social URLs
  → Backend detects platforms
  → Puppeteer scrapes each profile (photo, name, bio)
  → Best photo selected & validated by D-ID (face detection)
  → Persona auto-generated from bio (GPT-4o)
  → Redirect to chat screen

CHAT FLOW:
Fan sends message (text or voice via Web Speech API)
  → Socket.IO sends to backend
  → Azure OpenAI generates response (persona as system prompt)
  → Text response sent back instantly
  → ElevenLabs generates voice audio
  → Audio plays with speaking animation on avatar
```

---

## 6. Summary for PM

| Component | How | Legal Risk | Cost |
|-----------|-----|-----------|------|
| Profile scraping | Puppeteer (headless browser) reads public pages | Low — public data, user-initiated, minimal scope | Free (self-hosted) |
| Personality extraction | GPT-4o generates persona from scraped bio | Low — uses publicly posted information | Azure OpenAI usage |
| Fan speech input | Web Speech API (browser-native) | None — runs on user's device | Free |
| AI voice output | ElevenLabs TTS API | None — standard API usage | ElevenLabs subscription |
| Voice cloning (future) | yt-dlp + ffmpeg + voice API | Medium — requires influencer explicit consent | Voice API subscription |

**Bottom line:** The scraping approach is standard practice for public profile data, especially since the influencer themselves initiates the process. Adding explicit consent UI and a manual upload fallback covers us well. Personality extraction works from bio text today and can be significantly improved by expanding to public post content.
