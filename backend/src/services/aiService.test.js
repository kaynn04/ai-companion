const AIService = require('./aiService');

jest.mock('openai', () => {
    const mockChat = {
        completions: {
            create: jest.fn(),
        },
    };
    return {
        AzureOpenAI: jest.fn(() => ({
            chat: mockChat,
        })),
    };
});

describe('AIService', () => {
    const mockResponse = {
        choices: [
            { message: { content: 'Hello, how can I help you?' } },
        ],
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should fetch AI response successfully', async () => {
        const systemPrompt = 'You are a helpful assistant.';
        const messages = [
            { role: 'user', content: 'Hi there!' },
        ];

        const mockCreate = require('openai').AzureOpenAI().chat.completions.create;
        mockCreate.mockResolvedValue(mockResponse);

        const result = await AIService.getAIResponse(systemPrompt, messages);
        expect(mockCreate).toHaveBeenCalledWith({
            model: process.env.AZURE_OPENAI_DEPLOYMENT,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages,
            ],
            max_tokens: 200,
            temperature: 0.8,
        });
        expect(result).toBe('Hello, how can I help you?');
    });

    test('should throw an error when fetching AI response fails', async () => {
        const systemPrompt = 'You are a helpful assistant.';
        const messages = [
            { role: 'user', content: 'Hi there!' },
        ];

        const mockCreate = require('openai').AzureOpenAI().chat.completions.create;
        mockCreate.mockRejectedValue(new Error('API Error'));

        await expect(AIService.getAIResponse(systemPrompt, messages)).rejects.toThrow('Failed to fetch AI response');
        expect(mockCreate).toHaveBeenCalled();
    });
});