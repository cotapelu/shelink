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
import { describe, expect, it } from "vitest";
import {
  invoiceMatterSearchLimit,
  invoiceMatterSearchWhere
} from "@/server/finance/invoice-matter-search";

describe("invoice matter search", () => {
  it("空关键词返回本人可关联案件条件", () => {
    expect(invoiceMatterSearchWhere("u1", "")).toEqual({
      deletedAt: null,
      OR: [
        { ownerId: "u1" },
        { members: { some: { userId: "u1" } } }
      ]
    });
    expect(invoiceMatterSearchLimit("")).toBe(12);
  });

  it("输入关键词后按案名、系统编号和所内案号筛选", () => {
    expect(invoiceMatterSearchWhere("u1", " 二审 ")).toEqual({
      deletedAt: null,
      AND: [
        {
          OR: [
            { ownerId: "u1" },
            { members: { some: { userId: "u1" } } }
          ]
        },
        {
          OR: [
            { title: { contains: "二审", mode: "insensitive" } },
            { internalCode: { contains: "二审", mode: "insensitive" } },
            { firmCaseNo: { contains: "二审", mode: "insensitive" } }
          ]
        }
      ]
    });
    expect(invoiceMatterSearchLimit(" 二审 ")).toBe(10);
  });
});
