// Simple debug script to verify content script injection
console.log('🔍 RealTalk DEBUG: Content script injected on:', window.location.href);
console.log('🔍 RealTalk DEBUG: Page title:', document.title);
console.log('🔍 RealTalk DEBUG: Is Gmail?', window.location.href.includes('mail.google.com'));

// Check if this is Slack
if (window.location.href.includes('slack.com')) {
  console.log('🔍 RealTalk DEBUG: Slack detected!');
  
  // Find all contenteditable elements
  const editableElements = document.querySelectorAll('[contenteditable="true"]');
  console.log('🔍 RealTalk DEBUG: Found', editableElements.length, 'contenteditable elements');
  
  editableElements.forEach((el, index) => {
    console.log(`🔍 RealTalk DEBUG: Element ${index}:`, {
      tagName: el.tagName,
      className: el.className,
      id: el.id,
      role: el.getAttribute('role'),
      dataQa: el.getAttribute('data-qa'),
      ariaLabel: el.getAttribute('aria-label'),
      text: el.innerText || el.textContent
    });
  });
}

// YouTube dynamic detection - watch for navigation changes
if (window.location.href.includes('youtube.com')) {
  console.log('🔍 YouTube: Setting up dynamic detection');
  
  // Watch for URL changes (YouTube SPA navigation)
  let currentUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      console.log('🔍 YouTube: Page navigation detected, new URL:', currentUrl);
    }
  }, 1000);
  
  // Watch for new comment boxes appearing
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        const newCommentBoxes = document.querySelectorAll('#contenteditable-root[contenteditable="true"]');
        if (newCommentBoxes.length > 0) {
          console.log('🔍 YouTube: New comment boxes detected:', newCommentBoxes.length);
        }
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Simple message listener for testing
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🔍 RealTalk DEBUG: Received message:', request);
  
  if (request.action === 'getSelectedText') {
    let text = '';
    let platform = 'general';
    
    // Check for selected text first
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      text = selection.toString().trim();
    }
    
    // If no selection, try to find focused input or textarea
    if (!text) {
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        text = activeElement.value || '';
      }
    }
    
    // Gmail specific: Look for compose window
    if (!text && window.location.href.includes('mail.google.com')) {
      platform = 'gmail';
      // Try multiple selectors for Gmail compose
      const selectors = [
        '[contenteditable="true"][role="textbox"]',
        '[contenteditable="true"][aria-label*="Message Body"]',
        '.Am.Al.editable',
        '[g_editable="true"]',
        'div[aria-label="Message Body"]',
        '.editable[contenteditable="true"]',
        '[contenteditable="true"]',
        '[aria-label*="message body"]',
        'div[contenteditable="true"]'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && (element.innerText || element.textContent) && (element.innerText || element.textContent).trim()) {
          text = (element.innerText || element.textContent).trim();
          console.log('🔍 Found Gmail text with selector:', selector, 'Text:', text);
          break;
        }
      }
    }
    
    // Slack specific
    if (!text && window.location.href.includes('slack.com')) {
      platform = 'slack';
      const editableElements = document.querySelectorAll('[contenteditable="true"]');
      editableElements.forEach(el => {
        const elementText = el.innerText || el.textContent;
        if (elementText && elementText.trim() && !text) {
          text = elementText.trim();
        }
      });
    }
    
    // LinkedIn specific
    if (!text && window.location.href.includes('linkedin.com')) {
      platform = 'linkedin';
      const linkedinEditor = document.querySelector('[contenteditable="true"]');
      if (linkedinEditor) {
        text = linkedinEditor.innerText || linkedinEditor.textContent || '';
      }
    }
    
    // Reddit specific
    if (!text && window.location.href.includes('reddit.com')) {
      platform = 'reddit';
      const redditSelectors = [
        '[contenteditable="true"][role="textbox"]',
        'textarea[placeholder*="comment"]',
        'textarea[placeholder*="reply"]',
        '.public-DraftEditor-content',
        '[data-testid="comment-submission-form-richtext"]'
      ];
      
      for (const selector of redditSelectors) {
        const element = document.querySelector(selector);
        if (element && (element.innerText || element.textContent || element.value)) {
          text = (element.innerText || element.textContent || element.value).trim();
          console.log('🔍 Found Reddit text with selector:', selector, 'Text:', text);
          break;
        }
      }
    }
    
    // Discord Web specific
    if (!text && window.location.href.includes('discord.com')) {
      platform = 'discord';
      const discordSelectors = [
        '[role="textbox"][data-slate-editor="true"]',
        '[contenteditable="true"][role="textbox"]',
        'div[class*="slateTextArea"]'
      ];
      
      for (const selector of discordSelectors) {
        const element = document.querySelector(selector);
        if (element && (element.innerText || element.textContent)) {
          text = (element.innerText || element.textContent).trim();
          console.log('🔍 Found Discord text with selector:', selector, 'Text:', text);
          break;
        }
      }
    }

    // YouTube specific
    if (!text && window.location.href.includes('youtube.com')) {
      platform = 'youtube';
      const youtubeSelectors = [
        '#contenteditable-root[contenteditable="true"]',
        '.yt-formatted-string[contenteditable="true"]',
        '[data-placeholder*="comment"]',
        'div[contenteditable="true"][placeholder*="comment"]',
        '#contenteditable-textarea',
        '.yt-formatted-string[contenteditable="true"][role="textbox"]',
        'div[id*="contenteditable-root"]',
        'div[contenteditable="true"][role="textbox"]',
        '#simple-box #contenteditable-root',
        'ytd-commentbox #contenteditable-root',
        'tp-yt-paper-dialog #contenteditable-root',
        '[aria-label*="Add a comment"]',
        'yt-formatted-string[slot="textbox"]'
      ];
      
      for (const selector of youtubeSelectors) {
        const element = document.querySelector(selector);
        if (element && (element.innerText || element.textContent || element.value)) {
          text = (element.innerText || element.textContent || element.value).trim();
          console.log('🔍 Found YouTube text with selector:', selector, 'Text:', text);
          break;
        }
      }
    }
    
    console.log('🔍 RealTalk DEBUG: Found text:', text, 'Platform:', platform);
    
    sendResponse({
      text: text.trim(),
      platform: platform,
      debug: true
    });
  }
  
  return true;
});