import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withMetrics, recordActionEvent } from '@/lib/telemetry/server-metrics';
import { recordApiRequest, recordBusinessEvent } from '@/lib/telemetry/metrics';

// Mock metrics
vi.mock('@/lib/telemetry/metrics', () => ({
  recordApiRequest: vi.fn(),
  recordBusinessEvent: vi.fn(),
}));

describe('server-metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withMetrics', () => {
    it('should record success metric and business event for create/update/convert actions', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');
      const wrapped = withMetrics('createIntake', mockFn);

      const result = await wrapped('arg1', 'arg2');

      expect(result).toBe('result');
      expect(recordApiRequest).toHaveBeenCalledWith('createIntake', 'server', 200, expect.any(Number));
      // business event called with event name only (no labels by default)
      expect(recordBusinessEvent).toHaveBeenCalledWith('createIntake');
    });

    it('should record error metric when function throws plain error', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('fail'));
      const wrapped = withMetrics('someAction', mockFn);

      await expect(wrapped()).rejects.toThrow('fail');

      expect(recordApiRequest).toHaveBeenCalledWith('someAction', 'server', 500, expect.any(Number));
      // error label is 'unknown' because error has no code
      expect(recordBusinessEvent).toHaveBeenCalledWith('someAction_error', { error: 'unknown' });
    });

    it('should record error metric with error code if available', async () => {
      const mockFn = vi.fn().mockRejectedValue({ code: 'VALIDATION_ERROR', message: 'bad' });
      const wrapped = withMetrics('action', mockFn);

      await expect(wrapped()).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

      expect(recordApiRequest).toHaveBeenCalledWith('action', 'server', 'VALIDATION_ERROR', expect.any(Number));
      expect(recordBusinessEvent).toHaveBeenCalledWith('action_error', { error: 'VALIDATION_ERROR' });
    });

    it('should not record business event for non-mutating actions', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');
      const wrapped = withMetrics('listIntakes', mockFn);

      await wrapped();

      expect(recordBusinessEvent).not.toHaveBeenCalled();
    });
  });

  describe('recordActionEvent', () => {
    it('should call recordBusinessEvent with default params', () => {
      recordActionEvent('testEvent');
      expect(recordBusinessEvent).toHaveBeenCalledWith('testEvent', {}, 1);
    });

    it('should pass custom labels and value', () => {
      recordActionEvent('event', { userId: '123' }, 5);
      expect(recordBusinessEvent).toHaveBeenCalledWith('event', { userId: '123' }, 5);
    });
  });
});
