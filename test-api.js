require('dotenv').config();
const config = require('./config');

async function testOpenRouter() {
  console.log('Testing OpenRouter API...');
  console.log('API Key configured:', !!config.OPENROUTER_API_KEY);
  console.log('Model:', config.MODEL);
  
  try {
    const response = await fetch(config.OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.MODEL,
        messages: [
          {
            role: 'user',
            content: 'Say hello in a professional way'
          }
        ],
        max_tokens: 50,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Success! Response:', data.choices[0]?.message?.content);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testOpenRouter();