const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const DEFAULT_TEMP = path.join(__dirname, '..', '..', '..', 'temp');

class VoiceService {
    constructor() {
        this.apiKey = process.env.ELEVENLABS_API_KEY;
        this.voiceId = process.env.ELEVENLABS_VOICE_ID;
    }

    async generateVoice(text, responseId, tempDir) {
        if (!this.apiKey || !this.voiceId) {
            console.warn('[Voice] No ElevenLabs API key or voice ID — skipping TTS');
            return null;
        }

        const outDir = tempDir || DEFAULT_TEMP;
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

        try {
            const response = await axios({
                method: 'POST',
                url: `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`,
                headers: {
                    'xi-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg',
                },
                data: {
                    text: text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                        speed: 1.0,
                    },
                },
                responseType: 'arraybuffer',
            });

            const audioPath = path.join(outDir, `${responseId}.mp3`);
            fs.writeFileSync(audioPath, response.data);
            console.log(`🎤 Voice generated: ${audioPath}`);
            return audioPath;
        } catch (error) {
            console.error('❌ ElevenLabs error:', error.response?.data ? Buffer.from(error.response.data).toString() : error.message);
            return null;
        }
    }
}

module.exports = new VoiceService();
