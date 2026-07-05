import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchSimilarCases,
  searchSimilarCasesByVector
} from "@/server/yuandian/cases";
import { requireSession } from "@/lib/auth/session";
import { getYuandianSettings } from "@/lib/yuandian/settings";
import { audit } from "@/server/audit";
import {
  searchPtalCases,
  searchCasesByVector,
  YuandianNotConfiguredError,
  buildCaseDetailUrl,
  buildVectorCaseDetailUrl
} from "@/lib/yuandian/client";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/yuandian/settings");
vi.mock("@/server/audit");
vi.mock("@/lib/yuandian/client", async () => {
  const actual = await vi.importActual("@/lib/yuandian/client");
  return {
    ...actual,
    searchPtalCases: vi.fn(),
    searchCasesByVector: vi.fn()
  };
});

const mockRequireSession = vi.mocked(requireSession);
const mockGetYuandianSettings = vi.mocked(getYuandianSettings);
const mockClientSearch = vi.mocked(searchPtalCases);
const mockSearchCasesByVector = vi.mocked(searchCasesByVector);
const mockAudit = vi.mocked(audit);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: "u1", role: "LAWYER", name: "User" }
  } as any);
  mockGetYuandianSettings.mockResolvedValue({
    configured: true,
    caseDetailHost: "https://example.com"
  } as any);
});

describe("yuandian cases", () => {
  describe("searchSimilarCases", () => {
    it("should search and map items with detailUrl", async () => {
      const mockResponse = {
        total: 1,
        items: [
          {
            id: "case1",
            title: "Case Title",
            url: "/case/123",
            // other fields...
          }
        ] as any,
        pointsCharged: 10
      };
      mockClientSearch.mockResolvedValueOnce(mockResponse as any);

      const result = await searchSimilarCases({
        ay: ["CIVIL"],
        qw: "contract",
        xzqh_p: "BEIJING"
      });

      expect(result.total).toBe(1);
      expect(result.pointsCharged).toBe(10);
      expect(result.items).toHaveLength(1);
      const item = result.items[0];
      expect(item.id).toBe("case1");
      expect(item.title).toBe("Case Title");
      // url should be removed, detailUrl added
      expect(item).not.toHaveProperty("url");
      expect(item.detailUrl).toBe("https://example.com/case/123");
      // audit
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "YUANDIAN_CASE_SEARCH",
          targetType: "SystemSetting",
          targetId: "yuandianSettings"
        })
      );
    });

    it("should include matterId in audit when provided", async () => {
      mockClientSearch.mockResolvedValueOnce({ total: 0, items: [], pointsCharged: 0 } as any);

      await searchSimilarCases({
        ay: [],
        xzqh_p: "",
        matterId: "m123"
      });

      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          targetType: "Matter",
          targetId: "m123"
        })
      );
    });

    it("should throw if not configured", async () => {
      mockGetYuandianSettings.mockResolvedValueOnce({ configured: false } as any);
      await expect(searchSimilarCases({ ay: [], xzqh_p: "" } as any)).rejects.toThrow(YuandianNotConfiguredError);
    });
  });

  describe("searchSimilarCasesByVector", () => {
    it("should search vector and map items", async () => {
      const mockResponse = {
        total: 1,
        items: [
          {
            scid: "v1",
            title: "Vector Case",
            score: 0.95
          }
        ] as any,
        pointsCharged: 10
      };
      mockSearchCasesByVector.mockResolvedValueOnce(mockResponse as any);

      const result = await searchSimilarCasesByVector({
        content: "contract dispute",
        limit: 5
      });

      expect(result.items).toHaveLength(1);
      const item = result.items[0];
      expect(item.scid).toBe("v1");
      expect(item.title).toBe("Vector Case");
      expect(item.detailUrl).toBe("https://example.com/ydzk/caseDetail/case/v1");
      // audit
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "YUANDIAN_CASE_VECTOR_SEARCH",
          targetType: "SystemSetting"
        })
      );
    });

    it("should throw if not configured", async () => {
      mockGetYuandianSettings.mockResolvedValueOnce({ configured: false } as any);
      await expect(searchSimilarCasesByVector({ content: "test" } as any)).rejects.toThrow(YuandianNotConfiguredError);
    });
  });
});