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
  emptyToNull,
  requireApprover,
  generateTitle,
  clientTypeToPartyType,
  normalizeConflictQuery,
  conflictQueryKey,
  formatConflictQuery,
  buildExpectedConflictQueries,
  getCheckedConflictQueries,
  assertConflictReviewAllowsConversion,
  type IntakeConflictGateInput
} from "@/server/intakes/helpers";

describe("emptyToNull", () => {
  it("converts empty strings to null", () => {
    const input = { a: "", b: "value", c: "" };
    const result = emptyToNull(input);
    expect(result).toEqual({ a: null, b: "value", c: null });
  });

  it("preserves non-string values", () => {
    const input = { a: 0, b: false, c: null };
    const result = emptyToNull(input);
    expect(result).toEqual({ a: 0, b: false, c: null });
  });
});

describe("requireApprover", () => {
  it("allows ADMIN", () => expect(() => requireApprover("ADMIN")).not.toThrow());
  it("allows PRINCIPAL_LAWYER", () => expect(() => requireApprover("PRINCIPAL_LAWYER")).not.toThrow());
  it("denies LAWYER", () => expect(() => requireApprover("LAWYER")).toThrow("Chỉ quản trị viên hoặc luật sư chính"));
  it("denies ASSISTANT", () => expect(() => requireApprover("ASSISTANT")).toThrow("Chỉ quản trị viên hoặc luật sư chính"));
});

describe("generateTitle", () => {
  it("generates title with client and opposing", () => {
    expect(generateTitle("Công ty ABC", ["Cá nhân XYZ"], "Tranh chấp hợp đồng")).toBe("Công ty ABC và Cá nhân XYZ - Tranh chấp hợp đồng");
  });

  it("uses placeholder for null client", () => {
    expect(generateTitle(null, ["Bên đối phương"], "Vụ án")).toBe("Chưa có bên ủy quyền và Bên đối phương - Vụ án");
  });

  it("uses placeholder for empty opposing", () => {
    expect(generateTitle("Bên ủy quyền", [], "Nguyên nhân")).toBe("Bên ủy quyền và Chưa có bên đối phương - Nguyên nhân");
  });

  it("handles both nulls", () => {
    expect(generateTitle(null, [], "Vụ án")).toBe("Chưa có bên ủy quyền và Chưa có bên đối phương - Vụ án");
  });

  it("trims whitespace from all parts", () => {
    expect(generateTitle("  client  ", ["  opp  "], "  cause  ")).toBe("client và opp - cause");
  });
});

describe("clientTypeToPartyType", () => {
  it("maps INDIVIDUAL to NATURAL_PERSON", () => expect(clientTypeToPartyType("INDIVIDUAL")).toBe("NATURAL_PERSON"));
  it("maps COMPANY to COMPANY", () => expect(clientTypeToPartyType("COMPANY")).toBe("COMPANY"));
  it("maps others to OTHER_ORG", () => expect(clientTypeToPartyType("FIRM" as any)).toBe("OTHER_ORG"));
});

describe("conflict query utilities", () => {
  describe("normalizeConflictQuery", () => {
    it("returns null for invalid role", () => expect(normalizeConflictQuery({ role: "INVALID", name: "test", idNumber: "123" })).toBeNull());
    it("returns null when both name and idNumber empty", () => expect(normalizeConflictQuery({ role: "CLIENT_PARTY", name: "   ", idNumber: "" })).toBeNull());
    it("creates with name only", () => expect(normalizeConflictQuery({ role: "OPPOSING_PARTY", name: "对方", idNumber: "" })).toEqual({ role: "OPPOSING_PARTY", name: "对方", idNumber: "" }));
    it("creates with idNumber only", () => expect(normalizeConflictQuery({ role: "THIRD_PARTY", name: "", idNumber: "123456" })).toEqual({ role: "THIRD_PARTY", name: "", idNumber: "123456" }));
    it("trims", () => expect(normalizeConflictQuery({ role: "CLIENT_PARTY", name: "  name  ", idNumber: "  id  " })).toEqual({ role: "CLIENT_PARTY", name: "name", idNumber: "id" }));
  });

  describe("buildExpectedConflictQueries", () => {
    it("builds from client", () => {
      const intake: IntakeConflictGateInput = { client: { name: "c", idNumber: "123" }, parties: [], conflictChecks: [] };
      expect(buildExpectedConflictQueries(intake)).toEqual([{ role: "CLIENT_PARTY", name: "c", idNumber: "123" }]);
    });

    it("builds from parties", () => {
      const intake: IntakeConflictGateInput = { client: null, parties: [{ role: "OPPOSING_PARTY", name: "o", idNumber: "456" }], conflictChecks: [] };
      expect(buildExpectedConflictQueries(intake)).toEqual([{ role: "OPPOSING_PARTY", name: "o", idNumber: "456" }]);
    });

    it("skips empty party", () => {
      const intake: IntakeConflictGateInput = { client: null, parties: [{ role: "OPPOSING_PARTY", name: "", idNumber: "" }], conflictChecks: [] };
      expect(buildExpectedConflictQueries(intake)).toEqual([]);
    });
  });

  describe("getCheckedConflictQueries", () => {
    it("extracts from payload", () => {
      const payload = { queries: [{ role: "CLIENT_PARTY", name: "a", idNumber: "1" }] };
      expect(getCheckedConflictQueries(payload)).toEqual([{ role: "CLIENT_PARTY", name: "a", idNumber: "1" }]);
    });

    it("filters invalid", () => {
      const payload = { queries: [{ role: "BAD", name: "x" }, null, { role: "CLIENT_PARTY", name: "c", idNumber: "3" }] };
      expect(getCheckedConflictQueries(payload)).toEqual([{ role: "CLIENT_PARTY", name: "c", idNumber: "3" }]);
    });

    it("handles empty", () => {
      expect(getCheckedConflictQueries(null as any)).toEqual([]);
      expect(getCheckedConflictQueries({ queries: "bad" as any })).toEqual([]);
    });
  });

  describe("conflictQueryKey & formatConflictQuery", () => {
    it("generates key", () => expect(conflictQueryKey({ role: "CLIENT_PARTY", name: "a", idNumber: "1" })).toBe("CLIENT_PARTY|a|1"));
    it("formats", () => {
      expect(formatConflictQuery({ role: "CLIENT_PARTY", name: "client", idNumber: "123" })).toBe('Bên ủy quyền "client"');
      expect(formatConflictQuery({ role: "OPPOSING_PARTY", name: "opp", idNumber: "" })).toBe('Bên đối phương "opp"');
    });
  });

  describe("assertConflictReviewAllowsConversion", () => {
    const baseCheck = (opts: any = {}) => ({
      conclusion: opts.conclusion || "DIFFERENT",
      note: opts.note || "",
      queryPayload: opts.queryPayload || { queries: [] },
      hits: opts.hits || []
    });

    const makeIntake = (client: any, parties: any[] = [], checks: any[] = []): IntakeConflictGateInput => ({
      client,
      parties,
      conflictChecks: checks
    });

    it("throws if no expected queries", () => {
      expect(() => assertConflictReviewAllowsConversion(makeIntake(null, []))).toThrow("Cần bổ sung bên ủy quyền hoặc bên đối phương");
    });

    it("throws if no checks", () => {
      expect(() => assertConflictReviewAllowsConversion(makeIntake({ name: "c", idNumber: "123" }, []))).toThrow("Phải chạy kiểm tra xung đột lợi ích");
    });

    it("throws if missing query", () => {
      const intake = makeIntake({ name: "c", idNumber: "123" }, [], [baseCheck({ queryPayload: { queries: [{ role: "OPPOSING_PARTY", name: "o", idNumber: "456" }] }})]);
      expect(() => assertConflictReviewAllowsConversion(intake)).toThrow("Thiếu: Bên ủy quyền");
    });

    it("throws if conclusion not DIFFERENT", () => {
      const intake = makeIntake({ name: "c", idNumber: "123" }, [], [baseCheck({ conclusion: "PENDING", queryPayload: { queries: [{ role: "CLIENT_PARTY", name: "c", idNumber: "123" }] }})]);
      expect(() => assertConflictReviewAllowsConversion(intake)).toThrow("chưa có kết luận");
    });

    it("throws if high risk without note", () => {
      const intake = makeIntake({ name: "c", idNumber: "123" }, [], [baseCheck({
        conclusion: "DIFFERENT",
        queryPayload: { queries: [{ role: "CLIENT_PARTY", name: "c", idNumber: "123" }] },
        hits: [{ severity: "HIGH" }]
      })]);
      expect(() => assertConflictReviewAllowsConversion(intake)).toThrow("rủi ro cao hoặc chặn");
    });

    it("allows when ok", () => {
      const intake = makeIntake(
        { name: "c", idNumber: "123" },
        [{ role: "OPPOSING_PARTY", name: "o", idNumber: "456" }],
        [baseCheck({
          conclusion: "DIFFERENT",
          queryPayload: { queries: [{ role: "CLIENT_PARTY", name: "c", idNumber: "123" }, { role: "OPPOSING_PARTY", name: "o", idNumber: "456" }] },
          hits: []
        })]
      );
      expect(() => assertConflictReviewAllowsConversion(intake)).not.toThrow();
    });

    it("throws if conclusion is PENDING", () => {
      const intake = makeIntake({ name: "c", idNumber: "123" }, [], [baseCheck({ conclusion: "PENDING", queryPayload: { queries: [{ role: "CLIENT_PARTY", name: "c", idNumber: "123" }] }})]);
      expect(() => assertConflictReviewAllowsConversion(intake)).toThrow("chưa có kết luận");
    });

    it("throws if conclusion is NEED_INFO", () => {
      const intake = makeIntake({ name: "c", idNumber: "123" }, [], [baseCheck({ conclusion: "NEED_INFO", queryPayload: { queries: [{ role: "CLIENT_PARTY", name: "c", idNumber: "123" }] }})]);
      expect(() => assertConflictReviewAllowsConversion(intake)).toThrow("thông tin chưa đủ");
    });

    it("throws if conclusion is SAME_SUBJECT", () => {
      const intake = makeIntake({ name: "c", idNumber: "123" }, [], [baseCheck({ conclusion: "SAME_SUBJECT", queryPayload: { queries: [{ role: "CLIENT_PARTY", name: "c", idNumber: "123" }] }})]);
      expect(() => assertConflictReviewAllowsConversion(intake)).toThrow("Đã xác nhận có xung đột lợi ích");
    });

    it("throws if conclusion is unknown value", () => {
      const intake = makeIntake({ name: "c", idNumber: "123" }, [], [baseCheck({ conclusion: "UNKNOWN" as any, queryPayload: { queries: [{ role: "CLIENT_PARTY", name: "c", idNumber: "123" }] }})]);
      expect(() => assertConflictReviewAllowsConversion(intake)).toThrow("bất thường");
    });

    it("throws if high risk with whitespace-only note (trim to empty)", () => {
      const intake = makeIntake({ name: "c", idNumber: "123" }, [], [baseCheck({
        conclusion: "DIFFERENT",
        queryPayload: { queries: [{ role: "CLIENT_PARTY", name: "c", idNumber: "123" }] },
        hits: [{ severity: "HIGH" }],
        note: "   "
      })]);
      expect(() => assertConflictReviewAllowsConversion(intake)).toThrow("rủi ro cao hoặc chặn");
    });
  });

  describe("getCheckedConflictQueries edge cases", () => {
    it("handles payload with queries undefined", () => {
      const payload = { queries: undefined as any };
      expect(getCheckedConflictQueries(payload)).toEqual([]);
    });

    it("handles payload with queries null", () => {
      const payload = { queries: null as any };
      expect(getCheckedConflictQueries(payload)).toEqual([]);
    });

    it("handles queries array where all normalized to null", () => {
      const payload = { queries: [{ role: "CLIENT_PARTY", name: "", idNumber: "   " }] };
      expect(getCheckedConflictQueries(payload)).toEqual([]);
    });
  });
});
