import { describe, it, expect, vi, beforeEach } from "vitest";
import { recognizeInvoiceFromImage } from "@/server/ai/actions";
import { requireSession } from "@/lib/auth/session";
import { aiVision, extractJson, AiNotConfiguredError } from "@/lib/ai/client";
import { audit } from "@/server/audit";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/ai/client");
vi.mock("@/server/audit");

const mockRequireSession = vi.mocked(requireSession, true);
const mockAiVision = vi.mocked(aiVision, true);
const mockExtractJson = vi.mocked(extractJson, true);
const mockAudit = vi.mocked(audit, true);

beforeEach(() => {
  vi.clearAllMocks();
});

// Helper to create a mock File
function createMockFile(
  name: string,
  type: string,
  content: string | Uint8Array = "test content"
): File {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

describe("ai/actions", () => {
  it("should reject if no file provided", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1" } } as any);
    const formData = new FormData();
    // No file

    const result = await recognizeInvoiceFromImage(formData);

    expect(result).toEqual({ ok: false, message: "请上传发票图片" });
    expect(mockAiVision).not.toHaveBeenCalled();
  });

  it("should reject if file is not a File instance", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1" } } as any);
    const formData = new FormData();
    formData.append("file", "not a file" as any); // string

    const result = await recognizeInvoiceFromImage(formData);

    expect(result).toEqual({ ok: false, message: "请上传发票图片" });
  });

  it("should reject if file size is 0", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1" } } as any);
    const file = createMockFile("empty.jpg", "image/jpeg", ""); // empty string -> size 0
    const formData = new FormData();
    formData.append("file", file);

    const result = await recognizeInvoiceFromImage(formData);

    expect(result).toEqual({ ok: false, message: "请上传发票图片" });
  });

  it("should reject if file exceeds max size", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1" } } as any);
    const largeContent = "x".repeat(7 * 1024 * 1024); // 7MB > 6MB
    const file = createMockFile("large.jpg", "image/jpeg", largeContent);
    const formData = new FormData();
    formData.append("file", file);

    const result = await recognizeInvoiceFromImage(formData);

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/超过 6MB/);
  });

  it("should reject if file type is not image or PDF", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1" } } as any);
    const file = createMockFile("doc.txt", "text/plain", "text");
    const formData = new FormData();
    formData.append("file", file);

    const result = await recognizeInvoiceFromImage(formData);

    expect(result).toEqual({ ok: false, message: "仅支持图片或 PDF" });
  });

  it("should accept image file", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1" } } as any);
    const file = createMockFile("invoice.jpg", "image/jpeg", "fake image bytes");
    const formData = new FormData();
    formData.append("file", file);

    const mockAiResponse = { content: '{"invoiceNumber":"12345678"}' };
    mockAiVision.mockResolvedValue(mockAiResponse);
    mockExtractJson.mockReturnValue({ invoiceNumber: "12345678" });

    const result = await recognizeInvoiceFromImage(formData);

    expect(result).toEqual({
      ok: true,
      data: { invoiceNumber: "12345678" },
      raw: '{"invoiceNumber":"12345678"}',
    });
    expect(mockAiVision).toHaveBeenCalledTimes(1);
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        action: "AI_INVOICE_OCR",
        targetType: "FeeEntry",
        targetId: "scratch",
        detail: expect.objectContaining({
          ok: true,
          fileName: "invoice.jpg",
          invoiceNumber: "12345678",
        }),
      })
    );
  });

  it("should accept PDF file", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1" } } as any);
    const file = createMockFile("invoice.pdf", "application/pdf", "fake pdf bytes");
    const formData = new FormData();
    formData.append("file", file);

    mockAiVision.mockResolvedValue({ content: '{"sellerName":"Test Seller"}' });
    mockExtractJson.mockReturnValue({ sellerName: "Test Seller" });

    const result = await recognizeInvoiceFromImage(formData);

    expect(result.ok).toBe(true);
    expect(result.data.sellerName).toBe("Test Seller");
  });

  it("should handle AiNotConfiguredError", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1" } } as any);
    const file = createMockFile("test.jpg", "image/jpeg", "x");
    const formData = new FormData();
    formData.append("file", file);

    const error = new AiNotConfiguredError("AI not configured");
    mockAiVision.mockRejectedValue(error);

    const result = await recognizeInvoiceFromImage(formData);

    expect(result).toEqual({ ok: false, message: error.message });
    expect(mockAudit).not.toHaveBeenCalled();
  });

  it("should handle generic error", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1" } } as any);
    const file = createMockFile("test.jpg", "image/jpeg", "x");
    const formData = new FormData();
    formData.append("file", file);

    mockAiVision.mockRejectedValue(new Error("Network timeout"));

    const result = await recognizeInvoiceFromImage(formData);

    expect(result).toEqual({ ok: false, message: "Network timeout" });
    expect(mockAudit).not.toHaveBeenCalled();
  });

  it("should pass fileName and size to audit", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1" } } as any);
    const file = createMockFile("my-invoice.png", "image/png", "x");
    const formData = new FormData();
    formData.append("file", file);

    mockAiVision.mockResolvedValue({ content: "{}" });
    mockExtractJson.mockReturnValue({});

    await recognizeInvoiceFromImage(formData);

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          fileName: "my-invoice.png",
          size: file.size,
        }),
      })
    );
  });
});
