import { categoryShort, nextArchiveNo } from "@/lib/archive/archive-no";
import type { MatterCategory } from "@prisma/client";

describe("archive-no utilities", () => {
  describe("categoryShort", () => {
    it("should return correct short name for each category", () => {
      expect(categoryShort("CIVIL_COMMERCIAL" as MatterCategory)).toBe("民");
      expect(categoryShort("LABOR_ARBITRATION" as MatterCategory)).toBe("劳");
      expect(categoryShort("COMMERCIAL_ARBITRATION" as MatterCategory)).toBe("商");
      expect(categoryShort("CRIMINAL" as MatterCategory)).toBe("刑");
      expect(categoryShort("ADMINISTRATIVE" as MatterCategory)).toBe("行");
      expect(categoryShort("NON_LITIGATION" as MatterCategory)).toBe("非");
      expect(categoryShort("LEGAL_COUNSEL" as MatterCategory)).toBe("顾");
      expect(categoryShort("SPECIAL_PROJECT" as MatterCategory)).toBe("专");
    });

    it("should return default '案' for unknown category", () => {
      // @ts-expect-error - testing unknown category
      expect(categoryShort("UNKNOWN" as MatterCategory)).toBe("案");
    });
  });

  describe("nextArchiveNo", () => {
    it("should generate first archive number of the year", async () => {
      const mockTx = {
        archiveRecord: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      };
      const result = await nextArchiveNo(mockTx, "CIVIL_COMMERCIAL" as MatterCategory, new Date(2025, 0, 1));
      expect(result).toBe("2025-民-0001");
    });

    it("should increment from existing max", async () => {
      const mockTx = {
        archiveRecord: {
          findMany: vi.fn().mockResolvedValue([
            { archiveNo: "2025-民-0010" },
          ]),
        },
      };
      const result = await nextArchiveNo(mockTx, "CIVIL_COMMERCIAL" as MatterCategory, new Date(2025, 0, 1));
      expect(result).toBe("2025-民-0011");
    });

    it("should handle malformed existing number by falling back to 1", async () => {
      const mockTx = {
        archiveRecord: {
          findMany: vi.fn().mockResolvedValue([
            { archiveNo: "malformed" },
          ]),
        },
      };
      const result = await nextArchiveNo(mockTx, "CIVIL_COMMERCIAL" as MatterCategory, new Date(2025, 0, 1));
      expect(result).toBe("2025-民-0001");
    });
  });
});
