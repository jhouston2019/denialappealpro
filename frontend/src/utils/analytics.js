// Analytics utility functions
// To enable Google Analytics, add REACT_APP_GA_TRACKING_ID to your .env file

export const initAnalytics = () => {
  const trackingId = process.env.REACT_APP_GA_TRACKING_ID;
  
  if (!trackingId) {
    console.log('Analytics not configured (REACT_APP_GA_TRACKING_ID not set)');
    return;
  }

  // Load Google Analytics script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', trackingId);

  console.log('Analytics initialized');
};

export const trackPageView = (path) => {
  if (window.gtag) {
    window.gtag('config', process.env.REACT_APP_GA_TRACKING_ID, {
      page_path: path,
    });
  }
};

export const trackEvent = (category, action, label = null, value = null) => {
  if (window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Specific event trackers
export const trackAppealSubmit = (appealId) => {
  trackEvent('Appeal', 'submit', appealId);
};

export const trackPaymentStart = (appealId) => {
  trackEvent('Payment', 'start', appealId);
};

export const trackPaymentComplete = (appealId, amount) => {
  trackEvent('Payment', 'complete', appealId, amount);
};

export const trackDownload = (appealId) => {
  trackEvent('Download', 'pdf', appealId);
};

export const trackError = (errorMessage) => {
  trackEvent('Error', 'app_error', errorMessage);
};
