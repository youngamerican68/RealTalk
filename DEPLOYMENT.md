# Deployment Guide

## Quick Start

1. **Setup API Backend**
2. **Create Icons**  
3. **Load Extension**
4. **Configure Environment**

## 1. API Backend Setup

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables
vercel env add OPENAI_API_KEY
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add DATABASE_URL  # Optional
vercel env add FRONTEND_URL
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for text rewriting |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key for payments |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook endpoint secret |
| `DATABASE_URL` | No | PostgreSQL database URL (falls back to memory) |
| `FRONTEND_URL` | No | Frontend URL for Stripe redirects |

## 2. Create Icons

Create three PNG icons:
- `icons/icon16.png` (16x16px)
- `icons/icon48.png` (48x48px)  
- `icons/icon128.png` (128x128px)

Use a design tool or AI generator with prompts like:
- "Purple speech bubble icon, simple, professional"
- "Communication icon, minimalist, workplace theme"

## 3. Load Chrome Extension

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `RealTalk` directory
5. Extension should appear in toolbar

## 4. Update Configuration

### Update API URL

In `manifest.json`, update the host_permissions:
```json
"host_permissions": [
  "https://your-api-domain.vercel.app/*"
]
```

In `background/background.js`, update the API base URL:
```javascript
this.apiBaseUrl = 'https://your-api-domain.vercel.app';
```

## Testing

### Test Extension Loading
1. Extension icon appears in Chrome toolbar
2. No errors in `chrome://extensions/`
3. Popup opens when clicking icon

### Test Text Detection
1. Navigate to Slack/Gmail/LinkedIn
2. Focus on text input or select text
3. Click extension icon
4. Should show original text in popup

### Test API Integration
1. With text selected, click "Rewrite Text"
2. Should show loading spinner
3. Should display 3 rewrite options
4. Copy buttons should work

### Test Platform Detection
1. Test on different platforms (Slack, Gmail, LinkedIn)
2. Verify appropriate tone/style for each platform
3. Check that text capture works correctly

## Production Deployment

### Chrome Web Store

1. **Prepare Package**
   - Create proper icons
   - Test thoroughly
   - Update version in manifest.json

2. **Create Developer Account**
   - Pay $5 registration fee
   - Verify identity

3. **Upload Extension**
   - Create ZIP file of extension directory
   - Upload to Chrome Web Store Developer Dashboard
   - Fill out store listing details

4. **Review Process**
   - Chrome review takes 1-7 days
   - Address any feedback
   - Publish when approved

### API Production

1. **Upgrade Vercel Plan** (if needed for traffic)
2. **Setup Database** (PostgreSQL recommended)
3. **Configure Monitoring** (Vercel Analytics, Sentry)
4. **Setup Stripe Webhooks** in production
5. **Add Rate Limiting** for API endpoints

## Monitoring

### Extension Analytics
- Chrome Web Store provides basic metrics
- Monitor user reviews and feedback

### API Monitoring
- Vercel provides function analytics
- Monitor OpenAI API usage/costs
- Track Stripe subscription metrics

### Error Tracking
- Chrome extension errors in developer console
- API errors in Vercel logs
- User feedback channels

## Security Checklist

- [ ] API keys stored securely in environment variables
- [ ] HTTPS only for all API calls
- [ ] Input validation on all API endpoints
- [ ] Rate limiting implemented
- [ ] Webhook signature verification
- [ ] No sensitive data logged
- [ ] Extension permissions minimized
- [ ] Content Security Policy configured

## Troubleshooting

### Extension Won't Load
- Check manifest.json syntax
- Verify all file paths exist
- Check Chrome developer console for errors

### API Calls Fail
- Verify environment variables set correctly
- Check CORS configuration
- Validate OpenAI API key
- Monitor Vercel function logs

### Text Detection Issues
- Test on different websites
- Check content script injection
- Verify platform detection logic
- Test with different input types

## Support

For deployment issues:
1. Check Vercel documentation
2. Review Chrome extension development docs
3. OpenAI API documentation
4. Stripe integration guides