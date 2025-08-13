// Enhanced Risk Detector - embedded to avoid path issues
class RiskDetector {
  constructor() {
    this.emotionalTriggers = {
      high: [
        // Violent/aggressive language
        'kill', 'murder', 'destroy', 'annihilate', 'crush', 'obliterate',
        // Extreme anger
        'furious', 'rage', 'enraged', 'livid', 'irate', 'incensed',
        // Strong negative words
        'hate', 'despise', 'loathe', 'detest', 'abhor',
        // Insulting language
        'stupid', 'idiotic', 'moronic', 'incompetent', 'pathetic', 'ridiculous',
        // Extreme reactions
        'unacceptable', 'outrageous', 'disgraceful', 'appalling', 'disgusting',
        // Threatening language
        'going to', 'will make', 'pay for this', 'regret', 'sorry'
      ],
      medium: [
        'frustrated', 'disappointed', 'annoyed', 'irritated', 'upset', 'angry',
        'confused', 'concerned', 'worried', 'surprised', 'shocked',
        'fed up', 'sick of', 'tired of', 'done with', 'had enough'
      ],
      low: ['hope', 'think', 'feel', 'believe', 'suggest', 'recommend', 'wonder', 'curious']
    };

    this.violentPhrases = [
      'going to kill', 'want to kill', 'could kill', 'will kill',
      'going to murder', 'want to murder', 'could murder',
      'going to destroy', 'will destroy', 'going to crush'
    ];
  }

  assessRisk(text, platform = 'general', context = {}) {
    const emotionalRisk = this.analyzeEmotionalContent(text);
    
    return {
      overallRisk: emotionalRisk.level,
      emotionalRisk,
      platformRisk: { level: 'medium', platform, audienceSize: 'medium' },
      scenarioRisk: { type: 'general', context: 'general communication', level: 'low' },
      recommendations: emotionalRisk.level === 'high' ? ['🚨 HIGH RISK: Consider using Panic Mode', '🛡️ Use Reputation Shield for maximum safety'] : []
    };
  }

  analyzeEmotionalContent(text) {
    const lowercaseText = text.toLowerCase();
    let level = 'low';
    let foundTriggers = [];
    
    // Check for violent phrases first (highest priority)
    for (const phrase of this.violentPhrases) {
      if (lowercaseText.includes(phrase)) {
        level = 'high';
        foundTriggers.push(phrase);
        break;
      }
    }
    
    // Check for individual trigger words
    if (level !== 'high') {
      if (this.emotionalTriggers.high.some(trigger => {
        if (lowercaseText.includes(trigger)) {
          foundTriggers.push(trigger);
          return true;
        }
        return false;
      })) {
        level = 'high';
      } else if (this.emotionalTriggers.medium.some(trigger => {
        if (lowercaseText.includes(trigger)) {
          foundTriggers.push(trigger);
          return true;
        }
        return false;
      })) {
        level = 'medium';
      }
    }
    
    // Check for ALL CAPS (sign of shouting)
    const capsWords = text.match(/\b[A-Z]{3,}\b/g) || [];
    if (capsWords.length > 0) {
      level = level === 'low' ? 'medium' : 'high';
      foundTriggers.push('excessive caps');
    }
    
    // Check for excessive punctuation
    if (text.match(/[!?]{2,}/g)) {
      level = level === 'low' ? 'medium' : level;
      foundTriggers.push('excessive punctuation');
    }
    
    console.log('🎯 Risk Analysis:', { text: lowercaseText, level, foundTriggers });
    
    return { level, triggers: { high: [], medium: [], low: [] }, foundTriggers };
  }
}

class RealTalkPopup {
  constructor() {
    this.currentText = '';
    this.currentPlatform = 'general';
    this.currentScenario = 'general';
    this.userSelectedScenario = false;
    this.riskAssessment = null;
    this.rewrites = null;
    this.riskDetector = new RiskDetector();
    this.currentMode = 'simple'; // Start in simple mode
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.loadUsageInfo();
    this.loadCurrentText();
    this.setupManualInput();
    this.loadPreferredMode();
  }
  
  setupEventListeners() {
    // Mode toggle buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchMode(e.target.dataset.mode);
      });
    });
    
    
    // Simple mode copy button
    const smoothCopyBtn = document.getElementById('smoothCopyBtn');
    if (smoothCopyBtn) {
      smoothCopyBtn.addEventListener('click', () => {
        this.copySmoothedText();
      });
    }
    
    document.getElementById('rewriteBtn').addEventListener('click', () => {
      this.handleRewrite();
    });
    
    document.getElementById('retryBtn').addEventListener('click', () => {
      this.handleRewrite();
    });
    
    document.getElementById('upgradeBtn').addEventListener('click', () => {
      this.handleUpgrade();
    });
    
    // Panic mode button
    document.getElementById('panicBtn').addEventListener('click', () => {
      this.handlePanicMode();
    });
    
    // Scenario selection
    document.querySelectorAll('.scenario-mode').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectScenario(e.currentTarget);
      });
    });
    
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.target.getAttribute('data-type');
        this.copyRewrite(type);
      });
    });
  }
  
  async loadUsageInfo() {
    try {
      const response = await this.sendMessage({ action: 'checkUsage' });
      this.updateUsageDisplay(response);
    } catch (error) {
      console.error('Failed to load usage info:', error);
      document.getElementById('usageText').textContent = 'Usage info unavailable';
    }
  }
  
  async loadCurrentText() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        // Try multiple times with increasing delays to ensure content script is loaded
        this.attemptContentScriptCommunication(tabs[0], 0);
      }
    } catch (error) {
      console.error('Failed to get current text:', error);
      this.showNoTextMessage();
    }
  }

  async attemptContentScriptCommunication(tab, attemptCount) {
    const maxAttempts = 3;
    const delays = [50, 200, 500]; // Increasing delays
    
    try {
      console.log(`🔍 Attempt ${attemptCount + 1}/${maxAttempts}: Contacting content script...`);
      
      // Try to inject content script if it's not responding
      if (attemptCount === 0) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['debug-simple.js']
          });
          console.log('🔍 Content script re-injected');
        } catch (injectionError) {
          console.log('🔍 Content script injection failed (might already be loaded):', injectionError.message);
        }
      }
      
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'getSelectedText'
      });
      
      console.log('🔍 Content script response:', response);
      
      if (response && response.text && response.text.trim()) {
        this.currentText = response.text.trim();
        this.currentPlatform = response.platform || 'general';
        this.updateOriginalText(this.currentText);
        this.enableRewriteButton();
        
        // Auto-populate Simple Mode input if in Simple Mode
        if (this.currentMode === 'simple') {
          const smoothInput = document.getElementById('smoothInput');
          if (smoothInput) {
            smoothInput.value = this.currentText;
          }
        }
        this.checkCompatibility(tab.url);
        
        // Perform risk assessment
        this.performRiskAssessment(tab.url);
        console.log('✅ Content script communication successful!');
        return; // Success, stop trying
      } else {
        console.log('🔍 Content script responded but no text found');
        this.showNoTextMessage();
        this.checkCompatibility(tab.url);
      }
    } catch (error) {
      console.error(`🔍 Content script error (attempt ${attemptCount + 1}):`, error);
      
      // Retry if we haven't exceeded max attempts
      if (attemptCount < maxAttempts - 1) {
        console.log(`🔍 Retrying in ${delays[attemptCount + 1]}ms...`);
        setTimeout(() => {
          this.attemptContentScriptCommunication(tab, attemptCount + 1);
        }, delays[attemptCount + 1]);
      } else {
        console.log('🔍 All content script attempts failed, using manual input only');
        this.showNoTextMessage();
        this.checkCompatibility(tab.url);
      }
    }
  }
  
  checkCompatibility(url) {
    // Check for common desktop app patterns
    const isDesktopPattern = url && (
      url.startsWith('file://') ||
      url.includes('electron') ||
      !url.startsWith('http')
    );
    
    // Check for Slack desktop (won't work)
    const isSlackDesktop = url && url.includes('slack') && !url.includes('slack.com');
    
    if (isDesktopPattern || isSlackDesktop) {
      this.showCompatibilityWarning();
    }
  }
  
  showCompatibilityWarning() {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'compatibility-warning';
    warningDiv.innerHTML = `
      <div class="warning-icon">⚠️</div>
      <div class="warning-text">
        <strong>Limited Compatibility</strong><br>
        This appears to be a desktop app. RealTalk Draft works best in web browsers. 
        We'll copy text to your clipboard for manual pasting.
      </div>
    `;
    
    const content = document.querySelector('.content');
    content.insertBefore(warningDiv, content.firstChild);
  }
  
  updateUsageDisplay(usageInfo) {
    const usageText = document.getElementById('usageText');
    const upgradeBtn = document.getElementById('upgradeBtn');
    
    if (usageInfo.status === 'pro') {
      usageText.textContent = `Pro: ${usageInfo.usage}/1000 rewrites`;
      upgradeBtn.classList.add('hidden');
    } else {
      usageText.textContent = `Free: ${usageInfo.usage}/20 rewrites`;
      
      if (usageInfo.remaining <= 5) {
        upgradeBtn.classList.remove('hidden');
      }
      
      if (usageInfo.remaining === 0) {
        this.disableRewriteButton('Usage limit reached');
      }
    }
  }
  
  updateOriginalText(text) {
    const originalText = document.getElementById('originalText');
    originalText.textContent = text;
    
    // Clear manual input when auto-detection works
    const manualInput = document.getElementById('manualInput');
    if (manualInput) {
      manualInput.value = '';
    }
  }
  
  showNoTextMessage() {
    const originalText = document.getElementById('originalText');
    originalText.textContent = 'Select text or focus on an input field to get started';
    this.disableRewriteButton('No text selected');
  }
  
  enableRewriteButton() {
    const btn = document.getElementById('rewriteBtn');
    btn.disabled = false;
    btn.textContent = 'Rewrite Text';
  }
  
  /**
   * Switch between Simple and Expert modes
   */
  switchMode(mode) {
    this.currentMode = mode;
    
    // Update button states
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Show/hide appropriate sections
    const simpleModeSection = document.getElementById('simpleModeSection');
    const expertModeSection = document.getElementById('expertModeSection');
    
    if (mode === 'simple') {
      simpleModeSection.classList.remove('hidden');
      expertModeSection.classList.add('hidden');
      
      // Update footer button for Simple Mode
      const rewriteBtn = document.getElementById('rewriteBtn');
      rewriteBtn.innerHTML = '<span class="smooth-btn-icon">✨</span> Smooth It';
      rewriteBtn.onclick = () => this.handleSmoothIt();
      
      // Load any selected text into simple mode input
      const smoothInput = document.getElementById('smoothInput');
      if (this.currentText && smoothInput) {
        smoothInput.value = this.currentText;
      }
    } else {
      simpleModeSection.classList.add('hidden');
      expertModeSection.classList.remove('hidden');
      
      // Update footer button for Expert Mode
      const rewriteBtn = document.getElementById('rewriteBtn');
      rewriteBtn.innerHTML = 'Rewrite Text';
      rewriteBtn.onclick = () => this.handleRewrite();
      
      // Show scenario section for expert mode if we have text
      if (this.currentText) {
        document.getElementById('scenarioSection').classList.remove('hidden');
      }
    }
    
    // Store user preference
    chrome.storage.local.set({ preferredMode: mode });
  }
  
  /**
   * Handle Simple Mode "Smooth It" button click
   */
  async handleSmoothIt() {
    const smoothInput = document.getElementById('smoothInput');
    const toneSlider = document.getElementById('toneSlider');
    const smoothResult = document.getElementById('smoothResult');
    const rewriteBtn = document.getElementById('rewriteBtn');
    
    const text = smoothInput.value.trim();
    if (!text) {
      smoothInput.focus();
      return;
    }
    
    // Show loading state
    rewriteBtn.disabled = true;
    rewriteBtn.innerHTML = '<span class="smooth-btn-icon">⏳</span> Smoothing...';
    smoothResult.classList.add('hidden');
    
    try {
      const toneValue = parseInt(toneSlider.value);
      const response = await this.callSmoothAPI(text, toneValue);
      
      if (response.rewrites && response.rewrites.length > 0) {
        // Use the first rewrite as the "smoothed" text
        const smoothedText = response.rewrites[0].text;
        this.displaySmoothResult(smoothedText, toneValue);
      } else {
        throw new Error(response.error || 'Failed to smooth text');
      }
    } catch (error) {
      console.error('Smooth It error:', error);
      this.showError('Failed to smooth your text. Please try again.');
    } finally {
      // Reset button
      rewriteBtn.disabled = false;
      rewriteBtn.innerHTML = '<span class="smooth-btn-icon">✨</span> Smooth It';
    }
  }
  
  /**
   * Call the Simple Mode API through background script
   */
  async callSmoothAPI(text, toneValue) {
    // Map tone slider to communication mode
    let scenarioType;
    if (toneValue <= 33) {
      scenarioType = 'deEscalation'; // Friendly
    } else if (toneValue <= 66) {
      scenarioType = 'general'; // Balanced
    } else {
      scenarioType = 'professionalPushback'; // Firm
    }
    
    // Use the same message passing system as Expert Mode
    return new Promise((resolve, reject) => {
      // Set a timeout to handle message port issues
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout - please try again'));
      }, 10000); // 10 second timeout
      
      chrome.runtime.sendMessage({
        action: 'rewriteText',
        text: text,
        platform: this.currentPlatform || 'general',
        scenarioType: scenarioType,
        riskLevel: 'low' // Simple mode assumes low risk
      }, (response) => {
        clearTimeout(timeout);
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!response) {
          reject(new Error('No response received from background script'));
        } else if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }
  
  /**
   * Display smoothed result
   */
  displaySmoothResult(smoothedText, toneValue) {
    const resultText = document.getElementById('smoothResultText');
    const resultEncouragement = document.getElementById('resultEncouragement');
    const smoothResult = document.getElementById('smoothResult');
    
    resultText.textContent = smoothedText;
    
    // Set encouraging message based on tone
    const encouragements = {
      friendly: "Perfect! Your message sounds warm and approachable. 😊",
      balanced: "Great! Your message strikes the right professional tone. 👍",
      firm: "Excellent! Your message is assertive yet respectful. 💪"
    };
    
    let toneCategory = 'balanced';
    if (toneValue <= 33) toneCategory = 'friendly';
    else if (toneValue >= 67) toneCategory = 'firm';
    
    resultEncouragement.textContent = encouragements[toneCategory];
    
    smoothResult.classList.remove('hidden');
    smoothResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Store the smoothed text for copying
    this.smoothedText = smoothedText;
  }
  
  /**
   * Copy smoothed text to clipboard
   */
  async copySmoothedText() {
    if (!this.smoothedText) return;
    
    try {
      await navigator.clipboard.writeText(this.smoothedText);
      
      const copyBtn = document.getElementById('smoothCopyBtn');
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.classList.remove('copied');
      }, 2000);
      
      // Track usage
      await this.sendMessage({ action: 'incrementUsage' });
      
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  }
  
  /**
   * Load user's preferred mode from storage
   */
  async loadPreferredMode() {
    try {
      const result = await chrome.storage.local.get(['preferredMode']);
      const mode = result.preferredMode || 'simple';
      this.switchMode(mode);
    } catch (error) {
      console.error('Failed to load preferred mode:', error);
      this.switchMode('simple'); // Default to simple mode
    }
  }
  
  disableRewriteButton(reason) {
    const btn = document.getElementById('rewriteBtn');
    btn.disabled = true;
    btn.textContent = reason;
  }
  
  async handleRewrite(isPanicMode = false) {
    // Check manual input first
    const manualInput = document.getElementById('manualInput');
    const manualText = manualInput ? manualInput.value.trim() : '';
    
    if (manualText) {
      this.currentText = manualText;
      this.performRiskAssessment(null, manualText);
    } else if (!this.currentText) {
      await this.loadCurrentText();
      if (!this.currentText) {
        this.showError('No text found to rewrite. Please select text, focus on an input field, or type in the text box above.');
        return;
      }
    }
    
    this.showLoading(isPanicMode);
    
    try {
      const requestData = {
        action: 'rewriteText',
        text: this.currentText,
        platform: this.currentPlatform,
        scenarioType: this.currentScenario,
        riskLevel: this.riskAssessment ? this.riskAssessment.overallRisk : 'medium'
      };
      
      if (isPanicMode) {
        // Force maximum safety settings for panic mode
        requestData.scenarioType = 'reputationShield';
        requestData.riskLevel = 'high';
      }
      
      const response = await this.sendMessage(requestData);
      
      if (response.error) {
        if (response.error === 'Usage limit reached') {
          this.showUpgradePrompt();
        } else {
          this.showError(response.error);
        }
        return;
      }
      
      this.rewrites = response.rewrites;
      this.showRewrites(response.rewrites, response.fromCache);
      
      if (!response.fromCache) {
        this.loadUsageInfo();
      }
      
    } catch (error) {
      console.error('Rewrite failed:', error);
      this.showError('Failed to generate rewrites. Please try again.');
    }
  }
  
  showLoading(isPanicMode = false) {
    this.hideAllSections();
    const loadingSection = document.getElementById('loadingSection');
    loadingSection.classList.remove('hidden');
    
    if (isPanicMode) {
      const loadingText = loadingSection.querySelector('p');
      loadingText.textContent = '🚨 PANIC MODE: Generating safest possible rewrites...';
    } else {
      const loadingText = loadingSection.querySelector('p');
      loadingText.textContent = 'Generating professional rewrites...';
    }
  }
  
  showRewrites(rewrites, fromCache = false) {
    console.log('🎨 Displaying rewrites:', JSON.stringify(rewrites, null, 2));
    console.log('🎨 Type of rewrites:', typeof rewrites);
    console.log('🎨 Is array?', Array.isArray(rewrites));
    
    this.hideAllSections();
    this.updateRewriteLabels();
    
    console.log('🎯 Current scenario:', this.currentScenario);
    
    if (Array.isArray(rewrites)) {
      // Always populate the three slots regardless of scenario
      const slots = ['professionalText', 'directText', 'collaborativeText'];
      const countSlots = ['professionalCount', 'directCount', 'collaborativeCount'];
      
      rewrites.forEach((rewrite, index) => {
        if (index < 3) {
          const textElement = document.getElementById(slots[index]);
          const countElement = document.getElementById(countSlots[index]);
          
          if (textElement && countElement && rewrite.text) {
            textElement.textContent = rewrite.text;
            countElement.textContent = `${rewrite.text.length} chars`;
            console.log(`🎯 Set slot ${index} (${slots[index]}) to: ${rewrite.text.substring(0, 50)}...`);
          } else {
            console.log(`🎯 Missing element or text for slot ${index}:`, {
              textElement: !!textElement,
              countElement: !!countElement,
              text: rewrite.text
            });
          }
        }
      });
    } else if (rewrites.rewrites) {
      // Handle nested rewrites structure
      const slots = ['professionalText', 'directText', 'collaborativeText'];
      const countSlots = ['professionalCount', 'directCount', 'collaborativeCount'];
      
      rewrites.rewrites.forEach((rewrite, index) => {
        if (index < 3) {
          const textElement = document.getElementById(slots[index]);
          const countElement = document.getElementById(countSlots[index]);
          
          if (textElement && countElement && rewrite.text) {
            textElement.textContent = rewrite.text;
            countElement.textContent = `${rewrite.text.length} chars`;
          }
        }
      });
    }
    
    const rewritesSection = document.getElementById('rewritesSection');
    rewritesSection.classList.remove('hidden');
    rewritesSection.classList.add('fade-in');
    
    if (fromCache) {
      this.showCacheNotice();
    }
  }
  
  showError(message) {
    this.hideAllSections();
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorSection').classList.remove('hidden');
  }
  
  showUpgradePrompt() {
    this.hideAllSections();
    document.getElementById('errorMessage').textContent = 'You\'ve reached your monthly limit of 20 free rewrites. Upgrade to Pro for unlimited usage!';
    document.getElementById('errorSection').classList.remove('hidden');
    document.getElementById('retryBtn').style.display = 'none';
  }
  
  showCacheNotice() {
    const notice = document.createElement('div');
    notice.className = 'cache-notice';
    notice.textContent = 'Showing cached results (offline)';
    notice.style.cssText = `
      background: #fef3c7;
      color: #92400e;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      margin-bottom: 16px;
      text-align: center;
    `;
    
    const rewritesSection = document.getElementById('rewritesSection');
    rewritesSection.insertBefore(notice, rewritesSection.firstChild);
    
    setTimeout(() => {
      if (notice.parentNode) {
        notice.parentNode.removeChild(notice);
      }
    }, 5000);
  }
  
  hideAllSections() {
    document.getElementById('loadingSection').classList.add('hidden');
    document.getElementById('rewritesSection').classList.add('hidden');
    document.getElementById('errorSection').classList.add('hidden');
  }
  
  async copyRewrite(type) {
    const textIds = {
      professional: 'professionalText',
      direct: 'directText',
      collaborative: 'collaborativeText'
    };
    
    const textElement = document.getElementById(textIds[type]);
    const text = textElement.textContent;
    
    if (!text) return;
    
    try {
      await navigator.clipboard.writeText(text);
      this.showCopySuccess(type);
      
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'replaceText',
          newText: text
        });
      }
    } catch (error) {
      console.error('Failed to copy:', error);
      this.showCopyError();
    }
  }
  
  showCopySuccess(type) {
    const btn = document.querySelector(`.copy-btn[data-type="${type}"]`);
    const originalText = btn.textContent;
    
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('copied');
    }, 2000);
  }
  
  showCopyError() {
    const notification = document.createElement('div');
    notification.textContent = 'Failed to copy';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc2626;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
  
  async handleUpgrade() {
    try {
      const response = await this.sendMessage({
        action: 'createCheckoutSession'
      });
      
      if (response.checkoutUrl) {
        chrome.tabs.create({ url: response.checkoutUrl });
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
    }
  }
  
  sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
  
  setupManualInput() {
    const manualInput = document.getElementById('manualInput');
    if (manualInput) {
      manualInput.addEventListener('input', () => {
        if (manualInput.value.trim()) {
          this.enableRewriteButton();
          // Perform risk assessment on manual input
          this.performRiskAssessment(null, manualInput.value.trim());
        }
      });
    }
    // Always enable the button initially
    this.enableRewriteButton();
  }

  /**
   * Perform risk assessment on the current text
   */
  performRiskAssessment(url = null, text = null) {
    const textToAnalyze = text || this.currentText;
    if (!textToAnalyze) return;
    
    const context = { url };
    this.riskAssessment = this.riskDetector.assessRisk(textToAnalyze, this.currentPlatform, context);
    
    this.displayRiskAssessment();
    this.updateScenarioRecommendations();
    this.showRiskAndScenarioSections();
  }

  /**
   * Display risk assessment in the UI
   */
  displayRiskAssessment() {
    if (!this.riskAssessment) return;
    
    const riskBadge = document.getElementById('riskBadge');
    const riskText = document.getElementById('riskText');
    const contextBadges = document.getElementById('contextBadges');
    const riskRecommendations = document.getElementById('riskRecommendations');
    
    // Update risk level badge
    riskBadge.textContent = this.riskAssessment.overallRisk.toUpperCase();
    riskBadge.className = `risk-badge ${this.riskAssessment.overallRisk}`;
    
    // Update risk text
    const riskMessages = {
      low: 'Low Communication Risk',
      medium: 'Moderate Communication Risk',
      high: '⚠️ HIGH RISK - Use Caution'
    };
    riskText.textContent = riskMessages[this.riskAssessment.overallRisk];
    
    // Update context badges
    contextBadges.innerHTML = '';
    
    // Platform badge
    const platformBadge = document.createElement('span');
    platformBadge.className = 'context-badge platform';
    platformBadge.textContent = this.currentPlatform.toUpperCase();
    contextBadges.appendChild(platformBadge);
    
    // Scenario badge
    if (this.riskAssessment.scenarioRisk.type !== 'general') {
      const scenarioBadge = document.createElement('span');
      scenarioBadge.className = 'context-badge scenario';
      scenarioBadge.textContent = this.riskAssessment.scenarioRisk.context.toUpperCase();
      contextBadges.appendChild(scenarioBadge);
    }
    
    // Audience size badge
    if (this.riskAssessment.platformRisk.audienceSize === 'large') {
      const audienceBadge = document.createElement('span');
      audienceBadge.className = 'context-badge';
      audienceBadge.textContent = 'PUBLIC';
      contextBadges.appendChild(audienceBadge);
    }
    
    // Show recommendations if any
    if (this.riskAssessment.recommendations.length > 0) {
      const recommendationsList = document.createElement('ul');
      this.riskAssessment.recommendations.forEach(rec => {
        const li = document.createElement('li');
        li.textContent = rec;
        recommendationsList.appendChild(li);
      });
      riskRecommendations.innerHTML = '';
      riskRecommendations.appendChild(recommendationsList);
      riskRecommendations.classList.remove('hidden');
    } else {
      riskRecommendations.classList.add('hidden');
    }
    
    // Show panic mode button for high risk
    const panicBtn = document.getElementById('panicBtn');
    if (this.riskAssessment.overallRisk === 'high') {
      panicBtn.classList.remove('hidden');
    } else {
      panicBtn.classList.add('hidden');
    }
  }

  /**
   * Update scenario recommendations based on risk assessment
   */
  updateScenarioRecommendations() {
    if (!this.riskAssessment) return;
    
    // Only auto-select if no scenario has been manually chosen
    if (!this.userSelectedScenario) {
      let recommendedScenario = 'general';
      
      if (this.riskAssessment.scenarioRisk.type !== 'general') {
        const scenarioMapping = {
          customerComplaint: 'crisisResponse',
          publicReply: 'reputationShield',
          executiveCommunication: 'professionalPushback',
          conflictEscalation: 'deEscalation',
          apologyNeeded: 'apologyFramework'
        };
        recommendedScenario = scenarioMapping[this.riskAssessment.scenarioRisk.type] || 'general';
      } else if (this.riskAssessment.overallRisk === 'high') {
        recommendedScenario = 'reputationShield';
      } else if (this.riskAssessment.emotionalRisk.level === 'high') {
        recommendedScenario = 'deEscalation';
      }
      
      // Update UI to highlight recommended scenario
      this.currentScenario = recommendedScenario;
      this.updateScenarioSelection();
    }
    // If user has already selected a scenario, respect their choice
  }

  /**
   * Handle scenario selection
   */
  selectScenario(element) {
    // Remove active class from all scenarios
    document.querySelectorAll('.scenario-mode').forEach(mode => {
      mode.classList.remove('active');
    });
    
    // Add active class to selected scenario
    element.classList.add('active');
    
    // Update current scenario
    this.currentScenario = element.getAttribute('data-scenario');
    this.userSelectedScenario = true; // Mark as user-selected
    
    // Update rewrite labels immediately when scenario changes
    this.updateRewriteLabels();
    
    console.log('🎯 User selected scenario:', this.currentScenario);
  }

  /**
   * Update scenario selection UI
   */
  updateScenarioSelection() {
    document.querySelectorAll('.scenario-mode').forEach(mode => {
      mode.classList.remove('active');
      if (mode.getAttribute('data-scenario') === this.currentScenario) {
        mode.classList.add('active');
      }
    });
  }

  /**
   * Show risk assessment and scenario sections
   */
  showRiskAndScenarioSections() {
    const riskSection = document.getElementById('riskSection');
    const scenarioSection = document.getElementById('scenarioSection');
    
    // Only show risk section for HIGH risk scenarios
    if (this.riskAssessment && this.riskAssessment.overallRisk === 'high') {
      riskSection.classList.remove('hidden');
    } else {
      riskSection.classList.add('hidden');
    }
    
    scenarioSection.classList.remove('hidden');
  }

  /**
   * Handle panic mode - emergency rewrite with maximum safety
   */
  handlePanicMode() {
    // Force to safest scenario and highest caution
    this.currentScenario = 'reputationShield';
    this.userSelectedScenario = true; // Prevent auto-override
    this.updateScenarioSelection();
    
    // Visual feedback - disable all scenario buttons and show override
    this.showPanicModeOverride();
    
    // Update panic button
    const panicBtn = document.getElementById('panicBtn');
    panicBtn.textContent = '🚨 PANIC MODE ACTIVE';
    panicBtn.style.animation = 'none';
    panicBtn.style.backgroundColor = '#dc2626';
    
    // Trigger rewrite with panic mode
    this.handleRewrite(true);
  }

  /**
   * Show visual indication that panic mode is overriding user selection
   */
  showPanicModeOverride() {
    // Add panic mode indicator to scenario section
    const scenarioSection = document.getElementById('scenarioSection');
    let panicIndicator = document.getElementById('panicIndicator');
    
    if (!panicIndicator) {
      panicIndicator = document.createElement('div');
      panicIndicator.id = 'panicIndicator';
      panicIndicator.className = 'panic-indicator';
      panicIndicator.innerHTML = `
        <div style="background: #dc2626; color: white; padding: 8px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; text-align: center; margin-bottom: 8px; animation: pulse 1s infinite; display: flex; justify-content: space-between; align-items: center;">
          <span>🚨 PANIC MODE: Forcing Safest Settings for Maximum Protection</span>
          <button id="exitPanicBtn" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px; cursor: pointer; margin-left: 8px;">Exit Panic Mode</button>
        </div>
      `;
      scenarioSection.insertBefore(panicIndicator, scenarioSection.querySelector('.scenario-modes'));
      
      // Add exit panic mode listener
      document.getElementById('exitPanicBtn').addEventListener('click', () => {
        this.exitPanicMode();
      });
    }
    
    // Disable all scenario buttons visually
    document.querySelectorAll('.scenario-mode').forEach(mode => {
      mode.style.opacity = '0.5';
      mode.style.pointerEvents = 'none';
    });
    
    // Keep reputation shield highlighted
    const reputationShield = document.querySelector('[data-scenario="reputationShield"]');
    if (reputationShield) {
      reputationShield.style.opacity = '1';
      reputationShield.style.border = '2px solid #dc2626';
      reputationShield.style.backgroundColor = '#dc2626';
      reputationShield.style.color = 'white';
    }
  }

  /**
   * Exit panic mode and restore user control
   */
  exitPanicMode() {
    // Remove panic mode indicator
    const panicIndicator = document.getElementById('panicIndicator');
    if (panicIndicator) {
      panicIndicator.remove();
    }
    
    // Re-enable all scenario buttons
    document.querySelectorAll('.scenario-mode').forEach(mode => {
      mode.style.opacity = '1';
      mode.style.pointerEvents = 'auto';
      mode.style.border = '';
      mode.style.backgroundColor = '';
      mode.style.color = '';
    });
    
    // Reset panic button to original state
    const panicBtn = document.getElementById('panicBtn');
    panicBtn.textContent = '🚨 PANIC MODE';
    panicBtn.style.animation = 'pulse 2s infinite';
    panicBtn.style.backgroundColor = '#dc2626';
    
    // Reset user selection flag so they can choose again
    this.userSelectedScenario = false;
    
    // Keep current scenario but allow changes
    this.updateScenarioSelection();
    
    console.log('🚨 Exited Panic Mode - user control restored');
  }

  /**
   * Get type mapping based on current scenario
   */
  getTypeMappingForScenario() {
    const scenarioMappings = {
      reputationShield: {
        'Safest': 'professionalText',
        'Balanced': 'directText',
        'Strategic': 'collaborativeText'
      },
      deEscalation: {
        'Calming': 'professionalText',
        'Diplomatic': 'directText',
        'Bridge-building': 'collaborativeText'
      },
      crisisResponse: {
        'Apologetic': 'professionalText',
        'Solution-focused': 'directText',
        'Escalation': 'collaborativeText'
      },
      professionalPushback: {
        'Diplomatic': 'professionalText',
        'Assertive': 'directText',
        'Executive': 'collaborativeText'
      },
      apologyFramework: {
        'Full Responsibility': 'professionalText',
        'Collaborative': 'directText',
        'Learning-focused': 'collaborativeText'
      }
    };

    // Default mapping for general scenarios
    const defaultMapping = {
      'Formal': 'professionalText',
      'Professional': 'professionalText',
      'Safest': 'professionalText',
      'Direct': 'directText',
      'Balanced': 'directText',
      'Collaborative': 'collaborativeText',
      'Strategic': 'collaborativeText'
    };

    return scenarioMappings[this.currentScenario] || defaultMapping;
  }

  /**
   * Update rewrite labels based on current scenario
   */
  updateRewriteLabels() {
    const labelMappings = {
      reputationShield: {
        professional: { label: 'Safest', emoji: '🛡️' },
        direct: { label: 'Balanced', emoji: '⚖️' },
        collaborative: { label: 'Strategic', emoji: '🎯' }
      },
      deEscalation: {
        professional: { label: 'Calming', emoji: '😌' },
        direct: { label: 'Diplomatic', emoji: '🤝' },
        collaborative: { label: 'Bridge-building', emoji: '🌉' }
      },
      crisisResponse: {
        professional: { label: 'Apologetic', emoji: '🆘' },
        direct: { label: 'Solution-focused', emoji: '🔧' },
        collaborative: { label: 'Escalation', emoji: '📞' }
      },
      professionalPushback: {
        professional: { label: 'Diplomatic', emoji: '🤝' },
        direct: { label: 'Assertive', emoji: '💪' },
        collaborative: { label: 'Executive', emoji: '👔' }
      },
      apologyFramework: {
        professional: { label: 'Full Responsibility', emoji: '🤲' },
        direct: { label: 'Collaborative', emoji: '🤝' },
        collaborative: { label: 'Learning-focused', emoji: '📚' }
      }
    };

    // Default labels for general scenario
    const defaultLabels = {
      professional: { label: 'Professional', emoji: '💼' },
      direct: { label: 'Direct', emoji: '🎯' },
      collaborative: { label: 'Collaborative', emoji: '🤝' }
    };

    const labels = labelMappings[this.currentScenario] || defaultLabels;

    // Update the UI labels
    const professionalLabel = document.querySelector('.rewrite-option[data-type="professional"] .rewrite-label');
    const professionalEmoji = document.querySelector('.rewrite-option[data-type="professional"] .rewrite-emoji');
    const directLabel = document.querySelector('.rewrite-option[data-type="direct"] .rewrite-label');
    const directEmoji = document.querySelector('.rewrite-option[data-type="direct"] .rewrite-emoji');
    const collaborativeLabel = document.querySelector('.rewrite-option[data-type="collaborative"] .rewrite-label');
    const collaborativeEmoji = document.querySelector('.rewrite-option[data-type="collaborative"] .rewrite-emoji');

    if (professionalLabel) {
      professionalLabel.textContent = labels.professional.label;
      professionalEmoji.textContent = labels.professional.emoji;
    }
    if (directLabel) {
      directLabel.textContent = labels.direct.label;
      directEmoji.textContent = labels.direct.emoji;
    }
    if (collaborativeLabel) {
      collaborativeLabel.textContent = labels.collaborative.label;
      collaborativeEmoji.textContent = labels.collaborative.emoji;
    }
  }

  /**
   * Get count mapping based on current scenario
   */
  getCountMappingForScenario() {
    const scenarioMappings = {
      reputationShield: {
        'Safest': 'professionalCount',
        'Balanced': 'directCount',
        'Strategic': 'collaborativeCount'
      },
      deEscalation: {
        'Calming': 'professionalCount',
        'Diplomatic': 'directCount',
        'Bridge-building': 'collaborativeCount'
      },
      crisisResponse: {
        'Apologetic': 'professionalCount',
        'Solution-focused': 'directCount',
        'Escalation': 'collaborativeCount'
      },
      professionalPushback: {
        'Diplomatic': 'professionalCount',
        'Assertive': 'directCount',
        'Executive': 'collaborativeCount'
      },
      apologyFramework: {
        'Full Responsibility': 'professionalCount',
        'Collaborative': 'directCount',
        'Learning-focused': 'collaborativeCount'
      }
    };

    // Default mapping
    const defaultMapping = {
      'Formal': 'professionalCount',
      'Professional': 'professionalCount',
      'Safest': 'professionalCount',
      'Direct': 'directCount',
      'Balanced': 'directCount',
      'Collaborative': 'collaborativeCount',
      'Strategic': 'collaborativeCount'
    };

    return scenarioMappings[this.currentScenario] || defaultMapping;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new RealTalkPopup();
});