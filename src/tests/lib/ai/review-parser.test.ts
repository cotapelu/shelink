/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
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

  it("handles extractJson throwing", () => {
    (extractJson as any).mockImplementation(() => {
      throw new Error("JSON parse error");
    });
    expect(() => parseReviewItems("content")).toThrow("JSON parse error");
  });

  it("filters when title is non-string (null)", () => {
    (extractJson as any).mockReturnValue([
      { type: "MISSING", severity: "HIGH", title: null, detail: "Has detail" }
    ]);
    const result = parseReviewItems("content");
    expect(result).toEqual([]);
  });

  it("filters when detail is non-string (undefined)", () => {
    (extractJson as any).mockReturnValue([
      { type: "ISSUE", severity: "MEDIUM", title: "Has title", detail: undefined }
    ]);
    const result = parseReviewItems("content");
    expect(result).toEqual([]);
  });

  it("falls back when type is undefined (non-string)", () => {
    (extractJson as any).mockReturnValue([
      { severity: "HIGH", title: "T", detail: "D" }
    ]);
    const result = parseReviewItems("content");
    expect(result[0].type).toBe("ISSUE");
  });

  it("falls back when severity is boolean (non-string)", () => {
    (extractJson as any).mockReturnValue([
      { type: "MISSING", severity: true, title: "T", detail: "D" }
    ]);
    const result = parseReviewItems("content");
    expect(result[0].severity).toBe("MEDIUM");
  });

  it("handles empty array input", () => {
    (extractJson as any).mockReturnValue([]);
    const result = parseReviewItems("content");
    expect(result).toEqual([]);
  });

  it("preserves order for equal severity (sort stability)", () => {
    (extractJson as any).mockReturnValue([
      { type: "MISSING", severity: "HIGH", title: "A", detail: "D" },
      { type: "RISK", severity: "HIGH", title: "B", detail: "D" }
    ]);
    const result = parseReviewItems("content");
    expect(result.map(i => i.title)).toEqual(["A", "B"]);
  });
});
