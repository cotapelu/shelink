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
/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getReportData, type ReportPeriod } from '@/server/reports/queries';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    matter: {
      count: vi.fn(),
      groupBy: vi.fn()
    },
    feeEntry: {
      findMany: vi.fn()
    },
    user: {
      findMany: vi.fn()
    }
  }
}));

describe('getReportData - client receivable aggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates client receivable correctly with mixed types', async () => {
    const period: ReportPeriod = {
      label: 'Test',
      start: new Date('2024-01-01'),
      end: new Date('2024-02-01')
    };

    // KPIs: all zero
    (prisma.matter.count as any).mockResolvedValue(0);
    (prisma.matter.groupBy as any).mockResolvedValue([]);
    (prisma.feeEntry.findMany as any).mockResolvedValue([
      // Client A: one receivable, one received
      {
        type: 'RECEIVABLE',
        amount: 5000,
        matter: { primaryClient: { id: 'c1', name: 'Client A' } }
      },
      {
        type: 'RECEIVED',
        amount: 3000,
        matter: { primaryClient: { id: 'c1', name: 'Client A' } }
      },
      // Client B: only receivable
      {
        type: 'RECEIVABLE',
        amount: 10000,
        matter: { primaryClient: { id: 'c2', name: 'Client B' } }
      },
      // Client C: null primaryClient (should skip)
      {
        type: 'RECEIVED',
        amount: 2000,
        matter: { primaryClient: null }
      },
      // Client D: missing matter (should skip)
      {
        type: 'RECEIVABLE',
        amount: 4000,
        matter: undefined
      }
    ]);
    (prisma.user.findMany as any).mockResolvedValue([]);

    const result = await getReportData(period);

    expect(result.byClientReceivable).toHaveLength(2);
    // Client A: receivable 5000, received 3000, balance 2000
    // Client B: receivable 10000, received 0, balance 10000
    const clientA = result.byClientReceivable.find(c => c.clientId === 'c1')!;
    const clientB = result.byClientReceivable.find(c => c.clientId === 'c2')!;

    expect(clientA.name).toBe('Client A');
    expect(clientA.receivable).toBe(5000);
    expect(clientA.received).toBe(3000);
    expect(clientA.balance).toBe(2000);

    expect(clientB.name).toBe('Client B');
    expect(clientB.receivable).toBe(10000);
    expect(clientB.received).toBe(0);
    expect(clientB.balance).toBe(10000);

    // Sorted by balance descending: B (10000) then A (2000)
    expect(result.byClientReceivable[0].clientId).toBe('c2');
    expect(result.byClientReceivable[1].clientId).toBe('c1');
  });

  it('handles empty fee entries', async () => {
    (prisma.matter.count as any).mockResolvedValue(0);
    (prisma.matter.groupBy as any).mockResolvedValue([]);
    (prisma.feeEntry.findMany as any).mockResolvedValue([]);
    (prisma.user.findMany as any).mockResolvedValue([]);

    const result = await getReportData({
      label: 'Empty',
      start: new Date('2024-01-01'),
      end: new Date('2024-02-01')
    });

    expect(result.byClientReceivable).toEqual([]);
  });
});
