import { describe, it, expect } from "vitest";
import {
  pendingHours,
  isOverSla,
  formatPending,
  canMove,
  INTAKE_STAGES
} from "./pipeline-lib";

const NOW = 1_700_000_000_000;
const HOUR = 3_600_000;

describe("pendingHours", () => {
  it("floors hours since receivedAt", () => {
    expect(pendingHours(new Date(NOW - 5 * HOUR - 1000), NOW)).toBe(5);
  });
  it("returns null for missing/invalid dates", () => {
    expect(pendingHours(null)).toBeNull();
    expect(pendingHours("not-a-date")).toBeNull();
  });
  it("never negative for future dates", () => {
    expect(pendingHours(new Date(NOW + HOUR), NOW)).toBe(0);
  });
});

describe("isOverSla", () => {
  it("true only above 24h", () => {
    expect(isOverSla(24)).toBe(false);
    expect(isOverSla(25)).toBe(true);
    expect(isOverSla(null)).toBe(false);
  });
});

describe("formatPending", () => {
  it("shows hours under a day and days/n above", () => {
    expect(formatPending(3)).toBe("3 giờ");
    expect(formatPending(26)).toBe("1n 2g");
    expect(formatPending(48)).toBe("2 ngày");
    expect(formatPending(null)).toBe("—");
  });
});

describe("canMove", () => {
  it("allows between working columns only", () => {
    expect(canMove("INTAKE", "PENDING_CONFIRMATION")).toBe(true);
    expect(canMove("PENDING_CONFIRMATION", "INTAKE")).toBe(true);
    expect(canMove("INTAKE", "INTAKE")).toBe(false);
    expect(canMove("NEEDS_REVISION", "INTAKE")).toBe(false);
    expect(canMove("INTAKE", "CONVERTED")).toBe(false);
  });
  it("marks only two stages droppable", () => {
    expect(INTAKE_STAGES.filter((s) => s.droppable).map((s) => s.key)).toEqual([
      "INTAKE",
      "PENDING_CONFIRMATION"
    ]);
  });
});
