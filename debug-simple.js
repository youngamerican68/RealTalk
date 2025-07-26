// Simple debug script to verify content script injection
console.log('🔍 RealTalk DEBUG: Content script injected on:', window.location.href);
console.log('🔍 RealTalk DEBUG: Page title:', document.title);

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
      const gmailCompose = document.querySelector('[contenteditable="true"][role="textbox"]');
      if (gmailCompose) {
        text = gmailCompose.innerText || gmailCompose.textContent || '';
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
    
    console.log('🔍 RealTalk DEBUG: Found text:', text, 'Platform:', platform);
    
    sendResponse({
      text: text.trim(),
      platform: platform,
      debug: true
    });
  }
  
  return true;
});