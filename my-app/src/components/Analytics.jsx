import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function isGAConfigured() {
  return window.gtag && window.dataLayer && window.dataLayer.length > 0;
}

export function Analytics() {
  const location = useLocation();

  useEffect(() => {
    if (!isGAConfigured()) return;

    window.gtag('event', 'page_view', {
      page_path: location.pathname + location.search,
    });
  }, [location]);

  return null;
}

export function trackEvent(eventName, eventParams = {}) {
  if (!isGAConfigured()) {
    console.log('[Analytics] Event tracked (dev mode):', eventName, eventParams);
    return;
  }

  window.gtag('event', eventName, eventParams);
}

export function trackConversion(conversionName, value = null, currency = 'GBP') {
  if (!isGAConfigured()) {
    console.log('[Analytics] Conversion tracked (dev mode):', conversionName, value);
    return;
  }

  window.gtag('event', conversionName, {
    value: value,
    currency: currency
  });
}

export const AnalyticsEvents = {
  SIGNUP: 'sign_up',
  LOGIN: 'login',
  UPGRADE_CLICKED: 'upgrade_clicked',
  SUBSCRIPTION_STARTED: 'subscription_started',
  INVOICE_GENERATED: 'invoice_generated',
  EXPORT_FORM_GENERATED: 'export_form_generated',
  HS_CODE_SEARCHED: 'hs_code_searched',
  SHIPMENT_TRACKED: 'shipment_tracked',
  AI_CHAT_MESSAGE: 'ai_chat_message',
  CONTACT_ADDED: 'contact_added',
  LISTING_CREATED: 'listing_created',
  LISTING_VIEWED: 'listing_viewed',
  LEAD_GENERATED: 'lead_generated'
};
