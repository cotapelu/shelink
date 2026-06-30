import { describe, it, expect, vi } from "vitest";
import {
  seedDefaultFolders,
  suggestFolderByTemplateCategory,
} from "@/lib/default-folders";

describe("default-folders", () => {
  describe("seedDefaultFolders", () => {
    it("creates default folders for CIVIL_COMMERCIAL with correct order and flags", async () => {
      const mockCreateMany = vi.fn().mockResolvedValue({ count: 8 });
      const tx = { documentFolder: { createMany: mockCreateMany } } as any;

      await seedDefaultFolders(tx, "m-1", "CIVIL_COMMERCIAL");

      expect(mockCreateMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ matterId: "m-1", name: "Nhận vụ án", orderIndex: 0, isDefault: true }),
          expect.objectContaining({ matterId: "m-1", name: "Nộp đơn", orderIndex: 1, isDefault: true }),
          expect.objectContaining({ matterId: "m-1", name: "Thủ tục ủy quyền", orderIndex: 2, isDefault: true }),
          expect.objectContaining({ matterId: "m-1", name: "Chứng cứ", orderIndex: 3, isDefault: true }),
          expect.objectContaining({ matterId: "m-1", name: "Văn bản thủ tục", orderIndex: 4, isDefault: true }),
          expect.objectContaining({ matterId: "m-1", name: "Phiên tòa", orderIndex: 5, isDefault: true }),
          expect.objectContaining({ matterId: "m-1", name: "Phán quyết", orderIndex: 6, isDefault: true }),
          expect.objectContaining({ matterId: "m-1", name: "Kết thúc", orderIndex: 7, isDefault: true }),
        ]),
      });
    });

    it("creates folders for LABOR_ARBITRATION with correct names and order", async () => {
      const mockCreateMany = vi.fn().mockResolvedValue({ count: 8 });
      const tx = { documentFolder: { createMany: mockCreateMany } } as any;

      await seedDefaultFolders(tx, "m-2", "LABOR_ARBITRATION");

      const expectedNames = [
        "Nhận vụ án", "Thủ tục ủy quyền", "Chứng cứ", "Văn bản trọng tài",
        "Mở phiên", "Phán quyết", "Tố tụng", "Kết thúc"
      ];
      expect(mockCreateMany).toHaveBeenCalledWith({
        data: expect.arrayContaining(
          expectedNames.map((name, i) =>
            expect.objectContaining({ matterId: "m-2", name, orderIndex: i, isDefault: true })
          )
        ),
      });
    });

    it("creates folders for NON_LITIGATION with correct structure", async () => {
      const mockCreateMany = vi.fn().mockResolvedValue({ count: 5 });
      const tx = { documentFolder: { createMany: mockCreateMany } } as any;

      await seedDefaultFolders(tx, "m-3", "NON_LITIGATION");

      const expectedNames = ["Dự án", "Nghiên cứu", "Bản ghi công việc", "File đã phát hành", "Lưu trữ"];
      expect(mockCreateMany).toHaveBeenCalledWith({
        data: expect.arrayContaining(
          expectedNames.map((name, i) =>
            expect.objectContaining({ matterId: "m-3", name, orderIndex: i, isDefault: true })
          )
        ),
      });
    });

    it("returns early for unknown category (no createMany call)", async () => {
      const tx = { documentFolder: { createMany: vi.fn() } } as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await seedDefaultFolders(tx, "m-4", "UNKNOWN_CATEGORY" as any);
      expect(tx.documentFolder.createMany).not.toHaveBeenCalled();
    });
  });

  describe("suggestFolderByTemplateCategory", () => {
    const litigationCategories = ["CIVIL_COMMERCIAL", "ADMINISTRATIVE", "CRIMINAL"] as const;
    const nonLitigationCategories = ["NON_LITIGATION", "LEGAL_COUNSEL", "SPECIAL_PROJECT"] as const;

    it.each(Object.entries({
      INTAKE: "Nhận vụ án",
      RETAINER: "Thủ tục ủy quyền",
      LITIGATION: "Văn bản thủ tục", // non-CRIMINAL
      HEARING: "Phiên tòa",
      WORK_PRODUCT: "Chứng cứ",
      ARCHIVE: "Kết thúc",
      CLOSING: "Kết thúc",
      BLANK: "Nhận vụ án",
    }))("maps litigation template %s to %s", (template, expected) => {
      for (const cat of litigationCategories) {
        if (template === "LITIGATION" && cat === "CRIMINAL") {
          expect(suggestFolderByTemplateCategory(template, cat)).toBe("Trước phiên tòa");
        } else if (template === "WORK_PRODUCT" && cat === "CRIMINAL") {
          expect(suggestFolderByTemplateCategory(template, cat)).toBe("Thu thập chứng cứ");
        } else {
          expect(suggestFolderByTemplateCategory(template as any, cat)).toBe(expected);
        }
      }
    });

    it.each(Object.entries({
      INTAKE: "Dự án",
      RETAINER: "Dự án",
      LITIGATION: "File đã phát hành",
      HEARING: "Bản ghi công việc",
      WORK_PRODUCT: "File đã phát hành",
      ARCHIVE: "Lưu trữ",
      CLOSING: "Lưu trữ",
      BLANK: "Bản ghi công việc",
    }))("maps non-litigation template %s to %s", (template, expected) => {
      for (const cat of nonLitigationCategories) {
        expect(suggestFolderByTemplateCategory(template as any, cat)).toBe(expected);
      }
    });

    it("returns null for unknown templateCategory", () => {
      expect(suggestFolderByTemplateCategory("UNKNOWN_TEMPLATE" as any, "CIVIL_COMMERCIAL")).toBeNull();
      expect(suggestFolderByTemplateCategory("UNKNOWN_TEMPLATE" as any, "NON_LITIGATION")).toBeNull();
    });

    it("handles edge templateCategory empty string", () => {
      // Should return null as not in map
      expect(suggestFolderByTemplateCategory("", "CIVIL_COMMERCIAL")).toBeNull();
    });
  });
});
