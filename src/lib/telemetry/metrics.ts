/*
 * Prometheus-style metrics recording
 * In production, these would be scraped by Prometheus or exported via OTLP
 * For now, we log to console in dev mode
 */

interface MetricLabels {
  [key: string]: string | number;
}

/**
 * Record a counter metric
 */
export function recordCounter(name: string, labels: MetricLabels = {}, value: number = 1): void {
  const labelStr = Object.entries(labels)
    .map(([k, v]) => `${k}="${String(v)}"`)
    .join(',');
  console.log(`METRIC: ${name}{${labelStr}} ${value}`);
}

/**
 * Record a gauge metric
 */
export function recordGauge(name: string, labels: MetricLabels = {}, value: number): void {
  const labelStr = Object.entries(labels)
    .map(([k, v]) => `${k}="${String(v)}"`)
    .join(',');
  console.log(`METRIC: ${name}{${labelStr}} ${value}`);
}

/**
 * Record a histogram metric (simplified)
 */
export function recordHistogram(name: string, labels: MetricLabels = {}, valueMs: number): void {
  const labelStr = Object.entries(labels)
    .map(([k, v]) => `${k}="${String(v)}"`)
    .join(',');
  console.log(`METRIC: ${name}{${labelStr}} ${valueMs}`);
}

/**
 * Record API request metrics
 * Matches signature from client.ts: recordApiRequest(endpoint, method, status, durationMs, isError?, errorCode?)
 */
export function recordApiRequest(
  endpointOrMethod: string,
  methodOrPath: string,
  statusOrDuration: number,
  durationOrCorrelation: number,
  isError?: boolean | string,
  errorCode?: string
): void {
  // Flexible signature to accommodate both patterns:
  // Pattern A: (method, path, status, durationMs)
  // Pattern B: (endpoint, method, status, durationMs, isError, errorCode)
  let method: string, path: string, status: number, durationMs: number;

  if (typeof isError === 'boolean') {
    // Pattern B: (endpoint, method, status, duration, isError, errorCode)
    endpointOrMethod = endpointOrMethod.replace(/^\/api\//, ''); // strip prefix for metrics
    method = methodOrPath;
    path = endpointOrMethod;
    status = statusOrDuration;
    durationMs = durationOrCorrelation;
  } else {
    // Pattern A: (method, path, status, duration)
    method = endpointOrMethod;
    path = methodOrPath;
    status = statusOrDuration;
    durationMs = durationOrCorrelation;
  }

  recordCounter('http_requests_total', { method, path, status: status.toString() });
  recordHistogram('http_request_duration_seconds', { method, path }, durationMs / 1000);
  if (status >= 400 || isError) {
    const code = errorCode || (typeof isError === 'string' ? isError : status.toString());
    recordCounter('http_requests_failed_total', { method, path, code });
  }
}

/**
 * Record business metrics
 */
export function recordBusinessEvent(
  event: string,
  labels: MetricLabels = {},
  value: number = 1
): void {
  recordCounter('business_events_total', { event, ...labels }, value);
}

// Common application metrics
export const Metrics = {
  // HTTP metrics
  httpRequests: recordCounter.bind(null, 'http_requests_total'),
  httpRequestDuration: recordHistogram.bind(null, 'http_request_duration_seconds'),
  httpErrors: recordCounter.bind(null, 'http_requests_failed_total'),

  // Business metrics
  matterCreated: recordBusinessEvent.bind(null, 'matter_created'),
  intakeConverted: recordBusinessEvent.bind(null, 'intake_converted'),
  invoiceIssued: recordBusinessEvent.bind(null, 'invoice_issued'),
  userLogin: recordBusinessEvent.bind(null, 'user_login'),

  // Database metrics
  dbQueryDuration: recordHistogram.bind(null, 'db_query_duration_seconds'),
  dbErrors: recordCounter.bind(null, 'db_errors_total')
};
