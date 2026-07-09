import { describe, it, expect } from "vitest";
import { formatDisplayDate } from "./dateHelpers";

describe("formatDisplayDate", () => {
  it("returns 'Chưa rõ' when all parts are null", () => {
    expect(formatDisplayDate(null, null, null)).toBe("Chưa rõ");
  });

  it("formats day/month/year correctly", () => {
    expect(formatDisplayDate(2024, 5, 15)).toBe("15/05/2024");
    expect(formatDisplayDate(1990, 12, 1)).toBe("01/12/1990");
  });

  it("handles missing day", () => {
    expect(formatDisplayDate(2024, 5, null)).toBe("05/2024");
  });

  it("handles missing month", () => {
    expect(formatDisplayDate(2024, null, 15)).toBe("15/2024");
    expect(formatDisplayDate(2024, null, null)).toBe("2024");
  });

  it("handles missing year", () => {
    expect(formatDisplayDate(null, 5, 15)).toBe("15/05");
    expect(formatDisplayDate(null, 5, null)).toBe("05");
  });

  it("formats only day and month when year missing", () => {
    expect(formatDisplayDate(null, 7, 4)).toBe("04/07");
  });

  it("formats only month and year when day missing", () => {
    expect(formatDisplayDate(2022, 9, null)).toBe("09/2022");
  });

  it("pads day and month with leading zeros", () => {
    expect(formatDisplayDate(2023, 3, 5)).toBe("05/03/2023");
    expect(formatDisplayDate(2023, 10, 9)).toBe("09/10/2023");
  });
});
