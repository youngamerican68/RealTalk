# RealTalk Draft - Chrome Extension

Transform emotional or unprofessional messages into polished, workplace-appropriate communication.

## Features

- **Smart Text Detection**: Automatically detects text in input fields or selected text
- **Platform Optimization**: Optimized for Slack, Gmail, LinkedIn, and general web forms
- **3 Rewrite Styles**: 
  - 💼 **Professional**: Formal, diplomatic tone for senior leadership
  - 🎯 **Direct**: Clear and honest but respectful for peers
  - 🤝 **Collaborative**: Solution-focused, emphasizing teamwork
- **One-Click Copy**: Copy and replace text with a single click
- **Usage Tracking**: 20 free rewrites per month, upgrade to Pro for unlimited

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the project directory
5. The RealTalk Draft icon should appear in your toolbar

## Usage

### Method 1: Extension Icon
1. Select text or focus on an input field
2. Click the RealTalk Draft extension icon
3. Choose from 3 professional rewrites
4. Click "Copy" to use the rewrite

### Method 2: Keyboard Shortcut
1. Select text or focus on an input field
2. Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
3. Choose and copy your preferred rewrite

## Supported Platforms

- **Slack**: Optimized for workplace messaging tone
- **Gmail**: Formal email communication style  
- **LinkedIn**: Professional networking tone
- **General Web**: Works on any website with text inputs

## API Setup

The extension requires a backend API for OpenAI integration. Deploy to Vercel:

1. Set up environment variables:
   ```
   OPENAI_API_KEY=your_openai_api_key
   STRIPE_SECRET_KEY=your_stripe_secret_key  
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   DATABASE_URL=your_database_url (optional)
   FRONTEND_URL=your_frontend_url
   ```

2. Deploy to Vercel:
   ```bash
   npm install -g vercel
   vercel
   ```

3. Update `manifest.json` host_permissions to match your API domain

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Deploy to Vercel
npm run deploy
```

## File Structure

```
realtalk-draft/
├── manifest.json              # Chrome extension manifest
├── popup/                     # Extension popup UI
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content/                   # Content script
│   └── content.js
├── background/                # Background service worker
│   └── background.js
├── icons/                     # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── api/                       # Vercel API endpoints
│   ├── rewrite.js
│   ├── subscription/
│   └── webhook/
└── utils/                     # Utility functions
    ├── platform-detector.js
    └── storage.js
```

## Privacy & Security

- Original messages are never stored permanently
- API calls are made over HTTPS
- No tracking or analytics beyond usage counts
- User data is stored locally in browser storage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on target platforms
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or feature requests, please open an issue on GitHub.