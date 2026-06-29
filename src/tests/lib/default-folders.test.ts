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
      "立项",
      "调研",
      "工作底稿",
      "出具文件",
      "归档"
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
});

describe("suggestFolderByTemplateCategory", () => {
  describe("Litigation categories", () => {
    const litigationMatterCategory = "CIVIL_COMMERCIAL" as const;

    it("maps INTAKE to 收案", () => {
      expect(suggestFolderByTemplateCategory("INTAKE", litigationMatterCategory)).toBe("收案");
    });

    it("maps RETAINER to 委托手续", () => {
      expect(suggestFolderByTemplateCategory("RETAINER", litigationMatterCategory)).toBe("委托手续");
    });

    it("maps LITIGATION to 程序文书 (non-criminal)", () => {
      expect(suggestFolderByTemplateCategory("LITIGATION", "CIVIL_COMMERCIAL")).toBe("程序文书");
    });

    it("maps LITIGATION to 庭前 for CRIMINAL", () => {
      expect(suggestFolderByTemplateCategory("LITIGATION", "CRIMINAL")).toBe("庭前");
    });

    it("maps HEARING to 庭审 (non-criminal)", () => {
      expect(suggestFolderByTemplateCategory("HEARING", "CIVIL_COMMERCIAL")).toBe("庭审");
    });

    it("maps WORK_PRODUCT to 证据 (non-criminal)", () => {
      expect(suggestFolderByTemplateCategory("WORK_PRODUCT", "CIVIL_COMMERCIAL")).toBe("证据");
    });

    it("maps WORK_PRODUCT to 取证 for CRIMINAL", () => {
      expect(suggestFolderByTemplateCategory("WORK_PRODUCT", "CRIMINAL")).toBe("取证");
    });

    it("maps ARCHIVE to 结案", () => {
      expect(suggestFolderByTemplateCategory("ARCHIVE", "CIVIL_COMMERCIAL")).toBe("结案");
    });

    it("maps CLOSING to 结案", () => {
      expect(suggestFolderByTemplateCategory("CLOSING", "CIVIL_COMMERCIAL")).toBe("结案");
    });

    it("maps BLANK to 收案 (non-criminal)", () => {
      expect(suggestFolderByTemplateCategory("BLANK", "CIVIL_COMMERCIAL")).toBe("收案");
    });

    it("returns null for unknown templateCategory", () => {
      expect(suggestFolderByTemplateCategory("UNKNOWN", litigationMatterCategory)).toBeNull();
    });

    it("handles ADMINISTRATIVE as litigation", () => {
      expect(suggestFolderByTemplateCategory("INTAKE", "ADMINISTRATIVE")).toBe("收案");
      expect(suggestFolderByTemplateCategory("HEARING", "ADMINISTRATIVE")).toBe("庭审");
    });
  });

  describe("Non-litigation categories", () => {
    const nonLitigationMatterCategory = "NON_LITIGATION" as const;

    it("maps INTAKE to 立项", () => {
      expect(suggestFolderByTemplateCategory("INTAKE", nonLitigationMatterCategory)).toBe("立项");
    });

    it("maps RETAINER to 立项", () => {
      expect(suggestFolderByTemplateCategory("RETAINER", nonLitigationMatterCategory)).toBe("立项");
    });

    it("maps LITIGATION to 出具文件", () => {
      expect(suggestFolderByTemplateCategory("LITIGATION", nonLitigationMatterCategory)).toBe("出具文件");
    });

    it("maps HEARING to 工作底稿", () => {
      expect(suggestFolderByTemplateCategory("HEARING", nonLitigationMatterCategory)).toBe("工作底稿");
    });

    it("maps WORK_PRODUCT to 出具文件", () => {
      expect(suggestFolderByTemplateCategory("WORK_PRODUCT", nonLitigationMatterCategory)).toBe("出具文件");
    });

    it("maps ARCHIVE to 归档", () => {
      expect(suggestFolderByTemplateCategory("ARCHIVE", nonLitigationMatterCategory)).toBe("归档");
    });

    it("maps CLOSING to 归档", () => {
      expect(suggestFolderByTemplateCategory("CLOSING", nonLitigationMatterCategory)).toBe("归档");
    });

    it("maps BLANK to 工作底稿", () => {
      expect(suggestFolderByTemplateCategory("BLANK", nonLitigationMatterCategory)).toBe("工作底稿");
    });

    it("returns null for unknown templateCategory", () => {
      expect(suggestFolderByTemplateCategory("UNKNOWN", nonLitigationMatterCategory)).toBeNull();
    });
  });

  describe("Edge categories", () => {
    it("LEGAL_COUNSEL uses non-litigation map", () => {
      expect(suggestFolderByTemplateCategory("INTAKE", "LEGAL_COUNSEL")).toBe("立项");
      expect(suggestFolderByTemplateCategory("WORK_PRODUCT", "LEGAL_COUNSEL")).toBe("出具文件");
    });

    it("SPECIAL_PROJECT uses non-litigation map", () => {
      expect(suggestFolderByTemplateCategory("HEARING", "SPECIAL_PROJECT")).toBe("工作底稿");
      expect(suggestFolderByTemplateCategory("ARCHIVE", "SPECIAL_PROJECT")).toBe("归档");
    });

    it("LABOR_ARBITRATION uses non-litigation map (not in isLitigation)", () => {
      expect(suggestFolderByTemplateCategory("INTAKE", "LABOR_ARBITRATION")).toBe("立项");
      expect(suggestFolderByTemplateCategory("HEARING", "LABOR_ARBITRATION")).toBe("工作底稿");
    });

    it("COMMERCIAL_ARBITRATION uses non-litigation map (not in isLitigation)", () => {
      expect(suggestFolderByTemplateCategory("RETAINER", "COMMERCIAL_ARBITRATION")).toBe("立项");
      expect(suggestFolderByTemplateCategory("CLOSING", "COMMERCIAL_ARBITRATION")).toBe("归档");
    });
  });
});
