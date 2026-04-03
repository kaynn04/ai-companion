const axios = require('axios');
const fs = require('fs');
const path = require('path');

jest.mock('axios');

// Only mock specific fs methods, not the whole module
jest.spyOn(fs, 'existsSync').mockReturnValue(true);
jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('fake-audio'));
jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

// Set env before requiring the service
process.env.DID_API_KEY = 'test-api-key';

const videoService = require('./videoService');

beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockImplementation((path) => path === 'temp/test.mp3');
    fs.readFileSync.mockReturnValue(Buffer.from('fake-audio'));
    fs.writeFileSync.mockImplementation(() => {});
});

describe('VideoService', () => {
    it('should generate a video successfully', async () => {
        axios.mockImplementation((config) => {
            if (config.method === 'POST' && config.url.includes('/talks')) {
                return Promise.resolve({
                    data: { id: 'talk-123' },
                });
            }
            if (config.method === 'GET' && config.url.includes('/talks/talk-123')) {
                return Promise.resolve({
                    data: {
                        status: 'done',
                        result_url: 'https://d-id.com/video/result.mp4',
                    },
                });
            }
            if (config.method === 'GET' && config.responseType === 'arraybuffer') {
                return Promise.resolve({
                    data: Buffer.from('fake-video-data'),
                });
            }
            // Download video URL
            return Promise.resolve({
                data: Buffer.from('fake-video-data'),
            });
        });

        const result = await videoService.generateVideo(
            'temp/test.mp3',
            'https://example.com/photo.jpg',
            'resp_123'
        );

        expect(result).toBe(path.join('temp', 'resp_123.mp4'));
        expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should return null when D-ID fails', async () => {
        axios.mockImplementation((config) => {
            if (config.method === 'POST') {
                return Promise.resolve({
                    data: { id: 'talk-456' },
                });
            }
            if (config.method === 'GET') {
                return Promise.resolve({
                    data: { status: 'error' },
                });
            }
            return Promise.resolve({ data: {} });
        });

        const result = await videoService.generateVideo(
            'temp/test.mp3',
            'https://example.com/photo.jpg',
            'resp_456'
        );

        expect(result).toBeNull();
    });

    it('should return null for invalid audio path', async () => {
        fs.existsSync.mockReturnValue(false);

        const result = await videoService.generateVideo(
            'temp/nonexistent.mp3',
            'https://example.com/photo.jpg',
            'resp_789'
        );

        expect(result).toBeNull();
    });
});
