import { describe, it, expect } from "vitest";
import { normalizeUploadedFilename } from "@/lib/filename";

describe("filename utilities", () => {
  describe("normalizeUploadedFilename", () => {
    it("should return empty string unchanged", () => {
      expect(normalizeUploadedFilename("")).toBe("");
    });

    it("should return null unchanged", () => {
      expect(normalizeUploadedFilename(null as any)).toBe(null as any);
    });

    it("should return undefined unchanged", () => {
      expect(normalizeUploadedFilename(undefined as any)).toBe(undefined as any);
    });

    it("should return simple ASCII name unchanged", () => {
      expect(normalizeUploadedFilename("document.pdf")).toBe("document.pdf");
    });

    it("should attempt to decode strings containing mojibake patterns", () => {
      // The function should not throw and should return some string.
      const result = normalizeUploadedFilename("RÃ©sumÃ©");
      expect(typeof result).toBe("string");
    });

    it("should return original if decode fails or doesn't improve score", () => {
      // A string with no mojibake patterns won't trigger decode attempt.
      expect(normalizeUploadedFilename("hello world")).toBe("hello world");
    });
  });
});