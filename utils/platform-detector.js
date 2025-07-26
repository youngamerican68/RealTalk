class PlatformDetector {
  static detectPlatform() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    if (hostname.includes('slack.com')) {
      return 'slack';
    }
    
    if (hostname.includes('gmail.com') || hostname.includes('mail.google.com')) {
      return 'gmail';
    }
    
    if (hostname.includes('linkedin.com')) {
      return 'linkedin';
    }
    
    return 'general';
  }
  
  static getInputSelectors(platform) {
    const selectors = {
      slack: [
        '[data-qa="message_input"]',
        '.ql-editor[data-qa="message_input"]',
        '[contenteditable="true"][data-qa="message_input"]',
        '.ql-editor[role="textbox"]',
        '[contenteditable="true"][aria-label*="message"]',
        '.ql-editor.c-texty_input',
        '[data-qa="texty_composer_input"]',
        '.c-texty_input__input_container [contenteditable="true"]',
        '.p-message_pane_input_container [contenteditable="true"]',
        '.ql-editor',
        'div[contenteditable="true"][role="textbox"]'
      ],
      gmail: [
        '[contenteditable="true"][role="textbox"]',
        '[contenteditable="true"][aria-label*="Message Body"]',
        '.Am.Al.editable',
        '[g_editable="true"]',
        'div[aria-label="Message Body"]',
        '.editable[contenteditable="true"]'
      ],
      linkedin: [
        '.ql-editor[contenteditable="true"]',
        '[data-placeholder*="message"]',
        '[data-placeholder*="post"]'
      ],
      general: [
        'textarea',
        'input[type="text"]',
        '[contenteditable="true"]'
      ]
    };
    
    return selectors[platform] || selectors.general;
  }
  
  static findActiveInput() {
    const platform = this.detectPlatform();
    const selectors = this.getInputSelectors(platform);
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        if (element === document.activeElement || 
            element.contains(document.activeElement)) {
          return element;
        }
      }
    }
    
    return document.activeElement;
  }
  
  static extractText(element) {
    if (!element) return '';
    
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      return element.value;
    }
    
    if (element.contentEditable === 'true') {
      return element.innerText || element.textContent;
    }
    
    return '';
  }
  
  static setText(element, text) {
    if (!element) return false;
    
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    
    if (element.contentEditable === 'true') {
      element.innerText = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    
    return false;
  }
}