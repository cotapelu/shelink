import { describe, it, expect, vi, beforeEach } from "vitest";
import { aiChat, aiVision, AiNotConfiguredError, type AiChatOptions } from "@/lib/ai/client";
import * as settings from "@/lib/ai/settings";

// Mock the settings module
vi.mock("@/lib/ai/settings", () => ({
  getAiSettings: vi.fn()
}));

// Mock global fetch
global.fetch = vi.fn();

describe("aiChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws AiNotConfiguredError when AI not configured", async () => {
    (settings.getAiSettings as any).mockResolvedValue({ configured: false });
    const opts: AiChatOptions = { messages: [{ role: "user", content: "Hello" }] };
    await expect(aiChat(opts)).rejects.toThrow(AiNotConfiguredError);
  });

  it("calls OpenAI compatible API with correct URL and headers", async () => {
    (settings.getAiSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "test-key",
      baseUrl: "https://api.openai.com/v1",
      textModel: "gpt-3.5-turbo"
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "Hello there" } }] })
    });

    const opts: AiChatOptions = {
      messages: [{ role: "user", content: "Hello" }],
      maxTokens: 500,
      temperature: 0.5
    };

    const result = await aiChat(opts);

    expect(result.content).toBe("Hello there");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-key"
        })
      })
    );

    // Verify request body
    const callArgs = (global.fetch as any).mock.calls[0][1];
    const body = JSON.parse(callArgs.body);
    expect(body.model).toBe("gpt-3.5-turbo");
    expect(body.messages).toEqual([{ role: "user", content: "Hello" }]);
    expect(body.max_tokens).toBe(500);
    expect(body.temperature).toBe(0.5);
  });

  it("uses default values when options not provided", async () => {
    (settings.getAiSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://api.openai.com/v1",
      textModel: "gpt-4"
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "Response" } }] })
    });

    const result = await aiChat({ messages: [{ role: "user", content: "Hi" }] });

    expect(result.content).toBe("Response");
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.model).toBe("gpt-4");
    expect(body.max_tokens).toBe(1500);
    expect(body.temperature).toBe(0.2);
  });

  it("handles API error response", async () => {
    (settings.getAiSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://api.openai.com/v1",
      textModel: "gpt-3.5"
    });

    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "Invalid request"
    });

    await expect(aiChat({ messages: [{ role: "user", content: "Hi" }] }))
      .rejects.toThrow("AI 请求失败 (400): Invalid request");
  });

  it("handles missing choices array", async () => {
    (settings.getAiSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://api.openai.com/v1",
      textModel: "gpt-3.5"
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({})
    });

    const result = await aiChat({ messages: [{ role: "user", content: "Hi" }] });
    expect(result.content).toBe("");
  });

  it("handles timeout", async () => {
    (settings.getAiSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://api.openai.com/v1",
      textModel: "gpt-3.5"
    });

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 100));
    (global.fetch as any).mockReturnValue(timeoutPromise);

    await expect(aiChat({ messages: [{ role: "user", content: "Hi" }], timeoutMs: 50 }))
      .rejects.toThrow("timeout");
  });
});

describe("AiNotConfiguredError", () => {
  it("has correct message", () => {
    const err = new AiNotConfiguredError();
    expect(err.message).toBe("AI 未配置，请先到 设置 → AI 接入 填写 API key");
    expect(err.name).toBe("AiNotConfiguredError");
  });
});

// aiVision tests would require more complex mocking; deferred to integration
