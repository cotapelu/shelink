import { describe, it, expect, vi, beforeEach } from "vitest";
import { getExpressSettingsPublic } from "@/server/express/actions";
import { requireSession } from "@/lib/auth/session";
import * as settings from "@/lib/express/settings";

vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/express/settings", () => ({
  readPublicExpressSettings: vi.fn()
}));

const mockRequireSession = vi.mocked(requireSession);
const mockReadPublic = vi.mocked(settings.readPublicExpressSettings);

beforeEach(() => {
  vi.clearAllMocks();
  mockReadPublic.mockResolvedValue({ provider: "MOCK", apiKey: "mock-key" } as any);
});

describe("express/actions - getExpressSettingsPublic", () => {
  it("should throw if user is not admin", async () => {
    mockRequireSession.mockResolvedValue({ user: { role: "LAWYER" } } as any);

    await expect(getExpressSettingsPublic()).rejects.toThrow(
      "仅管理员可修改快递接入配置"
    );
  });

  it("should return settings for admin user", async () => {
    mockRequireSession.mockResolvedValue({ user: { role: "ADMIN" } } as any);

    const result = await getExpressSettingsPublic();

    expect(result).toEqual({ provider: "MOCK", apiKey: "mock-key" });
    expect(mockReadPublic).toHaveBeenCalledTimes(1);
  });
});
