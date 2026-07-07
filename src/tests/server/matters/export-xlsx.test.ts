// @ts-nocheck
import { describe, it, expect } from "vitest";
import { resolveMattersExportParams } from "@/server/matters/export-xlsx";

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
});
