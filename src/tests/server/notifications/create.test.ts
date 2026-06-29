/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNotification } from '@/server/notifications/create';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    notification: {
      create: vi.fn()
    }
  }
}));

describe('createNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates notification with all fields', async () => {
    const mockResult = { id: 'n1', userId: 'u1', title: 'Test' };
    (prisma.notification.create as any).mockResolvedValue(mockResult);

    const result = await createNotification({
      userId: 'u1',
      type: 'INTAKE_APPROVED',
      priority: 'HIGH',
      title: 'Test',
      content: 'Content',
      href: '/test',
      refType: 'Intake',
      refId: 'i1'
    });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        type: 'INTAKE_APPROVED',
        priority: 'HIGH',
        title: 'Test',
        content: 'Content',
        href: '/test',
        refType: 'Intake',
        refId: 'i1'
      }
    });
    expect(result).toBe(mockResult);
  });

  it('defaults priority to NORMAL when not provided', async () => {
    const mockResult = { id: 'n2' };
    (prisma.notification.create as any).mockResolvedValue(mockResult);

    await createNotification({
      userId: 'u2',
      type: 'MATTER_ASSIGNED',
      title: 'New matter'
    });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'u2',
        type: 'MATTER_ASSIGNED',
        priority: 'NORMAL',
        title: 'New matter',
        content: undefined,
        href: undefined,
        refType: undefined,
        refId: undefined
      }
    });
  });

  it('accepts optional fields as undefined', async () => {
    (prisma.notification.create as any).mockResolvedValue({});

    await createNotification({
      userId: 'u3',
      type: 'AUDIT_LOG',
      title: 'Audit'
    });

    const callArg = (prisma.notification.create as any).mock.calls[0][0];
    expect(callArg.data.content).toBeUndefined();
    expect(callArg.data.href).toBeUndefined();
    expect(callArg.data.refType).toBeUndefined();
    expect(callArg.data.refId).toBeUndefined();
  });

  it('passes through prisma return value', async () => {
    const returned = { id: 'n3', createdAt: new Date() };
    (prisma.notification.create as any).mockResolvedValue(returned);

    const result = await createNotification({
      userId: 'u4',
      type: 'SYSTEM',
      title: 'Sys'
    });

    expect(result).toBe(returned);
  });
});
