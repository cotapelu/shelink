import { describe, it, expect } from "vitest";
import {
  shouldSplitCommission,
  commissionShare,
  commissionNote,
  buildFeeEntryData,
  buildCommissionData,
  feeReceivedTimelineData,
  type CommissionPlanRow
} from "@/server/finance/fee-entry-lib";
import type { FeeEntryCreateInput } from "@/server/finance/schemas";

const occurredAt = new Date("2026-01-15T10:00:00Z");

const createInput = (over: Partial<FeeEntryCreateInput> = {}): FeeEntryCreateInput => ({
  matterId: "m1",
  billingId: "b1",
  type: "RECEIVED",
  amount: 1000000,
  occurredAt,
  ...over
} as FeeEntryCreateInput);

describe("shouldSplitCommission", () => {
  it("chỉ RECEIVED và amount > 0", () => {
    expect(shouldSplitCommission("RECEIVED", 100)).toBe(true);
    expect(shouldSplitCommission("RECEIVED", 0)).toBe(false);
    expect(shouldSplitCommission("COST", 100)).toBe(false);
    expect(shouldSplitCommission("COMMISSION", 100)).toBe(false);
  });
});

describe("commissionShare", () => {
  it("tính % và làm tròn 2 số", () => {
    expect(commissionShare(10, 1000000)).toBe(100000);
    expect(commissionShare(7.5, 100)).toBe(7.5);
    expect(commissionShare(33.333, 100)).toBe(33.33);
  });

  it("≤0 → null (bỏ qua, khớp guard cũ)", () => {
    expect(commissionShare(0, 1000)).toBeNull();
    expect(commissionShare(-5, 1000)).toBeNull();
    expect(commissionShare(10, 0)).toBeNull();
  });
});

describe("commissionNote", () => {
  it("có label → phương án", () => {
    expect(commissionNote({ label: "Kế toán A", percent: 20 })).toBe("Tự động chia theo phương án [Kế toán A] 20%");
  });
  it("không label → mặc định", () => {
    expect(commissionNote({ label: null, percent: 15 })).toBe("Tự động chia 15%");
  });
});

describe("buildFeeEntryData", () => {
  it("map đủ field, optional null", () => {
    const d = buildFeeEntryData(createInput(), "rec1");
    expect(d).toMatchObject({
      matterId: "m1",
      billingId: "b1",
      type: "RECEIVED",
      amount: 1000000,
      occurredAt,
      invoiceNo: null,
      payerOrPayee: null,
      method: null,
      note: null,
      recordedById: "rec1"
    });
    expect(d).not.toHaveProperty("parentFeeEntryId");
    expect(d).not.toHaveProperty("beneficiaryUserId");
  });

  it("giữ giá trị optional khi có", () => {
    const d = buildFeeEntryData(
      createInput({ invoiceNo: "INV1", payerOrPayee: "An", method: "CASH", note: "thu lần 1" }),
      "rec1"
    );
    expect(d).toMatchObject({ invoiceNo: "INV1", payerOrPayee: "An", method: "CASH", note: "thu lần 1" });
  });
});

describe("buildCommissionData", () => {
  const plan: CommissionPlanRow = { id: "p1", userId: "u9", percent: 20, label: null };
  const ctx = { matterId: "m1", billingId: "b1", occurredAt };

  it("dựng dòng con COMMISSION gắn parent", () => {
    const d = buildCommissionData({ plan, amount: 1000000, parentId: "parent1", recordedById: "rec1", ...ctx });
    expect(d).toMatchObject({
      matterId: "m1",
      type: "COMMISSION",
      amount: 200000,
      parentFeeEntryId: "parent1",
      beneficiaryUserId: "u9",
      recordedById: "rec1",
      note: "Tự động chia 20%"
    });
  });

  it("plan có label → note theo phương án", () => {
    const d = buildCommissionData({ plan: { ...plan, label: "Alpha" }, amount: 1000, parentId: "parent1", recordedById: "rec1", ...ctx });
    expect(d?.note).toBe("Tự động chia theo phương án [Alpha] 20%");
  });

  it("phần chia ≤0 → null", () => {
    expect(buildCommissionData({ plan: { ...plan, percent: 0 }, amount: 1000, parentId: "parent1", recordedById: "rec1", ...ctx })).toBeNull();
  });
});

describe("feeReceivedTimelineData", () => {
  it("dựng sự kiện FEE_RECEIVED với tiếng Việt format", () => {
    const d = feeReceivedTimelineData(createInput({ amount: 1500000 }));
    expect(d).toMatchObject({
      matterId: "m1",
      eventType: "FEE_RECEIVED",
      occurredAt
    });
    expect(d.title).toContain("Đã thu ¥1.500.000");
  });

  it("note rỗng → content undefined", () => {
    expect(feeReceivedTimelineData(createInput()).content).toBeUndefined();
  });
});
