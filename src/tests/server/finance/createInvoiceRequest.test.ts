// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createInvoiceRequest } from "@/server/finance/actions";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { notifyRoleApprovers } from "@/server/notifications/approval";
import { prisma } from "@/lib/prisma";
import { assertCanAssociateMatter, isManager } from "@/lib/permissions";

vi.mock("@/lib/auth/session");
vi.mock("next/cache");
vi.mock("@/server/notifications/approval");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    matter: {
      findUnique: vi.fn(),
    },
    invoiceRequest: {
      create: vi.fn(),
    },
  },
}));
vi.mock("@/lib/permissions", () => ({
  assertCanAssociateMatter: vi.fn(),
  isManager: vi.fn(),
}));

const mockRequireSession = vi.mocked(requireSession, true);
const mockRevalidatePath = vi.mocked(revalidatePath, true);
const mockNotifyRoleApprovers = vi.mocked(notifyRoleApprovers, true);
const mockPrisma = vi.mocked(prisma, true);
const mockAssertCanAssociateMatter = vi.mocked(assertCanAssociateMatter, true);
const mockIsManager = vi.mocked(isManager, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: "c000000000000000000000001", role: "LAWYER", name: "Test Lawyer" },
  } as any);
  mockAssertCanAssociateMatter.mockResolvedValue(undefined);
  mockIsManager.mockReturnValue(false);
});

const CUID = (n: number) => `c${n.toString().padStart(24, "0")}`;

describe("createInvoiceRequest", () => {
  it("should create PLAIN invoice with matterId successfully", async () => {
    const input = {
      matterId: CUID(2),
      noMatterReason: null,
      amount: 5000,
      invoiceType: "PLAIN" as const,
      invoiceItem: "LAWYER_FEE" as const,
      buyerName: "ABC Company",
      buyerTaxNo: null,
      buyerAddress: null,
      buyerPhone: null,
      buyerBank: null,
      buyerBankAccount: null,
      evidenceDocIds: ["doc1", "doc2"],
      requestNote: "Test note",
    };

    mockPrisma.matter.findUnique.mockResolvedValue({
      id: CUID(2),
      title: "Test Matter",
      internalCode: "M-2025-001",
    } as any);
    mockPrisma.invoiceRequest.create.mockResolvedValue({
      id: CUID(100),
    } as any);
    mockNotifyRoleApprovers.mockResolvedValue(undefined);

    const result = await createInvoiceRequest(input as any);

    expect(mockPrisma.invoiceRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          matterId: CUID(2),
          amount: 5000,
          invoiceType: "PLAIN",
          invoiceItem: "LAWYER_FEE",
          buyerName: "ABC Company",
          evidenceDocIds: ["doc1", "doc2"],
          title: "ABC Company",
          requestNote: "Test note",
          requestedById: CUID(1),
        }),
      })
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/finance");
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${CUID(2)}`);
    expect(mockNotifyRoleApprovers).toHaveBeenCalledWith({
      roles: ["ADMIN", "PRINCIPAL_LAWYER", "FINANCE"],
      excludeUserId: CUID(1),
      title: "Có yêu cầu xuất hóa đơn mới cần duyệt",
      content: `Test Lawyer đã gửi yêu cầu xuất hóa đơn: M-2025-001 Test Matter, số tiền 5.000 đồng`,
      href: "/finance",
      refType: "InvoiceRequest",
      refId: CUID(100),
      priority: "HIGH",
    });
    expect(result).toEqual({ id: CUID(100) });
  });

  it("should throw if amount <= 0", async () => {
    const input = {
      matterId: CUID(2),
      amount: 0,
      invoiceType: "PLAIN",
      invoiceItem: "LAWYER_FEE",
      buyerName: "ABC",
      evidenceDocIds: [],
    } as any;

    await expect(createInvoiceRequest(input)).rejects.toThrow("Số tiền phải lớn hơn 0");
  });

  it("should throw if buyerName is empty", async () => {
    const input = {
      matterId: CUID(2),
      amount: 1000,
      invoiceType: "PLAIN",
      invoiceItem: "LAWYER_FEE",
      buyerName: "   ",
      evidenceDocIds: [],
    } as any;

    await expect(createInvoiceRequest(input)).rejects.toThrow("Vui lòng nhập tên đơn vị mua");
  });

  it("should throw if invoiceType is invalid", async () => {
    const input = {
      matterId: CUID(2),
      amount: 1000,
      // @ts-expect-error testing invalid type
      invoiceType: "INVALID",
      invoiceItem: "LAWYER_FEE",
      buyerName: "ABC",
      evidenceDocIds: [],
    } as any;

    await expect(createInvoiceRequest(input)).rejects.toThrow("Vui lòng chọn loại hóa đơn");
  });

  it("should throw SPECIAL invoice missing required fields", async () => {
    const input = {
      matterId: CUID(2),
      amount: 1000,
      invoiceType: "SPECIAL" as const,
      invoiceItem: "LAWYER_FEE" as const,
      buyerName: "ABC Corp",
      buyerTaxNo: "",
      buyerAddress: null,
      buyerPhone: null,
      buyerBank: null,
      buyerBankAccount: null,
      evidenceDocIds: [],
    } as any;

    await expect(createInvoiceRequest(input)).rejects.toThrow("Hóa đơn GTGT đặc biệt bắt buộc phải có mã số thuế người nộp thuế");
  });

  it("should allow SPECIAL invoice with all required fields", async () => {
    const input = {
      matterId: CUID(2),
      amount: 10000,
      invoiceType: "SPECIAL" as const,
      invoiceItem: "LAWYER_FEE" as const,
      buyerName: "ABC Corp",
      buyerTaxNo: "123456789012345678",
      buyerAddress: "Address 1",
      buyerPhone: "1234567890",
      buyerBank: "Bank of Test",
      buyerBankAccount: "1234567890",
      evidenceDocIds: ["doc1"],
    } as any;

    mockPrisma.matter.findUnique.mockResolvedValue({
      id: CUID(2),
      title: "Test Matter",
      internalCode: "M-2025-001",
    } as any);
    mockPrisma.invoiceRequest.create.mockResolvedValue({
      id: CUID(101),
    } as any);

    const result = await createInvoiceRequest(input);

    expect(mockPrisma.invoiceRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          invoiceType: "SPECIAL",
          buyerTaxNo: "123456789012345678",
          buyerAddress: "Address 1",
          buyerPhone: "1234567890",
          buyerBank: "Bank of Test",
          buyerBankAccount: "1234567890",
        }),
      })
    );
    expect(result).toEqual({ id: CUID(101) });
  });

  it("should throw if matterId but no evidenceDocIds", async () => {
    const input = {
      matterId: CUID(2),
      amount: 1000,
      invoiceType: "PLAIN",
      invoiceItem: "LAWYER_FEE",
      buyerName: "ABC",
      evidenceDocIds: [],
    } as any;

    await expect(createInvoiceRequest(input)).rejects.toThrow("Vui lòng tải lên ít nhất một căn cứ xuất hóa đơn (hợp đồng ủy quyền bản scan...)");
  });

  it("should throw for noMatterReason without manager role", async () => {
    mockIsManager.mockReturnValue(false);
    const input = {
      matterId: null,
      noMatterReason: null,
      amount: 1000,
      invoiceType: "PLAIN",
      invoiceItem: "LAWYER_FEE",
      buyerName: "ABC",
      evidenceDocIds: [],
    } as any;

    await expect(createInvoiceRequest(input)).rejects.toThrow("Chỉ Tài chính / quản trị / luật sư chủ trì mới được tạo hóa đơn không liên kết vụ án");
  });

  it("should throw for noMatterReason empty even with manager role", async () => {
    mockIsManager.mockReturnValue(true);
    const input = {
      matterId: null,
      noMatterReason: "   ",
      amount: 1000,
      invoiceType: "PLAIN",
      invoiceItem: "LAWYER_FEE",
      buyerName: "ABC",
      evidenceDocIds: [],
    } as any;

    await expect(createInvoiceRequest(input)).rejects.toThrow("Khi không liên kết vụ án bắt buộc phải nhập lý do");
  });

});
