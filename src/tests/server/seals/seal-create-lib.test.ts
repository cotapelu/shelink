import { describe, it, expect } from "vitest";
import {
  buildSealFormRaw,
  deriveAlsoLegalRep,
  toSealDocumentData,
  toSealRequestData,
  toLegalRepSealRequestData,
  type DocPrepare
} from "@/server/seals/seal-create-lib";

const prepare: DocPrepare = {
  name: "Ban nhap.pdf",
  mimeType: "application/pdf",
  size: 1024,
  sha: "abc123",
  path: "seals/xyz",
  algorithm: "aes-256-gcm",
  iv: "aXY=",
  authTag: "bXY="
};

const sealData = {
  sealType: "CONTRACT_SEAL" as const,
  matterId: "m1",
  purpose: "  Ky hop dong  ",
  documentTitle: "  Hop đồng A  ",
  pageCount: 3,
  requireCrossPageSeal: true,
  copies: 2,
  urgency: "NORMAL" as const,
  requestNote: "  gap  ",
  parentSealRequestId: null
};

function fd(entries: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

describe("buildSealFormRaw", () => {
  it("map đủ field + mặc định (pageCount/copies/urgency)", () => {
    const raw = buildSealFormRaw(
      fd({ sealType: "CONTRACT_SEAL", matterId: "m1", purpose: "p", documentTitle: "t" })
    );
    expect(raw).toMatchObject({
      sealType: "CONTRACT_SEAL",
      matterId: "m1",
      purpose: "p",
      documentTitle: "t",
      pageCount: "1",
      requireCrossPageSeal: false,
      copies: "1",
      urgency: "NORMAL",
      requestNote: "",
      parentSealRequestId: null
    });
  });

  it("matterId rỗng → null; parentSealRequestId rỗng → null", () => {
    const raw = buildSealFormRaw(
      fd({ sealType: "S", matterId: "", purpose: "p", documentTitle: "t", parentSealRequestId: "" })
    );
    expect(raw.matterId).toBeNull();
    expect(raw.parentSealRequestId).toBeNull();
  });

  it("requireCrossPageSeal chỉ true đúng chuỗi 'true'", () => {
    const raw = buildSealFormRaw(
      fd({ sealType: "S", purpose: "p", documentTitle: "t", requireCrossPageSeal: "true" })
    );
    expect(raw.requireCrossPageSeal).toBe(true);
  });

  it("đọc giá trị từ form (pageCount/copies/urgency/requestNote/parent)", () => {
    const raw = buildSealFormRaw(
      fd({
        sealType: "S",
        purpose: "p",
        documentTitle: "t",
        pageCount: "5",
        copies: "3",
        urgency: "URGENT",
        requestNote: "note",
        parentSealRequestId: "parent1"
      })
    );
    expect(raw).toMatchObject({ pageCount: "5", copies: "3", urgency: "URGENT", requestNote: "note", parentSealRequestId: "parent1" });
  });
});

describe("deriveAlsoLegalRep", () => {
  it("true khi cờ true và sealType không phải LEGAL_REP_SEAL", () => {
    expect(deriveAlsoLegalRep(fd({ alsoLegalRep: "true" }), "CONTRACT_SEAL")).toBe(true);
  });

  it("false khi sealType đã là LEGAL_REP_SEAL (không tự gọi thêm)", () => {
    expect(deriveAlsoLegalRep(fd({ alsoLegalRep: "true" }), "LEGAL_REP_SEAL")).toBe(false);
  });

  it("false khi cờ không đúng 'true'", () => {
    expect(deriveAlsoLegalRep(fd({ alsoLegalRep: "false" }), "CONTRACT_SEAL")).toBe(false);
    expect(deriveAlsoLegalRep(fd({}), "CONTRACT_SEAL")).toBe(false);
  });
});

describe("toSealDocumentData", () => {
  it("payload bản nháp: mã hóa, category OTHER, 2 tag gốc", () => {
    const d = toSealDocumentData(prepare, { uploadedById: "u1", matterId: "m1" });
    expect(d).toEqual({
      matterId: "m1",
      name: prepare.name,
      category: "OTHER",
      path: prepare.path,
      mimeType: prepare.mimeType,
      size: prepare.size,
      sha256: prepare.sha,
      encrypted: true,
      algorithm: prepare.algorithm,
      iv: prepare.iv,
      authTag: prepare.authTag,
      tags: ["Yeu cau dong dau", "Ban nhap cho dong dau"],
      uploadedById: "u1"
    });
  });

  it("matterId null → undefined", () => {
    const d = toSealDocumentData(prepare, { uploadedById: "u1", matterId: null });
    expect(d.matterId).toBeUndefined();
  });

  it("extraTags (bản sao đại diện pháp luật) nối thêm", () => {
    const d = toSealDocumentData(prepare, { uploadedById: "u1", matterId: null, extraTags: ["Ban sao dau dai dien phap luat"] });
    expect(d.tags).toEqual(["Yeu cau dong dau", "Ban nhap cho dong dau", "Ban sao dau dai dien phap luat"]);
  });
});

describe("toSealRequestData", () => {
  it("trim purpose/documentTitle + requestNote rỗng → null", () => {
    const d = toSealRequestData(sealData, { draftDocId: "doc1", requestedById: "u1", code: "SEAL-2026-0001" });
    expect(d).toMatchObject({
      code: "SEAL-2026-0001",
      sealType: "CONTRACT_SEAL",
      matterId: "m1",
      purpose: "Ky hop dong",
      documentTitle: "Hop đồng A",
      pageCount: 3,
      requireCrossPageSeal: true,
      copies: 2,
      urgency: "NORMAL",
      requestNote: "gap",
      draftDocId: "doc1",
      requestedById: "u1",
      status: "PENDING",
      parentSealRequestId: undefined
    });
  });

  it("matterId null → undefined; parentSealRequestId có giá trị → giữ", () => {
    const d = toSealRequestData({ ...sealData, matterId: null, parentSealRequestId: "p9" }, { draftDocId: "d", requestedById: "u", code: "C" });
    expect(d.matterId).toBeUndefined();
    expect(d.parentSealRequestId).toBe("p9");
  });

  it("requestNote rỗng → null", () => {
    const d = toSealRequestData({ ...sealData, requestNote: "   " }, { draftDocId: "d", requestedById: "u", code: "C" });
    expect(d.requestNote).toBeNull();
  });
});

describe("toLegalRepSealRequestData", () => {
  it("type LEGAL_REP_SEAL + purpose ghi chú 'dong thoi voi {parentCode}'", () => {
    const d = toLegalRepSealRequestData(sealData, {
      draftDocId: "doc2",
      requestedById: "u1",
      code: "SEAL-2026-0002",
      parentSealId: "seal1",
      parentCode: "SEAL-2026-0001"
    });
    expect(d).toMatchObject({
      code: "SEAL-2026-0002",
      sealType: "LEGAL_REP_SEAL",
      purpose: "Ky hop dong (dong thoi voi SEAL-2026-0001)",
      draftDocId: "doc2",
      parentSealRequestId: "seal1",
      status: "PENDING"
    });
  });
});
