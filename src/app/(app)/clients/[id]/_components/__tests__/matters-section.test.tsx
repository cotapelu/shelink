import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MattersSection } from "../matters-section";
import type { Matter, Billing } from "@prisma/client";

const mockMatters: any[] = [
  {
    id: "m1",
    internalCode: "M-001",
    title: "Case Alpha",
    status: "IN_PROGRESS",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    firmCaseNo: null,
    category: "CIVIL_COMMERCIAL",
    causeId: null,
    causeFreeText: null,
    claimAmount: null,
    ourStanding: null,
    counterclaimAsPlaintiff: false,
    counterclaimAsDefendant: false,
    barFiling: null,
    businessType: null,
    serviceScope: null,
    deliverables: null,
    counselType: null,
    serviceStart: null,
    serviceEnd: null,
    intakeDate: null,
    primaryClientId: null,
    ownerId: "u1",
    intakeId: null,
    firstAcceptedAt: null,
    closedAt: null,
    archivedAt: null,
    customValues: {}
  }
];

const mockBillings: any[] = [
  {
    id: "b1",
    matterId: "m1",
    title: "Contract A",
    contractAmount: 50000,
    status: "ACTIVE",
    schedule: null,
    signedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "b2",
    matterId: "m1",
    title: "Contract B",
    contractAmount: 30000,
    status: "DRAFT",
    schedule: null,
    signedAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const makeBillingsMap = (
  billings: Billing[]
): Map<string, Billing[]> => {
  const map = new Map<string, Billing[]>();
  for (const b of billings) {
    const arr = map.get(b.matterId) ?? [];
    arr.push(b);
    map.set(b.matterId, arr);
  }
  return map;
};

describe("MattersSection", () => {
  it("renders empty state when no matters", () => {
    render(<MattersSection matters={[]} billingsMap={new Map()} />);
    expect(screen.getByText("暂无关联案件")).toBeInTheDocument();
  });

  it("renders table with matters and billings", () => {
    const billingsMap = makeBillingsMap(mockBillings);
    render(<MattersSection matters={mockMatters} billingsMap={billingsMap} />);
    expect(screen.getByText("关联案件")).toBeInTheDocument();
    // Headers
    expect(screen.getByText("案件编号")).toBeInTheDocument();
    expect(screen.getByText("案由")).toBeInTheDocument();
    expect(screen.getByText("状态")).toBeInTheDocument();
    expect(screen.getByText("签约合同")).toBeInTheDocument();
    expect(screen.getByText("金额")).toBeInTheDocument();
    // Content – use getAllBy for duplicates (matter code, title, status appear once per billing row)
    const matterCodes = screen.getAllByText("M-001");
    expect(matterCodes.length).toBe(2);
    const caseTitles = screen.getAllByText("Case Alpha");
    expect(caseTitles.length).toBe(2);
    expect(screen.getByText("Contract A")).toBeInTheDocument();
    expect(screen.getByText("Contract B")).toBeInTheDocument();
    // Amounts
    expect(screen.getByText("¥50,000")).toBeInTheDocument();
    expect(screen.getByText("¥30,000")).toBeInTheDocument();
  });

  it("displays matter status as raw enum", () => {
    const billingsMap = makeBillingsMap(mockBillings);
    render(<MattersSection matters={mockMatters} billingsMap={billingsMap} />);
    // Status appears twice (one per billing row)
    const statuses = screen.getAllByText("IN_PROGRESS");
    expect(statuses.length).toBeGreaterThanOrEqual(1);
  });

  it("handles matter with no billings gracefully (fallback to empty array)", () => {
    const matterNoBillings = [mockMatters[0]];
    const emptyBillingsMap = new Map<string, Billing[]>();
    render(<MattersSection matters={matterNoBillings} billingsMap={emptyBillingsMap} />);
    // Table headers should be present
    expect(screen.getByText("关联案件")).toBeInTheDocument();
    expect(screen.getByText("案件编号")).toBeInTheDocument();
    // No data rows should be rendered
    const rows = screen.queryAllByRole("row");
    // Only header row exists
    expect(rows.length).toBe(1);
  });
});
