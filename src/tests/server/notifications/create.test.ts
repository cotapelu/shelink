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
