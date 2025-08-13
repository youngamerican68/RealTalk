export default {
  // OpenRouter API Configuration
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_API_URL: 'https://openrouter.ai/api/v1/chat/completions',
  
  // Model Configuration
  MODEL: 'mistralai/mixtral-8x7b-instruct',
  
  // API Settings
  MAX_TOKENS: 800,
  TEMPERATURE: 0.7,
  
  // Rate Limiting
  FREE_REQUESTS_PER_MONTH: 20,
  PRO_REQUESTS_PER_MONTH: 1000
};