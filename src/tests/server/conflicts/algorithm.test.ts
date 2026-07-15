import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma BEFORE importing runConflictCheck
vi.mock("@/lib/prisma", () => ({
  prisma: {
    party: { findMany: vi.fn() },
    client: { findMany: vi.fn() },
  },
}));

import { toMatterInfo, pickSeverity, bumpSeverity, roleLabel, runConflictCheck } from "@/server/conflicts/algorithm";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as any;

// ── toMatterInfo Tests ────────────────────────────────────────────────────────────

describe("toMatterInfo", () => {
  it("should map matter correctly with full data", () => {
    const matter = {
      id: "m1",
      internalCode: "INT-2024-001",
      title: "Test Matter",
      category: "CIVIL_COMMERCIAL" as const,
      status: "IN_PROGRESS" as const,
      intakeDate: new Date("2024-01-15"),
      cause: { name: "Contract Dispute" },
      causeFreeText: null,
      owner: { name: "John Doe" },
    } as any;
    const result = toMatterInfo(matter, "CLIENT_PARTY", "PLAINTIFF");
    expect(result).toEqual({
      matterId: "m1",
      internalCode: "INT-2024-001",
      title: "Test Matter",
      category: "CIVIL_COMMERCIAL",
      status: "IN_PROGRESS",
      intakeDate: new Date("2024-01-15"),
      causeText: "Contract Dispute",
      ownerName: "John Doe",
      partyRole: "CLIENT_PARTY",
      partyStanding: "PLAINTIFF",
    });
  });

  it("should use causeFreeText when cause.name is null", () => {
    const matter = {
      id: "m2",
      internalCode: "INT-2024-002",
      title: "Matter 2",
      category: "CRIMINAL" as const,
      status: "CLOSED" as const,
      intakeDate: null,
      cause: null,
      causeFreeText: "Custom cause text",
      owner: { name: "John Doe" },
    } as any;
    const result = toMatterInfo(matter, "OPPOSING_PARTY", null);
    expect(result.causeText).toBe("Custom cause text");
  });

  it("should return null when both cause.name and causeFreeText are null", () => {
    const matter = {
      id: "m3",
      internalCode: "INT-2024-003",
      title: "Matter 3",
      category: "ADMINISTRATIVE" as const,
      status: "PENDING_ACCEPTANCE" as const,
      intakeDate: new Date(),
      cause: null,
      causeFreeText: null,
      owner: { name: "Jane Smith" },
    } as any;
    const result = toMatterInfo(matter, "THIRD_PARTY", "THIRD_PARTY");
    expect(result.causeText).toBeNull();
  });

  it("should handle null intakeDate and default ownerName", () => {
    const matter = {
      id: "m4",
      internalCode: "INT-2024-004",
      title: "Matter 4",
      category: "CIVIL_COMMERCIAL" as const,
      status: "IN_PROGRESS" as const,
      intakeDate: null,
      cause: { name: "Divorce" },
      causeFreeText: null,
      owner: { name: "Jane Smith" },
    } as any;
    const result = toMatterInfo(matter, "CLIENT_PARTY", null);
    expect(result.intakeDate).toBeNull();
    expect(result.ownerName).toBe("Jane Smith");
  });
});

// ── pickSeverity Tests ────────────────────────────────────────────────────────────

describe("pickSeverity", () => {
  it("should return BLOCKING for OPPOSING_PARTY candidate vs CLIENT_PARTY history", () => {
    expect(pickSeverity("OPPOSING_PARTY", "CLIENT_PARTY")).toBe("BLOCKING");
  });

  it("should return HIGH for CLIENT_PARTY candidate vs OPPOSING_PARTY history", () => {
    expect(pickSeverity("CLIENT_PARTY", "OPPOSING_PARTY")).toBe("HIGH");
  });

  it("should return LOW for OPPOSING_PARTY vs OPPOSING_PARTY", () => {
    expect(pickSeverity("OPPOSING_PARTY", "OPPOSING_PARTY")).toBe("LOW");
  });

  it("should return LOW for CLIENT_PARTY vs CLIENT_PARTY", () => {
    expect(pickSeverity("CLIENT_PARTY", "CLIENT_PARTY")).toBe("LOW");
  });

  it("should return MEDIUM when either role is THIRD_PARTY", () => {
    expect(pickSeverity("THIRD_PARTY", "CLIENT_PARTY")).toBe("MEDIUM");
    expect(pickSeverity("CLIENT_PARTY", "THIRD_PARTY")).toBe("MEDIUM");
    expect(pickSeverity("THIRD_PARTY", "THIRD_PARTY")).toBe("MEDIUM");
  });

  it("should return MEDIUM for other role combinations", () => {
    expect(pickSeverity("AGENT", "WITNESS")).toBe("MEDIUM");
    expect(pickSeverity("CO_LITIGANT", "CLIENT_PARTY")).toBe("MEDIUM");
  });
});

// ── bumpSeverity Tests ────────────────────────────────────────────────────────────

describe("bumpSeverity", () => {
  it("should bump LOW to MEDIUM", () => {
    expect(bumpSeverity("LOW")).toBe("MEDIUM");
  });

  it("should bump MEDIUM to HIGH", () => {
    expect(bumpSeverity("MEDIUM")).toBe("HIGH");
  });

  it("should bump HIGH to BLOCKING", () => {
    expect(bumpSeverity("HIGH")).toBe("BLOCKING");
  });

  it("should keep BLOCKING at BLOCKING (max)", () => {
    expect(bumpSeverity("BLOCKING")).toBe("BLOCKING");
  });
});

// ── roleLabel Tests ───────────────────────────────────────────────────────────────

describe("roleLabel", () => {
  it("should label CLIENT_PARTY as 委托方", () => {
    expect(roleLabel("CLIENT_PARTY")).toBe("委托方");
  });

  it("should label OPPOSING_PARTY as 对方", () => {
    expect(roleLabel("OPPOSING_PARTY")).toBe("对方");
  });

  it("should label THIRD_PARTY as 第三人", () => {
    expect(roleLabel("THIRD_PARTY")).toBe("第三人");
  });

  it("should label CO_LITIGANT as 共同诉讼人", () => {
    expect(roleLabel("CO_LITIGANT")).toBe("共同诉讼人");
  });

  it("should label AGENT as 代理人", () => {
    expect(roleLabel("AGENT")).toBe("代理人");
  });

  it("should label WITNESS as 证人", () => {
    expect(roleLabel("WITNESS")).toBe("证人");
  });

  it("should label unknown roles as 当事人", () => {
    expect(roleLabel("UNKNOWN_ROLE" as any)).toBe("当事人");
  });
});

// ── runConflictCheck Tests ────────────────────────────────────────────────────────

describe("runConflictCheck", () => {
  const mockMatter = {
    id: "m1",
    internalCode: "INT-2024-001",
    title: "Test Matter",
    category: "CIVIL_COMMERCIAL" as const,
    status: "IN_PROGRESS" as const,
    intakeDate: new Date("2024-01-15"),
    cause: { name: "Contract Dispute" },
    causeFreeText: null,
    owner: { name: "John Doe" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.party.findMany.mockReset();
    mockPrisma.client.findMany.mockReset();
    // Default: empty array for any call
    mockPrisma.party.findMany.mockResolvedValue([]);
    mockPrisma.client.findMany.mockResolvedValue([]);
  });

  it("should return empty results for empty queries", async () => {
    const result = await runConflictCheck([]);
    expect(result.hits).toEqual([]);
    expect(result.sameNameClients).toEqual([]);
    expect(result.idMatchedClients).toEqual([]);
  });

  it("should skip query with no name or idNumber", async () => {
    const result = await runConflictCheck([{ role: "CLIENT_PARTY", name: "" }]);
    expect(result.hits).toEqual([]);
  });

  it("should find exact party name match and create BLOCKING hit", async () => {
    mockPrisma.party.findMany.mockResolvedValueOnce([
      {
        id: "p1",
        name: "Acme Corp",
        idNumber: null,
        role: "CLIENT_PARTY",
        standing: "PLAINTIFF" as const,
        matter: mockMatter,
      },
    ]).mockResolvedValueOnce([]); // fuzzy returns empty

    const result = await runConflictCheck([
      { role: "OPPOSING_PARTY", name: "Acme Corp" },
    ]);

    expect(result.hits).toHaveLength(1);
    expect(result.hits[0]).toMatchObject({
      hitType: "HISTORICAL_PARTY",
      targetId: "m1",
      matchedField: "name",
      matchedValue: "Acme Corp",
      severity: "BLOCKING", // OPPOSING_PARTY vs CLIENT_PARTY
      reason: expect.stringContaining("Trùng tên với 委托方「Acme Corp」trong案件「INT-2024-001」"),
    });
  });

  it("should find exact idNumber match and bump severity", async () => {
    mockPrisma.party.findMany.mockResolvedValueOnce([
      {
        id: "p1",
        name: "Acme Corp",
        idNumber: "123456",
        role: "CLIENT_PARTY",
        standing: null,
        matter: mockMatter,
      },
    ]).mockResolvedValueOnce([]);

    const result = await runConflictCheck([
      { role: "CLIENT_PARTY", name: "Acme Corp", idNumber: "123456" },
    ]);

    // Query has both name and idNumber; party matches both → 2 hits (name + id)
    expect(result.hits.length).toBeGreaterThanOrEqual(1);
    // Find the idNumber hit
    const idHit = result.hits.find(h => h.matchedField === "idNumber");
    expect(idHit).toBeDefined();
    expect(idHit!.severity).toBe("MEDIUM"); // bump from LOW
    expect(idHit!.matchedField).toBe("idNumber");
  });

  it("should find fuzzy name match (contains) and mark LOW severity", async () => {
    mockPrisma.party.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: "p1",
        name: "Acme Corporation",
        idNumber: null,
        role: "THIRD_PARTY",
        standing: null,
        matter: mockMatter,
      },
    ]);

    const result = await runConflictCheck([
      { role: "CLIENT_PARTY", name: "Acme" },
    ]);

    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].severity).toBe("LOW");
    expect(result.hits[0].matchedField).toBe("name");
    expect(result.hits[0].matchedRatio).toBeCloseTo(4 / 16, 2); // Acme / Acme Corporation
  });

  it("should deduplicate hits and keep highest severity", async () => {
    mockPrisma.party.findMany.mockResolvedValueOnce([
      {
        id: "p1",
        name: "Acme Corp",
        idNumber: null,
        role: "CLIENT_PARTY",
        standing: null,
        matter: mockMatter,
      },
    ]).mockResolvedValueOnce([]);
    mockPrisma.client.findMany.mockResolvedValue([]);

    const result = await runConflictCheck([
      { role: "OPPOSING_PARTY", name: "Acme Corp" }, // severity BLOCKING
      { role: "CLIENT_PARTY", name: "Acme Corp" }, // severity LOW
    ]);

    // Dedup by (targetId, matchedField, matchedValue)
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].severity).toBe("BLOCKING");
  });

  it("should sort hits by descending severity", async () => {
    const mockMatter2 = {
      ...mockMatter,
      id: "m2",
      internalCode: "INT-2024-002",
    };

    mockPrisma.party.findMany
      .mockResolvedValueOnce([ // exact Acme (CLIENT_PARTY)
        { id: "p1", name: "Acme Corp", idNumber: null, role: "CLIENT_PARTY", standing: null, matter: mockMatter },
      ])
      .mockResolvedValueOnce([]) // fuzzy Acme none
      .mockResolvedValueOnce([ // exact Beta (OPPOSING_PARTY)
        { id: "p2", name: "Beta Corp", idNumber: null, role: "OPPOSING_PARTY", standing: null, matter: mockMatter2 },
      ])
      .mockResolvedValueOnce([]); // fuzzy Beta none
    mockPrisma.client.findMany.mockResolvedValue([]);

    const result = await runConflictCheck([
      { role: "CLIENT_PARTY", name: "Acme Corp" }, // LOW
      { role: "CLIENT_PARTY", name: "Beta Corp" }, // HIGH (OPPOSING_PARTY history)
    ]);

    expect(result.hits).toHaveLength(2);
    expect(result.hits[0].severity).toBe("HIGH");
    expect(result.hits[1].severity).toBe("LOW");
  });
});
