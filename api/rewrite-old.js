import config from '../config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, platform, userId, scenarioType, riskLevel } = req.body;

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

    // Using simple direct prompt instead of complex generatePrompt function

    // Retry logic for rate limits
    let response;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      response = await fetch(config.OPENROUTER_API_URL, {
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
              content: 'You are a writing assistant. When users show you text they want to send, rewrite it to be more polite/professional while keeping the same request or instruction.'
            },
            {
              role: 'user',
              content: `Rewrite this text to be more polite: "${text}"\n\nExamples:\n- Original: "do your homework now" → Rewrite: "Please do your homework"\n- Original: "if you dont finish your sandwich, im calling your mom" → Rewrite: "Please finish your sandwich"\n\nGive me 3 versions in this JSON format: [{"type":"polite","text":"..."},{"type":"professional","text":"..."},{"type":"direct","text":"..."}]`
            }
          ],
          max_tokens: config.MAX_TOKENS,
          temperature: config.TEMPERATURE,
        }),
      });

      if (response.ok) {
        break; // Success, exit retry loop
      }

      if (response.status === 429 && attempts < maxAttempts - 1) {
        // Rate limited, wait and retry
        const waitTime = Math.pow(2, attempts) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`Rate limited, retrying in ${waitTime}ms (attempt ${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        attempts++;
      } else {
        break; // Don't retry for other errors or final attempt
      }
    }

    if (!response.ok) {
      if (response.status === 429) {
        console.log('Rate limit hit after retries, using fallback rewrites');
        const fallbackRewrites = generateFallbackRewrites(text, platform, scenarioType);
        return res.status(200).json({
          rewrites: fallbackRewrites,
          platform: platform,
          userId: userId,
          fallback: true
        });
      }
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
        text: rewrite.text
      }));

      return res.status(200).json({
        rewrites: formattedRewrites,
        platform: platform,
        userId: userId
      });

    } catch (parseError) {
      const fallbackRewrites = generateFallbackRewrites(text, platform, scenarioType);
      return res.status(200).json({
        rewrites: fallbackRewrites,
        platform: platform,
        userId: userId,
        fallback: true
      });
    }

  } catch (error) {
    console.error('Rewrite API error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return res.status(500).json({ 
      error: 'Failed to generate rewrites',
      debug: error.message 
    });
  }
}

function generatePrompt(text, platform, scenarioType, riskLevel) {
  // High-anxiety scenario templates
  const scenarioPrompts = {
    reputationShield: `You are RealTalk Draft, a message rewriting specialist. The user has written a message they want to send, but it might damage their reputation. Your job is to REWRITE their message into 3 safer, more professional versions that they can send instead.

User's original message they want to send: "${text}"

This is a HIGH REPUTATION RISK scenario. Provide 3 improved versions of their message:
1. Safest: Maximum diplomatic protection, suitable for public viewing
2. Balanced: Professional but maintains some original intent
3. Strategic: Thoughtful version that advances the conversation positively

CRITICAL RULES:
- REWRITE their message, don't respond to it
- Keep the same general purpose/goal as their original message
- Eliminate ALL inflammatory language
- Remove personal attacks or blame
- Add diplomatic language ("I understand," "perspective," "collaborate")
- Focus on solutions, not problems
- Consider this may be screenshotted or shared
- Protect sender's professional reputation at all costs
- Use "I" statements exclusively
- Suggest next steps that de-escalate

Format: Return a JSON array with 3 objects containing "type" and "text" fields.`,

    deEscalation: `You are RealTalk Draft. The user wants to send an emotionally charged message but needs it de-escalated. Your job is to improve their draft message, NOT respond to it.

TASK: Take their draft message and make it calmer while keeping the same intent.

Their draft message: "${text}"

EXAMPLE:
- If they wrote: "you're being unreasonable and need to fix this now"
- DON'T write a response like: "I understand you may feel the situation is unreasonable..."
- DO rewrite their message like: "I'm concerned about this issue and would appreciate working together to resolve it"

This is a CONFLICT ESCALATION scenario. Provide 3 calmer versions of THEIR message:
1. Calming: Maximum de-escalation, acknowledges emotions
2. Diplomatic: Professional while addressing the issue
3. Bridge-building: Focuses on finding common ground

CRITICAL RULES:
- Improve THEIR message, don't write a response TO their message
- Keep their same goal/intent
- Remove ALL accusatory language
- Transform anger into concern
- Use collaborative language
- Focus on shared goals and solutions
- Avoid "you" statements that blame

Format: Return a JSON array with 3 objects containing "type" and "text" fields.`,

    crisisResponse: `You are RealTalk Draft, a message rewriting specialist. The user has written a complaint or crisis message they want to send. Your job is to REWRITE their message into 3 more professional versions that they can send instead.

User's original message they want to send: "${text}"

This is a CUSTOMER CRISIS scenario. Provide 3 improved versions of their message:
1. Apologetic: Takes full responsibility with sincere apology
2. Solution-focused: Acknowledges issue and offers immediate solutions
3. Escalation: Professional escalation to management/specialist

CRISIS MANAGEMENT RULES:
- REWRITE their message, don't respond to it
- Keep the same general purpose/goal as their original message
- Start with acknowledgment of the issue
- Take appropriate responsibility without admitting fault
- Express genuine concern for customer experience  
- Offer specific next steps or solutions
- Provide timeline for resolution
- Include contact information or escalation path
- Use empathetic language ("I understand how frustrating this must be")
- End with commitment to resolution

Format: Return a JSON array with 3 objects containing "type" and "text" fields.`,

Edit this draft message to be more assertive and professional. Make 3 versions:

Examples of editing (NOT responding):
- Draft: "you're being ridiculous" → Edit: "I disagree with this approach"
- Draft: "if you dont finish your sandwich, im calling your mom" → Edit: "Please finish your sandwich"

Return 3 edited versions:
1. Diplomatic: gentle but firm
2. Assertive: clear and direct
3. Executive: confident leadership

Format: JSON array with "type" and "text" fields.`,

    apologyFramework: `You are RealTalk Draft, a message rewriting specialist. The user has written a mistake acknowledgment they want to send. Your job is to REWRITE their message into 3 more professional apology versions that they can send instead.

User's original message they want to send: "${text}"

This is an APOLOGY SCENARIO. Provide 3 improved versions of their message:
1. Full Responsibility: Complete ownership with action plan
2. Collaborative: Acknowledges issue while inviting partnership
3. Learning-focused: Frames mistake as growth opportunity

APOLOGY FRAMEWORK RULES:
- REWRITE their message, don't respond to it
- Keep the same general purpose/goal as their original message
- Take clear responsibility without excuses
- Acknowledge specific impact on the other person
- Express genuine remorse
- Explain what went wrong (briefly, without excuses)
- Detail specific corrective actions
- Commit to preventing future occurrences
- Ask how you can make it right
- End with gratitude for their patience

Format: Return a JSON array with 3 objects containing "type" and "text" fields.`,
  };

  // Standard platform prompts (fallback)
  const platformPrompts = {
    slack: `You are RealTalk Draft, a message rewriting specialist. The user has written a message they want to send on Slack. Your job is to REWRITE their message into 3 more professional versions optimized for Slack that they can send instead.

User's original message they want to send: "${text}"

Risk Level: ${riskLevel || 'medium'}

Provide 3 improved versions of their message:
1. Professional: Formal, diplomatic, suitable for senior leadership
2. Direct: Clear and honest but respectful, good for peers  
3. Collaborative: Solution-focused, emphasizing teamwork

Rules based on risk level ${riskLevel}:
- REWRITE their message, don't respond to it
- Keep the same general purpose/goal as their original message
${riskLevel === 'high' ? '- MAXIMUM caution: remove ALL emotional language\n- Use highly diplomatic tone\n- Focus on solutions only' : ''}
- Keep each under 280 characters
- Maintain core concern
- Use "I" statements when appropriate
- Suggest next steps
- Use professional Slack tone

Format: Return a JSON array with 3 objects containing "type" and "text" fields.`,

    linkedin: `You are RealTalk Draft, a message rewriting specialist. The user has written a message they want to send on LinkedIn. Your job is to REWRITE their message into 3 more professional versions optimized for LinkedIn that they can send instead.

User's original message they want to send: "${text}"

Risk Level: ${riskLevel || 'medium'} - This is a professional networking platform where reputation matters.

Provide 3 improved versions of their message:
1. Professional: Maximum diplomatic protection for public viewing
2. Direct: Clear but respectful, suitable for professional connections
3. Collaborative: Builds professional relationships and networks

LINKEDIN-SPECIFIC RULES:
- REWRITE their message, don't respond to it
- Keep the same general purpose/goal as their original message
- Consider this may be public and affect professional reputation
- Use industry-appropriate language
- Focus on professional growth and collaboration
- Remove any personal attacks or complaints
- Emphasize thought leadership and expertise
- Build bridges, don't burn them
- Consider future business relationships

Format: Return a JSON array with 3 objects containing "type" and "text" fields.`,

    reddit: `You are RealTalk Draft, a message rewriting specialist. The user has written a message they want to post on Reddit. Your job is to REWRITE their message into 3 safer versions that they can post instead.

User's original message they want to post: "${text}"

Risk Level: ${riskLevel || 'high'} - This is a PUBLIC FORUM where messages can go viral and attract harassment.

Provide 3 improved versions of their message:
1. Safest: Maximum protection against trolling and harassment
2. Balanced: Clear position while avoiding controversy triggers
3. Thoughtful: Contributes meaningfully to discussion

REDDIT-SPECIFIC RULES:
- REWRITE their message, don't respond to it
- Keep the same general purpose/goal as their original message
- Consider this is PUBLIC and can be screenshot/shared
- Avoid anything that could trigger harassment or trolling
- Remove personal information or identifiable details
- Use respectful tone that discourages pile-on responses
- Focus on the issue, not personal attacks
- Consider subreddit rules and culture
- Prepare for public scrutiny

Format: Return a JSON array with 3 objects containing "type" and "text" fields.`,

    general: `You are RealTalk Draft. The user wants to send a message but needs it polished. Your job is to improve their draft message, NOT respond to it.

TASK: Take their draft message and make it better while keeping the same intent.

Their draft message: "${text}"

EXAMPLE:
- If they wrote: "you're being ridiculous about this deadline"
- DON'T write a response like: "I understand your concern about the deadline..."  
- DO rewrite their message like: "I'm concerned this deadline might be challenging to meet"

Risk Level: ${riskLevel || 'medium'}

Provide 3 improved versions of THEIR message (not responses to it):
1. Safest: Maximum protection and diplomacy
2. Balanced: Professional while maintaining intent  
3. Strategic: Thoughtful approach that advances goals

CRITICAL RULES:
- Improve THEIR message, don't write a response TO their message
- Keep their same goal/intent
- Make it more professional/polite
${riskLevel === 'high' ? '- CRISIS MODE: Maximum diplomatic protection\n- Remove ALL emotional/inflammatory language\n- Focus only on solutions and next steps' : ''}
${riskLevel === 'medium' ? '- CAUTION MODE: Professional tone with diplomatic language\n- Remove harsh language, keep respectful intent' : ''}
${riskLevel === 'low' ? '- STANDARD MODE: Professional improvement with clear communication' : ''}

Format: Return a JSON array with 3 objects containing "type" and "text" fields.`,
  };

  // Return scenario-specific prompt if provided, otherwise use platform prompt
  if (scenarioType && scenarioPrompts[scenarioType]) {
    return scenarioPrompts[scenarioType];
  }
  
  return platformPrompts[platform] || platformPrompts.general;
}

function generateFallbackRewrites(text, platform, scenarioType) {
  const scenarioFallbacks = {
    reputationShield: [
      { type: 'professional', text: `I'd like to discuss this matter professionally. Could we schedule time to address this thoughtfully?` },
      { type: 'direct', text: `I understand there may be concerns here. I'm committed to finding a constructive resolution.` },
      { type: 'collaborative', text: `I value our working relationship and would appreciate the opportunity to discuss this further.` }
    ],
    deEscalation: [
      { type: 'professional', text: `I understand this is important to you. Let's work together to find a solution that works for everyone.` },
      { type: 'direct', text: `I hear your concerns and want to address them properly. Can we discuss this when we both have time to focus?` },
      { type: 'collaborative', text: `I appreciate you bringing this up. Let's collaborate on finding the best path forward.` }
    ],
    crisisResponse: [
      { type: 'professional', text: `Thank you for bringing this to my attention. I want to address this properly and will get back to you shortly.` },
      { type: 'direct', text: `I understand this needs immediate attention. Let me look into this and provide you with an update soon.` },
      { type: 'collaborative', text: `I appreciate your patience. I'm committed to resolving this and will keep you updated on progress.` }
    ]
  };

  const defaultFallbacks = [
    { type: 'professional', text: `I wanted to discuss this with you. Could we find time to talk about the best approach?` },
    { type: 'direct', text: `I think this deserves our attention. When would be a good time to address this together?` },
    { type: 'collaborative', text: `I'd value your perspective on this. Could we work together to find a good solution?` }
  ];

  return scenarioFallbacks[scenarioType] || defaultFallbacks;
}