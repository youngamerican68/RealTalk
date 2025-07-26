class StorageManager {
  static async get(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  }
  
  static async set(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  }
  
  static async clear() {
    return new Promise((resolve) => {
      chrome.storage.local.clear(resolve);
    });
  }
  
  static async getUserId() {
    const storage = await this.get(['userId']);
    return storage.userId;
  }
  
  static async getUsageInfo() {
    const storage = await this.get([
      'usageCount',
      'usageResetDate',
      'subscriptionStatus'
    ]);
    
    return {
      usageCount: storage.usageCount || 0,
      usageResetDate: storage.usageResetDate,
      subscriptionStatus: storage.subscriptionStatus || 'free'
    };
  }
  
  static async incrementUsage() {
    const storage = await this.get(['usageCount']);
    const newCount = (storage.usageCount || 0) + 1;
    
    await this.set({ usageCount: newCount });
    return newCount;
  }
  
  static async resetUsageIfNeeded() {
    const storage = await this.get(['usageResetDate', 'usageCount']);
    const now = new Date();
    const resetDate = new Date(storage.usageResetDate);
    
    if (now > resetDate) {
      const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      
      await this.set({
        usageCount: 0,
        usageResetDate: nextResetDate.toISOString()
      });
      
      return true;
    }
    
    return false;
  }
  
  static async cacheRewrite(originalText, rewrites) {
    const storage = await this.get(['recentRewrites']);
    const recent = storage.recentRewrites || [];
    
    const cacheEntry = {
      original: originalText,
      rewrites: rewrites,
      timestamp: Date.now(),
      id: this.generateCacheId()
    };
    
    recent.unshift(cacheEntry);
    
    if (recent.length > 5) {
      recent.splice(5);
    }
    
    await this.set({ recentRewrites: recent });
  }
  
  static async getCachedRewrite(originalText) {
    const storage = await this.get(['recentRewrites']);
    const recent = storage.recentRewrites || [];
    
    const maxAge = 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    const cached = recent.find(item => 
      item.original === originalText && 
      (now - item.timestamp) < maxAge
    );
    
    return cached ? cached.rewrites : null;
  }
  
  static async clearExpiredCache() {
    const storage = await this.get(['recentRewrites']);
    const recent = storage.recentRewrites || [];
    
    const maxAge = 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    const filtered = recent.filter(item => 
      (now - item.timestamp) < maxAge
    );
    
    if (filtered.length !== recent.length) {
      await this.set({ recentRewrites: filtered });
    }
  }
  
  static async updateSubscriptionStatus(status) {
    await this.set({ subscriptionStatus: status });
  }
  
  static async getSettings() {
    const storage = await this.get([
      'autoReplace',
      'preferredTone',
      'showNotifications'
    ]);
    
    return {
      autoReplace: storage.autoReplace !== false,
      preferredTone: storage.preferredTone || 'professional',
      showNotifications: storage.showNotifications !== false
    };
  }
  
  static async updateSettings(settings) {
    await this.set(settings);
  }
  
  static generateCacheId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  static async exportData() {
    const allData = await this.get(null);
    
    const exportData = {
      ...allData,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };
    
    delete exportData.userId;
    
    return JSON.stringify(exportData, null, 2);
  }
  
  static async importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      const allowedKeys = [
        'usageCount',
        'usageResetDate',
        'subscriptionStatus',
        'recentRewrites',
        'autoReplace',
        'preferredTone',
        'showNotifications'
      ];
      
      const filteredData = {};
      allowedKeys.forEach(key => {
        if (data[key] !== undefined) {
          filteredData[key] = data[key];
        }
      });
      
      await this.set(filteredData);
      return true;
      
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }
  
  static async getStorageUsage() {
    return new Promise((resolve) => {
      chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
        const maxBytes = chrome.storage.local.QUOTA_BYTES;
        resolve({
          used: bytesInUse,
          total: maxBytes,
          percentage: (bytesInUse / maxBytes) * 100
        });
      });
    });
  }
}