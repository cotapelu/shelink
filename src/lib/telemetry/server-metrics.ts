/*
 * Helper to instrument server actions with metrics recording
 * Records duration and status for each action invocation
 */

import { recordApiRequest, recordBusinessEvent } from './metrics';

/**
 * Wrap an async server action with metrics instrumentation
 * @param actionName - Name of the action (e.g., 'createIntake', 'listMatters')
 * @param fn - The async server function to wrap
 * @returns Wrapped function that records metrics before returning
 */
export function withMetrics<T extends (...args: any[]) => Promise<any>>(
  actionName: string,
  fn: T
): T {
  const wrapped = async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const start = Date.now();
    try {
      const result = await fn(...args);
      const duration = Date.now() - start;
      // Record success (assume result may have status or implicit success)
      recordApiRequest(actionName, 'server', 200, duration);
      // Record business event for create-type actions
      if (actionName.startsWith('create') || actionName.startsWith('update') || actionName.startsWith('convert')) {
        recordBusinessEvent(actionName);
      }
      return result as ReturnType<T>;
    } catch (error: any) {
      const duration = Date.now() - start;
      const status = error?.code || error?.status || 500;
      recordApiRequest(actionName, 'server', status, duration);
      recordBusinessEvent(`${actionName}_error`, { error: String(error?.code || 'unknown') });
      throw error;
    }
  };
  return wrapped as T;
}

/**
 * Record a custom business event with additional labels
 */
export function recordActionEvent(action: string, labels: Record<string, string> = {}, value: number = 1) {
  recordBusinessEvent(action, labels, value);
}
