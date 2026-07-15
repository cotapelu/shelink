import { describe, it, expect } from "vitest";
import {
  computeResolvedPurpose,
  validateForm,
  isPdfFile,
  buildFormData
} from "@/app/(app)/approvals/seals/_components/use-seal-request-form-helpers";
import type { PurposePreset } from "@/app/(app)/approvals/seals/_components/use-seal-request-form-helpers";

describe("computeResolvedPurpose", () => {
  it("returns preset when not '其他'", () => {
    expect(computeResolvedPurpose("委托合同" as PurposePreset, "")).toBe("委托合同");
  });

  it("returns '其他：<trimmed>' when preset is '其他' and other provided", () => {
    expect(computeResolvedPurpose("其他" as PurposePreset, "  some reason  ")).toBe("其他：some reason");
  });

  it("returns empty string when preset is '其他' and other empty", () => {
    expect(computeResolvedPurpose("其他" as PurposePreset, "   ")).toBe("");
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
    purposePreset: "委托合同" as PurposePreset,
    purposeOther: "",
    documentTitle: "Doc",
    hasExisting: false,
    file: null
  };

  it("validates sealType", () => {
    expect(validateForm("", "委托合同" as PurposePreset, "", "Doc", false, null)).toBe("请选择章种类");
  });

  it("validates purposePreset", () => {
    expect(validateForm("test", "" as PurposePreset, "", "Doc", false, null)).toBe("请选择用印事由");
  });

  it("validates purposeOther when preset is '其他'", () => {
    expect(validateForm("test", "其他" as PurposePreset, "   ", "Doc", false, null)).toBe("请填写「其他」用印事由的具体说明");
  });

  it("validates documentTitle", () => {
    expect(validateForm("test", "委托合同" as PurposePreset, "", "   ", false, null)).toBe("请填写文件标题");
  });

  it("validates file for new submission", () => {
    expect(validateForm("test", "委托合同" as PurposePreset, "", "Doc", false, null)).toBe("请上传待盖章稿");
  });

  it("rejects non-PDF file", () => {
    const file = { type: "image/png", name: "image.png" } as File;
    expect(validateForm("test", "委托合同" as PurposePreset, "", "Doc", false, file)).toBe("需上传 pdf 格式文件");
  });

  it("passes when existing draft", () => {
    expect(validateForm("test", "委托合同" as PurposePreset, "", "Doc", true, null)).toBeNull();
  });
});

describe("buildFormData", () => {
  it("builds FormData with all fields", () => {
    const fd = buildFormData(
      "test",
      "matter-1",
      "测试用印目的",
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
    expect(fd.get("purpose")).toBe("测试用印目的");
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
