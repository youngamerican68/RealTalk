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
        const response = await chrome.tabs.sendMessage(tabs[0].id, {
          action: 'getSelectedText'
        });
        
        if (response && response.text) {
          this.currentText = response.text;
          this.currentPlatform = response.platform || 'general';
          this.updateOriginalText(this.currentText);
          this.enableRewriteButton();
          this.checkCompatibility(tabs[0].url);
        } else {
          this.showNoTextMessage();
          this.checkCompatibility(tabs[0].url);
        }
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
    if (!this.currentText) {
      await this.loadCurrentText();
      if (!this.currentText) {
        this.showError('No text found to rewrite. Please select text or focus on an input field.');
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
    this.hideAllSections();
    
    if (Array.isArray(rewrites)) {
      document.getElementById('professionalText').textContent = rewrites[0] || '';
      document.getElementById('directText').textContent = rewrites[1] || '';
      document.getElementById('collaborativeText').textContent = rewrites[2] || '';
      
      document.getElementById('professionalCount').textContent = `${(rewrites[0] || '').length} chars`;
      document.getElementById('directCount').textContent = `${(rewrites[1] || '').length} chars`;
      document.getElementById('collaborativeCount').textContent = `${(rewrites[2] || '').length} chars`;
    } else if (rewrites.rewrites) {
      rewrites.rewrites.forEach((rewrite, index) => {
        const textId = ['professionalText', 'directText', 'collaborativeText'][index];
        const countId = ['professionalCount', 'directCount', 'collaborativeCount'][index];
        
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
}

document.addEventListener('DOMContentLoaded', () => {
  new RealTalkPopup();
});