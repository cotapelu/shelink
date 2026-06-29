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
  parseClientType,
  parsePartyType,
  parseImportDate,
  parseAmount,
  buildMatterTitle,
  firstProcedureTypeFor,
  validateRow,
  type NormalizedRow,
  type RowValidation
} from "@/lib/imports/matter-import";

describe("parseCategoryLabel", () => {
  it("maps all category labels to values", () => {
    expect(parseCategoryLabel("Dân sự - Thương mại")).toBe("CIVIL_COMMERCIAL");
    expect(parseCategoryLabel("Lao động & Trọng tài")).toBe("LABOR_ARBITRATION");
    expect(parseCategoryLabel("Thương mại & Trọng tài")).toBe("COMMERCIAL_ARBITRATION");
    expect(parseCategoryLabel("Hình sự")).toBe("CRIMINAL");
    expect(parseCategoryLabel("Hành chính")).toBe("ADMINISTRATIVE");
    expect(parseCategoryLabel("Phi tố tụng")).toBe("NON_LITIGATION");
    expect(parseCategoryLabel("Tư vấn")).toBe("LEGAL_COUNSEL");
    expect(parseCategoryLabel("Dự án đặc biệt")).toBe("SPECIAL_PROJECT");
  });

  it("returns null for unknown text", () => {
    expect(parseCategoryLabel("Unknown")).toBeNull();
    expect(parseCategoryLabel("")).toBeNull();
  });

  it("trims whitespace", () => {
    expect(parseCategoryLabel(" Dân sự - Thương mại ")).toBe("CIVIL_COMMERCIAL");
  });
});

describe("parseStatusLabel", () => {
  it("maps status labels", () => {
    expect(parseStatusLabel("Đang xử lý")).toBe("IN_PROGRESS");
    expect(parseStatusLabel("Đã kết thúc")).toBe("CLOSED");
    expect(parseStatusLabel("Đã lưu trữ")).toBe("ARCHIVED");
  });

  it("handles special case '已结案'", () => {
    expect(parseStatusLabel("已结案")).toBe("CLOSED");
  });

  it("returns null for unknown", () => {
    expect(parseStatusLabel("Pending")).toBeNull();
  });
});

describe("parseClientType", () => {
  it("defaults to INDIVIDUAL", () => {
    expect(parseClientType(undefined)).toBe("INDIVIDUAL");
    expect(parseClientType("")).toBe("INDIVIDUAL");
    expect(parseClientType("  ")).toBe("INDIVIDUAL");
  });

  it("detects COMPANY", () => {
    expect(parseClientType("Công ty")).toBe("COMPANY");
    expect(parseClientType("企业")).toBe("COMPANY");
    expect(parseClientType("公司")).toBe("COMPANY");
    expect(parseClientType("单位")).toBe("COMPANY");
  });

  it("preserves INDIVIDUAL for other strings", () => {
    expect(parseClientType("个人")).toBe("INDIVIDUAL");
    expect(parseClientType("自然人")).toBe("INDIVIDUAL");
  });
});

describe("parsePartyType", () => {
  it("defaults to NATURAL_PERSON", () => {
    expect(parsePartyType(undefined)).toBe("NATURAL_PERSON");
  });

  it("detects COMPANY", () => {
    expect(parsePartyType("Công ty")).toBe("COMPANY");
    expect(parsePartyType("企业")).toBe("COMPANY");
    expect(parsePartyType("公司")).toBe("COMPANY");
    expect(parsePartyType("单位")).toBe("COMPANY");
  });
});

describe("parseImportDate", () => {
  it("parses YYYY-MM-DD", () => {
    const result = parseImportDate("2024-01-15");
    expect(result).toEqual(new Date(2024, 0, 15));
  });

  it("parses YYYY/MM/DD", () => {
    const result = parseImportDate("2024/01/15");
    expect(result).toEqual(new Date(2024, 0, 15));
  });

  it("parses YYYY.MM.DD", () => {
    const result = parseImportDate("2024.01.15");
    expect(result).toEqual(new Date(2024, 0, 15));
  });

  it("returns null for empty", () => {
    expect(parseImportDate("")).toBeNull();
    expect(parseImportDate(undefined)).toBeNull();
  });

  it("returns null for clearly invalid strings", () => {
    expect(parseImportDate("not-a-date")).toBeNull();
    expect(parseImportDate("123")).toBeNull();
    expect(parseImportDate("")).toBeNull();
  });
});

describe("parseAmount", () => {
  it("parses plain number", () => {
    expect(parseAmount("1000")).toBe(1000);
    expect(parseAmount("0")).toBe(0);
  });

  it("removes commas and currency symbols", () => {
    expect(parseAmount("1,000")).toBe(1000);
    expect(parseAmount("¥1,000")).toBe(1000);
    expect(parseAmount("￥1000")).toBe(1000);
    expect(parseAmount("1000 元")).toBe(1000);
  });

  it("parses decimals", () => {
    expect(parseAmount("1234.56")).toBe(1234.56);
  });

  it("returns null for empty", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
  });

  it("returns null for invalid", () => {
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("-100")).toBeNull(); // negative not allowed
  });
});

describe("buildMatterTitle", () => {
  it("builds title with cause", () => {
    expect(buildMatterTitle("Client A", "Opp B", "Contract Dispute"))
      .toBe("Client A 与 Opp B Contract Dispute");
  });

  it("builds title without cause", () => {
    expect(buildMatterTitle("Client A", "Opp B", null))
      .toBe("Client A 与 Opp B");
  });

  it("trims whitespace", () => {
    expect(buildMatterTitle("  Client A  ", "  Opp B  ", "  Dispute  "))
      .toBe("Client A 与 Opp B Dispute");
  });

  it("handles empty cause", () => {
    expect(buildMatterTitle("Client", "Opp", "")).toBe("Client 与 Opp");
  });
});

describe("firstProcedureTypeFor", () => {
  it("returns FIRST_INSTANCE for litigation categories", () => {
    expect(firstProcedureTypeFor("CIVIL_COMMERCIAL")).toBe("FIRST_INSTANCE");
    expect(firstProcedureTypeFor("CRIMINAL")).toBe("FIRST_INSTANCE");
    expect(firstProcedureTypeFor("ADMINISTRATIVE")).toBe("FIRST_INSTANCE");
  });

  it("returns NON_LITIGATION_PHASE for others", () => {
    expect(firstProcedureTypeFor("NON_LITIGATION")).toBe("NON_LITIGATION_PHASE");
    expect(firstProcedureTypeFor("LEGAL_COUNSEL")).toBe("NON_LITIGATION_PHASE");
    expect(firstProcedureTypeFor("SPECIAL_PROJECT")).toBe("NON_LITIGATION_PHASE");
  });
});

describe("validateRow", () => {
  const minimalValidRow: Record<string, string> = {
    clientName: "Client Co",
    clientIdNumber: "1234567890",
    opposingName: "Opponent Inc",
    opposingIdNumber: "0987654321",
    category: "Dân sự - Thương mại",
    status: "Đang xử lý"
  };

  it("accepts minimal valid row", () => {
    const result = validateRow(minimalValidRow);
    expect(result.errors).toHaveLength(0);
    expect(result.normalized).not.toBeNull();
    const n = result.normalized as NormalizedRow;
    expect(n.clientName).toBe("Client Co");
    expect(n.category).toBe("CIVIL_COMMERCIAL");
    expect(n.status).toBe("IN_PROGRESS");
    expect(n.clientType).toBe("INDIVIDUAL");
    expect(n.opposingPartyType).toBe("NATURAL_PERSON");
  });

  it("requires clientName", () => {
    const row = { ...minimalValidRow, clientName: "" };
    const result = validateRow(row);
    expect(result.errors).toContain("Thiếu tên khách hàng");
    expect(result.normalized).toBeNull();
  });

  it("requires clientIdNumber", () => {
    const row = { ...minimalValidRow, clientIdNumber: "" };
    const result = validateRow(row);
    expect(result.errors).toContain("Thiếu số căn cước khách hàng");
  });

  it("requires opposingName", () => {
    const row = { ...minimalValidRow, opposingName: "" };
    const result = validateRow(row);
    expect(result.errors).toContain("Thiếu tên đối phương");
  });

  it("requires opposingIdNumber", () => {
    const row = { ...minimalValidRow, opposingIdNumber: "" };
    const result = validateRow(row);
    expect(result.errors).toContain("Thiếu số căn cước đối phương");
  });

  it("validates category label", () => {
    const row = { ...minimalValidRow, category: "Invalid Category" };
    const result = validateRow(row);
    expect(result.errors).toContain(`Loại vụ án「Invalid Category」không nhận diện được`);
  });

  it("validates status label", () => {
    const row = { ...minimalValidRow, status: "Pending" };
    const result = validateRow(row);
    expect(result.errors).toContain(`Trạng thái vụ án「Pending」không nhận diện được (Đang xử lý/Đã kết thúc/Đã lưu trữ)`);
  });

  it("validates intake date format", () => {
    const row = { ...minimalValidRow, intakeDate: "invalid-date" };
    const result = validateRow(row);
    expect(result.errors.some(e => e.includes("Ngày nhận vụ án"))).toBe(true);
  });

  it("validates amount", () => {
    const row = { ...minimalValidRow, claimAmount: "not-a-number" };
    const result = validateRow(row);
    expect(result.errors.some(e => e.includes("Giá trị yêu cầu"))).toBe(true);
  });

  it("parses clientType correctly", () => {
    const row = { ...minimalValidRow, clientType: "企业" };
    const result = validateRow(row);
    expect(result.normalized?.clientType).toBe("COMPANY");
  });

  it("parses party types correctly", () => {
    const row = { ...minimalValidRow, opposingType: "公司" };
    const result = validateRow(row);
    expect(result.normalized?.opposingPartyType).toBe("COMPANY");
  });

  it("handles whitespace trimming", () => {
    const row: Record<string, string> = {
      clientName: "  Client  ",
      clientIdNumber: "  123  ",
      opposingName: "  Opp  ",
      opposingIdNumber: "  456  ",
      category: " Dân sự - Thương mại ",
      status: "Đang xử lý"
    };
    const result = validateRow(row);
    expect(result.normalized?.clientName).toBe("Client");
    expect(result.normalized?.clientIdNumber).toBe("123");
    expect(result.normalized?.opposingName).toBe("Opp");
    expect(result.normalized?.opposingIdNumber).toBe("456");
  });

  it("accepts optional fields as empty", () => {
    const row: Record<string, string> = {
      clientName: "Client",
      clientIdNumber: "123",
      opposingName: "Opp",
      opposingIdNumber: "456",
      category: "Dân sự - Thương mại",
      status: "Đang xử lý",
      ownerEmail: "",
      cause: "",
      claimAmount: "",
      jurisdiction: "",
      clientPhone: "",
      clientType: "",
      opposingType: ""
    };
    const result = validateRow(row);
    expect(result.errors).toHaveLength(0);
    const n = result.normalized as NormalizedRow;
    expect(n.ownerEmail).toBeNull();
    expect(n.causeText).toBeNull();
    expect(n.claimAmount).toBeNull();
    expect(n.jurisdiction).toBeNull();
    expect(n.clientPhone).toBeNull();
  });
});
