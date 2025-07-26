# Testing Guide

## Pre-Testing Setup

1. **Create Icons**: Add actual PNG icons to the `icons/` directory
2. **Deploy API**: Deploy the backend to Vercel with environment variables
3. **Update API URL**: Change the API URL in `background.js` to your deployed endpoint

## Manual Testing Checklist

### Extension Loading
- [ ] Extension loads without errors in `chrome://extensions/`
- [ ] Extension icon appears in Chrome toolbar
- [ ] Popup opens when clicking extension icon
- [ ] No console errors when loading popup

### Text Detection
- [ ] **Slack**: Focus on message input field, extension detects text
- [ ] **Gmail**: Focus on compose window, extension detects text  
- [ ] **LinkedIn**: Focus on message/post input, extension detects text
- [ ] **General sites**: Works with regular textarea and input fields
- [ ] **Selected text**: Works when text is selected on any page

### Keyboard Shortcut
- [ ] `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows) opens popup
- [ ] Shortcut works when text is selected
- [ ] Shortcut works when input field is focused

### API Integration
- [ ] "Rewrite Text" button triggers API call
- [ ] Loading spinner appears during API call
- [ ] Error handling works when API is unreachable
- [ ] Usage counter updates after successful rewrite
- [ ] Cached responses work when offline

### Rewrite Quality
- [ ] **Professional tone**: Formal, diplomatic language
- [ ] **Direct tone**: Clear, respectful but straightforward
- [ ] **Collaborative tone**: Solution-focused, team-oriented
- [ ] Platform-specific optimization (Slack vs Gmail vs LinkedIn)
- [ ] Character limits respected (under 280 chars)

### Copy Functionality
- [ ] Copy buttons work for each rewrite option
- [ ] "Copied!" confirmation appears
- [ ] Text is actually copied to clipboard
- [ ] Auto-replacement works in input fields

### Usage Tracking
- [ ] Usage counter displays correctly
- [ ] Free tier limits at 20 rewrites
- [ ] Upgrade prompt appears when approaching limit
- [ ] Usage resets monthly

### Error Handling
- [ ] No text selected shows appropriate message
- [ ] API errors display user-friendly messages
- [ ] Network errors handled gracefully
- [ ] Retry functionality works

### UI/UX
- [ ] Popup design looks professional
- [ ] Dark mode support works
- [ ] Animations are smooth
- [ ] Text truncation works properly
- [ ] Responsive design in popup

## Platform-Specific Tests

### Slack Web App
1. Go to `app.slack.com`
2. Click in message input box
3. Type emotional message like "This is ridiculous and makes no sense!"
4. Activate extension
5. Verify rewrites are appropriate for Slack tone

### Gmail
1. Go to `gmail.com`
2. Click "Compose"
3. Type in message body: "I'm frustrated with this situation"
4. Activate extension  
5. Verify rewrites are appropriate for email formality

### LinkedIn
1. Go to `linkedin.com`
2. Try messaging or posting
3. Type: "This approach is completely wrong"
4. Activate extension
5. Verify rewrites are appropriate for professional networking

## Automated Testing

Create simple test scripts:

```javascript
// Test platform detection
console.log('Platform:', PlatformDetector.detectPlatform());

// Test text extraction
const input = document.querySelector('textarea');
console.log('Extracted text:', PlatformDetector.extractText(input));

// Test storage
chrome.storage.local.get(['usageCount'], (result) => {
  console.log('Usage count:', result.usageCount);
});
```

## Performance Testing

- [ ] Extension doesn't slow down page loading
- [ ] API responses are under 5 seconds
- [ ] Memory usage is reasonable
- [ ] No memory leaks in long sessions

## Security Testing

- [ ] No sensitive data in console logs
- [ ] API calls use HTTPS only
- [ ] No XSS vulnerabilities
- [ ] Input sanitization works

## Edge Cases

- [ ] Very long text (500+ characters)
- [ ] Empty text input
- [ ] Special characters and emojis
- [ ] Multiple browser tabs
- [ ] Rapid consecutive API calls
- [ ] Network disconnection during API call

## Browser Compatibility

- [ ] Chrome (primary target)
- [ ] Edge (Chromium-based)
- [ ] Brave (Chromium-based)

## Deployment Testing

After publishing to Chrome Web Store:
- [ ] Extension installs correctly from store
- [ ] Store listing displays properly
- [ ] Permissions are appropriate
- [ ] User reviews and feedback

## Bug Reporting

When testing, document:
- Browser version
- Operating system
- Exact steps to reproduce
- Expected vs actual behavior
- Console error messages
- Screenshots/videos if helpful

## Testing Environment

Recommended testing setup:
- Clean Chrome profile for testing
- Developer tools open for debugging
- Network throttling to test slow connections
- Different screen sizes/resolutions