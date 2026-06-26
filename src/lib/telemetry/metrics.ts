/**
 * In-memory metrics collector for Prometheus exposition
 * NOTE: In serverless environment, metrics are per-instance (not aggregated across instances).
 * For true aggregation, use external metrics backend (Prometheus Pushgateway, StatsD, etc.)
 */

interface Counter {
  value: number;
  labels: Record<string, string>;
}

interface Histogram {
  values: number[]; // durations in seconds
  labels: Record<string, string>;
}

class MetricsCollector {
  // Counters: e.g., http_requests_total{method, endpoint, status}
  private counters: Map<string, Counter> = new Map();

  // Histograms: e.g., http_request_duration_seconds{method, endpoint}
  private histograms: Map<string, Histogram> = new Map();

  // Gauges: e.g., circuit_breaker_state{endpoint, state}
  private gauges: Map<string, number> = new Map();

  /**
   * Increment a counter
   */
  incrementCounter(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    const key = this.buildKey(name, labels);
    const counter = this.counters.get(key);
    if (counter) {
      counter.value += value;
    } else {
      this.counters.set(key, { value, labels });
    }
  }

  /**
   * Observe a value for histogram (duration in seconds)
   */
  observeHistogram(name: string, labels: Record<string, string> = {}, valueSeconds: number): void {
    const key = this.buildKey(name, labels);
    const hist = this.histograms.get(key);
    if (hist) {
      hist.values.push(valueSeconds);
    } else {
      this.histograms.set(key, { values: [valueSeconds], labels });
    }
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, labels: Record<string, string> = {}, value: number): void {
    const key = this.buildKey(name, labels);
    this.gauges.set(key, value);
  }

  private buildKey(name: string, labels: Record<string, string>): string {
    const labelKeys = Object.keys(labels).sort();
    const labelStr = labelKeys.map(k => `${k}="${labels[k]}"`).join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  /**
   * Format metrics as Prometheus text exposition format
   */
  toPrometheusString(): string {
    const lines: string[] = [];

    // Counters
    for (const [key, counter] of this.counters) {
      lines.push(`# TYPE ${this.extractMetricName(key)} counter`);
      lines.push(`${key} ${counter.value}`);
    }

    // Histograms (store raw observations; Prometheus expects buckets. For simplicity, we output as summary).
    for (const [key, hist] of this.histograms) {
      const baseName = this.extractMetricName(key);
      lines.push(`# TYPE ${baseName} summary`);
      const sum = hist.values.reduce((a, b) => a + b, 0);
      const count = hist.values.length;
      const avg = sum / count;
      lines.push(`${key}_count ${count}`);
      lines.push(`${key}_sum ${sum}`);
      // For simplicity, we don't calculate quantiles here.
      // In production, use prom-client library.
    }

    // Gauges
    for (const [key, value] of this.gauges) {
      lines.push(`# TYPE ${this.extractMetricName(key)} gauge`);
      lines.push(`${key} ${value}`);
    }

    return lines.join('\n') + '\n';
  }

  private extractMetricName(key: string): string {
    // key is like "metric{label1="value1",label2="value2"}"
    // Extract "metric"
    const idx = key.indexOf('{');
    return idx > 0 ? key.substring(0, idx) : key;
  }

  /**
   * Reset all metrics (optional, e.g., after scrape)
   */
  reset(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }
}

// Global singleton
export const metrics = new MetricsCollector();

/**
 * Helper to record API request
 */
export function recordApiRequest(
  endpoint: string,
  method: string,
  status: number,
  durationMs: number,
  isError: boolean = false,
  errorCode?: string
): void {
  const durationSec = durationMs / 1000;
  const labels = { endpoint, method, status: String(status) };

  metrics.incrementCounter('http_requests_total', labels);
  metrics.observeHistogram('http_request_duration_seconds', { endpoint, method }, durationSec);

  if (isError) {
    const errorLabels = { endpoint, method, error: errorCode || 'unknown' };
    metrics.incrementCounter('api_errors_total', errorLabels);
  }
}

/**
 * Helper to record circuit breaker state
 */
export function recordCircuitBreakerState(endpoint: string, method: string, state: string): void {
  metrics.setGauge('circuit_breaker_state', { endpoint, method }, state === 'OPEN' ? 1 : state === 'HALF_OPEN' ? 0.5 : 0);
}
