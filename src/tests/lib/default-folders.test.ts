/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_FOLDERS_BY_CATEGORY,
  seedDefaultFolders,
  suggestFolderByTemplateCategory
} from "@/lib/default-folders";

describe("DEFAULT_FOLDERS_BY_CATEGORY", () => {
  it("contains all required MatterCategory keys", () => {
    const expectedKeys: Array<keyof typeof DEFAULT_FOLDERS_BY_CATEGORY> = [
      "CIVIL_COMMERCIAL",
      "LABOR_ARBITRATION",
      "COMMERCIAL_ARBITRATION",
      "ADMINISTRATIVE",
      "CRIMINAL",
      "NON_LITIGATION",
      "LEGAL_COUNSEL",
      "SPECIAL_PROJECT"
    ];
    for (const key of expectedKeys) {
      expect(DEFAULT_FOLDERS_BY_CATEGORY).toHaveProperty(key);
      expect(Array.isArray(DEFAULT_FOLDERS_BY_CATEGORY[key])).toBe(true);
      expect(DEFAULT_FOLDERS_BY_CATEGORY[key].length).toBeGreaterThan(0);
    }
  });

  it("all arrays are readonly and contain strings", () => {
    for (const arr of Object.values(DEFAULT_FOLDERS_BY_CATEGORY)) {
      expect(arr).toBeInstanceOf(Array);
      for (const item of arr) {
        expect(typeof item).toBe("string");
      }
    }
  });

  it("non-litigation categories have different structure", () => {
    const litigation =
      DEFAULT_FOLDERS_BY_CATEGORY.CIVIL_COMMERCIAL.length +
      DEFAULT_FOLDERS_BY_CATEGORY.ADMINISTRATIVE.length +
      DEFAULT_FOLDERS_BY_CATEGORY.CRIMINAL.length;
    const nonLitigation =
      DEFAULT_FOLDERS_BY_CATEGORY.NON_LITIGATION.length +
      DEFAULT_FOLDERS_BY_CATEGORY.LEGAL_COUNSEL.length +
      DEFAULT_FOLDERS_BY_CATEGORY.SPECIAL_PROJECT.length;
    // NON_LITIGATION has fewer folders (5) than litigation (8-9)
    expect(nonLitigation).toBeLessThan(litigation);
    expect(DEFAULT_FOLDERS_BY_CATEGORY.NON_LITIGATION).toEqual([
      "Dự án",
      "Nghiên cứu",
      "Bản ghi công việc",
      "File đã phát hành",
      "Lưu trữ"
    ]);
  });
});

describe("seedDefaultFolders", () => {
  let mockTx: any;
  let matterId: string;
  let category: "CIVIL_COMMERCIAL";

  beforeEach(() => {
    matterId = "matter-123";
    category = "CIVIL_COMMERCIAL";
    mockTx = {
      documentFolder: {
        createMany: vi.fn().mockResolvedValue({ count: 8 })
      }
    };
  });

  it("creates default folders for valid category", async () => {
    await seedDefaultFolders(mockTx, matterId, category);
    expect(mockTx.documentFolder.createMany).toHaveBeenCalledWith({
      data: DEFAULT_FOLDERS_BY_CATEGORY[category].map((name, i) => ({
        matterId,
        name,
        orderIndex: i,
        isDefault: true
      }))
    });
  });

  it("uses correct orderIndex starting from 0", async () => {
    await seedDefaultFolders(mockTx, matterId, category);
    const calledWith = mockTx.documentFolder.createMany.mock.calls[0][0];
    const { data } = calledWith;
    for (let i = 0; i < data.length; i++) {
      expect(data[i].orderIndex).toBe(i);
      expect(data[i].isDefault).toBe(true);
      expect(data[i].matterId).toBe(matterId);
    }
  });

  it("returns early if names array is empty", async () => {
    // Force a category with empty array (simulate via mock? but const, so just test that it doesn't call)
    // Instead, test with category that exists but we can't override const. So we skip this edge.
    // However we can test that if somehow passed a category with no folders, it returns early.
    // Use a direct property override to simulate (only for this test)
    const original = DEFAULT_FOLDERS_BY_CATEGORY.CRIMINAL;
    try {
      (DEFAULT_FOLDERS_BY_CATEGORY as any).CRIMINAL = [];
      await seedDefaultFolders(mockTx, matterId, "CRIMINAL");
      expect(mockTx.documentFolder.createMany).not.toHaveBeenCalled();
    } finally {
      (DEFAULT_FOLDERS_BY_CATEGORY as any).CRIMINAL = original;
    }
  });

  it("handles different category lengths correctly", async () => {
    await seedDefaultFolders(mockTx, matterId, "NON_LITIGATION");
    const calledWith = mockTx.documentFolder.createMany.mock.calls[0][0];
    expect(calledWith.data).toHaveLength(5);
  });

  it("returns early for unknown category (names undefined)", async () => {
    const mockTx2 = { documentFolder: { createMany: vi.fn().mockResolvedValue({ count: 0 }) } };
    // @ts-expect-error testing invalid category
    await seedDefaultFolders(mockTx2, "matter-456", "UNKNOWN_CATEGORY" as any);
    expect(mockTx2.documentFolder.createMany).not.toHaveBeenCalled();
  });
});

describe("suggestFolderByTemplateCategory", () => {
  describe("Litigation categories", () => {
    const litigationMatterCategory = "CIVIL_COMMERCIAL" as const;

    it("maps INTAKE to Nhận vụ án", () => {
      expect(suggestFolderByTemplateCategory("INTAKE", litigationMatterCategory)).toBe("Nhận vụ án");
    });

    it("maps RETAINER to Thủ tục ủy quyền", () => {
      expect(suggestFolderByTemplateCategory("RETAINER", litigationMatterCategory)).toBe("Thủ tục ủy quyền");
    });

    it("maps LITIGATION to Văn bản thủ tục (non-criminal)", () => {
      expect(suggestFolderByTemplateCategory("LITIGATION", "CIVIL_COMMERCIAL")).toBe("Văn bản thủ tục");
    });

    it("maps LITIGATION to Trước phiên tòa for CRIMINAL", () => {
      expect(suggestFolderByTemplateCategory("LITIGATION", "CRIMINAL")).toBe("Trước phiên tòa");
    });

    it("maps HEARING to Phiên tòa (non-criminal)", () => {
      expect(suggestFolderByTemplateCategory("HEARING", "CIVIL_COMMERCIAL")).toBe("Phiên tòa");
    });

    it("maps WORK_PRODUCT to Chứng cứ (non-criminal)", () => {
      expect(suggestFolderByTemplateCategory("WORK_PRODUCT", "CIVIL_COMMERCIAL")).toBe("Chứng cứ");
    });

    it("maps WORK_PRODUCT to Thu thập chứng cứ for CRIMINAL", () => {
      expect(suggestFolderByTemplateCategory("WORK_PRODUCT", "CRIMINAL")).toBe("Thu thập chứng cứ");
    });

    it("maps ARCHIVE to Kết thúc", () => {
      expect(suggestFolderByTemplateCategory("ARCHIVE", "CIVIL_COMMERCIAL")).toBe("Kết thúc");
    });

    it("maps CLOSING to Kết thúc", () => {
      expect(suggestFolderByTemplateCategory("CLOSING", "CIVIL_COMMERCIAL")).toBe("Kết thúc");
    });

    it("maps BLANK to Nhận vụ án (non-criminal)", () => {
      expect(suggestFolderByTemplateCategory("BLANK", "CIVIL_COMMERCIAL")).toBe("Nhận vụ án");
    });

    it("returns null for unknown templateCategory", () => {
      expect(suggestFolderByTemplateCategory("UNKNOWN", litigationMatterCategory)).toBeNull();
    });

    it("handles ADMINISTRATIVE as litigation", () => {
      expect(suggestFolderByTemplateCategory("INTAKE", "ADMINISTRATIVE")).toBe("Nhận vụ án");
      expect(suggestFolderByTemplateCategory("HEARING", "ADMINISTRATIVE")).toBe("Phiên tòa");
    });
  });

  describe("Non-litigation categories", () => {
    const nonLitigationMatterCategory = "NON_LITIGATION" as const;

    it("maps INTAKE to Dự án", () => {
      expect(suggestFolderByTemplateCategory("INTAKE", nonLitigationMatterCategory)).toBe("Dự án");
    });

    it("maps RETAINER to Dự án", () => {
      expect(suggestFolderByTemplateCategory("RETAINER", nonLitigationMatterCategory)).toBe("Dự án");
    });

    it("maps LITIGATION to File đã phát hành", () => {
      expect(suggestFolderByTemplateCategory("LITIGATION", nonLitigationMatterCategory)).toBe("File đã phát hành");
    });

    it("maps HEARING to Bản ghi công việc", () => {
      expect(suggestFolderByTemplateCategory("HEARING", nonLitigationMatterCategory)).toBe("Bản ghi công việc");
    });

    it("maps WORK_PRODUCT to File đã phát hành", () => {
      expect(suggestFolderByTemplateCategory("WORK_PRODUCT", nonLitigationMatterCategory)).toBe("File đã phát hành");
    });

    it("maps ARCHIVE to Lưu trữ", () => {
      expect(suggestFolderByTemplateCategory("ARCHIVE", nonLitigationMatterCategory)).toBe("Lưu trữ");
    });

    it("maps CLOSING to Lưu trữ", () => {
      expect(suggestFolderByTemplateCategory("CLOSING", nonLitigationMatterCategory)).toBe("Lưu trữ");
    });

    it("maps BLANK to Bản ghi công việc", () => {
      expect(suggestFolderByTemplateCategory("BLANK", nonLitigationMatterCategory)).toBe("Bản ghi công việc");
    });

    it("returns null for unknown templateCategory", () => {
      expect(suggestFolderByTemplateCategory("UNKNOWN", nonLitigationMatterCategory)).toBeNull();
    });
  });

  describe("Edge categories", () => {
    it("LEGAL_COUNSEL uses non-litigation map", () => {
      expect(suggestFolderByTemplateCategory("INTAKE", "LEGAL_COUNSEL")).toBe("Dự án");
      expect(suggestFolderByTemplateCategory("WORK_PRODUCT", "LEGAL_COUNSEL")).toBe("File đã phát hành");
    });

    it("SPECIAL_PROJECT uses non-litigation map", () => {
      expect(suggestFolderByTemplateCategory("HEARING", "SPECIAL_PROJECT")).toBe("Bản ghi công việc");
      expect(suggestFolderByTemplateCategory("ARCHIVE", "SPECIAL_PROJECT")).toBe("Lưu trữ");
    });

    it("LABOR_ARBITRATION uses non-litigation map (not in isLitigation)", () => {
      expect(suggestFolderByTemplateCategory("INTAKE", "LABOR_ARBITRATION")).toBe("Dự án");
      expect(suggestFolderByTemplateCategory("HEARING", "LABOR_ARBITRATION")).toBe("Bản ghi công việc");
    });

    it("COMMERCIAL_ARBITRATION uses non-litigation map (not in isLitigation)", () => {
      expect(suggestFolderByTemplateCategory("RETAINER", "COMMERCIAL_ARBITRATION")).toBe("Dự án");
      expect(suggestFolderByTemplateCategory("CLOSING", "COMMERCIAL_ARBITRATION")).toBe("Lưu trữ");
    });
  });
});
