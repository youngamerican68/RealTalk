import config from '../config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, toneValue, scenarioType, platform, userId } = req.body;

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

    const prompt = generateSmoothPrompt(text, toneValue, scenarioType, platform);

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
        temperature: 0.7, // Slightly higher for more natural everyday language
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

    // Try to parse as JSON, fallback to plain text
    let smoothedText = aiResponse;
    try {
      const parsed = JSON.parse(aiResponse);
      if (parsed.smoothedText) {
        smoothedText = parsed.smoothedText;
      } else if (typeof parsed === 'string') {
        smoothedText = parsed;
      }
    } catch (parseError) {
      // Use the raw response as the smoothed text
      smoothedText = aiResponse.replace(/^["']|["']$/g, ''); // Remove surrounding quotes if present
    }

    // Ensure reasonable length
    if (smoothedText.length > 280) {
      smoothedText = smoothedText.substring(0, 277) + '...';
    }

    return res.status(200).json({
      success: true,
      smoothedText: smoothedText,
      originalText: text,
      toneValue: toneValue,
      scenarioType: scenarioType,
      platform: platform,
      userId: userId
    });

  } catch (error) {
    console.error('Smooth API error:', error);
    
    // Provide a simple fallback
    const fallbackText = generateFallbackSmooth(req.body.text, req.body.toneValue);
    return res.status(200).json({
      success: true,
      smoothedText: fallbackText,
      fallback: true,
      originalText: req.body.text,
      toneValue: req.body.toneValue,
      userId: req.body.userId
    });
  }
}

function generateSmoothPrompt(text, toneValue, scenarioType, platform) {
  // Determine tone based on slider value
  let toneDescription, toneInstructions;
  
  if (toneValue <= 33) {
    toneDescription = "friendly and warm";
    toneInstructions = `
- Use warm, approachable language
- Include phrases like "I hope," "I'd love to," "I understand"
- Add gentle courtesy words like "please" and "thank you"
- Make it sound caring and considerate
- Use softer language that shows empathy`;
  } else if (toneValue <= 66) {
    toneDescription = "balanced and professional";
    toneInstructions = `
- Use clear, professional language
- Be polite but direct
- Include appropriate courtesy words
- Strike a balance between friendly and business-like
- Make it sound competent and respectful`;
  } else {
    toneDescription = "firm and assertive";
    toneInstructions = `
- Use confident, assertive language
- Be direct but still polite
- Show determination and clarity
- Use stronger action words
- Make it sound decisive while remaining respectful`;
  }

  // Scenario-specific context
  const scenarioContext = {
    'deEscalation': 'This appears to be a potentially tense situation that needs smoothing over.',
    'general': 'This is a general communication that needs to sound more polished.',
    'professionalPushback': 'This is a situation where the person needs to be assertive but diplomatic.'
  };

  return `You are a "Smooth It" communication specialist. Your job is to take rough, awkward, or blunt messages and transform them into polished, appropriate messages while keeping the same core meaning.

Original message: "${text}"

TASK: Transform this into a single, polished message that is ${toneDescription}.

TONE INSTRUCTIONS (Tone level: ${toneValue}/100):${toneInstructions}

GENERAL SMOOTHING RULES:
- Keep the core message and intent
- Fix awkward phrasing and grammar
- Add appropriate politeness markers
- Make it sound natural and confident
- Remove any unnecessarily harsh language
- Ensure it's appropriate for the context
- Keep it concise but complete
- Make it sound like something a well-spoken person would say

CONTEXT: ${scenarioContext[scenarioType] || scenarioContext.general}

EXAMPLES OF SMOOTHING:

Rough: "hey sorry maybe later"
Smooth (Friendly): "Hi! I'm so sorry, but I'll need to take a raincheck on this. Thank you for understanding!"
Smooth (Balanced): "Hi there, I apologize but I'll need to reschedule. Thanks for your understanding."
Smooth (Firm): "I need to reschedule this. I'll let you know when I'm available. Thanks."

Rough: "need landlord to fix this asap"  
Smooth (Friendly): "I hope you're doing well! I wanted to reach out about a maintenance issue that needs attention when you have a chance."
Smooth (Balanced): "I'd like to report a maintenance issue that needs to be addressed. Please let me know when this can be scheduled."
Smooth (Firm): "I need to report a maintenance issue that requires prompt attention. Please arrange for this to be fixed."

Return ONLY the smoothed message as plain text. No quotes, no JSON, no explanations - just the improved message.`;
}

function generateFallbackSmooth(text, toneValue) {
  if (!text) return "I wanted to get in touch with you about something.";
  
  const baseText = text.trim();
  
  if (toneValue <= 33) {
    // Friendly tone
    return `I hope you're doing well! ${baseText.charAt(0).toUpperCase() + baseText.slice(1)}. Thank you so much for your time and understanding!`;
  } else if (toneValue <= 66) {
    // Balanced tone
    return `I wanted to reach out regarding: ${baseText}. I'd appreciate your assistance with this matter.`;
  } else {
    // Firm tone
    return `I need to address the following: ${baseText}. Please let me know how we can proceed.`;
  }
}