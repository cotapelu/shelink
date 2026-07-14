import { describe, it, expect } from "vitest";
import { toMatterInfo } from "@/server/conflicts/algorithm";
import type { SelectedMatterInfo } from "@/server/conflicts/algorithm";

describe("toMatterInfo", () => {
  it("should map matter correctly with full data", () => {
    const matter: SelectedMatterInfo = {
      id: "m1",
      internalCode: "INT-2024-001",
      title: "Test Matter",
      category: "CIVIL_COMMERCIAL",
      status: "IN_PROGRESS",
      intakeDate: new Date("2024-01-15"),
      cause: { name: "Contract Dispute" },
      causeFreeText: null,
      owner: { name: "John Doe" },
    };
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
    const matter: SelectedMatterInfo = {
      id: "m2",
      internalCode: "INT-2024-002",
      title: "Matter 2",
      category: "CRIMINAL",
      status: "CLOSED",
      intakeDate: null,
      cause: null,
      causeFreeText: "Custom cause text",
      owner: { name: "John Doe" },
    };
    const result = toMatterInfo(matter, "OPPOSING_PARTY", null);
    expect(result.causeText).toBe("Custom cause text");
  });

  it("should return null when both cause.name and causeFreeText are null", () => {
    const matter: SelectedMatterInfo = {
      id: "m3",
      internalCode: "INT-2024-003",
      title: "Matter 3",
      category: "ADMINISTRATIVE",
      status: "PENDING_ACCEPTANCE",
      intakeDate: new Date(),
      cause: null,
      causeFreeText: null,
      owner: { name: "Jane Smith" },
    };
    const result = toMatterInfo(matter, "THIRD_PARTY", "THIRD_PARTY");
    expect(result.causeText).toBeNull();
  });

  it("should handle null intakeDate and default ownerName", () => {
    const matter: SelectedMatterInfo = {
      id: "m4",
      internalCode: "INT-2024-004",
      title: "Matter 4",
      category: "CIVIL_COMMERCIAL",
      status: "IN_PROGRESS",
      intakeDate: null,
      cause: { name: "Divorce" },
      causeFreeText: null,
      owner: { name: "Jane Smith" },
    };
    const result = toMatterInfo(matter, "CLIENT_PARTY", null);
    expect(result.intakeDate).toBeNull();
    expect(result.ownerName).toBe("Jane Smith");
  });
});
