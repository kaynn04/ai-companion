const { OpenAI } = require('openai');

let client;

if (process.env.AZURE_OPENAI_ENDPOINT) {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT.replace(/\/$/, '');
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';
  
  if (process.env.AZURE_OPENAI_API_KEY) {
    // API Key auth
    client = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: `${endpoint}/openai/deployments/${deployment}`,
      defaultQuery: { 'api-version': '2024-08-01-preview' },
      defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY }
    });
  } else {
    // Try DefaultAzureCredential (managed identity / az cli login)
    const { DefaultAzureCredential } = require('@azure/identity');
    const credential = new DefaultAzureCredential();
    
    // We'll get a token per request
    client = {
      chat: {
        completions: {
          create: async (params) => {
            const tokenResponse = await credential.getToken('https://cognitiveservices.azure.com/.default');
            const tempClient = new OpenAI({
              apiKey: 'placeholder',
              baseURL: `${endpoint}/openai/deployments/${deployment}`,
              defaultQuery: { 'api-version': '2024-08-01-preview' },
              defaultHeaders: { 'Authorization': `Bearer ${tokenResponse.token}` }
            });
            return tempClient.chat.completions.create(params);
          }
        }
      }
    };
  }
  console.log(`[AI] Using Azure OpenAI: ${endpoint} / ${deployment}`);
} else if (process.env.GITHUB_TOKEN) {
  client = new OpenAI({
    apiKey: process.env.GITHUB_TOKEN,
    baseURL: 'https://models.inference.ai.azure.com'
  });
  console.log('[AI] Using GitHub Models');
} else {
  console.warn('[AI] No API key found — using mock responses');
  client = null;
}

// In-memory conversation history per session
const conversationHistory = new Map();
const MAX_HISTORY = 20;

async function generateResponse(message, systemPrompt, sessionId) {
  if (!conversationHistory.has(sessionId)) {
    conversationHistory.set(sessionId, []);
  }
  const history = conversationHistory.get(sessionId);

  history.push({ role: 'user', content: message });

  while (history.length > MAX_HISTORY) {
    history.shift();
  }

  if (!client) {
    return `Hey! Thanks for reaching out. (Mock response — no API key configured)`;
  }

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10)
    ];

    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';
    const response = await client.chat.completions.create({
      model: deployment,
      messages,
      max_tokens: 300,
      temperature: 0.8
    });

    const aiText = response.choices[0]?.message?.content || 'Hmm, I got nothing. Try again?';
    history.push({ role: 'assistant', content: aiText });

    return aiText;
  } catch (err) {
    console.error('[AI] Error:', err.message);
    return `Sorry, I'm having trouble right now. (${err.message})`;
  }
}

module.exports = { generateResponse };
