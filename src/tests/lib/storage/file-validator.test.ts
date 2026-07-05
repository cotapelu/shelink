import { describe, it, expect } from "vitest";
import { validateUploadedFile, UploadPurpose } from "@/lib/storage/file-validator";

function makeFile(name: string, size: number, type?: string): File {
  return new File([`a`.repeat(size)], name, { type });
}

describe("file-validator", () => {
  describe("validateUploadedFile", () => {
    it("accepts allowed document types", () => {
      const file = makeFile("doc.pdf", 1024, "application/pdf");
      expect(() => validateUploadedFile(file, { purpose: "document", maxBytes: 10 * 1024 * 1024 })).not.toThrow();
    });

    it("rejects disallowed extension for document", () => {
      const file = makeFile("malware.exe", 1024, "application/octet-stream");
      expect(() => validateUploadedFile(file, { purpose: "document", maxBytes: 10 * 1024 * 1024 })).toThrow("不允许");
    });

    it("accepts image for invoice purpose", () => {
      const file = makeFile("inv.jpg", 1024, "image/jpeg");
      expect(() => validateUploadedFile(file, { purpose: "invoice", maxBytes: 5 * 1024 * 1024 })).not.toThrow();
    });

    it("rejects file too large", () => {
      const file = makeFile("big.pdf", 2 * 1024 * 1024 + 1, "application/pdf");
      expect(() => validateUploadedFile(file, { purpose: "document", maxBytes: 2 * 1024 * 1024 })).toThrow("限制");
    });

    it("accepts narrow ext for stamp", () => {
      const file = makeFile("stamp.png", 500, "image/png");
      expect(() => validateUploadedFile(file, { purpose: "stamp", maxBytes: 1 * 1024 * 1024 })).not.toThrow();
    });

    it("rejects MIME not matching allowed pattern for invoice", () => {
      const file = makeFile("inv.jpg", 500, "application/octet-stream");
      expect(() => validateUploadedFile(file, { purpose: "invoice", maxBytes: 1 * 1024 * 1024 })).toThrow("MIME 类型");
    });
  });
});