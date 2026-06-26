import { useReportWebVitals } from 'next/web-vitals';

export interface WebVitalsMetric {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
}

const sendToAnalytics = (metric: WebVitalsMetric) => {
  // Replace with your analytics endpoint
  const endpoint = '/api/analytics';
  const body = JSON.stringify(metric);

  // Use navigator.sendBeacon if available, otherwise fetch
  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, body);
  } else {
    fetch(endpoint, {
      method: 'POST',
      body,
      keepalive: true,
    }).catch(() => {
      // Silently fail
    });
  }
};

export function useWebVitals() {
  useReportWebVitals(sendToAnalytics);
}