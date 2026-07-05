import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAiSettingsPublic,
  saveAiSettingsAction,
  clearAiKeyAction,
  testAiConnection
} from "@/server/settings/ai-actions";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import {
  saveAiSettings as saveSettings,
  readPublicAiSettings
} from "@/lib/ai/settings";
import { aiChat, AiNotConfiguredError } from "@/lib/ai/client";

vi.mock("@/lib/auth/session");
vi.mock("@/server/audit");
vi.mock("@/lib/ai/settings");
vi.mock("@/lib/ai/client");

const mockRequireSession = vi.mocked(requireSession);
const mockAudit = vi.mocked(audit);
const mockSaveSettings = vi.mocked(saveSettings);
const mockReadPublicAiSettings = vi.mocked(readPublicAiSettings);
const mockAiChat = vi.mocked(aiChat);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: "u1", role: "ADMIN", name: "Admin" }
  } as any);
});

describe("ai-actions", () => {
  describe("getAiSettingsPublic", () => {
    it("should return public settings as admin", async () => {
      mockReadPublicAiSettings.mockResolvedValue({ apiKeyPresent: true, baseUrl: "https://api.example.com" } as any);
      const result = await getAiSettingsPublic();
      expect(result).toEqual({ apiKeyPresent: true, baseUrl: "https://api.example.com" });
      expect(mockReadPublicAiSettings).toHaveBeenCalled();
    });

    it("should reject non-admin", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u2", role: "LAWYER", name: "User" }
      } as any);
      await expect(getAiSettingsPublic()).rejects.toThrow("仅管理员可修改 AI 配置");
    });
  });

  describe("saveAiSettingsAction", () => {
    it("should save settings and audit", async () => {
      mockSaveSettings.mockResolvedValue(undefined as any);
      const input = {
        apiKey: "sk-123",
        baseUrl: "https://api.example.com",
        textModel: "gpt-4",
        visionModel: ""
      };
      const result = await saveAiSettingsAction(input as any);
      expect(result).toEqual({ ok: true });
      expect(mockSaveSettings).toHaveBeenCalledWith({
        apiKey: "sk-123",
        baseUrl: "https://api.example.com",
        textModel: "gpt-4",
        visionModel: undefined // empty string becomes undefined
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "AI_SETTINGS_SAVE",
          targetType: "SystemSetting",
          targetId: "aiSettings",
          detail: expect.objectContaining({
            changedKey: true,
            baseUrl: "https://api.example.com",
            textModel: "gpt-4"
          })
        })
      );
    });

    it("should trim empty strings to undefined", async () => {
      mockSaveSettings.mockResolvedValue(undefined as any);
      await saveAiSettingsAction({
        apiKey: "",
        baseUrl: "",
        textModel: "  ",
        visionModel: "  "
      } as any);
      expect(mockSaveSettings).toHaveBeenCalledWith({
        apiKey: undefined,
        baseUrl: undefined,
        textModel: undefined,
        visionModel: undefined
      });
    });

    it("should reject non-admin", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u2", role: "LAWYER", name: "User" }
      } as any);
      await expect(saveAiSettingsAction({} as any)).rejects.toThrow("仅管理员可修改 AI 配置");
    });
  });

  describe("clearAiKeyAction", () => {
    it("should clear key", async () => {
      mockSaveSettings.mockResolvedValue(undefined as any);
      await clearAiKeyAction({ confirm: true });
      expect(mockSaveSettings).toHaveBeenCalledWith({ clearKey: true });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "AI_SETTINGS_CLEAR_KEY",
          targetType: "SystemSetting",
          targetId: "aiSettings"
        })
      );
    });

    it("should reject non-admin", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u2", role: "LAWYER", name: "User" }
      } as any);
      await expect(clearAiKeyAction({ confirm: true } as any)).rejects.toThrow("仅管理员可修改 AI 配置");
    });
  });

  describe("testAiConnection", () => {
    it("should succeed with pong reply", async () => {
      mockAiChat.mockResolvedValue({ content: "pong" } as any);
      const result = await testAiConnection();
      expect(result).toEqual({ ok: true, reply: "pong" });
      expect(mockAiChat).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "system" }),
            expect.objectContaining({ role: "user", content: "ping" })
          ]),
          maxTokens: 10,
          temperature: 0,
          timeoutMs: 10000
        })
      );
    });

    it("should return error on AiNotConfiguredError", async () => {
      mockAiChat.mockRejectedValue(new AiNotConfiguredError());
      const result = await testAiConnection();
      expect(result.ok).toBe(false);
      expect(result).toHaveProperty("message");
    });

    it("should handle generic error", async () => {
      mockAiChat.mockRejectedValue(new Error("timeout"));
      const result = await testAiConnection();
      expect(result.ok).toBe(false);
      expect(result.message).toBe("timeout");
    });

    it("should reject non-admin", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u2", role: "LAWYER", name: "User" }
      } as any);
      await expect(testAiConnection()).rejects.toThrow("仅管理员可修改 AI 配置");
    });
  });
});