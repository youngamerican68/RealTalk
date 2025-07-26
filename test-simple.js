require('dotenv').config();

async function testRewrite() {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  const MODEL = 'mistralai/mistral-7b-instruct:free';
  
  const text = 'this is annoying and frustrating';
  const platform = 'gmail';
  
  const prompt = `You are RealTalk Draft, a workplace communication assistant. Transform the following message into 3 professional alternatives optimized for email communication.

Original message: "${text}"

Provide exactly 3 rewrites:
1. Professional: Formal, diplomatic, suitable for senior leadership
2. Direct: Clear and honest but respectful, good for peers  
3. Collaborative: Solution-focused, emphasizing teamwork

Rules:
- Keep each under 280 characters
- Maintain the core concern
- Remove emotional language
- Use "I" statements when appropriate
- Suggest next steps
- Use formal email tone and structure
- Include appropriate email courtesy

Format: Return a JSON array with 3 objects containing "type" and "text" fields.`;

  try {
    console.log('Testing rewrite with OpenRouter...');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: text }
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;
    
    console.log('✅ Raw AI Response:');
    console.log(aiResponse);
    
    try {
      const rewrites = JSON.parse(aiResponse);
      console.log('\n✅ Parsed Rewrites:');
      rewrites.forEach((rewrite, i) => {
        console.log(`${i+1}. ${rewrite.type}: ${rewrite.text}`);
      });
    } catch (parseError) {
      console.log('⚠️ Could not parse as JSON, using fallback');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testRewrite();