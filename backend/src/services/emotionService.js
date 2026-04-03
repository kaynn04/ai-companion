class EmotionService {
    constructor() {
        this.emotionKeywords = {
            excited: ["let's go", "fire", "insane", "crazy"],
            laughing: ["😂", "🤣", "haha", "lol", "lmao"],
            thinking: ["?", "hmm", "maybe", "wonder"],
            surprised: ["oh wow", "omg", "no way"],
            sad: ["sorry", "rough", "tough"],
            happy: ["😊", "nice", "great", "awesome", "love"],
            neutral: [],
        };
    }

    detectEmotion(text) {
        for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
            if (keywords.some((keyword) => text.toLowerCase().includes(keyword))) {
                return emotion;
            }
        }
        return "neutral";
    }
}

module.exports = new EmotionService();