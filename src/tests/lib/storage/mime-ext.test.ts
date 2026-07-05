import { describe, it, expect } from "vitest";
import {
  ensureExt,
  isInlinePreviewable,
  officePreviewKind,
  canPreview
} from "@/lib/storage/mime-ext";

describe("mime-ext utilities", () => {
  describe("ensureExt", () => {
    it("should return name unchanged if already has extension", () => {
      expect(ensureExt("report.pdf", "application/pdf")).toBe("report.pdf");
      expect(ensureExt("archive.tar.gz", "application/zip")).toBe("archive.tar.gz");
    });

    it("should append extension based on mimeType", () => {
      expect(ensureExt("report", "application/pdf")).toBe("report.pdf");
      expect(ensureExt("photo", "image/png")).toBe("photo.png");
      expect(ensureExt("data", "application/json")).toBe("data.json");
    });

    it("should return name unchanged if no mimeType", () => {
      expect(ensureExt("report", null)).toBe("report");
      expect(ensureExt("report", undefined)).toBe("report");
    });

    it("should handle unknown mimeType", () => {
      expect(ensureExt("file", "application/unknown")).toBe("file");
    });

    it("should be case-insensitive for mimeType", () => {
      expect(ensureExt("doc", "APPLICATION/PDF")).toBe("doc.pdf");
      expect(ensureExt("image", "Image/PNG")).toBe("image.png");
    });
  });

  describe("isInlinePreviewable", () => {
    it("should return true for PDF", () => {
      expect(isInlinePreviewable("application/pdf")).toBe(true);
    });

    it("should return true for images", () => {
      expect(isInlinePreviewable("image/png")).toBe(true);
      expect(isInlinePreviewable("image/jpeg")).toBe(true);
      expect(isInlinePreviewable("image/webp")).toBe(true);
    });

    it("should return true for text types", () => {
      expect(isInlinePreviewable("text/plain")).toBe(true);
      expect(isInlinePreviewable("text/markdown")).toBe(true);
      expect(isInlinePreviewable("text/html")).toBe(true);
    });

    it("should return false for unknown or null", () => {
      expect(isInlinePreviewable(null)).toBe(false);
      expect(isInlinePreviewable(undefined as any)).toBe(false);
      expect(isInlinePreviewable("application/octet-stream")).toBe(false);
    });
  });

  describe("officePreviewKind", () => {
    it("should detect docx by mime", () => {
      expect(officePreviewKind("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe("docx");
    });

    it("should detect docx by filename", () => {
      expect(officePreviewKind(null, "file.DOCX")).toBe("docx");
    });

    it("should detect xlsx by mime", () => {
      expect(officePreviewKind("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe("xlsx");
    });

    it("should detect xls by mime", () => {
      expect(officePreviewKind("application/vnd.ms-excel")).toBe("xlsx");
    });

    it("should detect xlsx/xls by filename", () => {
      expect(officePreviewKind(null, "data.xlsx")).toBe("xlsx");
      expect(officePreviewKind(null, "data.xls")).toBe("xlsx");
    });

    it("should return null for other types", () => {
      expect(officePreviewKind("application/pdf", null)).toBe(null);
      expect(officePreviewKind(null, "file.txt")).toBe(null);
    });
  });

  describe("canPreview", () => {
    it("should return true for inline previewable types", () => {
      expect(canPreview("application/pdf")).toBe(true);
      expect(canPreview("image/png")).toBe(true);
    });

    it("should return true for Office documents that can be converted", () => {
      expect(canPreview("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true);
      expect(canPreview(null, "file.xlsx")).toBe(true);
    });

    it("should return false for non-previewable", () => {
      expect(canPreview("application/zip")).toBe(false);
      expect(canPreview("video/mp4")).toBe(false);
    });
  });
});