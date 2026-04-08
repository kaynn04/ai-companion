const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve temp files (avatars)
app.use('/temp', express.static(path.join(__dirname, '..', '..', 'temp')));

// Serve frontend
app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'src')));

// API routes
const onboardingRoutes = require('./api/onboardingRoutes');
app.use('/api', onboardingRoutes);

// API endpoint to get session data (for frontend to load persona + avatar)
const { getSession } = require('./models/onboardingSession');
app.get('/api/session/:sessionId', (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session || session.status !== 'done') {
    return res.status(404).json({ error: 'Session not ready' });
  }
  return res.json({
    sessionId: session.sessionId,
    displayName: session.crawlResult?.displayName || session.userName,
    avatarPath: session.crawlResult?.profileImagePath ? `/temp/${session.crawlResult.profileImagePath}` : null,
    bio: session.crawlResult?.bio || ''
  });
});

// AI Service
const { generateResponse } = require('./services/aiService');
const voiceService = require('./services/voiceService');

const TEMP_DIR = path.join(__dirname, '..', '..', 'temp');
const fs = require('fs');

// Ensure temp dir exists
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// TTS endpoint
app.post('/api/tts', async (req, res) => {
  const { text, sessionId } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const responseId = `tts_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    const audioPath = await voiceService.generateVoice(text, responseId, TEMP_DIR);
    if (!audioPath) {
      return res.status(503).json({ error: 'TTS unavailable — no ElevenLabs key configured' });
    }
    res.set('Content-Type', 'audio/mpeg');
    const stream = fs.createReadStream(audioPath);
    stream.pipe(res);
    // Clean up after sending
    stream.on('end', () => {
      fs.unlink(audioPath, () => {});
    });
  } catch (err) {
    console.error('[TTS] Error:', err.message);
    res.status(500).json({ error: 'TTS generation failed' });
  }
});

// Socket.IO — chat
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('message', async (data) => {
    const { text, sessionId } = data;
    console.log(`[Chat] ${socket.id}: ${text} (session: ${sessionId})`);

    // Get persona + avatar from session
    let systemPrompt = 'You are a friendly AI assistant.';
    let avatarPath = null;
    if (sessionId) {
      const session = getSession(sessionId);
      if (session?.persona?.systemPrompt) {
        systemPrompt = session.persona.systemPrompt;
      }
      if (session?.crawlResult?.profileImagePath) {
        avatarPath = session.crawlResult.profileImagePath;
      }
    }

    try {
      // Step 1: Get AI text response (fast — send immediately)
      const aiText = await generateResponse(text, systemPrompt, sessionId || socket.id);
      socket.emit('ai-response', { text: aiText, sessionId });

      // Voice TTS is handled via /api/tts endpoint — frontend calls it after receiving text
    } catch (err) {
      console.error('[Chat] AI error:', err.message);
      socket.emit('ai-response', { text: 'Sorry, I had a moment there. Try again?', sessionId });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`AI Companion server running on http://localhost:${PORT}`);
});

module.exports = { app, server, io };
