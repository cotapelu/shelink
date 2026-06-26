/**
 * Immutable Audit Log for Security & Compliance
 *
 * Records all security-sensitive actions:
 * - Authentication events (login, logout, register)
 * - Authorization checks (role changes, access granted/denied)
 * - Data mutations (create, update, delete)
 * - Admin actions (user management, data import/export)
 *
 * Design: WAL (Write-Ahead Log) - append-only, never modify or delete.
 * Storage: In production, use append-only database table or cloud audit log.
 * For now: in-memory (development) + file-based backup (if needed).
 */

export interface AuditEvent {
  id?: string; // auto-generated
  timestamp: string; // ISO
  userId?: string; // who performed action (if authenticated)
  ip?: string; // client IP
  userAgent?: string; // browser/client
  action: string; // e.g., 'user.login', 'person.delete', 'user.role_change'
  resource: string; // e.g., 'person', 'user', 'relationship'
  resourceId?: string; // ID of affected resource
  details?: Record<string, unknown>; // additional context
  outcome: 'success' | 'failure' | 'denied';
  error?: string; // if failure
}

// In-memory store (development ONLY)
// In production, write to database with append-only constraint
export class AuditLogStore {
  private logs: AuditEvent[] = [];
  private readonly MAX_MEMORY = 10000; // keep last 10k in memory for debugging

  record(event: Omit<AuditEvent, 'id' | 'timestamp'>): void {
    const fullEvent: AuditEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    this.logs.push(fullEvent);

    // Keep memory bounded
    if (this.logs.length > this.MAX_MEMORY) {
      this.logs = this.logs.slice(-this.MAX_MEMORY);
    }

    // In production, also persist to database or audit service
    this.persist(fullEvent);
  }

  private persist(event: AuditEvent): void {
    // TODO: Implement persistence
    // Options:
    // 1. Database table with triggers preventing UPDATE/DELETE
    // 2. Cloud audit log (AWS CloudTrail, GCP Audit Logs)
    // 3. Append-only file (with proper permissions)
    // For now: just console.log in dev
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUDIT]', JSON.stringify(event));
    }
  }

  /**
   * Query logs (admin only, for investigation)
   */
  query(filter: {
    userId?: string;
    action?: string;
    resource?: string;
    startTime?: string;
    endTime?: string;
    limit?: number;
  }): AuditEvent[] {
    const startTime = filter.startTime;
    const endTime = filter.endTime;
    let result = this.logs;

    if (filter.userId) {
      result = result.filter(l => l.userId === filter.userId);
    }
    if (filter.action) {
      result = result.filter(l => l.action === filter.action);
    }
    if (filter.resource) {
      result = result.filter(l => l.resource === filter.resource);
    }
    if (startTime) {
      result = result.filter(l => l.timestamp >= startTime);
    }
    if (endTime) {
      result = result.filter(l => l.timestamp <= endTime);
    }

    // Sort by timestamp descending (newest first)
    result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (filter.limit) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }

  /**
   * Export logs for external analysis (SIEM)
   */
  exportJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Singleton
export const auditLog = new AuditLogStore();

/**
 * Helper to record action with context
 */
export function recordAudit(
  action: string,
  resource: string,
  userId?: string,
  details?: Record<string, unknown>,
  outcome: 'success' | 'failure' | 'denied' = 'success',
  error?: string
): void {
  // Extract IP and user agent from request context if available
  // In Next.js server actions, we can access headers via `headers()` but expensive.
  // For now, skip IP/userAgent (can be added via middleware)
  auditLog.record({
    action,
    resource,
    userId,
    details,
    outcome,
    error,
    // ip, userAgent left empty (could be set via context)
  });
}
