const request = require('supertest');
const express = require('express');
const messageRoutes = require('../src/api/messageRoutes');
const AIService = require('../src/services/aiService');

jest.mock('../src/services/aiService');

const app = express();
app.use(express.json());
app.use('/api', messageRoutes);

describe('POST /api/message', () => {
    it('should block prohibited content', async () => {
        const response = await request(app)
            .post('/api/message')
            .send({ message: 'This contains hate speech' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Your input contains prohibited content. Please revise and try again.');
    });

    it('should return AI response for valid input', async () => {
        AIService.getAIResponse.mockResolvedValue('AI response text');

        const response = await request(app)
            .post('/api/message')
            .send({
                message: 'Hello, AI!',
                messages: [
                    { role: 'user', content: 'Hello, AI!' },
                ],
            });

        expect(response.status).toBe(200);
        expect(response.body.response).toBe('AI response text');
    }, 10000); // Increased timeout to 10 seconds

    it('should handle AI service errors gracefully', async () => {
        AIService.getAIResponse.mockRejectedValue(new Error('AI error'));

        const response = await request(app)
            .post('/api/message')
            .send({
                message: 'Hello, AI!',
                messages: [
                    { role: 'user', content: 'Hello, AI!' },
                ],
            });

        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Failed to process message');
    });
});