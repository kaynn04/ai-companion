const { AzureOpenAI } = require('openai');
const { DefaultAzureCredential, getBearerTokenProvider } = require('@azure/identity');
const dotenv = require('dotenv');

dotenv.config();

class AIService {
    constructor() {
        const credential = new DefaultAzureCredential();
        const scope = 'https://cognitiveservices.azure.com/.default';
        const azureADTokenProvider = getBearerTokenProvider(credential, scope);

        this.client = new AzureOpenAI({
            azureADTokenProvider,
            endpoint: process.env.AZURE_OPENAI_ENDPOINT,
            apiVersion: '2024-10-21',
            deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
        });

        this.deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    }

    async getAIResponse(systemPrompt, messages = []) {
        try {
            const response = await this.client.chat.completions.create({
                model: this.deployment,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages,
                ],
                max_tokens: 200,
                temperature: 0.8,
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('Error fetching AI response:', error.message);
            throw new Error('Failed to fetch AI response');
        }
    }
}

module.exports = new AIService();
