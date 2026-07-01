import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  recordCounter,
  recordGauge,
  recordHistogram,
  recordApiRequest,
  recordBusinessEvent,
  Metrics,
} from '@/lib/telemetry/metrics';

describe('Telemetry Metrics', () => {
  let consoleLogSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    consoleLogSpy = vi.fn();
    vi.spyOn(console, 'log').mockImplementation(consoleLogSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('recordCounter', () => {
    it('should record counter with default value 1 and no labels', () => {
      recordCounter('test_counter');

      expect(consoleLogSpy).toHaveBeenCalledWith('METRIC: test_counter{} 1');
    });

    it('should record counter with custom value and labels', () => {
      recordCounter('http_requests_total', { method: 'GET', path: '/api/users' }, 5);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: http_requests_total{method="GET",path="/api/users"} 5'
      );
    });

    it('should handle empty labels object', () => {
      recordCounter('empty_labels', {}, 10);

      expect(consoleLogSpy).toHaveBeenCalledWith('METRIC: empty_labels{} 10');
    });

    it('should escape special characters in label values', () => {
      recordCounter('test', { label: 'value with "quotes"' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: test{label="value with \"quotes\""} 1'
      );
    });
  });

  describe('recordGauge', () => {
    it('should record gauge with value', () => {
      recordGauge('test_gauge', { region: 'us-west' }, 42.5);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: test_gauge{region="us-west"} 42.5'
      );
    });

    it('should handle negative gauge values', () => {
      recordGauge('negative_gauge', {}, -10);

      expect(consoleLogSpy).toHaveBeenCalledWith('METRIC: negative_gauge{} -10');
    });
  });

  describe('recordHistogram', () => {
    it('should record histogram with ms value', () => {
      recordHistogram('request_duration', { endpoint: '/api/data' }, 150.5);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: request_duration{endpoint="/api/data"} 150.5'
      );
    });

    it('should handle zero duration', () => {
      recordHistogram('instant', {}, 0);

      expect(consoleLogSpy).toHaveBeenCalledWith('METRIC: instant{} 0');
    });
  });

  describe('recordApiRequest', () => {
    it('should record using Pattern A (method, path, status, duration)', () => {
      recordApiRequest('GET', '/api/users', 200, 45); // integer ms

      expect(consoleLogSpy).toHaveBeenNthCalledWith(1,
        'METRIC: http_requests_total{method="GET",path="/api/users",status="200"} 1'
      );
      expect(consoleLogSpy).toHaveBeenNthCalledWith(2,
        'METRIC: http_request_duration_seconds{method="GET",path="/api/users"} 0.045'
      );
    });

    it('should record using Pattern B (endpoint, method, status, duration, isError, errorCode)', () => {
      recordApiRequest('/api/users', 'POST', 500, 120.0, true, 'INTERNAL_ERROR');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: http_requests_total{method="POST",path="users",status="500"} 1'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: http_request_duration_seconds{method="POST",path="users"} 0.12'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: http_requests_failed_total{method="POST",path="users",code="INTERNAL_ERROR"} 1'
      );
    });

    it('should strip /api/ prefix in Pattern B', () => {
      // Pattern B: 6 args (isError and errorCode provided)
      recordApiRequest('/api/very/long/path', 'DELETE', 204, 10, false, 'TIMEOUT');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: http_requests_total{method="DELETE",path="very/long/path",status="204"} 1'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: http_request_duration_seconds{method="DELETE",path="very/long/path"} 0.01'
      );
    });

    it('should not record error metric when status < 400 and isError false', () => {
      recordApiRequest('GET', '/api/success', 200, 50);

      const calls = consoleLogSpy.mock.calls.map((c) => c[0]);
      expect(calls.filter((c) => c.includes('http_requests_failed_total'))).toHaveLength(0);
    });

    it('should record error metric when status >= 400 even without isError flag', () => {
      recordApiRequest('GET', '/api/bad', 404, 30);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: http_requests_failed_total{method="GET",path="/api/bad",code="404"} 1'
      );
    });
  });

  describe('recordBusinessEvent', () => {
    it('should record business event with default value 1', () => {
      recordBusinessEvent('matter_created', { lawyerId: 'lawyer-123' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: business_events_total{event="matter_created",lawyerId="lawyer-123"} 1'
      );
    });

    it('should record business event with custom value', () => {
      recordBusinessEvent('invoice_issued', { amount: '1000' }, 5);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: business_events_total{event="invoice_issued",amount="1000"} 5'
      );
    });

    it('should merge event label with additional labels', () => {
      recordBusinessEvent('user_login', { userId: 'user-456', success: 'true' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: business_events_total{event="user_login",userId="user-456",success="true"} 1'
      );
    });
  });

  describe('Metrics object', () => {
    beforeEach(() => {
      consoleLogSpy.mockClear();
    });

    it('httpRequests should call recordCounter with correct signature', () => {
      Metrics.httpRequests({ method: 'POST', path: '/api/test', status: '201' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: http_requests_total{method="POST",path="/api/test",status="201"} 1'
      );
    });

    it('httpRequestDuration should call recordHistogram', () => {
      Metrics.httpRequestDuration({ method: 'GET', path: '/api/health' }, 0.5);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: http_request_duration_seconds{method="GET",path="/api/health"} 0.5'
      );
    });

    it('httpErrors should call recordCounter for errors', () => {
      Metrics.httpErrors({ method: 'DELETE', path: '/api/resource', code: 'TIMEOUT' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: http_requests_failed_total{method="DELETE",path="/api/resource",code="TIMEOUT"} 1'
      );
    });

    it('matterCreated should call recordBusinessEvent', () => {
      Metrics.matterCreated({ matterId: 'matter-789' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: business_events_total{event="matter_created",matterId="matter-789"} 1'
      );
    });

    it('intakeConverted should call recordBusinessEvent', () => {
      Metrics.intakeConverted({ intakeId: 'intake-123' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: business_events_total{event="intake_converted",intakeId="intake-123"} 1'
      );
    });

    it('invoiceIssued should call recordBusinessEvent', () => {
      Metrics.invoiceIssued({ invoiceId: 'inv-456', amount: '2500' }, 1);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: business_events_total{event="invoice_issued",invoiceId="inv-456",amount="2500"} 1'
      );
    });

    it('userLogin should call recordBusinessEvent', () => {
      Metrics.userLogin({ userId: 'user-999', method: 'email' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: business_events_total{event="user_login",userId="user-999",method="email"} 1'
      );
    });

    it('dbQueryDuration should call recordHistogram', () => {
      Metrics.dbQueryDuration({ query: 'findMany Preservation' }, 12.34);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: db_query_duration_seconds{query="findMany Preservation"} 12.34'
      );
    });

    it('dbErrors should call recordCounter', () => {
      Metrics.dbErrors({ operation: 'prisma.preservation.findMany', code: 'P2002' }, 1);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: db_errors_total{operation="prisma.preservation.findMany",code="P2002"} 1'
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle labels with many entries', () => {
      const manyLabels = {
        a: '1',
        b: '2',
        c: '3',
        d: '4',
        e: '5',
      };
      recordCounter('many_labels', manyLabels, 1);

      const call = consoleLogSpy.mock.calls[0][0] as string;
      expect(call).toContain('many_labels{');
      expect(call).toContain('a="1"');
      expect(call).toContain('e="5"');
    });

    it('should handle numeric label values converted to string', () => {
      recordGauge('numeric_label', { count: 123 }, 456.789);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'METRIC: numeric_label{count="123"} 456.789'
      );
    });

    it('should handle missing labels parameter (default)', () => {
      recordHistogram('no_labels', {}, 0); // explicit defaults

      expect(consoleLogSpy).toHaveBeenCalledWith('METRIC: no_labels{} 0');
    });

    it('should handle very large numbers', () => {
      recordCounter('big_number', {}, 999999999);

      expect(consoleLogSpy).toHaveBeenCalledWith('METRIC: big_number{} 999999999');
    });

    it('should handle negative numbers in counter (unusual but allowed)', () => {
      recordCounter('negative', {}, -5);

      expect(consoleLogSpy).toHaveBeenCalledWith('METRIC: negative{} -5');
    });
  });
});
