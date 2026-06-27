import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseReviewItems } from "@/lib/ai/review-parser";
import { extractJson } from "@/lib/ai/client";

vi.mock("@/lib/ai/client", () => ({
  extractJson: vi.fn()
}));

describe("parseReviewItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses valid array of review items", () => {
    (extractJson as any).mockReturnValue([
      {
        type: "MISSING",
        severity: "HIGH",
        title: "Missing signature",
        detail: "The document lacks a signature"
      },
      {
        type: "RISK",
        severity: "LOW",
        title: "Risk noted",
        detail: "Potential风险"
      }
    ]);

    const result = parseReviewItems("some content");
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("MISSING");
    expect(result[1].severity).toBe("LOW");
  });

  it("throws if extracted data is not an array", () => {
    (extractJson as any).mockReturnValue({ error: "not array" });
    expect(() => parseReviewItems("content")).toThrow("AI 返回内容无法解析为审查清单");
  });

  it("filters out items with empty title or detail", () => {
    (extractJson as any).mockReturnValue([
      { type: "MISSING", severity: "HIGH", title: "", detail: "Has detail" },
      { type: "ISSUE", severity: "MEDIUM", title: "Has title", detail: "" },
      { type: "SUGGESTION", severity: "LOW", title: "Valid", detail: "Also valid" }
    ]);

    const result = parseReviewItems("content");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Valid");
  });

  it("normalizes type and severity to uppercase", () => {
    (extractJson as any).mockReturnValue([
      { type: "missing", severity: "high", title: "T", detail: "D" }
    ]);

    const result = parseReviewItems("content");
    expect(result[0].type).toBe("MISSING");
    expect(result[0].severity).toBe("HIGH");
  });

  it("falls back invalid type to ISSUE", () => {
    (extractJson as any).mockReturnValue([
      { type: "INVALID", severity: "HIGH", title: "T", detail: "D" }
    ]);

    const result = parseReviewItems("content");
    expect(result[0].type).toBe("ISSUE");
  });

  it("falls back invalid severity to MEDIUM", () => {
    (extractJson as any).mockReturnValue([
      { type: "MISSING", severity: "INVALID", title: "T", detail: "D" }
    ]);

    const result = parseReviewItems("content");
    expect(result[0].severity).toBe("MEDIUM");
  });

  it("sorts items by severity order HIGH→LOW", () => {
    (extractJson as any).mockReturnValue([
      { type: "SUGGESTION", severity: "LOW", title: "L", detail: "D" },
      { type: "MISSING", severity: "HIGH", title: "H", detail: "D" },
      { type: "RISK", severity: "MEDIUM", title: "M", detail: "D" }
    ]);

    const result = parseReviewItems("content");
    expect(result.map(i => i.severity)).toEqual(["HIGH", "MEDIUM", "LOW"]);
  });

  it("handles mixed case types correctly", () => {
    (extractJson as any).mockReturnValue([
      { type: "MiSsInG", severity: "high", title: "T", detail: "D" }
    ]);
    const result = parseReviewItems("content");
    expect(result[0].type).toBe("MISSING");
    expect(result[0].severity).toBe("HIGH");
  });

  it("returns empty array if all items filtered", () => {
    (extractJson as any).mockReturnValue([
      { type: "MISSING", severity: "HIGH", title: "", detail: "D" },
      { type: "ISSUE", severity: "MEDIUM", title: "T", detail: "" }
    ]);
    const result = parseReviewItems("content");
    expect(result).toEqual([]);
  });
});
