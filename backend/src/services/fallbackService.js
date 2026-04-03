class FallbackService {
    constructor() {
        this.TIMEOUTS = {
            voice: 3000, // 3 seconds
            video: 8000, // 8 seconds
        };
    }

    async handleFallback(socket, textResponse, voicePromise, videoPromise) {
        // Deliver text immediately
        socket.emit('text', textResponse);

        try {
            const voiceResponse = await this.withTimeout(voicePromise, this.TIMEOUTS.voice);
            socket.emit('audio', voiceResponse);
        } catch (error) {
            console.warn('Voice generation failed, skipping to video:', error);
        }

        try {
            const videoResponse = await this.withTimeout(videoPromise, this.TIMEOUTS.video);
            socket.emit('video', videoResponse);
        } catch (error) {
            console.warn('Video generation failed, falling back to audio only:', error);
        }
    }

    withTimeout(promise, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Timeout exceeded')), timeout);
            promise
                .then((result) => {
                    clearTimeout(timer);
                    resolve(result);
                })
                .catch((error) => {
                    clearTimeout(timer);
                    reject(error);
                });
        });
    }
}

module.exports = new FallbackService();