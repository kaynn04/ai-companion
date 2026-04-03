class LoggingService {
    constructor() {
        this.logs = [];
    }

    logMessage(sessionId, message) {
        this.logs.push({ sessionId, type: 'message', timestamp: new Date(), message });
    }

    logResponseTime(sessionId, responseTime) {
        this.logs.push({ sessionId, type: 'responseTime', timestamp: new Date(), responseTime });
    }

    logMediaGeneration(sessionId, success, mediaType) {
        this.logs.push({ sessionId, type: 'mediaGeneration', timestamp: new Date(), success, mediaType });
    }

    getLogs() {
        return this.logs;
    }
}

module.exports = new LoggingService();