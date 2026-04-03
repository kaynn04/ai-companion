const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const dotenv = require('dotenv');

dotenv.config();

class VideoService {
    constructor() {
        this.apiKey = process.env.DID_API_KEY;
        this.baseUrl = 'https://api.d-id.com';
        this._cachedImageUrl = null; // Cache uploaded image URL
    }

    /**
     * Upload an image to D-ID temp storage
     * @param {string} imagePath - Local path to image file
     * @returns {string|null} D-ID image URL
     */
    async _uploadImage(imagePath) {
        try {
            const form = new FormData();
            form.append('image', fs.createReadStream(imagePath));

            const response = await axios({
                method: 'POST',
                url: `${this.baseUrl}/images`,
                headers: {
                    'Authorization': `Basic ${this.apiKey}`,
                    ...form.getHeaders(),
                },
                data: form,
            });

            const imageUrl = response.data?.url;
            console.log(`📷 Image uploaded to D-ID: ${imageUrl}`);
            return imageUrl;
        } catch (error) {
            console.error('❌ D-ID image upload error:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * Upload audio to D-ID temp storage
     * @param {string} audioPath - Local path to audio file
     * @returns {string|null} D-ID audio URL
     */
    async _uploadAudio(audioPath) {
        try {
            const form = new FormData();
            form.append('audio', fs.createReadStream(audioPath));

            const response = await axios({
                method: 'POST',
                url: `${this.baseUrl}/audios`,
                headers: {
                    'Authorization': `Basic ${this.apiKey}`,
                    ...form.getHeaders(),
                },
                data: form,
            });

            const audioUrl = response.data?.url;
            console.log(`🎤 Audio uploaded to D-ID: ${audioUrl}`);
            return audioUrl;
        } catch (error) {
            console.error('❌ D-ID audio upload error:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * Generate video using D-ID's built-in text-to-speech (no ElevenLabs needed)
     * @param {string} text - Text for D-ID to speak
     * @param {string} sourceImagePath - Local path to influencer photo
     * @param {string} responseId - Unique ID
     * @returns {string|null} Path to video file or null
     */
    async generateVideoFromText(text, sourceImagePath, responseId) {
        try {
            // Upload image to D-ID (cache after first upload)
            if (!this._cachedImageUrl) {
                if (!fs.existsSync(sourceImagePath)) {
                    console.error('❌ Source image not found:', sourceImagePath);
                    return null;
                }
                this._cachedImageUrl = await this._uploadImage(sourceImagePath);
                if (!this._cachedImageUrl) return null;
            }

            console.log(`🎬 Creating D-ID video (text mode) for ${responseId}...`);

            const createResponse = await axios({
                method: 'POST',
                url: `${this.baseUrl}/talks`,
                headers: {
                    'Authorization': `Basic ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                data: {
                    source_url: this._cachedImageUrl,
                    script: {
                        type: 'text',
                        input: text,
                        provider: {
                            type: 'microsoft',
                            voice_id: 'en-US-GuyNeural',
                        },
                    },
                    config: {
                        result_format: 'mp4',
                        stitch: true,
                    },
                },
            });

            const talkId = createResponse.data?.id;
            if (!talkId) {
                console.error('❌ D-ID: No talk ID returned', createResponse.data);
                return null;
            }

            console.log(`🎬 D-ID talk created: ${talkId}`);

            const videoUrl = await this._pollForCompletion(talkId);
            if (!videoUrl) return null;

            const videoResponse = await axios({
                method: 'GET',
                url: videoUrl,
                responseType: 'arraybuffer',
            });

            const videoPath = path.join('temp', `${responseId}.mp4`);
            fs.writeFileSync(videoPath, videoResponse.data);
            console.log(`🎬 Video saved: ${videoPath}`);
            return videoPath;
        } catch (error) {
            console.error('❌ D-ID error:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * Generate a lip-synced video using D-ID Talks API
     * @param {string} audioPath - Path to the audio file (mp3)
     * @param {string} sourceUrl - URL of the influencer's photo
     * @param {string} responseId - Unique ID for this response
     * @returns {string|null} Path to the generated video file, or null on failure
     */
    async generateVideo(audioPath, sourceImagePath, responseId) {
        try {
            if (!audioPath || !fs.existsSync(audioPath)) {
                console.warn('⚠️ Skipping video generation — invalid audio path');
                return null;
            }

            // Upload audio to D-ID
            const audioUrl = await this._uploadAudio(audioPath);
            if (!audioUrl) {
                console.warn('⚠️ Failed to upload audio to D-ID');
                return null;
            }

            // Upload image to D-ID (cache after first upload)
            if (!this._cachedImageUrl) {
                if (!fs.existsSync(sourceImagePath)) {
                    console.error('❌ Source image not found:', sourceImagePath);
                    return null;
                }
                this._cachedImageUrl = await this._uploadImage(sourceImagePath);
                if (!this._cachedImageUrl) {
                    console.warn('⚠️ Failed to upload image to D-ID');
                    return null;
                }
            }

            console.log(`🎬 Creating D-ID video for ${responseId}...`);

            // Create talk via D-ID API
            const createResponse = await axios({
                method: 'POST',
                url: `${this.baseUrl}/talks`,
                headers: {
                    'Authorization': `Basic ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                data: {
                    source_url: this._cachedImageUrl,
                    script: {
                        type: 'audio',
                        audio_url: audioUrl,
                    },
                    config: {
                        result_format: 'mp4',
                        stitch: true,
                    },
                },
            });

            const talkId = createResponse.data?.id;
            if (!talkId) {
                console.error('❌ D-ID: No talk ID returned', createResponse.data);
                return null;
            }

            console.log(`🎬 D-ID talk created: ${talkId}`);

            // Poll for completion
            const videoUrl = await this._pollForCompletion(talkId);
            if (!videoUrl) return null;

            // Download the video
            const videoResponse = await axios({
                method: 'GET',
                url: videoUrl,
                responseType: 'arraybuffer',
            });

            const videoPath = path.join('temp', `${responseId}.mp4`);
            fs.writeFileSync(videoPath, videoResponse.data);
            console.log(`🎬 Video saved: ${videoPath}`);
            return videoPath;
        } catch (error) {
            console.error('❌ D-ID error:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * Poll D-ID API until video is done or failed
     * @param {string} talkId - D-ID talk ID
     * @returns {string|null} Video URL or null
     */
    async _pollForCompletion(talkId) {
        const maxAttempts = 30;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            try {
                const statusResponse = await axios({
                    method: 'GET',
                    url: `${this.baseUrl}/talks/${talkId}`,
                    headers: {
                        'Authorization': `Basic ${this.apiKey}`,
                    },
                });

                const status = statusResponse.data?.status;
                console.log(`🎬 D-ID status: ${status} (attempt ${attempt + 1})`);

                if (status === 'done') {
                    return statusResponse.data?.result_url;
                }

                if (status === 'error' || status === 'rejected') {
                    console.error('❌ D-ID generation failed:', statusResponse.data);
                    return null;
                }
            } catch (error) {
                console.error('❌ D-ID poll error:', error.message);
            }
        }

        console.error('❌ D-ID timed out after 60 seconds');
        return null;
    }
}

module.exports = new VideoService();
