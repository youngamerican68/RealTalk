class RealTalkBackground {
  constructor() {
    this.apiBaseUrl = 'https://real-talk-sigma.vercel.app';
    this.init();
  }
  
  init() {
    this.setupMessageListener();
    this.setupCommandListener();
    this.setupInstallListener();
  }
  
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'rewriteText') {
        this.handleRewriteRequest(request, sendResponse);
        return true;
      }
      
      if (request.action === 'checkUsage') {
        this.checkUsageLimit(sendResponse);
        return true;
      }
      
      if (request.action === 'openPopup') {
        this.openPopup();
      }
      
      if (request.action === 'copyToClipboard') {
        this.copyToClipboard(request.text, sendResponse);
        return true;
      }
    });
  }
  
  setupCommandListener() {
    chrome.commands.onCommand.addListener((command) => {
      if (command === 'rewrite-text') {
        this.openPopup();
      }
    });
  }
  
  setupInstallListener() {
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        this.initializeUser();
      }
    });
  }
  
  async initializeUser() {
    const userId = this.generateUserId();
    const installDate = new Date().toISOString();
    
    await chrome.storage.local.set({
      userId: userId,
      installDate: installDate,
      usageCount: 0,
      usageResetDate: this.getNextResetDate(),
      subscriptionStatus: 'free',
      recentRewrites: []
    });
  }
  
  generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  getNextResetDate() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
  }
  
  async checkUsageLimit(sendResponse) {
    try {
      const storage = await chrome.storage.local.get([
        'usageCount', 
        'usageResetDate', 
        'subscriptionStatus'
      ]);
      
      const now = new Date();
      const resetDate = new Date(storage.usageResetDate);
      
      if (now > resetDate) {
        await chrome.storage.local.set({
          usageCount: 0,
          usageResetDate: this.getNextResetDate()
        });
        storage.usageCount = 0;
      }
      
      const limit = storage.subscriptionStatus === 'pro' ? 1000 : 20;
      const remaining = Math.max(0, limit - storage.usageCount);
      
      sendResponse({
        usage: storage.usageCount,
        limit: limit,
        remaining: remaining,
        status: storage.subscriptionStatus,
        canUse: remaining > 0
      });
    } catch (error) {
      console.error('Failed to check usage:', error);
      sendResponse({ error: 'Failed to check usage' });
    }
  }
  
  async handleRewriteRequest(request, sendResponse) {
    try {
      const usageCheck = await new Promise((resolve) => {
        this.checkUsageLimit(resolve);
      });
      
      if (!usageCheck.canUse) {
        sendResponse({ 
          error: 'Usage limit reached',
          usage: usageCheck 
        });
        return;
      }
      
      const result = await this.callRewriteAPI(request.text, request.platform);
      
      if (result.error) {
        const cachedRewrites = await this.getCachedRewrites(request.text);
        if (cachedRewrites) {
          sendResponse({ rewrites: cachedRewrites, fromCache: true });
          return;
        }
        sendResponse({ error: result.error });
        return;
      }
      
      await this.incrementUsage();
      await this.cacheRewrites(request.text, result.rewrites);
      
      sendResponse({ rewrites: result.rewrites });
      
    } catch (error) {
      console.error('Rewrite request failed:', error);
      sendResponse({ error: 'Failed to process request' });
    }
  }
  
  async callRewriteAPI(text, platform) {
    try {
      console.log('🚀 Making API call to:', `${this.apiBaseUrl}/api/rewrite`);
      const storage = await chrome.storage.local.get(['userId']);
      
      const requestData = {
        text: text,
        platform: platform,
        userId: storage.userId
      };
      console.log('📤 Request data:', requestData);
      
      const response = await fetch(`${this.apiBaseUrl}/api/rewrite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ API response:', JSON.stringify(result, null, 2));
      console.log('✅ Rewrites array:', result.rewrites);
      return result;
    } catch (error) {
      console.error('❌ API call failed:', error);
      return { error: 'API call failed' };
    }
  }
  
  async incrementUsage() {
    const storage = await chrome.storage.local.get(['usageCount']);
    await chrome.storage.local.set({
      usageCount: (storage.usageCount || 0) + 1
    });
  }
  
  async cacheRewrites(originalText, rewrites) {
    const storage = await chrome.storage.local.get(['recentRewrites']);
    const recent = storage.recentRewrites || [];
    
    recent.unshift({
      original: originalText,
      rewrites: rewrites,
      timestamp: Date.now()
    });
    
    if (recent.length > 5) {
      recent.splice(5);
    }
    
    await chrome.storage.local.set({ recentRewrites: recent });
  }
  
  async getCachedRewrites(text) {
    const storage = await chrome.storage.local.get(['recentRewrites']);
    const recent = storage.recentRewrites || [];
    
    const cached = recent.find(item => item.original === text);
    return cached ? cached.rewrites : null;
  }
  
  async openPopup() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await chrome.action.openPopup();
      }
    } catch (error) {
      console.error('Failed to open popup:', error);
    }
  }
  
  async copyToClipboard(text, sendResponse) {
    try {
      await navigator.clipboard.writeText(text);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
}

const realTalkBackground = new RealTalkBackground();