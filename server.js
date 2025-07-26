require('dotenv').config();
const http = require('http');
const url = require('url');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'mistralai/mistral-7b-instruct:free';

function generatePrompt(text, platform) {
  const platformPrompts = {
    slack: `You are RealTalk Draft, a workplace communication assistant. Transform the following message into 3 professional alternatives optimized for Slack workplace communication.

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
- Use casual but professional Slack tone
- Consider using thread replies for longer context

Format: Return a JSON array with 3 objects containing "type" and "text" fields.`,

    gmail: `You are RealTalk Draft, a workplace communication assistant. Transform the following message into 3 professional alternatives optimized for email communication.

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

Format: Return a JSON array with 3 objects containing "type" and "text" fields.`,

    general: `You are RealTalk Draft, a workplace communication assistant. Transform the following message into 3 professional alternatives for general workplace communication.

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
- Use general professional tone

Format: Return a JSON array with 3 objects containing "type" and "text" fields.`
  };

  return platformPrompts[platform] || platformPrompts.general;
}

function generateFallbackRewrites(text, platform) {
  const baseText = text.length > 100 ? text.substring(0, 100) + '...' : text;
  
  return [
    {
      type: 'professional',
      text: `I wanted to bring to your attention: ${baseText}. I'd appreciate your guidance on how to proceed.`
    },
    {
      type: 'direct',
      text: `I need to discuss: ${baseText}. Can we schedule time to address this?`
    },
    {
      type: 'collaborative',
      text: `I'd like to work together on: ${baseText}. What are your thoughts on next steps?`
    }
  ];
}

async function handleRewrite(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const { text, platform, userId } = JSON.parse(body);

      if (!text || text.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Text is required' }));
        return;
      }

      if (text.length > 500) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Text must be 500 characters or less' }));
        return;
      }

      if (!userId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'User ID is required' }));
        return;
      }

      if (!OPENROUTER_API_KEY) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'OpenRouter API key not configured' }));
        return;
      }

      const prompt = generatePrompt(text, platform || 'general');

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
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content;

      if (!aiResponse) {
        throw new Error('No response from OpenRouter');
      }

      try {
        const rewrites = JSON.parse(aiResponse);
        console.log('📝 Raw rewrites from AI:', JSON.stringify(rewrites, null, 2));
        
        if (!Array.isArray(rewrites) || rewrites.length !== 3) {
          throw new Error('Invalid response format');
        }

        const formattedRewrites = rewrites.map((rewrite, index) => ({
          type: ['professional', 'direct', 'collaborative'][index],
          text: rewrite.text || rewrite.message || rewrite.content || JSON.stringify(rewrite)
        }));
        
        console.log('📝 Formatted rewrites:', JSON.stringify(formattedRewrites, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          rewrites: formattedRewrites
        }));

      } catch (parseError) {
        const fallbackRewrites = generateFallbackRewrites(text, platform);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          rewrites: fallbackRewrites,
          fallback: true
        }));
      }

    } catch (error) {
      console.error('Rewrite API error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to generate rewrites' }));
    }
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.pathname === '/api/rewrite') {
    handleRewrite(req, res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`);
  console.log(`📝 Rewrite endpoint: http://localhost:${PORT}/api/rewrite`);
  console.log(`🤖 Using model: ${MODEL}`);
});