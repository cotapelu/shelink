import { describe, it, expect } from "vitest";
import {
  computeResolvedPurpose,
  validateForm,
  isPdfFile,
  buildFormData
} from "@/app/(app)/approvals/seals/_components/use-seal-request-form-helpers";
import type { PurposePreset } from "@/app/(app)/approvals/seals/_components/use-seal-request-form-helpers";

describe("computeResolvedPurpose", () => {
  it("returns preset when not 'Khác'", () => {
    expect(computeResolvedPurpose("Hợp đồng ủy quyền" as PurposePreset, "")).toBe("Hợp đồng ủy quyền");
  });

  it("returns 'Khác: <trimmed>' when preset is 'Khác' and other provided", () => {
    expect(computeResolvedPurpose("Khác" as PurposePreset, "  some reason  ")).toBe("Khác: some reason");
  });

  it("returns empty string when preset is 'Khác' and other empty", () => {
    expect(computeResolvedPurpose("Khác" as PurposePreset, "   ")).toBe("");
  });
});

describe("isPdfFile", () => {
  it("recognizes PDF by MIME type", () => {
    expect(isPdfFile({ type: "application/pdf", name: "doc.pdf" } as File)).toBe(true);
  });

  it("recognizes PDF by extension", () => {
    expect(isPdfFile({ type: "text/plain", name: "document.PDF" } as File)).toBe(true);
  });

  it("rejects non-PDF", () => {
    expect(isPdfFile({ type: "image/png", name: "image.png" } as File)).toBe(false);
  });
});

describe("validateForm", () => {
  const defaultState = {
    sealType: "test",
    purposePreset: "Hợp đồng ủy quyền" as PurposePreset,
    purposeOther: "",
    documentTitle: "Doc",
    hasExisting: false,
    file: null
  };

  it("validates sealType", () => {
    expect(validateForm("", "Hợp đồng ủy quyền" as PurposePreset, "", "Doc", false, null)).toBe("Hãy chọn loại dấu");
  });

  it("validates purposePreset", () => {
    expect(validateForm("test", "" as PurposePreset, "", "Doc", false, null)).toBe("Hãy chọn lý do dùng dấu");
  });

  it("validates purposeOther when preset is 'Khác'", () => {
    expect(validateForm("test", "Khác" as PurposePreset, "   ", "Doc", false, null)).toBe("Hãy nhập diễn giải cụ thể cho lý do dùng dấu「Khác」");
  });

  it("validates documentTitle", () => {
    expect(validateForm("test", "Hợp đồng ủy quyền" as PurposePreset, "", "   ", false, null)).toBe("Hãy nhập tiêu đề văn bản");
  });

  it("validates file for new submission", () => {
    expect(validateForm("test", "Hợp đồng ủy quyền" as PurposePreset, "", "Doc", false, null)).toBe("Hãy tải lên bản chờ đóng dấu");
  });

  it("rejects non-PDF file", () => {
    const file = { type: "image/png", name: "image.png" } as File;
    expect(validateForm("test", "Hợp đồng ủy quyền" as PurposePreset, "", "Doc", false, file)).toBe("Cần tải tệp định dạng PDF");
  });

  it("passes when existing draft", () => {
    expect(validateForm("test", "Hợp đồng ủy quyền" as PurposePreset, "", "Doc", true, null)).toBeNull();
  });
});

describe("buildFormData", () => {
  it("builds FormData with all fields", () => {
    const fd = buildFormData(
      "test",
      "matter-1",
      "Mục đích dùng dấu để kiểm tra",
      "Document Title",
      5,
      true,
      2,
      "NORMAL",
      "note",
      false,
      false,
      null,
      null
    );

    expect(fd.get("sealType")).toBe("test");
    expect(fd.get("matterId")).toBe("matter-1");
    expect(fd.get("purpose")).toBe("Mục đích dùng dấu để kiểm tra");
    expect(fd.get("documentTitle")).toBe("Document Title");
    expect(fd.get("pageCount")).toBe("5");
    expect(fd.get("requireCrossPageSeal")).toBe("true");
    expect(fd.get("copies")).toBe("2");
    expect(fd.get("urgency")).toBe("NORMAL");
    expect(fd.get("requestNote")).toBe("note");
    expect(fd.has("alsoLegalRep")).toBe(false);
  });

  it("includes alsoLegalRep when true and not LEGAL_REP_SEAL", () => {
    const fd = buildFormData(
      "test",
      "",
      "purpose",
      "title",
      1,
      false,
      1,
      "NORMAL",
      "",
      true,
      false,
      null,
      null
    );
    expect(fd.get("alsoLegalRep")).toBe("true");
  });

  it("skips alsoLegalRep for LEGAL_REP_SEAL", () => {
    const fd = buildFormData(
      "LEGAL_REP_SEAL",
      "",
      "purpose",
      "title",
      1,
      false,
      1,
      "NORMAL",
      "",
      true,
      false,
      null,
      null
    );
    expect(fd.has("alsoLegalRep")).toBe(false);
  });

  it("includes existingDraftDocId when hasExisting", () => {
    const fd = buildFormData(
      "test",
      "",
      "purpose",
      "title",
      1,
      false,
      1,
      "NORMAL",
      "",
      false,
      true,
      { draftDocId: "draft-123" },
      null
    );
    expect(fd.get("existingDraftDocId")).toBe("draft-123");
  });

  it("includes file when not hasExisting", () => {
    const file = new File(["content"], "doc.pdf", { type: "application/pdf" });
    const fd = buildFormData(
      "test",
      "",
      "purpose",
      "title",
      1,
      false,
      1,
      "NORMAL",
      "",
      false,
      false,
      null,
      file
    );
    expect(fd.get("draftDoc")).toBe(file);
  });
});
