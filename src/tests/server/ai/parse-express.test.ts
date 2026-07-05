import { parseExpressLabel } from "@/server/ai/parse-express";
import { aiVision } from "@/lib/ai/client";
import { requireSession } from "@/lib/auth/session";

vi.mock("@/lib/ai/client", () => ({
  aiVision: vi.fn(),
  extractJson: (text: string) => JSON.parse(text),
  AiNotConfiguredError: class extends Error { constructor() { super("Not configured") } },
}));

vi.mock("@/lib/auth/session", () => ({
  requireSession: vi.fn(),
}));

describe("parseExpressLabel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should extract trackingNo and companyCode from valid image", async () => {
    (aiVision as any).mockResolvedValue({
      content: JSON.stringify({ trackingNo: "SF1234567890", companyCode: "顺丰速运" }),
    });
    (requireSession as any).mockResolvedValue({ user: { id: "u1" } });

    const file = new File(["dummy"], "express.jpg", { type: "image/jpeg" });
    const form = new FormData();
    form.append("file", file);

    const result = await parseExpressLabel(form);
    expect(result).toEqual({ trackingNo: "SF1234567890", companyCode: "顺丰速运" });
  });

  it("should throw for non-image mime type", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1" } });
    const file = new File(["content"], "document.pdf", { type: "application/pdf" });
    const form = new FormData();
    form.append("file", file);

    await expect(parseExpressLabel(form)).rejects.toThrow(/仅支持图片格式/);
  });

  it("should throw for oversized file", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1" } });
    const largeContent = "a".repeat(11 * 1024 * 1024); // 11MB
    const file = new File([largeContent], "large.jpg", { type: "image/jpeg" });
    const form = new FormData();
    form.append("file", file);

    await expect(parseExpressLabel(form)).rejects.toThrow(/超过 10MB/);
  });
});
