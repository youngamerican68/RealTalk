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

    // Politeness and social awkwardness indicators
    this.politenessAnalysis = {
      // Words/phrases that indicate bluntness or rudeness
      bluntness: [
        'nope', 'nah', 'whatever', 'fine', 'k', 'sure',
        'obviously', 'clearly', 'duh', 'come on', 'seriously',
        'you need to', 'you should', 'you have to', 'just do it'
      ],
      
      // Indicators of social awkwardness  
      awkwardness: [
        'umm', 'uh', 'so yeah', 'i guess', 'maybe', 'sorta', 'kinda',
        'i dunno', 'not sure', 'i think maybe', 'if thats ok',
        'sorry to bother', 'hope this is ok', 'sorry again'
      ],
      
      // Missing courtesy markers
      missingCourtesy: {
        requests: ['can you', 'could you', 'would you', 'need you to', 'want you to'],
        noPlease: true, // Will check if requests lack "please"
        noThankYou: true, // Will check if no gratitude expressed
        abruptEnding: true // Will check for abrupt endings
      },
      
      // ESL/Non-native speaker patterns
      eslIndicators: [
        'very much', 'so much sorry', 'please to', 'kindly do',
        'revert back', 'do the needful', 'good name', 'out of station'
      ],
      
      // Everyday scenarios that need smoothing
      commonScenarios: {
        cancellation: ['cant make it', 'have to cancel', 'sorry cant', 'maybe later', 'rain check'],
        landlordRequest: ['landlord', 'fix', 'broken', 'repair', 'maintenance', 'heat', 'water'],
        apology: ['my bad', 'oops', 'sorry about', 'messed up', 'screwed up'],
        request: ['need', 'want', 'can you', 'help', 'favor', 'ask you']
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
    
    // Add politeness analysis for Simple Mode
    const politenessAnalysis = this.analyzePoliteness(text);
    
    return {
      overallRisk,
      emotionalRisk,
      platformRisk,
      scenarioRisk,
      urgencyFactors,
      politenessAnalysis,
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

  /**
   * Analyze politeness and social smoothness of text
   */
  analyzePoliteness(text) {
    const lowercaseText = text.toLowerCase();
    const analysis = {
      needsSmoothing: false,
      issues: [],
      severity: 'low', // low, medium, high
      suggestedTone: 'balanced',
      detectedScenario: null
    };

    let issueCount = 0;

    // Check for bluntness (using word boundaries to avoid partial matches)
    const bluntWords = this.politenessAnalysis.bluntness.filter(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(text);
    });
    if (bluntWords.length > 0) {
      analysis.issues.push('blunt_language');
      issueCount += bluntWords.length;
    }

    // Check for awkwardness
    const awkwardPhrases = this.politenessAnalysis.awkwardness.filter(phrase => 
      lowercaseText.includes(phrase)
    );
    if (awkwardPhrases.length > 0) {
      analysis.issues.push('awkward_phrasing');
      issueCount += awkwardPhrases.length;
    }

    // Check for ESL indicators  
    const eslIndicators = this.politenessAnalysis.eslIndicators.filter(phrase => 
      lowercaseText.includes(phrase)
    );
    if (eslIndicators.length > 0) {
      analysis.issues.push('esl_patterns');
      issueCount += eslIndicators.length;
    }

    // Check for missing courtesy markers
    const hasRequest = this.politenessAnalysis.missingCourtesy.requests.some(req => 
      lowercaseText.includes(req)
    );
    if (hasRequest) {
      if (!lowercaseText.includes('please')) {
        analysis.issues.push('missing_please');
        issueCount++;
      }
      if (!lowercaseText.includes('thank') && !lowercaseText.includes('appreciate')) {
        analysis.issues.push('missing_gratitude');
        issueCount++;
      }
    }

    // Check for abrupt ending
    if (text.length < 50 && !text.includes('.') && !text.includes('!') && !text.includes('?')) {
      analysis.issues.push('abrupt_ending');
      issueCount++;
    }

    // Detect common scenarios
    for (const [scenarioName, keywords] of Object.entries(this.politenessAnalysis.commonScenarios)) {
      const matchCount = keywords.filter(keyword => lowercaseText.includes(keyword)).length;
      if (matchCount > 0) {
        analysis.detectedScenario = scenarioName;
        break;
      }
    }

    // Determine severity and suggested tone
    if (issueCount >= 3) {
      analysis.severity = 'high';
      analysis.needsSmoothing = true;
      analysis.suggestedTone = 'friendly'; // Extra politeness needed
    } else if (issueCount >= 2) {
      analysis.severity = 'medium';
      analysis.needsSmoothing = true;
      analysis.suggestedTone = 'balanced';
    } else if (issueCount >= 1) {
      analysis.severity = 'low';
      analysis.needsSmoothing = true;
      analysis.suggestedTone = 'balanced';
    }

    // Adjust suggested tone based on detected scenario
    if (analysis.detectedScenario === 'landlordRequest') {
      analysis.suggestedTone = 'firm'; // Need to be assertive with landlords
    } else if (analysis.detectedScenario === 'apology') {
      analysis.suggestedTone = 'friendly'; // Apologies should be warm
    }

    return analysis;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RiskDetector;
} else if (typeof window !== 'undefined') {
  window.RiskDetector = RiskDetector;
}