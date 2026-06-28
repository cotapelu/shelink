/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createIntake } from '@/server/intakes/actions';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth/session';
import { audit } from '@/server/audit';
import { notifyRoleApprovers } from '@/server/notifications/approval';
import { revalidatePath } from 'next/cache';
import * as helpers from '@/server/intakes/helpers';

// Mocks
vi.mock('@/lib/auth/session', () => ({ requireSession: vi.fn() }));
vi.mock('@/server/audit'); // already imported
vi.mock('@/server/notifications/approval'); // already imported
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    client: { findUnique: vi.fn(), create: vi.fn() },
    contact: { findFirst: vi.fn(), create: vi.fn() },
    causeOfAction: { findUnique: vi.fn() },
    intake: { create: vi.fn() }
  }
}));

vi.mock('@/server/intakes/helpers', () => ({
  emptyToNull: vi.fn((obj) => obj),
  generateTitle: vi.fn(() => 'Auto Title')
}));



const mockSession = { user: { id: 'u1', name: 'Test User' } };

describe('createIntake', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireSession as any).mockResolvedValue(mockSession);
    (prisma.intake.create as any).mockResolvedValue({ id: 'i1' });
  });

  it('existing client path', async () => {
    const input = {
      clientId: 'c1234567890123456789012345',
      category: 'CIVIL_COMMERCIAL' as any,
      parties: [{
        role: 'OPPOSING_PARTY' as const,
        name: 'Opponent',
        ordinal: 1,
        partyType: 'NATURAL_PERSON' as const,
        idNumber: '1234567890',
        standing: 'PLAINTIFF' as const
      }],
      title: 'Existing Client Case',
      counterclaim: false,
      coUserIds: [] as string[],
      ourStanding: 'PLAINTIFF' as any
    };

    (prisma.client.findUnique as any).mockResolvedValue({ id: 'c1', name: 'Client Name' });

    const result = await createIntake(input);

    expect(prisma.client.findUnique).toHaveBeenCalledWith({
      where: { id: 'c1234567890123456789012345' },
      select: { name: true }
    });
    expect(prisma.client.create).not.toHaveBeenCalled();
    expect(prisma.intake.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: 'c1234567890123456789012345',
          ownerUserId: 'u1',
          createdById: 'u1',
          title: 'ExistingClientCase'
        })
      })
    );
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'INTAKE_CREATE' })
    );
    expect(notifyRoleApprovers).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/intakes');
    expect(result).toEqual({ ok: true, id: 'i1', clientId: 'c1234567890123456789012345' });
  });

  it('creates new client when clientName provided without clientId', async () => {
    const input = {
      clientName: 'New Client',
      clientType: 'COMPANY' as any,
      category: 'CIVIL_COMMERCIAL' as any,
      parties: [{
        role: 'OPPOSING_PARTY' as const,
        name: 'Opponent',
        ordinal: 1,
        partyType: 'NATURAL_PERSON' as const,
        idNumber: '1234567890',
        standing: 'PLAINTIFF' as const
      }],
      counterclaim: false,
      coUserIds: [] as string[],
      ourStanding: 'PLAINTIFF' as any
    };

    (prisma.client.create as any).mockResolvedValue({ id: 'c2', name: 'New Client' });

    const result = await createIntake(input);

    expect(prisma.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'New Client',
          type: 'COMPANY'
          // contacts may be undefined when no contact info
        })
      })
    );
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CLIENT_AUTO_CREATE', targetId: 'c2' })
    );
    // Called twice: one for client auto-create, one for intake create
    expect(audit).toHaveBeenCalledTimes(2);
    expect(prisma.intake.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: 'c2'
        })
      })
    );
    expect(result.clientId).toBe('c2');
    expect(result.ok).toBe(true);
  });

  it('uses auto-generated title when title not provided', async () => {
    const input = {
      clientId: 'c1234567890123456789012345',
      category: 'CIVIL_COMMERCIAL' as any,
      parties: [{
        role: 'OPPOSING_PARTY' as const,
        name: 'Opponent',
        ordinal: 1,
        partyType: 'NATURAL_PERSON' as const,
        idNumber: '1234567890',
        standing: 'PLAINTIFF' as const
      }],
      counterclaim: false,
      coUserIds: [] as string[],
      ourStanding: 'PLAINTIFF' as any
    };

    (prisma.client.findUnique as any).mockResolvedValue({ id: 'c1234567890123456789012345', name: 'Client' });

    await createIntake(input);

    expect(helpers.generateTitle).toHaveBeenCalledWith('Client', ["Opponent"], null);
    const createArg = (prisma.intake.create as any).mock.calls[0][0];
    expect(createArg.data.title).toBe('Auto Title');
  });

  it('generates auto title when title is whitespace only', async () => {
    const input = {
      clientId: 'c1234567890123456789012345',
      category: 'CIVIL_COMMERCIAL' as any,
      parties: [{
        role: 'OPPOSING_PARTY' as const,
        name: 'Opponent',
        ordinal: 1,
        partyType: 'NATURAL_PERSON' as const,
        idNumber: '1234567890',
        standing: 'PLAINTIFF' as const
      }],
      title: '   ', // whitespace only
      counterclaim: false,
      coUserIds: [] as string[],
      ourStanding: 'PLAINTIFF' as any
    };

    (prisma.client.findUnique as any).mockResolvedValue({ id: 'c1234567890123456789012345', name: 'Client' });

    await createIntake(input);

    expect(helpers.generateTitle).toHaveBeenCalledWith('Client', ["Opponent"], null);
    const createArg = (prisma.intake.create as any).mock.calls[0][0];
    expect(createArg.data.title).toBe('Auto Title');
  });

  it('handles causeId lookup for title generation', async () => {
    const input = {
      clientId: 'c1234567890123456789012345',
      causeId: 'cause1234567890123456789012345',
      category: 'CIVIL_COMMERCIAL' as any,
      parties: [{
        role: 'OPPOSING_PARTY' as const,
        name: 'Opponent',
        ordinal: 1,
        partyType: 'NATURAL_PERSON' as const,
        idNumber: '1234567890',
        standing: 'PLAINTIFF' as const
      }],
      counterclaim: false,
      coUserIds: [] as string[],
      ourStanding: 'PLAINTIFF' as any
    };

    (prisma.client.findUnique as any).mockResolvedValue({ id: 'c1234567890123456789012345', name: 'Client' });
    (prisma.causeOfAction.findUnique as any).mockResolvedValue({ name: 'Contract Dispute' });

    await createIntake(input);

    expect(prisma.causeOfAction.findUnique).toHaveBeenCalledWith({
      where: { id: 'cause1234567890123456789012345' },
      select: { name: true }
    });
    expect(helpers.generateTitle).toHaveBeenCalledWith('Client', ["Opponent"], 'Contract Dispute');
  });

  it('creates contact for existing client when contact info provided', async () => {
    const input = {
      clientId: 'c1234567890123456789012345',
      contactName: 'Contact Person',
      contactPhone: '123456789',
      category: 'CIVIL_COMMERCIAL' as any,
      parties: [{
        role: 'OPPOSING_PARTY' as const,
        name: 'Opponent',
        ordinal: 1,
        partyType: 'NATURAL_PERSON' as const,
        idNumber: '1234567890',
        standing: 'PLAINTIFF' as const
      }],
      counterclaim: false,
      coUserIds: [] as string[],
      ourStanding: 'PLAINTIFF' as any
    };

    (prisma.client.findUnique as any).mockResolvedValue({ id: 'c1234567890123456789012345', name: 'Client' });
    (prisma.contact.findFirst as any).mockResolvedValue(null); // no existing
    (prisma.contact.create as any).mockResolvedValue({});

    await createIntake(input);

    expect(prisma.contact.findFirst).toHaveBeenCalledWith({
      where: {
        clientId: 'c1234567890123456789012345',
        name: 'Contact Person'
      }
    });
    expect(prisma.contact.create).toHaveBeenCalledWith({
      data: {
        clientId: 'c1234567890123456789012345',
        name: 'Contact Person',
        phone: '123456789',
        isPrimary: false
      }
    });
  });

  it('does not create duplicate contact if exists', async () => {
    const input = {
      clientId: 'c1234567890123456789012345',
      contactName: 'Existing Contact',
      category: 'CIVIL_COMMERCIAL' as any,
      parties: [{
        role: 'OPPOSING_PARTY' as const,
        name: 'Opponent',
        ordinal: 1,
        partyType: 'NATURAL_PERSON' as const,
        idNumber: '1234567890',
        standing: 'PLAINTIFF' as const
      }],
      counterclaim: false,
      coUserIds: [] as string[],
      ourStanding: 'PLAINTIFF' as any
    };

    (prisma.client.findUnique as any).mockResolvedValue({ id: 'c1234567890123456789012345', name: 'Client' });
    (prisma.contact.findFirst as any).mockResolvedValue({ id: 'contact1' }); // exists

    await createIntake(input);

    expect(prisma.contact.create).not.toHaveBeenCalled();
  });
});
