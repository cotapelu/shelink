import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveExpressSettingsAction } from "@/server/express/actions";
import { requireSession } from "@/lib/auth/session";
import * as settings from "@/lib/express/settings";
import { audit } from "@/server/audit";

vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/express/settings", () => ({
  saveExpressSettings: vi.fn(),
  readPublicExpressSettings: vi.fn()
}));
vi.mock("@/server/audit", () => ({ audit: vi.fn().mockResolvedValue(undefined) }));

const mockRequireSession = vi.mocked(requireSession);
const mockSaveSettings = vi.mocked(settings.saveExpressSettings);
const mockAudit = vi.mocked(audit);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("saveExpressSettingsAction", () => {
  it("should throw if user is not admin", async () => {
    mockRequireSession.mockResolvedValue({ user: { role: "LAWYER" } } as any);

    await expect(saveExpressSettingsAction({})).rejects.toThrow(
      "仅管理员可修改快递接入配置"
    );
  });

  it("should save settings and audit for admin", async () => {
    mockRequireSession.mockResolvedValue({ user: { role: "ADMIN" } } as any);
    mockSaveSettings.mockResolvedValue({ ok: true });

    const result = await saveExpressSettingsAction({
      kdniaoEbusinessId: "test-eb",
      kdniaoAppKey: "test-app",
      kdniaoClearKey: true,
      kuaidi100Customer: "customer",
      kuaidi100Key: "key",
      kuaidi100ClearKey: false
    });

    expect(result).toEqual({ ok: true });
    expect(mockSaveSettings).toHaveBeenCalledWith({
      kdniaoEbusinessId: "test-eb",
      kdniaoAppKey: "test-app",
      kdniaoClearKey: true,
      kuaidi100Customer: "customer",
      kuaidi100Key: "key",
      kuaidi100ClearKey: false
    });
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "EXPRESS_SETTINGS_SAVE",
        targetType: "SystemSetting",
        targetId: "expressSettings"
      })
    );
  });

  it("should trim strings before saving", async () => {
    mockRequireSession.mockResolvedValue({ user: { role: "ADMIN" } } as any);
    mockSaveSettings.mockResolvedValue({ ok: true });

    await saveExpressSettingsAction({
      kdniaoEbusinessId: "  eb  ",
      kdniaoAppKey: "  app  ",
      kdniaoClearKey: true,
      kuaidi100Customer: "  cust  ",
      kuaidi100Key: "  key  ",
      kuaidi100ClearKey: false
    });

    expect(mockSaveSettings).toHaveBeenCalledWith({
      kdniaoEbusinessId: "eb",
      kdniaoAppKey: "app",
      kdniaoClearKey: true,
      kuaidi100Customer: "cust",
      kuaidi100Key: "key",
      kuaidi100ClearKey: false
    });
  });
});
