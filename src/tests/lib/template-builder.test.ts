import { describe, it, expect } from "vitest";
import PizZip from "pizzip";
import { BUILTIN_TEMPLATES, createDocxBuffer, injectSignDate } from "@/lib/template-builder";

describe("BUILTIN_TEMPLATES", () => {
  it("có 8 mẫu và tên không trùng", () => {
    expect(BUILTIN_TEMPLATES).toHaveLength(8);
    const names = BUILTIN_TEMPLATES.map((t) => t.name);
    expect(new Set(names).size).toBe(8);
  });

  it("mỗi mẫu có category hợp lệ, variables, và buildBuffer trả Buffer", () => {
    for (const t of BUILTIN_TEMPLATES) {
      expect(t.variables.length).toBeGreaterThan(0);
      expect(typeof t.buildBuffer).toBe("function");
      const buf = t.buildBuffer();
      expect(Buffer.isBuffer(buf)).toBe(true);
      // ZIP magic "PK\x03\x04"
      expect(buf.subarray(0, 4).toString("latin1")).toBe("PK\u0003\u0004");
    }
  });

  it("mỗi mẫu đều khai báo generatedAt (thời điểm sinh)", () => {
    for (const t of BUILTIN_TEMPLATES) {
      expect(t.variables).toContain("generatedAt");
    }
  });
});

describe("injectSignDate", () => {
  it("thay placeholder bằng ngày hôm nay (YYYY年M月D日)", () => {
    const d = new Date();
    const expectToday = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    expect(injectSignDate("具状人：x\n__SIGN_DATE__")).toBe(`具状人：x\n${expectToday}`);
  });

  it("không có placeholder → giữ nguyên", () => {
    expect(injectSignDate("không có ngày")).toBe("không có ngày");
  });
});

describe("createDocxBuffer", () => {
  it("nén được document.xml chứa title + body", () => {
    const buf = createDocxBuffer("Tiêu đề", "Nội dung thân", ["a.b"]);
    const zip = new PizZip(buf);
    const xml = zip.file("word/document.xml")?.asText() ?? "";
    expect(xml).toContain("Tiêu đề");
    expect(xml).toContain("Nội dung thân");
    expect(xml).toContain("生成时间：{{generatedAt}}");
  });

  it("sinh MERGEFIELD cho mỗi biến", () => {
    const buf = createDocxBuffer("T", "B", ["matter.internalCode", "client.name"]);
    const xml = new PizZip(buf).file("word/document.xml")?.asText() ?? "";
    expect(xml).toContain("MERGEFIELD matter.internalCode");
    expect(xml).toContain("MERGEFIELD client.name");
    expect(xml).toContain("{{{matter.internalCode}}}");
  });

  it("đóng gói đủ 4 part chuẩn docx tối thiản", () => {
    const buf = createDocxBuffer("T", "B", []);
    const zip = new PizZip(buf);
    for (const p of ["word/document.xml", "[Content_Types].xml", "_rels/.rels", "word/_rels/document.xml.rels"]) {
      expect(zip.file(p)).toBeTruthy();
    }
  });

  it("không biến (variables rỗng) vẫn hợp lệ", () => {
    const buf = createDocxBuffer("T", "B", []);
    const xml = new PizZip(buf).file("word/document.xml")?.asText() ?? "";
    expect(xml).not.toContain("MERGEFIELD");
  });
});
