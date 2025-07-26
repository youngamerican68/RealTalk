// Simple test to verify content script injection
console.log('✅ Content script injected successfully!');
console.log('URL:', window.location.href);
console.log('Title:', document.title);

// Test if PlatformDetector is available
setTimeout(() => {
  if (typeof PlatformDetector !== 'undefined') {
    console.log('✅ PlatformDetector is available');
    console.log('Platform detected:', PlatformDetector.detectPlatform());
  } else {
    console.log('❌ PlatformDetector is NOT available');
  }
}, 1000);