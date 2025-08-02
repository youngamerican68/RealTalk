class RealTalkPopup {
  constructor() {
    this.currentText = '';
    this.currentPlatform = 'general';
    this.rewrites = null;
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.loadUsageInfo();
    this.loadCurrentText();
    this.setupManualInput();
  }
  
  setupEventListeners() {
    document.getElementById('rewriteBtn').addEventListener('click', () => {
      this.handleRewrite();
    });
    
    document.getElementById('retryBtn').addEventListener('click', () => {
      this.handleRewrite();
    });
    
    document.getElementById('upgradeBtn').addEventListener('click', () => {
      this.handleUpgrade();
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
        // Add a small delay to ensure content script is loaded
        setTimeout(async () => {
          try {
            console.log('🔍 Attempting to contact content script...');
            const response = await chrome.tabs.sendMessage(tabs[0].id, {
              action: 'getSelectedText'
            });
            
            console.log('🔍 Content script response:', response);
            
            if (response && response.text && response.text.trim()) {
              this.currentText = response.text.trim();
              this.currentPlatform = response.platform || 'general';
              this.updateOriginalText(this.currentText);
              this.enableRewriteButton();
              this.checkCompatibility(tabs[0].url);
            } else {
              this.showNoTextMessage();
              this.checkCompatibility(tabs[0].url);
            }
          } catch (error) {
            console.error('🔍 Content script error:', error);
            console.log('Content script not ready, using manual input only');
            this.showNoTextMessage();
          }
        }, 25);
      }
    } catch (error) {
      console.error('Failed to get current text:', error);
      this.showNoTextMessage();
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
  
  disableRewriteButton(reason) {
    const btn = document.getElementById('rewriteBtn');
    btn.disabled = true;
    btn.textContent = reason;
  }
  
  async handleRewrite() {
    // Check manual input first
    const manualInput = document.getElementById('manualInput');
    const manualText = manualInput ? manualInput.value.trim() : '';
    
    if (manualText) {
      this.currentText = manualText;
    } else if (!this.currentText) {
      await this.loadCurrentText();
      if (!this.currentText) {
        this.showError('No text found to rewrite. Please select text, focus on an input field, or type in the text box above.');
        return;
      }
    }
    
    this.showLoading();
    
    try {
      const response = await this.sendMessage({
        action: 'rewriteText',
        text: this.currentText,
        platform: this.currentPlatform
      });
      
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
  
  showLoading() {
    this.hideAllSections();
    document.getElementById('loadingSection').classList.remove('hidden');
  }
  
  showRewrites(rewrites, fromCache = false) {
    console.log('🎨 Displaying rewrites:', JSON.stringify(rewrites, null, 2));
    console.log('🎨 Type of rewrites:', typeof rewrites);
    console.log('🎨 Is array?', Array.isArray(rewrites));
    
    this.hideAllSections();
    
    if (Array.isArray(rewrites)) {
      // Map the response types to our UI elements
      const typeMapping = {
        'Formal': 'professionalText',
        'Professional': 'professionalText', 
        'Direct': 'directText',
        'Collaborative': 'collaborativeText'
      };
      
      const countMapping = {
        'Formal': 'professionalCount',
        'Professional': 'professionalCount',
        'Direct': 'directCount', 
        'Collaborative': 'collaborativeCount'
      };
      
      rewrites.forEach((rewrite) => {
        const textId = typeMapping[rewrite.type];
        const countId = countMapping[rewrite.type];
        
        if (textId && countId) {
          document.getElementById(textId).textContent = rewrite.text || '';
          document.getElementById(countId).textContent = `${(rewrite.text || '').length} chars`;
        }
      });
    } else if (rewrites.rewrites) {
      // Map the response types to our UI elements
      const typeMapping = {
        'Formal': 'professionalText',
        'Professional': 'professionalText', 
        'Direct': 'directText',
        'Collaborative': 'collaborativeText'
      };
      
      const countMapping = {
        'Formal': 'professionalCount',
        'Professional': 'professionalCount',
        'Direct': 'directCount', 
        'Collaborative': 'collaborativeCount'
      };
      
      rewrites.rewrites.forEach((rewrite) => {
        const textId = typeMapping[rewrite.type];
        const countId = countMapping[rewrite.type];
        
        if (textId && countId) {
          document.getElementById(textId).textContent = rewrite.text || '';
          document.getElementById(countId).textContent = `${(rewrite.text || '').length} chars`;
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
        }
      });
    }
    // Always enable the button initially
    this.enableRewriteButton();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new RealTalkPopup();
});