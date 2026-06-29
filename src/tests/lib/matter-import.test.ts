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
    expect(parseCategoryLabel("Dân sự - Thương mại")).toBe("CIVIL_COMMERCIAL");
    expect(parseCategoryLabel("Lao động & Trọng tài")).toBe("LABOR_ARBITRATION");
    expect(parseCategoryLabel("Thương mại & Trọng tài")).toBe("COMMERCIAL_ARBITRATION");
    expect(parseCategoryLabel("Hình sự")).toBe("CRIMINAL");
    expect(parseCategoryLabel("Hành chính")).toBe("ADMINISTRATIVE");
    expect(parseCategoryLabel("Phi tố tụng")).toBe("NON_LITIGATION");
    expect(parseCategoryLabel("Tư vấn")).toBe("LEGAL_COUNSEL");
    expect(parseCategoryLabel("Dự án đặc biệt")).toBe("SPECIAL_PROJECT");
    expect(parseCategoryLabel("Không tồn tại")).toBeNull();
  });

  it("案件状态反查（兼容「结案」）", () => {
    expect(parseStatusLabel("Đang xử lý")).toBe("IN_PROGRESS");
    expect(parseStatusLabel("Đã kết thúc")).toBe("CLOSED");
    expect(parseStatusLabel("已结案")).toBe("CLOSED");
    expect(parseStatusLabel("Đã lưu trữ")).toBe("ARCHIVED");
    expect(parseStatusLabel("Chờ khởi động")).toBe("PENDING_ACCEPTANCE");
    expect(parseStatusLabel("Tạm dừng")).toBe("ON_HOLD");
    expect(parseStatusLabel("Sai")).toBeNull();
  });

  it("个人/企业 → PartyType / ClientType", () => {
    expect(parsePartyType("Công ty")).toBe("COMPANY");
    expect(parsePartyType("Cá nhân")).toBe("NATURAL_PERSON");
    expect(parsePartyType("")).toBe("NATURAL_PERSON");
    expect(parseClientType("Công ty")).toBe("COMPANY");
    expect(parseClientType(undefined)).toBe("INDIVIDUAL");
  });

  it("日期 / 金额解析", () => {
    expect(parseImportDate("2026-05-30")?.getFullYear()).toBe(2026);
    expect(parseImportDate("2026/5/3")?.getMonth()).toBe(4);
    expect(parseImportDate("Không hợp lệ")).toBeNull();
    expect(parseAmount("120,000")).toBe(120000);
    expect(parseAmount("¥12万")).toBeNull(); // 「万」không phân tích
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
    opposingType: "Công ty",
    category: "Dân sự - Thương mại",
    status: "Đang xử lý",
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
    expect(errors.some((e) => e.includes("tên khách hàng"))).toBe(true);
    expect(errors.some((e) => e.includes("Loại vụ án"))).toBe(true);
  });

  it("收案日期格式错误报错", () => {
    const { errors } = validateRow({ ...okRow, intakeDate: "30/05/2026" });
    expect(errors.some((e) => e.includes("Ngày nhận vụ án"))).toBe(true);
  });
});
