import config from '../config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, platform, userId } = req.body;

    if (!text || text.length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > 500) {
      return res.status(400).json({ error: 'Text must be 500 characters or less' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const openrouterApiKey = config.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return res.status(500).json({ error: 'OpenRouter API key not configured' });
    }

    const prompt = generatePrompt(text, platform || 'general');

    const response = await fetch(config.OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.MODEL,
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: config.MAX_TOKENS,
        temperature: config.TEMPERATURE,
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
      
      if (!Array.isArray(rewrites) || rewrites.length !== 3) {
        throw new Error('Invalid response format');
      }

      const formattedRewrites = rewrites.map(rewrite => ({
        type: rewrite.type,
        text: rewrite.text.substring(0, 280)
      }));

      return res.status(200).json({
        rewrites: formattedRewrites,
        platform: platform,
        userId: userId
      });

    } catch (parseError) {
      const fallbackRewrites = generateFallbackRewrites(text, platform);
      return res.status(200).json({
        rewrites: fallbackRewrites,
        platform: platform,
        userId: userId,
        fallback: true
      });
    }

  } catch (error) {
    console.error('Rewrite API error:', error);
    return res.status(500).json({ error: 'Failed to generate rewrites' });
  }
}

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

    linkedin: `You are RealTalk Draft, a workplace communication assistant. Transform the following message into 3 professional alternatives optimized for LinkedIn professional networking.

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
- Use professional networking tone
- Consider industry connections and reputation

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