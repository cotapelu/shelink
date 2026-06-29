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
import { describe, it, expect } from "vitest";
import {
  parseCategoryLabel,
  parseStatusLabel,
  parsePartyType,
  parseClientType,
  parseImportDate,
  parseAmount,
  buildMatterTitle,
  firstProcedureTypeFor,
  validateRow,
  type RawRow
} from "@/lib/imports/matter-import";

describe("批量导入 — 文本映射", () => {
  it("案件类型反查", () => {
    expect(parseCategoryLabel("民商诉讼")).toBe("CIVIL_COMMERCIAL");
    expect(parseCategoryLabel("劳动仲裁")).toBe("LABOR_ARBITRATION");
    expect(parseCategoryLabel("不存在")).toBeNull();
  });

  it("案件状态反查（兼容「结案」）", () => {
    expect(parseStatusLabel("办理中")).toBe("IN_PROGRESS");
    expect(parseStatusLabel("已结案")).toBe("CLOSED");
    expect(parseStatusLabel("结案")).toBe("CLOSED");
    expect(parseStatusLabel("已归档")).toBe("ARCHIVED");
    expect(parseStatusLabel("乱填")).toBeNull();
  });

  it("个人/企业 → PartyType / ClientType", () => {
    expect(parsePartyType("企业")).toBe("COMPANY");
    expect(parsePartyType("个人")).toBe("NATURAL_PERSON");
    expect(parsePartyType("")).toBe("NATURAL_PERSON");
    expect(parseClientType("企业")).toBe("COMPANY");
    expect(parseClientType(undefined)).toBe("INDIVIDUAL");
  });

  it("日期 / 金额解析", () => {
    expect(parseImportDate("2026-05-30")?.getFullYear()).toBe(2026);
    expect(parseImportDate("2026/5/3")?.getMonth()).toBe(4);
    expect(parseImportDate("无效")).toBeNull();
    expect(parseAmount("120,000")).toBe(120000);
    expect(parseAmount("¥12万")).toBeNull(); // 「万」不解析
    expect(parseAmount("")).toBeNull();
  });

  it("标题生成无重复空格", () => {
    expect(buildMatterTitle("张三", "某公司", "买卖合同纠纷")).toBe("张三 与 某公司 买卖合同纠纷");
    expect(buildMatterTitle("张三", "某公司", null)).toBe("张三 与 某公司");
  });

  it("首程序类型推断与收案转化一致", () => {
    expect(firstProcedureTypeFor("CIVIL_COMMERCIAL")).toBe("FIRST_INSTANCE");
    expect(firstProcedureTypeFor("CRIMINAL")).toBe("FIRST_INSTANCE");
    expect(firstProcedureTypeFor("NON_LITIGATION")).toBe("NON_LITIGATION_PHASE");
    expect(firstProcedureTypeFor("LABOR_ARBITRATION")).toBe("NON_LITIGATION_PHASE");
  });
});

describe("批量导入 — 单行校验", () => {
  const okRow: RawRow = {
    clientName: "张三",
    clientIdNumber: "110101199001011234",
    opposingName: "某公司",
    opposingIdNumber: "91110000MA01XXXX1A",
    opposingType: "企业",
    category: "民商诉讼",
    status: "办理中",
    claimAmount: "120000"
  };

  it("合法行通过并归一化", () => {
    const { errors, normalized } = validateRow(okRow);
    expect(errors).toHaveLength(0);
    expect(normalized).not.toBeNull();
    expect(normalized?.category).toBe("CIVIL_COMMERCIAL");
    expect(normalized?.status).toBe("IN_PROGRESS");
    expect(normalized?.opposingPartyType).toBe("COMPANY");
    expect(normalized?.claimAmount).toBe(120000);
  });

  it("缺必填项报错且 normalized 为 null", () => {
    const { errors, normalized } = validateRow({ ...okRow, clientName: "", category: "瞎填" });
    expect(normalized).toBeNull();
    expect(errors.some((e) => e.includes("客户名称"))).toBe(true);
    expect(errors.some((e) => e.includes("案件类型"))).toBe(true);
  });

  it("收案日期格式错误报错", () => {
    const { errors } = validateRow({ ...okRow, intakeDate: "2026年5月" });
    expect(errors.some((e) => e.includes("收案日期"))).toBe(true);
  });
});
