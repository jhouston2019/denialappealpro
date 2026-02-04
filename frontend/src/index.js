import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { initAnalytics } from './utils/analytics';
import { measurePageLoad, reportWebVitals } from './utils/performance';

// Initialize analytics
initAnalytics();

// Measure page load performance
measurePageLoad();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// Register service worker for offline capability
serviceWorkerRegistration.register({
  onSuccess: () => console.log('Service worker registered successfully'),
  onUpdate: () => console.log('New content available, please refresh')
});

// Report web vitals
reportWebVitals((metric) => {
  console.log(metric);
  // Send to analytics if available
  if (window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_category: 'Web Vitals',
      non_interaction: true,
    });
  }
});
