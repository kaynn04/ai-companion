class InputFilterService {
    constructor() {
        this.blocklist = [
            /hate speech/i,
            /explicit content/i,
            /threats/i,
            /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
            /\b\d{10}\b/, // Phone number pattern
            /\b\d{1,3} \w+ (Street|Ave|Blvd|Rd)\b/i, // Address pattern
        ];
    }

    isBlocked(input) {
        return this.blocklist.some((pattern) => pattern.test(input));
    }

    getRedirectMessage() {
        return "Your input contains prohibited content. Please revise and try again.";
    }
}

module.exports = new InputFilterService();