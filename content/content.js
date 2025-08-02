class RealTalkContent {
  constructor() {
    this.selectedText = '';
    this.activeElement = null;
    this.platform = PlatformDetector.detectPlatform();
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.setupMessageListener();
  }
  
  setupEventListeners() {
    document.addEventListener('mouseup', () => {
      this.captureSelectedText();
    });
    
    document.addEventListener('keyup', () => {
      this.captureSelectedText();
    });
    
    document.addEventListener('focusin', (event) => {
      this.activeElement = event.target;
    });
  }
  
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'getSelectedText') {
        const text = this.getTextToRewrite();
        console.log('RealTalk Debug:', {
          selectedText: this.selectedText,
          activeElement: this.activeElement,
          platform: this.platform,
          extractedText: text,
          currentFocus: document.activeElement
        });
        sendResponse({
          text: text,
          platform: this.platform,
          hasActiveInput: !!this.activeElement
        });
      }
      
      if (request.action === 'replaceText') {
        const success = this.replaceText(request.newText);
        sendResponse({ success });
      }
      
      return true;
    });
  }
  
  captureSelectedText() {
    const selection = window.getSelection();
    this.selectedText = selection.toString().trim();
  }
  
  getTextToRewrite() {
    if (this.selectedText) {
      return this.selectedText.substring(0, 500);
    }
    
    const activeInput = PlatformDetector.findActiveInput();
    if (activeInput) {
      const text = PlatformDetector.extractText(activeInput);
      return text.substring(0, 500);
    }
    
    // YouTube debug: Try to find any comment input
    if (this.platform === 'youtube') {
      console.log('🔍 YouTube Debug: Looking for comment inputs...');
      const allInputs = document.querySelectorAll('[contenteditable="true"], textarea, input');
      console.log('🔍 Found inputs:', allInputs);
      
      for (const input of allInputs) {
        console.log('🔍 Input element:', {
          tagName: input.tagName,
          id: input.id,
          className: input.className,
          placeholder: input.placeholder,
          ariaLabel: input.getAttribute('aria-label'),
          textContent: input.textContent || input.value
        });
        
        if (input.textContent || input.value) {
          return (input.textContent || input.value).substring(0, 500);
        }
      }
    }
    
    return '';
  }
  
  replaceText(newText) {
    if (this.selectedText) {
      return this.replaceSelectedText(newText);
    }
    
    const activeInput = PlatformDetector.findActiveInput();
    if (activeInput) {
      return PlatformDetector.setText(activeInput, newText);
    }
    
    return false;
  }
  
  replaceSelectedText(newText) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return false;
    
    try {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(newText));
      selection.removeAllRanges();
      return true;
    } catch (error) {
      console.error('Failed to replace selected text:', error);
      return false;
    }
  }
  
  static showCopyConfirmation() {
    const notification = document.createElement('div');
    notification.textContent = 'Copied!';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4A154B;
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 2000);
  }
}

console.log('🚀 RealTalk content script starting to load...');
console.log('🚀 PlatformDetector available:', typeof PlatformDetector);

try {
  console.log('🚀 Creating RealTalkContent instance...');
  const realTalkContent = new RealTalkContent();
  console.log('🚀 RealTalk content script loaded successfully!');
} catch (error) {
  console.error('🚀 RealTalk content script failed to load:', error);
}