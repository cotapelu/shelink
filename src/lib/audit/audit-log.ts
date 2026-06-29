/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
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
