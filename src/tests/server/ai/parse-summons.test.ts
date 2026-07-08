// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseSummons } from "@/server/ai/parse-summons";
import { requireSession } from "@/lib/auth/session";
import { aiVision, extractJson, AiNotConfiguredError } from "@/lib/ai/client";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/ai/client");

const mockRequireSession = vi.mocked(requireSession);
const mockAiVision = vi.mocked(aiVision);
const mockExtractJson = vi.mocked(extractJson);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: "u1" } });
});

describe("parseSummons", () => {
  it("should parse valid summons image and return all fields", async () => {
    const file = new File(["dummy"], "summons.jpg", { type: "image/jpeg" });
    const form = new FormData();
    form.append("file", file);

    mockAiVision.mockResolvedValue({
      content: JSON.stringify({
        hearingDate: "2024-06-15",
        hearingTime: "09:00",
        courtRoom: "第三法庭",
        caseNumber: "(2024)京0105民初1234号",
        judge: "张三",
        parties: ["李四", "王五"]
      })
    });
    mockExtractJson.mockReturnValue({
      hearingDate: "2024-06-15",
      hearingTime: "09:00",
      courtRoom: "第三法庭",
      caseNumber: "(2024)京0105民初1234号",
      judge: "张三",
      parties: ["李四", "王五"]
    });

    const result = await parseSummons(form);

    expect(result).toEqual({
      hearingDate: "2024-06-15",
      hearingTime: "09:00",
      courtRoom: "第三法庭",
      caseNumber: "(2024)京0105民初1234号",
      judge: "张三",
      parties: ["李四", "王五"]
    });
    expect(mockAiVision).toHaveBeenCalled();
  });

  it("should return null fields when AI returns null values", async () => {
    const file = new File(["dummy"], "summons.png", { type: "image/png" });
    const form = new FormData();
    form.append("file", file);

    mockAiVision.mockResolvedValue({
      content: "{\"hearingDate\": null, \"hearingTime\": null, \"courtRoom\": null, \"caseNumber\": null, \"judge\": null, \"parties\": null}"
    });
    mockExtractJson.mockReturnValue({
      hearingDate: null,
      hearingTime: null,
      courtRoom: null,
      caseNumber: null,
      judge: null,
      parties: null
    });

    const result = await parseSummons(form);

    expect(result).toEqual({
      hearingDate: null,
      hearingTime: null,
      courtRoom: null,
      caseNumber: null,
      judge: null,
      parties: null
    });
  });

  it("should throw error for unsupported file type", async () => {
    const file = new File(["dummy"], "summons.txt", { type: "text/plain" });
    const form = new FormData();
    form.append("file", file);

    await expect(parseSummons(form)).rejects.toThrow(/仅支持图片/);
  });

  it("should throw error for file too large", async () => {
    const largeContent = "a".repeat(11 * 1024 * 1024); // 11MB
    const file = new File([largeContent], "large.pdf", { type: "application/pdf" });
    const form = new FormData();
    form.append("file", file);

    await expect(parseSummons(form)).rejects.toThrow("超过 10MB");
  });

  it("should throw AiNotConfiguredError when AI not configured", async () => {
    const file = new File(["dummy"], "summons.jpg", { type: "image/jpeg" });
    const form = new FormData();
    form.append("file", file);

    mockAiVision.mockRejectedValue(new AiNotConfiguredError("AI not configured"));

    await expect(parseSummons(form)).rejects.toThrow(AiNotConfiguredError);
  });

  it("should throw generic error on vision failure", async () => {
    const file = new File(["dummy"], "summons.jpg", { type: "image/jpeg" });
    const form = new FormData();
    form.append("file", file);

    mockAiVision.mockRejectedValue(new Error("vision error"));

    await expect(parseSummons(form)).rejects.toThrow("vision error");
  });

  it("should accept PDF files", async () => {
    const file = new File(["dummy"], "summons.pdf", { type: "application/pdf" });
    const form = new FormData();
    form.append("file", file);

    mockAiVision.mockResolvedValue({
      content: "{\"hearingDate\": \"2024-07-01\", \"parties\": []}"
    });
    mockExtractJson.mockReturnValue({
      hearingDate: "2024-07-01",
      hearingTime: null,
      courtRoom: null,
      caseNumber: null,
      judge: null,
      parties: []
    });

    const result = await parseSummons(form);
    expect(result.hearingDate).toBe("2024-07-01");
  });
});
