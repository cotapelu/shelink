// @ts-nocheck
import { describe, it, expect } from "vitest";
import { resolveMattersExportParams, buildMattersExportWorkbook } from "@/server/matters/export-xlsx";

describe("resolveMattersExportParams", () => {
  it("should parse full params for active tab", () => {
    const params = new URLSearchParams();
    params.set("tab", "active");
    params.set("sortBy", "hearing");
    params.set("sortDir", "asc");

    const result = resolveMattersExportParams(params);

    expect(result.tab).toBe("active");
    expect(result.sortBy).toBe("hearing");
    expect(result.sortDir).toBe("asc");
    expect(result.search).toBeUndefined();
    expect(result.category).toBeUndefined();
  });

  it("should normalize hearing to intakeDate for intake tab", () => {
    const params = new URLSearchParams();
    params.set("tab", "intake");
    params.set("sortBy", "hearing"); // not allowed for intake
    params.set("sortDir", "desc");

    const result = resolveMattersExportParams(params);

    expect(result.tab).toBe("intake");
    expect(result.sortBy).toBe("intakeDate"); // normalized
  });

  it("should parse category and status", () => {
    const params = new URLSearchParams();
    params.set("tab", "active");
    params.set("category", "CIVIL_COMMERCIAL");
    params.set("status", "IN_PROGRESS");

    const result = resolveMattersExportParams(params);

    expect(result.category).toBe("CIVIL_COMMERCIAL");
    expect(result.status).toBe("IN_PROGRESS");
  });

  it("should default to active tab when missing", () => {
    const params = new URLSearchParams();
    params.set("sortBy", "claimAmount");

    const result = resolveMattersExportParams(params);

    expect(result.tab).toBe("active");
    expect(result.sortBy).toBe("claimAmount");
  });

  it("should trim and clean search text", () => {
    const params = new URLSearchParams();
    params.set("tab", "all");
    params.set("search", "  test query  ");

    const result = resolveMattersExportParams(params);

    expect(result.search).toBe("test query");
  });

  describe("edge cases and defaults", () => {
    it("should default tab to 'active' when invalid", () => {
      const params = new URLSearchParams("tab=invalid");
      const result = resolveMattersExportParams(params);
      expect(result.tab).toBe("active");
    });

    it("should accept all valid tab values", () => {
      const tabs = ["intake", "active", "archived", "revision", "all"] as const;
      tabs.forEach(tab => {
        const params = new URLSearchParams(`tab=${tab}`);
        expect(resolveMattersExportParams(params).tab).toBe(tab);
      });
    });

    it("should normalize sortBy to default for tab when invalid", () => {
      const params = new URLSearchParams("tab=active&sortBy=invalid");
      const result = resolveMattersExportParams(params);
      // defaultSortByForTab('active') returns 'hearing'
      expect(result.sortBy).toBe("hearing");
    });

    it("should keep sortBy when valid for tab", () => {
      const params = new URLSearchParams("tab=active&sortBy=hearing");
      expect(resolveMattersExportParams(params).sortBy).toBe("hearing");
      const params2 = new URLSearchParams("tab=intake&sortBy=intakeDate");
      expect(resolveMattersExportParams(params2).sortBy).toBe("intakeDate");
    });

    it("should set category to undefined when invalid", () => {
      const params = new URLSearchParams("category=INVALID");
      expect(resolveMattersExportParams(params).category).toBeUndefined();
    });

    it("should accept valid categories", () => {
      const valid = [
        "CIVIL_COMMERCIAL",
        "LABOR_ARBITRATION",
        "COMMERCIAL_ARBITRATION",
        "CRIMINAL",
        "ADMINISTRATIVE",
        "NON_LITIGATION",
        "LEGAL_COUNSEL",
        "SPECIAL_PROJECT"
      ] as const;
      valid.forEach(cat => {
        const params = new URLSearchParams(`category=${cat}`);
        expect(resolveMattersExportParams(params).category).toBe(cat);
      });
    });

    it("should set status to undefined when missing", () => {
      const params = new URLSearchParams();
      expect(resolveMattersExportParams(params).status).toBeUndefined();
    });

    it("should clean status text", () => {
      const params = new URLSearchParams("status=  in_progress  ");
      expect(resolveMattersExportParams(params).status).toBe("in_progress");
    });

    it("should return undefined for non-date format", () => {
      const params = new URLSearchParams("from=not-a-date");
      expect(resolveMattersExportParams(params).from).toBeUndefined();
    });

    it("should accept date in YYYY-MM-DD format even if semantically invalid", () => {
      // cleanDateText only checks format, not validity of month/day
      const params = new URLSearchParams("from=2025-13-01");
      expect(resolveMattersExportParams(params).from).toBe("2025-13-01");
    });

    it("should default sortDir to 'desc' when not 'asc'", () => {
      const params = new URLSearchParams("sortDir=desc");
      expect(resolveMattersExportParams(params).sortDir).toBe("desc");
      const params2 = new URLSearchParams("sortDir="); // empty
      expect(resolveMattersExportParams(params2).sortDir).toBe("desc");
    });

    it("should accept 'asc' sortDir", () => {
      const params = new URLSearchParams("sortDir=asc");
      expect(resolveMattersExportParams(params).sortDir).toBe("asc");
    });
  });
});

describe("buildMattersExportWorkbook", () => {
  const mockUser: ExportUser = { id: "u1", role: "LAWYER" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.intake).findMany = vi.fn();
    vi.mocked(prisma.matter).findMany = vi.fn();
    vi.mocked(prisma.user).findMany = vi.fn();
  });

  it("handles empty intake tab with no data", async () => {
    vi.mocked(prisma.intake).findMany.mockResolvedValue([]);

    const result = await buildMattersExportWorkbook(
      { tab: "intake", sortBy: "intakeDate", sortDir: "desc" },
      mockUser
    );

    expect(result.total).toBe(0);
    expect(result.filename).toContain("intake");
    expect(result.tabLabel).toBe("Chờ duyệt");
    expect(prisma.intake.findMany).toHaveBeenCalledTimes(1);
  });

  it("handles empty active tab with no matters", async () => {
    vi.mocked(prisma.matter).findMany.mockResolvedValue([]);

    const result = await buildMattersExportWorkbook(
      { tab: "active", sortBy: "hearing", sortDir: "asc" },
      mockUser
    );

    expect(result.total).toBe(0);
    expect(result.filename).toContain("active");
    expect(result.tabLabel).toBe("Đang xử lý");
    expect(prisma.matter.findMany).toHaveBeenCalledTimes(1);
  });

  it("propagates prisma errors on intake tab", async () => {
    const mockError = new Error("DB failure");
    vi.mocked(prisma.intake).findMany.mockRejectedValue(mockError);

    await expect(
      buildMattersExportWorkbook(
        { tab: "intake", sortBy: "intakeDate", sortDir: "desc" },
        mockUser
      )
    ).rejects.toThrow("DB failure");
  });

  it("propagates prisma errors on active tab", async () => {
    const mockError = new Error("DB failure");
    vi.mocked(prisma.matter).findMany.mockRejectedValue(mockError);

    await expect(
      buildMattersExportWorkbook(
        { tab: "active", sortBy: "hearing", sortDir: "asc" },
        mockUser
      )
    ).rejects.toThrow("DB failure");
  });

  it("handles revision tab same as intake", async () => {
    vi.mocked(prisma.intake).findMany.mockResolvedValue([]);

    const result = await buildMattersExportWorkbook(
      { tab: "revision", sortBy: "intakeDate", sortDir: "desc" },
      mockUser
    );

    expect(result.total).toBe(0);
    expect(result.tabLabel).toBe("Chờ bổ sung");
  });

  it("handles archived tab with no data", async () => {
    vi.mocked(prisma.matter).findMany.mockResolvedValue([]);

    const result = await buildMattersExportWorkbook(
      { tab: "archived", sortBy: "intakeDate", sortDir: "desc" },
      mockUser
    );

    expect(result.total).toBe(0);
 expect(result.tabLabel).toBe("Đã lưu trữ");
    expect(prisma.matter.findMany).toHaveBeenCalledTimes(1);
  });

  it("handles all tab with no data", async () => {
    vi.mocked(prisma.matter).findMany.mockResolvedValue([]);

    const result = await buildMattersExportWorkbook(
      { tab: "all", sortBy: "intakeDate", sortDir: "desc" },
      mockUser
    );

    expect(result.total).toBe(0);
    expect(result.tabLabel).toBe("Tất cả vụ án");
    // all tab queries matters without archive filter
    expect(prisma.matter.findMany).toHaveBeenCalledTimes(1);
  });
});

