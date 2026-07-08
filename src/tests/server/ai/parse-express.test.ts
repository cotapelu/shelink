// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseExpressLabel } from "@/server/ai/parse-express";
import { requireSession } from "@/lib/auth/session";
import { aiVision, extractJson, AiNotConfiguredError } from "@/lib/ai/client";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/ai/client");

const mockRequireSession = vi.mocked(requireSession);
const mockAiVision = vi.mocked(aiVision);
const mockExtractJson = vi.mocked(extractJson);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: "u1" } } as any);
});

describe("parseExpressLabel", () => {
  it("should parse valid image and return trackingNo and companyCode", async () => {
    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
    const form = new FormData();
    form.append("file", file);

    mockAiVision.mockResolvedValue({
      content: '{"trackingNo": "1234567890", "companyCode": "顺丰速运"}'
    } as any);
    mockExtractJson.mockReturnValue({
      trackingNo: "1234567890",
      companyCode: "顺丰速运"
    } as any);

    const result = await parseExpressLabel(form);

    expect(result).toEqual({
      trackingNo: "1234567890",
      companyCode: "顺丰速运"
    });
    expect(mockAiVision).toHaveBeenCalled();
  });

  it("should return null fields when AI returns null", async () => {
    const file = new File(["dummy"], "test.png", { type: "image/png" });
    const form = new FormData();
    form.append("file", file);

    mockAiVision.mockResolvedValue({
      content: '{"trackingNo": null, "companyCode": null}'
    } as any);
    mockExtractJson.mockReturnValue({
      trackingNo: null,
      companyCode: null
    } as any);

    const result = await parseExpressLabel(form);

    expect(result).toEqual({
      trackingNo: null,
      companyCode: null
    });
  });

  it("should throw error for unsupported file type", async () => {
    const file = new File(["dummy"], "test.txt", { type: "text/plain" });
    const form = new FormData();
    form.append("file", file);

    await expect(parseExpressLabel(form)).rejects.toThrow("仅支持图片格式");
  });

  it("should throw error for file too large", async () => {
    const largeContent = "a".repeat(11 * 1024 * 1024); // 11MB
    const file = new File([largeContent], "large.jpg", { type: "image/jpeg" });
    const form = new FormData();
    form.append("file", file);

    await expect(parseExpressLabel(form)).rejects.toThrow("超过 10MB");
  });

  it("should throw AiNotConfiguredError when AI not configured", async () => {
    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
    const form = new FormData();
    form.append("file", file);

    mockAiVision.mockRejectedValue(new AiNotConfiguredError("AI not configured"));

    await expect(parseExpressLabel(form)).rejects.toThrow(AiNotConfiguredError);
  });

  it("should throw generic error on vision failure", async () => {
    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
    const form = new FormData();
    form.append("file", file);

    mockAiVision.mockRejectedValue(new Error("network error") as any);

    await expect(parseExpressLabel(form)).rejects.toThrow("network error");
  });
});
