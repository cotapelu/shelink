// @ts-nocheck
/**
 * Test server action module báo giá: createQuote (tính tiền + sinh code),
 * convertQuoteToContract (transaction) và phân quyền setQuoteStatus.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createQuote, setQuoteStatus, convertQuoteToContract } from "./actions";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

/** id hợp lệ cho zod .cuid() (c + 24 ký tự) */
const QID = "c" + "0".repeat(24);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    quote: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn()
    },
    quoteItem: { deleteMany: vi.fn(), create: vi.fn() },
    contract: { create: vi.fn() },
    contractEvent: { create: vi.fn() }
  }
}));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/audit", () => ({ audit: vi.fn() }));

const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  getServerSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN", name: "Admin" } });
});

describe("createQuote", () => {
  it("computes pricing and generates a QT code", async () => {
    // nextSequenceCode uses prisma.$transaction; resolve inner callback
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
    mockPrisma.systemSetting = { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn() };
    mockPrisma.quote.create.mockResolvedValue({ id: "q1", code: "QT-2026-0001" });
    mockPrisma.quoteItem.create.mockResolvedValue({});

    const quote = await createQuote({
      title: "Tư vấn thiết kế",
      clientId: "ckclient000000000000001",
      items: [{ name: "Thiết kế logo", quantity: 2, unitPrice: 1000 }],
      discountPercent: 0,
      taxPercent: 0
    });

    expect(quote.id).toBe("q1");
    const data = mockPrisma.quote.create.mock.calls[0][0].data;
    expect(data.code).toMatch(/^QT-\d{4}-\d{4}$/);
    expect(String(data.total)).toBe("2000");
  });

  it("applies discount and tax before persisting totals", async () => {
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
    mockPrisma.systemSetting = { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn() };
    mockPrisma.quote.create.mockResolvedValue({ id: "q2" });
    mockPrisma.quoteItem.create.mockResolvedValue({});

    await createQuote({
      title: "Gói marketing",
      clientId: "ckclient000000000000001",
      items: [{ name: "Chạy ads", quantity: 1, unitPrice: 1000 }],
      discountPercent: 10,
      taxPercent: 10
    });

    const data = mockPrisma.quote.create.mock.calls[0][0].data;
    expect(String(data.subtotal)).toBe("1000");
    expect(String(data.total)).toBe("990");
  });
});

describe("setQuoteStatus", () => {
  it("rejects non-manager roles", async () => {
    getServerSession.mockResolvedValue({ user: { id: "u2", role: "STAFF" } });
    mockPrisma.quote.findUnique.mockResolvedValue({ id: QID, status: "DRAFT", deletedAt: null, createdById: "u2", validDays: 30 });

    await expect(setQuoteStatus(QID, "SENT")).rejects.toThrow(/quyền|role/i);
  });

  it("sets issuedAt and expiresAt when sent by manager", async () => {
    mockPrisma.quote.findUnique.mockResolvedValue({ id: "q1", status: "DRAFT", deletedAt: null, createdById: "u1", validDays: 15 });
    mockPrisma.quote.update.mockResolvedValue({ id: "q1", status: "SENT" });

    await setQuoteStatus("ckquote000000000000001", "SENT");

    const data = mockPrisma.quote.update.mock.calls[0][0].data;
    expect(data.status).toBe("SENT");
    expect(data.issuedAt).toBeInstanceOf(Date);
    expect(data.expiresAt).toBeInstanceOf(Date);
  });
});

describe("convertQuoteToContract", () => {
  it("creates contract + event and marks quote CONVERTED in one transaction", async () => {
    mockPrisma.quote.findUnique.mockResolvedValue({
      id: QID,
      code: "QT-2026-0001",
      status: "ACCEPTED",
      deletedAt: null,
      clientId: "ckclient000000000000001",
      total: new (await import("@prisma/client")).Prisma.Decimal(2000),
      currency: "VND",
      ownerUserId: "u1"
    });
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
    mockPrisma.systemSetting = { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn() };
    mockPrisma.contract.create.mockResolvedValue({ id: "c1", code: "CT-2026-0001" });
    mockPrisma.contractEvent.create.mockResolvedValue({});
    mockPrisma.quote.update.mockResolvedValue({});

    const contract = await convertQuoteToContract({ id: QID });

    expect(contract.code).toMatch(/^CT-\d{4}-\d{4}$/);
    const eventData = mockPrisma.contractEvent.create.mock.calls[0][0].data;
    expect(eventData.kind).toBe("CREATED");
    const quoteUpdate = mockPrisma.quote.update.mock.calls[0][0].data;
    expect(quoteUpdate.status).toBe("CONVERTED");
    expect(quoteUpdate.contractId).toBe("c1");
  });

  it("refuses double conversion", async () => {
    mockPrisma.quote.findUnique.mockResolvedValue({ id: QID, status: "CONVERTED", deletedAt: null });
    await expect(convertQuoteToContract({ id: QID })).rejects.toThrow(/đã chuyển/);
  });
});
