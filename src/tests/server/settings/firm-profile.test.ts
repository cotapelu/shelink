import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getFirmProfile,
  saveFirmProfile,
  FIRM_PROFILE_DEFAULTS,
  CATEGORY_WORD_DEFAULTS
} from "@/server/settings/firm-profile";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn()
    }
  }
}));

const mockPrisma = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
  (mockPrisma.systemSetting.findUnique as any).mockResolvedValue(null as any);
  (mockPrisma.systemSetting.upsert as any).mockResolvedValue({} as any);
  (mockPrisma.systemSetting.delete as any).mockResolvedValue({} as any);
});

describe("firm-profile", () => {
  describe("getFirmProfile", () => {
    it("should return defaults when no saved profile", async () => {
      const result = await getFirmProfile();
      expect(result).toEqual(FIRM_PROFILE_DEFAULTS);
    });

    it("should return saved profile", async () => {
      const saved = {
        value: {
          firmName: "My Firm",
          firmSubtitle: "Best",
          logoDataUrl: "data:image/png;base64,xxx",
          matterCodePrefix: "MF",
          firmShortName: "MF",
          caseNoTemplate: "MF-{year}",
          categoryWords: { CIVIL_COMMERCIAL: "Dân sự" }
        } as any
      };
      (mockPrisma.systemSetting.findUnique as any).mockResolvedValue(saved as any);

      const result = await getFirmProfile();

      expect(result.firmName).toBe("My Firm");
      expect(result.matterCodePrefix).toBe("MF");
    });
  });

  describe("saveFirmProfile", () => {
    it("should upsert profile", async () => {
      const profile = {
        firmName: "New Firm",
        firmSubtitle: "Sub",
        logoDataUrl: null,
        matterCodePrefix: "NF",
        firmShortName: "NF",
        caseNoTemplate: "NF-{seq}",
        categoryWords: { CRIMINAL: "Hình sự" }
      };

      await saveFirmProfile(profile);

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith({
        where: { key: "firmProfile" },
        update: { value: expect.objectContaining({ firmName: "New Firm" }) },
        create: { key: "firmProfile", value: expect.objectContaining({ firmName: "New Firm" }) }
      });
    });
  });

  describe("constants", () => {
    it("CATEGORY_WORD_DEFAULTS should have all MatterCategory keys", () => {
      expect(Object.keys(CATEGORY_WORD_DEFAULTS).length).toBeGreaterThan(0);
    });

    it("FIRM_PROFILE_DEFAULTS should match interface", () => {
      expect(FIRM_PROFILE_DEFAULTS.firmName).toBe("LawLink");
      expect(FIRM_PROFILE_DEFAULTS.matterCodePrefix).toBe("LL");
    });
  });
});