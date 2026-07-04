// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIntakeFormStates } from "./use-intake-form-states";
import { useWatch } from "react-hook-form";

// Mock useWatch
vi.mock("react-hook-form", () => ({
  useWatch: vi.fn()
}));

describe("useIntakeFormStates", () => {
  const mockControl = {};

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default category CIVIL_COMMERCIAL when undefined", () => {
    vi.mocked(useWatch).mockImplementation(({ name }) => {
      if (name === "category") return undefined;
      return undefined;
    });

    const { result } = renderHook(() => useIntakeFormStates(mockControl));
    expect(result.current.category).toBe("CIVIL_COMMERCIAL");
  });

  it("returns watched category when defined", () => {
    vi.mocked(useWatch).mockImplementation(({ name }) => {
      if (name === "category") return "LABOR_ARBITRATION";
      return undefined;
    });

    const { result } = renderHook(() => useIntakeFormStates(mockControl));
    expect(result.current.category).toBe("LABOR_ARBITRATION");
  });

  it("returns undefined for firstProcedureType when not set", () => {
    vi.mocked(useWatch).mockReturnValue(undefined);

    const { result } = renderHook(() => useIntakeFormStates(mockControl));
    expect(result.current.firstProcedureType).toBeUndefined();
  });

  it("returns watched values for all fields", () => {
    vi.mocked(useWatch).mockImplementation(({ name }) => {
      const values: Record<string, any> = {
        category: "CIVIL_COMMERCIAL",
        firstProcedureType: "SUIT",
        clientId: "client-123",
        feeType: "FIXED",
        ownerUserId: "user-1",
        coUserIds: ["u2", "u3"],
        receivedAt: new Date(),
        jurisdiction: "北京市",
        firstAgency: "Court A",
        barFiling: "YES",
        counterclaim: true,
        ourStanding: "PLAINTIFF",
        businessType: "COMMERCIAL",
        serviceStart: "2024-01-01",
        serviceEnd: "2024-12-31",
        counselType: "FULL_TIME",
        parties: [{ role: "CLIENT_PARTY", name: "Alice" }],
        title: "Test Title",
        causeFreeText: "Contract dispute",
        claimAmount: 100000,
        claimDescription: "Description",
        causeId: "cause-1"
      };
      return values[name];
    });

    const { result } = renderHook(() => useIntakeFormStates(mockControl));
    expect(result.current.clientId).toBe("client-123");
    expect(result.current.feeType).toBe("FIXED");
    expect(result.current.ownerUserId).toBe("user-1");
    expect(result.current.coUserIds).toEqual(["u2", "u3"]);
    expect(result.current.jurisdiction).toBe("北京市");
    expect(result.current.counterclaim).toBe(true);
    expect(result.current.claimAmount).toBe(100000);
  });
});
