import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveFirmProfileAction } from "@/server/settings/firm-profile-actions";
import { requireSession } from "@/lib/auth/session";
import { saveFirmProfile } from "@/server/settings/firm-profile";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/auth/session");
vi.mock("@/server/settings/firm-profile");
vi.mock("@/server/audit");
vi.mock("next/cache");

const mockRequireSession = vi.mocked(requireSession);
const mockSaveFirmProfile = vi.mocked(saveFirmProfile);
const mockAudit = vi.mocked(audit);
const mockRevalidatePath = vi.mocked(revalidatePath);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN", name: "Admin" } } as any);
});

describe("firm-profile-actions", () => {
  it("should save firm profile and audit", async () => {
    const input = {
      firmName: "Test Firm",
      firmSubtitle: "Legal Experts",
      matterCodePrefix: "TF",
      firmShortName: "TF",
      caseNoTemplate: "TF-{year}-{seq}",
      logoDataUrl: null,
      categoryWords: {}
    };
    mockSaveFirmProfile.mockResolvedValue(undefined);

    await saveFirmProfileAction(input as any);

    expect(mockSaveFirmProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        firmName: "Test Firm",
        firmSubtitle: "Legal Experts",
        matterCodePrefix: "TF",
        firmShortName: "TF",
        caseNoTemplate: "TF-{year}-{seq}"
      })
    );
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "FIRM_PROFILE_SAVE",
        targetType: "SystemSetting",
        targetId: "firmProfile"
      })
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("should reject non-admin", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER", name: "Lawyer" } } as any);
    await expect(saveFirmProfileAction({} as any)).rejects.toThrow("仅管理员可修改律所信息配置");
  });

  it("should validate logo data URL format", async () => {
    const input = { logoDataUrl: "data:image/png;base64,abc" } as any;
    await saveFirmProfileAction(input);
    expect(mockSaveFirmProfile).toHaveBeenCalled();
  });

  it("should reject invalid logo mime type", async () => {
    const input = { logoDataUrl: "data:text/plain;base64,abc" } as any;
    await expect(saveFirmProfileAction(input)).rejects.toThrow("Logo 必须是 PNG / JPG / WebP / SVG 图片");
  });

  it("should reject oversized logo", async () => {
    const bigBase64 = "data:image/png;base64," + "a".repeat(300 * 1024);
    const input = { logoDataUrl: bigBase64 } as any;
    await expect(saveFirmProfileAction(input)).rejects.toThrow("Logo 体积过大");
  });
});