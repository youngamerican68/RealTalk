/**
 * Risk Detection Engine for RealTalk Draft
 * Analyzes message context and emotional triggers to assess communication risk
 */

class RiskDetector {
  constructor() {
    this.emotionalTriggers = {
      high: [
        // All caps words (detected by pattern)
        // Aggressive language
        'angry', 'furious', 'ridiculous', 'stupid', 'idiotic', 'incompetent',
        'unacceptable', 'outrageous', 'disgusted', 'appalled',
        // Accusatory language
        'you always', 'you never', 'your fault', 'blame you', 'you should have',
        // Extreme statements
        'absolutely not', 'completely wrong', 'total failure', 'disaster',
        'terrible', 'awful', 'worst', 'hate', 'can\'t stand'
      ],
      medium: [
        // Frustrated language
        'frustrated', 'disappointed', 'confused', 'concerned', 'worried',
        'surprised', 'shocked', 'unexpected', 'unfortunate',
        // Passive aggressive
        'fine', 'whatever', 'obviously', 'clearly', 'as i said', 'per my last',
        // Demanding language
        'need this now', 'asap', 'urgent', 'immediately', 'demanding', 'require'
      ],
      low: [
        // Mildly emotional
        'hope', 'think', 'feel', 'believe', 'suggest', 'recommend',
        'prefer', 'would like', 'could we', 'maybe', 'perhaps'
      ]
    };

    this.platformRiskFactors = {
      linkedin: {
        public: 'high', // Public posts have high reputation risk
        message: 'medium', // Private messages are safer
        comment: 'high' // Comments are public
      },
      twitter: {
        tweet: 'high', // All tweets are public
        reply: 'high', // Replies can go viral
        dm: 'low' // DMs are private
      },
      reddit: {
        post: 'high', // Posts can reach large audiences
        comment: 'high', // Comments are public and threaded
        message: 'low' // Private messages
      },
      slack: {
        channel: 'medium', // Team visibility
        dm: 'low', // Private conversation
        thread: 'medium' // Threaded discussion
      },
      gmail: {
        compose: 'low', // Email is typically private
        reply: 'low', // Reply context
        forward: 'medium' // Forwarding increases visibility
      },
      general: {
        form: 'medium', // Unknown context
        comment: 'high', // Assume public
        message: 'low' // Assume private
      }
    };

    this.scenarioPatterns = {
      customerComplaint: {
        keywords: ['complaint', 'dissatisfied', 'refund', 'problem', 'issue', 'broken', 'not working'],
        context: 'customer service',
        risk: 'high'
      },
      publicReply: {
        keywords: ['@', 'reply to', 'responding to', 'in response'],
        context: 'public discussion',
        risk: 'high'
      },
      executiveCommunication: {
        keywords: ['ceo', 'executive', 'senior', 'leadership', 'board', 'director'],
        context: 'leadership communication',
        risk: 'high'
      },
      conflictEscalation: {
        keywords: ['disagree', 'wrong', 'mistake', 'error', 'failed', 'disappointed'],
        context: 'conflict resolution',
        risk: 'medium'
      },
      apologyNeeded: {
        keywords: ['sorry', 'apologize', 'my fault', 'my mistake', 'regret'],
        context: 'mistake acknowledgment',
        risk: 'medium'
      }
    };
  }

  /**
   * Main risk assessment function
   * @param {string} text - The message text to analyze
   * @param {string} platform - The platform (linkedin, slack, etc.)
   * @param {Object} context - Additional context (url, thread info, etc.)
   * @returns {Object} Risk assessment results
   */
  assessRisk(text, platform = 'general', context = {}) {
    const emotionalRisk = this.analyzeEmotionalContent(text);
    const platformRisk = this.analyzePlatformRisk(platform, context);
    const scenarioRisk = this.detectScenario(text, context);
    const urgencyFactors = this.detectUrgencyFactors(text);
    
    // Calculate overall risk level
    const riskScores = {
      low: 1,
      medium: 2, 
      high: 3
    };
    
    const totalRisk = (
      riskScores[emotionalRisk.level] +
      riskScores[platformRisk.level] +
      riskScores[scenarioRisk.level] +
      (urgencyFactors.hasUrgency ? 1 : 0)
    ) / 3;
    
    let overallRisk = 'low';
    if (totalRisk >= 2.5) overallRisk = 'high';
    else if (totalRisk >= 1.5) overallRisk = 'medium';
    
    return {
      overallRisk,
      emotionalRisk,
      platformRisk,
      scenarioRisk,
      urgencyFactors,
      recommendations: this.generateRecommendations(overallRisk, scenarioRisk, emotionalRisk)
    };
  }

  /**
   * Analyze emotional content and triggers
   */
  analyzeEmotionalContent(text) {
    const lowercaseText = text.toLowerCase();
    const triggers = {
      high: [],
      medium: [],
      low: []
    };
    
    // Check for emotional trigger words
    Object.keys(this.emotionalTriggers).forEach(level => {
      this.emotionalTriggers[level].forEach(trigger => {
        if (lowercaseText.includes(trigger)) {
          triggers[level].push(trigger);
        }
      });
    });
    
    // Check for ALL CAPS (sign of shouting)
    const capsWords = text.match(/\b[A-Z]{2,}\b/g) || [];
    if (capsWords.length > 0) {
      triggers.high.push('excessive caps');
    }
    
    // Check for excessive punctuation
    const excessivePunctuation = text.match(/[!?]{2,}/g) || [];
    if (excessivePunctuation.length > 0) {
      triggers.medium.push('excessive punctuation');
    }
    
    // Determine risk level
    let level = 'low';
    if (triggers.high.length > 0) level = 'high';
    else if (triggers.medium.length > 0) level = 'medium';
    
    return {
      level,
      triggers,
      capsWords,
      hasExcessivePunctuation: excessivePunctuation.length > 0
    };
  }

  /**
   * Analyze platform-specific risk factors
   */
  analyzePlatformRisk(platform, context) {
    const platformConfig = this.platformRiskFactors[platform] || this.platformRiskFactors.general;
    
    // Determine message type based on context
    let messageType = 'form';
    if (context.url) {
      if (context.url.includes('compose') || context.url.includes('new')) messageType = 'compose';
      if (context.url.includes('reply')) messageType = 'reply';
      if (context.url.includes('comment')) messageType = 'comment';
      if (context.url.includes('post')) messageType = 'post';
    }
    
    const riskLevel = platformConfig[messageType] || platformConfig.form || 'medium';
    
    return {
      level: riskLevel,
      platform,
      messageType,
      isPublic: ['post', 'comment', 'tweet', 'reply'].includes(messageType),
      audienceSize: this.estimateAudienceSize(platform, messageType)
    };
  }

  /**
   * Detect communication scenario type
   */
  detectScenario(text, context) {
    const lowercaseText = text.toLowerCase();
    let detectedScenario = null;
    let highestMatchCount = 0;
    
    Object.keys(this.scenarioPatterns).forEach(scenarioKey => {
      const scenario = this.scenarioPatterns[scenarioKey];
      let matchCount = 0;
      
      scenario.keywords.forEach(keyword => {
        if (lowercaseText.includes(keyword)) {
          matchCount++;
        }
      });
      
      if (matchCount > highestMatchCount) {
        highestMatchCount = matchCount;
        detectedScenario = {
          type: scenarioKey,
          context: scenario.context,
          level: scenario.risk,
          matchCount
        };
      }
    });
    
    return detectedScenario || {
      type: 'general',
      context: 'general communication',
      level: 'low',
      matchCount: 0
    };
  }

  /**
   * Detect urgency factors
   */
  detectUrgencyFactors(text) {
    const lowercaseText = text.toLowerCase();
    const urgencyKeywords = ['urgent', 'asap', 'immediately', 'now', 'emergency', 'critical'];
    const foundUrgencyWords = urgencyKeywords.filter(word => lowercaseText.includes(word));
    
    return {
      hasUrgency: foundUrgencyWords.length > 0,
      urgencyWords: foundUrgencyWords,
      level: foundUrgencyWords.length > 0 ? 'high' : 'low'
    };
  }

  /**
   * Estimate potential audience size
   */
  estimateAudienceSize(platform, messageType) {
    const audienceMap = {
      linkedin: { post: 'large', comment: 'medium', message: 'small' },
      twitter: { tweet: 'large', reply: 'large', dm: 'small' },
      reddit: { post: 'large', comment: 'medium', message: 'small' },
      slack: { channel: 'small', dm: 'small', thread: 'small' },
      gmail: { compose: 'small', reply: 'small', forward: 'medium' }
    };
    
    return audienceMap[platform]?.[messageType] || 'medium';
  }

  /**
   * Generate contextual recommendations
   */
  generateRecommendations(overallRisk, scenarioRisk, emotionalRisk) {
    const recommendations = [];
    
    if (overallRisk === 'high') {
      recommendations.push('🚨 HIGH RISK: Consider using Panic Mode for safest options');
      recommendations.push('💭 Take time to cool down before sending');
    }
    
    if (emotionalRisk.level === 'high') {
      recommendations.push('😤 High emotional content detected - recommend De-escalation mode');
    }
    
    if (scenarioRisk.type === 'customerComplaint') {
      recommendations.push('🆘 Customer complaint detected - use Crisis Response mode');
    }
    
    if (scenarioRisk.type === 'executiveCommunication') {
      recommendations.push('💼 Executive communication - use Professional mode');
    }
    
    if (scenarioRisk.type === 'apologyNeeded') {
      recommendations.push('🤲 Apology context detected - use Apology Framework');
    }
    
    return recommendations;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RiskDetector;
} else if (typeof window !== 'undefined') {
  window.RiskDetector = RiskDetector;
}