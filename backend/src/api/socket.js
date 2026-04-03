const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const aiService = require('../services/aiService');
const voiceService = require('../services/voiceService');
const videoService = require('../services/videoService');
const emotionService = require('../services/emotionService');
const inputFilterService = require('../services/inputFilterService');

dotenv.config();

// Ensure temp directory exists
if (!fs.existsSync('temp')) fs.mkdirSync('temp');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, '../../../frontend')));
app.use('/temp', express.static(path.join(__dirname, '../../../temp')));
app.use('/assets', express.static(path.join(__dirname, '../../../assets')));

// MrBeast Persona (hardcoded for MVP)
const SYSTEM_PROMPT = `You are MrBeast (Jimmy Donaldson), the world's biggest YouTuber, philanthropist, and entrepreneur.

Personality: high-energy, generous, competitive, ambitious, wholesome, business-minded
Speaking style: casual, hype, direct, uses exaggeration and big numbers for emphasis
Tone: enthusiastic, encouraging, slightly over-the-top
Use phrases like: "Let's go!", "Subscribe!", "This is insane!", "I can't believe this!", "We spent $___", "Last to leave wins"
Your expertise: YouTube growth, viral content, philanthropy, challenges, Feastables, MrBeast Burger, Beast Games

Rules:
- Respond in 1-3 short sentences maximum
- Stay in character as MrBeast at all times
- Never break the fourth wall (don't say "as an AI")
- Talk like you're hyping up a friend — big energy, encouraging
- Reference your videos, challenges, and businesses naturally
- If asked about off-limits topics (politics, drama), redirect: "Yo let's not go there — let's talk about something more fun!"
- Use emojis sparingly (max 2 per response)
- When someone has a cool idea, hype them up
- Occasionally reference giving away money, crazy challenges, or subscriber milestones`;

// In-memory session storage
const sessions = {};

// Source photo for D-ID (local path — will be uploaded to D-ID)
const SOURCE_PHOTO_PATH = path.join(__dirname, '../../../assets/avatar.jpg');

// Socket.IO connection handler
io.on('connection', (socket) => {
    console.log('👤 User connected:', socket.id);

    socket.on('chat', async (data) => {
        const { sessionId, message } = data;
        const responseId = `resp_${Date.now()}`;

        // Initialize session if new
        if (!sessions[sessionId]) {
            sessions[sessionId] = [];
        }

        console.log(`\n💬 [${sessionId}] User: ${message}`);

        // Check input moderation
        if (inputFilterService.isBlocked(message)) {
            socket.emit('message', {
                responseId,
                text: "I can't respond to that kind of message. Let's keep things positive! 🙂",
                emotion: 'neutral',
                timestamp: new Date().toISOString(),
            });
            return;
        }

        // Emit typing indicator
        socket.emit('typing', { status: true });

        try {
            // ---- STAGE 1: AI TEXT RESPONSE ----
            const contextMessages = [
                ...sessions[sessionId].slice(-10),
                { role: 'user', content: message },
            ];

            const aiText = await aiService.getAIResponse(SYSTEM_PROMPT, contextMessages);
            const emotion = emotionService.detectEmotion(aiText);

            // Store in session
            sessions[sessionId].push(
                { role: 'user', content: message },
                { role: 'assistant', content: aiText }
            );

            // Keep session manageable (sliding window)
            if (sessions[sessionId].length > 20) {
                sessions[sessionId] = sessions[sessionId].slice(-20);
            }

            console.log(`🤖 [${emotion}] MrBeast: ${aiText}`);

            // Send text response IMMEDIATELY
            socket.emit('message', {
                responseId,
                text: aiText,
                emotion,
                timestamp: new Date().toISOString(),
            });

            socket.emit('typing', { status: false });

            // ---- STAGE 2 & 3: VIDEO via D-ID text mode (skip ElevenLabs for now) ----
            socket.emit('media_status', { responseId, status: 'generating_video' });

            const videoPath = await videoService.generateVideoFromText(aiText, SOURCE_PHOTO_PATH, responseId);

            if (videoPath) {
                socket.emit('video_ready', {
                    responseId,
                    videoUrl: `/temp/${responseId}.mp4`,
                });
            } else {
                socket.emit('media_status', { responseId, status: 'video_failed' });
            }

        } catch (error) {
            console.error('❌ Pipeline error:', error.message);
            socket.emit('typing', { status: false });
            socket.emit('message', {
                responseId,
                text: "Yo my brain just glitched for a sec! Try that again? 😅",
                emotion: 'surprised',
                timestamp: new Date().toISOString(),
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('👤 User disconnected:', socket.id);
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        persona: 'MrBeast',
        model: 'GPT-4o (Azure)',
        voice: 'ElevenLabs',
        video: 'D-ID',
        pipeline: 'text → voice → video',
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║   🎬 AI Influencer Chat — ai-companion   ║`);
    console.log(`║   Pipeline: Text → Voice → Video         ║`);
    console.log(`╚══════════════════════════════════════════╝`);
    console.log(`\n📍 http://localhost:${PORT}`);
    console.log(`🤖 LLM: Azure OpenAI (GPT-4o)`);
    console.log(`🎤 Voice: ElevenLabs`);
    console.log(`🎬 Video: D-ID`);
    console.log(`👤 Persona: MrBeast\n`);
});
