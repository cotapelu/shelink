import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchEnterpriseCandidates,
  getEnterpriseDetail,
  bindPartyToEnterprise,
  unbindPartyEnterprise,
  getEnterpriseSummaryByParty,
  type EnterpriseSearchItem
} from "@/server/yuandian/enterprise";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { getYuandianSettings } from "@/lib/yuandian/settings";
import {
  searchEnterpriseCandidates as clientSearch,
  getEnterpriseBaseInfo as clientDetail,
  getEnterpriseSummary as clientSummary,
  type MappedEnterpriseInfo,
  type EnterpriseSummary
} from "@/lib/yuandian/enterprise";
import { audit } from "@/server/audit";
import {
  assertCanAccessMatter,
  assertCanModifyMatter
} from "@/lib/permissions";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/yuandian/settings");
vi.mock("@/lib/yuandian/enterprise");
vi.mock("@/server/audit");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    causeOfAction: {
      findMany: vi.fn(),
      findUnique: vi.fn()
    },
    party: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));
vi.mock("@/lib/permissions");
vi.mock("next/cache");

const mockRequireSession = vi.mocked(requireSession);
const mockGetSettings = vi.mocked(getYuandianSettings);
const mockClientSearch = vi.mocked(clientSearch);
const mockClientDetail = vi.mocked(clientDetail);
const mockClientSummary = vi.mocked(clientSummary);
const mockAudit = vi.mocked(audit);
const mockPrismaParty = vi.mocked(prisma.party);
const mockAssertCanAccessMatter = vi.mocked(assertCanAccessMatter);
const mockAssertCanModifyMatter = vi.mocked(assertCanModifyMatter);
const mockRevalidatePath = vi.mocked(revalidatePath);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: "user-1" } } as any);
});

describe("server/yuandian/enterprise", () => {
  describe("searchEnterpriseCandidates", () => {
    it("should return empty when not configured", async () => {
      mockGetSettings.mockResolvedValue({ configured: false } as any);
      const result = await searchEnterpriseCandidates("test");
      expect(result).toEqual({ items: [], configured: false });
    });

    it("should return candidates when configured and clientSearch succeeds", async () => {
      mockGetSettings.mockResolvedValue({ configured: true } as any);
      const clientResult = [
        {
          id: "ent-1",
          "企业名称": "Test Co",
          "统一社会信用代码": "123456789012345678"
        }
      ] as any;
      mockClientSearch.mockResolvedValue(clientResult);

      const result = await searchEnterpriseCandidates("Test");

      expect(result.configured).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual<EnterpriseSearchItem>({
        id: "ent-1",
        name: "Test Co",
        creditCode: "123456789012345678"
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          action: "YUANDIAN_ENTERPRISE_SEARCH",
          detail: { query: "Test", hits: 1 }
        })
      );
    });

    it("should swallow errors and return configured:true with empty items", async () => {
      mockGetSettings.mockResolvedValue({ configured: true } as any);
      mockClientSearch.mockRejectedValue(new Error("API error"));
      const result = await searchEnterpriseCandidates("Test");
      expect(result).toEqual({ items: [], configured: true });
    });
  });

  describe("getEnterpriseDetail", () => {
    it("should return null info when not configured", async () => {
      mockGetSettings.mockResolvedValue({ configured: false } as any);
      const result = await getEnterpriseDetail("ent-1");
      expect(result).toEqual({ info: null, configured: false });
    });

    it("should return enterprise info when configured", async () => {
      mockGetSettings.mockResolvedValue({ configured: true } as any);
      const detail: MappedEnterpriseInfo = {
        id: "ent-1",
        name: "Test Co",
        creditCode: "123456..."
      } as any;
      mockClientDetail.mockResolvedValue(detail);

      const result = await getEnterpriseDetail("ent-1");
      expect(result).toEqual({ info: detail, configured: true });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "YUANDIAN_ENTERPRISE_DETAIL",
          detail: { enterpriseId: "ent-1", name: "Test Co", found: true }
        })
      );
    });
  });

  describe("bindPartyToEnterprise", () => {
    const input = {
      partyId: "party-1",
      enterpriseId: "ent-1",
      socialCode: "123456789012345678",
      enterpriseName: "Test Co"
    };

    it("should bind and audit when user has modify permission", async () => {
      mockPrismaParty.findUnique.mockResolvedValue({
        id: input.partyId,
        matterId: "matter-1",
        name: "Party A"
      } as any);
      mockPrismaParty.update.mockResolvedValue({ id: input.partyId } as any);
      mockAssertCanModifyMatter.mockResolvedValue(undefined as any);

      const result = await bindPartyToEnterprise(input);

      expect(result).toEqual({ ok: true });
      expect(mockPrismaParty.update).toHaveBeenCalledWith({
        where: { id: input.partyId },
        data: {
          enterpriseId: input.enterpriseId,
          enterpriseSocialCode: input.socialCode,
          enterpriseName: input.enterpriseName,
          enterpriseBoundAt: expect.any(Date)
        }
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "YUANDIAN_ENTERPRISE_BIND",
          targetId: input.partyId,
          detail: expect.objectContaining({
            matterId: "matter-1",
            enterpriseId: input.enterpriseId
          })
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/matter-1`);
    });

    it("should throw if party not found", async () => {
      mockPrismaParty.findUnique.mockResolvedValue(null);
      await expect(bindPartyToEnterprise(input)).rejects.toThrow("当事人不存在");
    });

    it("should throw if party not linked to matter", async () => {
      mockPrismaParty.findUnique.mockResolvedValue({
        id: input.partyId,
        matterId: null
      } as any);
      await expect(bindPartyToEnterprise(input)).rejects.toThrow("当事人未关联案件");
    });
  });

  describe("unbindPartyEnterprise", () => {
    it("should unbind when permission granted", async () => {
      mockPrismaParty.findUnique.mockResolvedValue({
        id: "party-1",
        matterId: "matter-1",
        name: "Party A"
      } as any);
      mockPrismaParty.update.mockResolvedValue({ id: "party-1" } as any);
      mockAssertCanModifyMatter.mockResolvedValue(undefined as any);

      const result = await unbindPartyEnterprise("party-1");
      expect(result).toEqual({ ok: true });
      expect(mockPrismaParty.update).toHaveBeenCalledWith({
        where: { id: "party-1" },
        data: {
          enterpriseId: null,
          enterpriseSocialCode: null,
          enterpriseName: null,
          enterpriseBoundAt: null
        }
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "YUANDIAN_ENTERPRISE_UNBIND",
          targetId: "party-1"
        })
      );
    });
  });

  describe("getEnterpriseSummaryByParty", () => {
    const party = {
      id: "party-1",
      matterId: "matter-1",
      enterpriseId: "ent-1",
      enterpriseSocialCode: null
    };

    it("should throw if party not bound to enterprise", async () => {
      mockPrismaParty.findUnique.mockResolvedValue({
        ...party,
        enterpriseId: null,
        enterpriseSocialCode: null
      } as any);
      await expect(
        getEnterpriseSummaryByParty("party-1")
      ).rejects.toThrow("此当事人尚未绑定元典企业");
    });

    it("should return configured:false when settings not configured", async () => {
      mockPrismaParty.findUnique.mockResolvedValue(party as any);
      mockGetSettings.mockResolvedValue({ configured: false } as any);
      mockAssertCanAccessMatter.mockResolvedValue(undefined as any);

      const result = await getEnterpriseSummaryByParty("party-1");
      expect(result).toEqual({ summary: null, configured: false });
    });

    it("should return summary when configured and accessible", async () => {
      mockPrismaParty.findUnique.mockResolvedValue(party as any);
      mockGetSettings.mockResolvedValue({ configured: true } as any);
      mockAssertCanAccessMatter.mockResolvedValue(undefined as any);
      const summary: EnterpriseSummary = {
        level: "LOW",
        coreRisks: [{ category: "legal", total: 0 }]
      } as any;
      mockClientSummary.mockResolvedValue(summary);

      const result = await getEnterpriseSummaryByParty("party-1");
      expect(result).toEqual({ summary, configured: true });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "YUANDIAN_ENTERPRISE_SUMMARY",
          targetId: "party-1",
          detail: expect.objectContaining({
            enterpriseId: "ent-1",
            level: "LOW"
          })
        })
      );
    });
  });
});
