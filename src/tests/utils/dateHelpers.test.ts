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
