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

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  normalizeStageSteps,
  seedStagesFromTemplate,
  MAX_TEMPLATE_STEPS
} from "./stage-template";

describe("normalizeStageSteps", () => {
  it("map + sắp xếp theo order", () => {
    expect(
      normalizeStageSteps([
        { name: "  Chuẩn bị  ", order: 2 },
        { name: "Tiếp nhận", order: 1 }
      ])
    ).toEqual([
      { name: "Tiếp nhận", order: 1 },
      { name: "Chuẩn bị", order: 2 }
    ]);
  });

  it("bỏ mục thiếu tên / chỉ khoảng trắng / không phải object", () => {
    expect(
      normalizeStageSteps([
        { name: "A", order: 1 },
        { name: "   ", order: 2 },
        { name: "", order: 3 },
        null,
        "chuỗi",
        42,
        { order: 9 }
      ])
    ).toEqual([{ name: "A", order: 1 }]);
  });

  it("ghép order khi thiếu lấy thứ tự lướt", () => {
    expect(
      normalizeStageSteps([{ name: "A" }, { name: "B" }, { name: "C" }])
    ).toEqual([
      { name: "A", order: 1 },
      { name: "B", order: 2 },
      { name: "C", order: 3 }
    ]);
  });

  it("trả rỗng cho input không hợp lệ", () => {
    expect(normalizeStageSteps(undefined)).toEqual([]);
    expect(normalizeStageSteps(null)).toEqual([]);
    expect(normalizeStageSteps({ steps: [] })).toEqual([]);
    expect(normalizeStageSteps("x")).toEqual([]);
  });

  it("chặn tối đa 50 bước", () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ name: `S${i}`, order: i + 1 }));
    expect(normalizeStageSteps(many)).toHaveLength(MAX_TEMPLATE_STEPS);
  });
});

function makeClient(steps: unknown | null) {
  return {
    stageTemplate: {
      findUnique: vi.fn().mockResolvedValue(steps === null ? null : { steps })
    },
    matterStage: { createMany: vi.fn().mockResolvedValue({ count: 0 }) }
  };
}

describe("seedStagesFromTemplate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("đọc mẫu default-{procedureType} và tạo stage, trả số lượng", async () => {
    const client = makeClient([{ name: "Tiếp nhận", order: 1 }, { name: "Xử lý", order: 2 }]);
    const count = await seedStagesFromTemplate(client, "proc-1", "FIRST_INSTANCE");
    expect(client.stageTemplate.findUnique).toHaveBeenCalledWith({
      where: { id: "default-FIRST_INSTANCE" }
    });
    expect(client.matterStage.createMany).toHaveBeenCalledWith({
      data: [
        { procedureId: "proc-1", name: "Tiếp nhận", order: 1 },
        { procedureId: "proc-1", name: "Xử lý", order: 2 }
      ]
    });
    expect(count).toBe(0); // mock trả count 0
  });

  it("không có mẫu → 0, không tạo stage", async () => {
    const client = makeClient(null);
    expect(await seedStagesFromTemplate(client, "proc-1", "INVESTIGATION")).toBe(0);
    expect(client.matterStage.createMany).not.toHaveBeenCalled();
  });

  it("mẫu rỗng/hỏng → 0, không tạo stage", async () => {
    expect(await seedStagesFromTemplate(makeClient([]), "p", "INVESTIGATION")).toBe(0);
    const broken = makeClient([{ name: "  ", order: 1 }, null]);
    expect(await seedStagesFromTemplate(broken, "p", "INVESTIGATION")).toBe(0);
    expect(broken.matterStage.createMany).not.toHaveBeenCalled();
  });

  it("trả đúng count khi tạo thành công", async () => {
    const client = makeClient([{ name: "A", order: 1 }]);
    client.matterStage.createMany.mockResolvedValue({ count: 1 });
    expect(await seedStagesFromTemplate(client, "proc-9", "ADMIN_RECONSIDERATION")).toBe(1);
  });
});
