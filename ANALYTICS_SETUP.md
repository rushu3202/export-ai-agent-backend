# Google Analytics 4 Setup Guide

## Overview
The platform is now integrated with Google Analytics 4 (GA4) for comprehensive tracking of user behavior, conversions, and key metrics.

## Setup Instructions

### 1. Create GA4 Property
1. Go to [Google Analytics](https://analytics.google.com)
2. Create a new GA4 property for ExportAgent
3. Copy your **Measurement ID** (format: `G-XXXXXXXXXX`)

### 2. Configure Measurement ID
1. Update `my-app/src/components/CookieConsent.jsx`:
   - Replace `GA_MEASUREMENT_ID` with your actual Measurement ID
   - Find and replace both instances (2 places in the file)

### 3. Verify Installation
1. Open the platform in your browser
2. Open Chrome DevTools → Network tab
3. Look for requests to `google-analytics.com/g/collect`
4. Check GA4 Real-Time reports to see live traffic

## Tracked Events

### Automatic Events
- **Page Views**: Tracked automatically on every route change
- **User Engagement**: Session duration, scroll depth
- **First Visit**: New user identification

### Custom Events
The following business events are tracked:

#### User Journey
- `sign_up` - New user registration
- `login` - User login
- `upgrade_clicked` - User clicks upgrade to Pro
- `subscription_started` - Successful subscription (with value)

#### Core Features
- `invoice_generated` - PDF invoice created
- `export_form_generated` - Export document created
- `hs_code_searched` - HS code search performed
- `shipment_tracked` - Shipment tracking query
- `ai_chat_message` - AI assistant message sent
- `contact_added` - New contact/CRM entry

#### B2B Marketplace
- `listing_created` - New marketplace listing
- `listing_viewed` - Listing detail page viewed
- `lead_generated` - Inquiry submitted on listing

## Implementation Examples

### Track Custom Event
```javascript
import { trackEvent, AnalyticsEvents } from '../components/Analytics';

// Track invoice generation
trackEvent(AnalyticsEvents.INVOICE_GENERATED, {
  currency: 'GBP',
  value: totalAmount,
  invoice_type: 'commercial'
});
```

### Track Conversion
```javascript
import { trackConversion } from '../components/Analytics';

// Track subscription conversion
trackConversion('subscription_started', subscriptionAmount);
```

## Key Metrics to Monitor

### Business Metrics
- **Conversion Rate**: Visitors → Signups → Paid Users
- **Feature Adoption**: % users using each feature
- **Revenue per User**: Avg subscription value
- **Churn Rate**: Users canceling subscription

### Product Metrics
- **Popular Features**: Most used features (invoice, forms, HS codes)
- **User Flow**: Navigation patterns and drop-off points
- **Session Duration**: Time spent in app
- **Return Rate**: Repeat user visits

### Marketing Metrics
- **Acquisition Channels**: Traffic sources (organic, direct, referral)
- **Landing Page Performance**: Conversion rate by page
- **Campaign Attribution**: Which campaigns drive signups

## Privacy & GDPR Compliance

### Cookie Consent Banner
The platform includes a GDPR-compliant cookie consent banner that:
- ✅ Shows on first visit to request user consent
- ✅ Only loads GA4 after user accepts cookies
- ✅ Stores consent preference in localStorage
- ✅ Allows users to decline tracking
- ✅ Links to privacy policy

### Current Configuration
- ✅ Consent-based tracking (no tracking without permission)
- ✅ IP Anonymization enabled
- ✅ Secure cookie flags (SameSite=None;Secure)
- ✅ No PII (Personally Identifiable Information) tracked
- ✅ User can decline analytics at any time

### Cookie Policy
Update your privacy policy to mention:
- Google Analytics cookies for analytics
- Purpose: Improve user experience and platform performance
- User right to opt-out via browser settings
- Data retention: 14 months (GA4 default)

## Advanced Features (Optional)

### 1. Enhanced Ecommerce
Track subscription plans as products:
```javascript
gtag('event', 'purchase', {
  transaction_id: 'SUB-12345',
  value: 29.00,
  currency: 'GBP',
  items: [{
    item_name: 'Pro Plan',
    item_category: 'Subscription'
  }]
});
```

### 2. Custom Dimensions
Add user properties:
```javascript
gtag('set', 'user_properties', {
  subscription_tier: 'pro',
  business_type: 'manufacturer',
  country: 'UK'
});
```

### 3. Goals & Conversions
In GA4, create custom conversions for:
- Free trial signups
- First invoice generated
- Subscription upgrades
- Marketplace listings created

## Troubleshooting

### Events Not Showing
1. Check Measurement ID is correct in both places
2. Wait 24-48 hours for GA4 to start showing data
3. Use Real-Time reports for immediate verification
4. Check browser console for GA errors

### Development Mode
In development, events are logged to console:
```
[Analytics] Event tracked (dev mode): invoice_generated {currency: 'GBP', value: 1200}
```

This prevents test data polluting production analytics.

## Next Steps

1. **Set up GA4 property** and get Measurement ID
2. **Update HTML** with your Measurement ID
3. **Verify tracking** in Real-Time reports
4. **Create custom reports** for key metrics
5. **Set up alerts** for critical events (signups, upgrades)
6. **Monitor weekly** to optimize user experience

## Support Resources

- [GA4 Documentation](https://support.google.com/analytics/answer/10089681)
- [Event Reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
- [GA4 Reports](https://support.google.com/analytics/answer/9212670)
