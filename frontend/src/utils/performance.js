// Performance monitoring utilities

export const measurePageLoad = () => {
  if (window.performance && window.performance.timing) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        const connectTime = perfData.responseEnd - perfData.requestStart;
        const renderTime = perfData.domComplete - perfData.domLoading;
        
        console.log('Performance Metrics:');
        console.log(`Page Load Time: ${pageLoadTime}ms`);
        console.log(`Connect Time: ${connectTime}ms`);
        console.log(`Render Time: ${renderTime}ms`);
        
        // Send to analytics if available
        if (window.gtag) {
          window.gtag('event', 'timing_complete', {
            name: 'page_load',
            value: pageLoadTime,
            event_category: 'Performance'
          });
        }
      }, 0);
    });
  }
};

export const measureComponentRender = (componentName, startTime) => {
  const endTime = performance.now();
  const renderTime = endTime - startTime;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`${componentName} render time: ${renderTime.toFixed(2)}ms`);
  }
  
  return renderTime;
};

export const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};
