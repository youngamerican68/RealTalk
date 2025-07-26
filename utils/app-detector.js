class AppDetector {
  static isWebBrowser() {
    return typeof window !== 'undefined' && window.location;
  }
  
  static isDesktopApp() {
    // Check for common desktop app indicators
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Electron apps (Slack, Discord, etc.)
    if (userAgent.includes('electron')) {
      return true;
    }
    
    // Check for desktop app specific patterns
    const desktopIndicators = [
      'slack-desktop',
      'discord-desktop',
      'teams-desktop'
    ];
    
    return desktopIndicators.some(indicator => 
      userAgent.includes(indicator)
    );
  }
  
  static getAppContext() {
    if (!this.isWebBrowser()) {
      return 'unknown';
    }
    
    const hostname = window.location.hostname;
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Slack detection
    if (hostname.includes('slack.com')) {
      return {
        platform: 'slack',
        type: 'web',
        compatible: true,
        message: null
      };
    }
    
    // Gmail detection
    if (hostname.includes('gmail.com') || hostname.includes('mail.google.com')) {
      return {
        platform: 'gmail',
        type: 'web',
        compatible: true,
        message: null
      };
    }
    
    // LinkedIn detection
    if (hostname.includes('linkedin.com')) {
      return {
        platform: 'linkedin',
        type: 'web',
        compatible: true,
        message: null
      };
    }
    
    // Desktop app detection (won't work)
    if (this.isDesktopApp()) {
      return {
        platform: 'desktop-app',
        type: 'desktop',
        compatible: false,
        message: 'RealTalk Draft works best in web browsers. For desktop apps, we can copy text to your clipboard for manual pasting.'
      };
    }
    
    // General web (should work)
    return {
      platform: 'general',
      type: 'web',
      compatible: true,
      message: null
    };
  }
  
  static shouldShowCompatibilityWarning() {
    const context = this.getAppContext();
    return !context.compatible;
  }
  
  static getCompatibilityMessage() {
    const context = this.getAppContext();
    return context.message;
  }
  
  static getRecommendedAction() {
    const context = this.getAppContext();
    
    if (!context.compatible) {
      const actions = {
        'desktop-app': 'Try using the web version in your browser for full functionality, or use copy-only mode.',
        'unknown': 'This platform may not be fully supported. Text will be copied to clipboard.'
      };
      
      return actions[context.platform] || actions['unknown'];
    }
    
    return null;
  }
}