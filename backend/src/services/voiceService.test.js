const VoiceService = require('./voiceService');
const axios = require('axios');

jest.mock('axios');

describe('VoiceService', () => {
    const mockAudioUrl = 'https://example.com/audio.mp3';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should generate voice successfully', async () => {
        const text = 'Hello, this is a test.';
        axios.post.mockResolvedValue({ data: { audio_url: mockAudioUrl } });

        const result = await VoiceService.generateVoice(text);
        expect(axios.post).toHaveBeenCalledWith(
            `${VoiceService.endpoint}/${VoiceService.voiceId}`,
            { text },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': VoiceService.apiKey,
                },
            }
        );
        expect(result).toBe(mockAudioUrl);
    });

    test('should throw an error when voice generation fails', async () => {
        const text = 'Hello, this is a test.';
        axios.post.mockRejectedValue(new Error('API Error'));

        await expect(VoiceService.generateVoice(text)).rejects.toThrow('Failed to generate voice');
        expect(axios.post).toHaveBeenCalled();
    });
});