import {
  formatDisplayDate,
  calculateAge,
  getZodiacSign,
  getZodiacAnimal
} from "@/utils/dateHelpers";

describe("dateHelpers", () => {
  describe("formatDisplayDate", () => {
    it("should format date in Vietnamese format (day/month/year)", () => {
      // month=5 => May => "05"
      expect(formatDisplayDate(2023, 5, 15)).toBe("15/05/2023");
    });

    it("should handle null gracefully", () => {
      expect(formatDisplayDate(null, null, null)).toBe("Chưa rõ");
    });

    it("should format with only day and month", () => {
      expect(formatDisplayDate(null, 12, 25)).toBe("25/12");
    });

    it("should format with only year and month", () => {
      expect(formatDisplayDate(2024, 1, null)).toBe("01/2024");
    });

    it("should format with only year", () => {
      expect(formatDisplayDate(2025, null, null)).toBe("2025");
    });

    it("should format with day only", () => {
      expect(formatDisplayDate(null, null, 7)).toBe("07");
    });

    it("should handle zeros as falsy (no value)", () => {
      expect(formatDisplayDate(0, 0, 0)).toBe("Chưa rõ");
    });
  });

  describe("calculateAge", () => {
    it("should calculate age from deathYear", () => {
      const result = calculateAge(1990, 2023);
      expect(result).toEqual({ age: 33, isDeceased: true });
    });

    it("should mark deceased when deathYear provided and older", () => {
      const result = calculateAge(1990, 2010);
      expect(result).toEqual({ age: 20, isDeceased: true });
    });

    it("should return null if no birthYear", () => {
      expect(calculateAge(null)).toBeNull();
    });

    it("should calculate current age using current year when deathYear omitted", () => {
      const currentYear = new Date().getFullYear();
      const result = calculateAge(1990);
      expect(result).toEqual({ age: currentYear - 1990, isDeceased: false });
    });
  });

  describe("getZodiacSign", () => {
    it("should return Aries for March 21 - April 19", () => {
      expect(getZodiacSign(21, 3)).toBe("Bạch Dương");
      expect(getZodiacSign(19, 4)).toBe("Bạch Dương");
    });

    it("should return Cancer for June 22 - July 22", () => {
      expect(getZodiacSign(22, 6)).toBe("Cự Giải");
      expect(getZodiacSign(22, 7)).toBe("Cự Giải");
    });

    it("should return null for invalid date", () => {
      expect(getZodiacSign(null, null)).toBeNull();
    });

    // Boundary tests for all 12 signs
    it("should return Pisces for Feb 19 - Mar 20", () => {
      expect(getZodiacSign(19, 2)).toBe("Song Ngư");
      expect(getZodiacSign(20, 3)).toBe("Song Ngư");
    });

    it("should return Taurus for Apr 20 - May 20", () => {
      expect(getZodiacSign(20, 4)).toBe("Kim Ngưu");
    });

    it("should return Gemini for May 21 - Jun 20", () => {
      expect(getZodiacSign(21, 5)).toBe("Song Tử");
    });

    it("should return Leo for Jul 23 - Aug 22", () => {
      expect(getZodiacSign(23, 7)).toBe("Sư Tử");
    });

    it("should return Virgo for Aug 23 - Sep 22", () => {
      expect(getZodiacSign(23, 8)).toBe("Xử Nữ");
    });

    it("should return Libra for Sep 23 - Oct 22", () => {
      expect(getZodiacSign(23, 9)).toBe("Thiên Bình");
    });

    it("should return Scorpio for Oct 24 - Nov 21", () => {
      expect(getZodiacSign(24, 10)).toBe("Thiên Yết");
      expect(getZodiacSign(21, 11)).toBe("Thiên Yết");
    });

    it("should return Sagittarius for Nov 22 - Dec 21", () => {
      expect(getZodiacSign(22, 11)).toBe("Nhân Mã");
    });

    it("should return Capricorn for Dec 22 - Jan 19", () => {
      expect(getZodiacSign(22, 12)).toBe("Ma Kết");
      expect(getZodiacSign(19, 1)).toBe("Ma Kết");
    });

    it("should return Aquarius for Jan 20 - Feb 18", () => {
      expect(getZodiacSign(20, 1)).toBe("Bảo Bình");
    });
  });

  describe("getZodiacAnimal", () => {
    it("should return correct animal for year (solar year)", () => {
      expect(getZodiacAnimal(2023)).toBe("Mão"); // Rabbit
      expect(getZodiacAnimal(2024)).toBe("Thìn"); // Dragon
      expect(getZodiacAnimal(1990)).toBe("Ngọ"); // Horse (1990 % 12 = 10)
    });

    it("should use lunar year when month/day provided", () => {
      // 2023-01-01 solar corresponds to lunar year 2022 (Dần)
      expect(getZodiacAnimal(2023, 1, 1)).toBe("Dần");
    });
  });
});
