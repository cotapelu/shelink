import { describe, it, expect, vi, beforeEach } from "vitest";
import { getLunarDateString } from "@/utils/dateHelpers";

vi.mock("lunar-javascript", () => ({
  Solar: {
    fromYmd: vi.fn()
  }
}));

import { Solar } from "lunar-javascript";

describe("getLunarDateString", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null if year, month, or day is null", () => {
    expect(getLunarDateString(null, 1, 1)).toBeNull();
    expect(getLunarDateString(2025, null, 1)).toBeNull();
    expect(getLunarDateString(2025, 1, null)).toBeNull();
  });

  it("formats non-leap lunar date correctly", () => {
    const mockLunar = {
      getDay: () => 15,
      getMonth: () => 6, // positive
      getYear: () => 2025
    };
    (Solar.fromYmd as any).mockReturnValue({
      getLunar: () => mockLunar
    });

    const result = getLunarDateString(2025, 7, 20);
    expect(result).toBe("15/06/2025");
  });

  it("formats leap lunar date with nhuận suffix", () => {
    const mockLunar = {
      getDay: () => 5,
      getMonth: () => -4, // negative indicates leap
      getYear: () => 2025
    };
    (Solar.fromYmd as any).mockReturnValue({
      getLunar: () => mockLunar
    });

    const result = getLunarDateString(2025, 5, 10);
    expect(result).toBe("05/04 nhuận/2025");
  });

  it("returns null on conversion error", () => {
    (Solar.fromYmd as any).mockImplementation(() => {
      throw new Error("conversion error");
    });

    const result = getLunarDateString(2025, 7, 20);
    expect(result).toBeNull();
  });
});
