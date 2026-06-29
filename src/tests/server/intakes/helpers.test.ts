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
  it("denies LAWYER", () => expect(() => requireApprover("LAWYER")).toThrow("仅管理员或主任律师可审批收案"));
  it("denies ASSISTANT", () => expect(() => requireApprover("ASSISTANT")).toThrow("仅管理员或主任律师可审批收案"));
});

describe("generateTitle", () => {
  it("generates title with client and opposing", () => {
    expect(generateTitle("ABC公司", ["XYZ个人"], "合同纠纷")).toBe("ABC公司与XYZ个人合同纠纷");
  });

  it("uses placeholder for null client", () => {
    expect(generateTitle(null, ["对方"], "案件")).toBe("待补充委托方与对方案件");
  });

  it("uses placeholder for empty opposing", () => {
    expect(generateTitle("委托方", [], "案由")).toBe("委托方与待补充对方案由");
  });

  it("handles both nulls", () => {
    expect(generateTitle(null, [], "案件")).toBe("待补充委托方与待补充对方案件");
  });

  it("trims whitespace from all parts", () => {
    expect(generateTitle("  client  ", ["  opp  "], "  cause  ")).toBe("client与oppcause");
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
      expect(formatConflictQuery({ role: "CLIENT_PARTY", name: "client", idNumber: "123" })).toBe("委托方「client」");
      expect(formatConflictQuery({ role: "OPPOSING_PARTY", name: "opp", idNumber: "" })).toBe("对方「opp」");
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
      expect(() => assertConflictReviewAllowsConversion(makeIntake(null, []))).toThrow("请先补充委托方或相对方");
    });

    it("throws if no checks", () => {
      expect(() => assertConflictReviewAllowsConversion(makeIntake({ name: "c", idNumber: "123" }, []))).toThrow("必须先运行利益冲突检索");
    });

    it("throws if missing query", () => {
      const intake = makeIntake({ name: "c", idNumber: "123" }, [], [baseCheck({ queryPayload: { queries: [{ role: "OPPOSING_PARTY", name: "o", idNumber: "456" }] }})]);
      expect(() => assertConflictReviewAllowsConversion(intake)).toThrow("缺少：委托方");
    });

    it("throws if conclusion not DIFFERENT", () => {
      const intake = makeIntake({ name: "c", idNumber: "123" }, [], [baseCheck({ conclusion: "PENDING", queryPayload: { queries: [{ role: "CLIENT_PARTY", name: "c", idNumber: "123" }] }})]);
      expect(() => assertConflictReviewAllowsConversion(intake)).toThrow("还没有结论");
    });

    it("throws if high risk without note", () => {
      const intake = makeIntake({ name: "c", idNumber: "123" }, [], [baseCheck({
        conclusion: "DIFFERENT",
        queryPayload: { queries: [{ role: "CLIENT_PARTY", name: "c", idNumber: "123" }] },
        hits: [{ severity: "HIGH" }]
      })]);
      expect(() => assertConflictReviewAllowsConversion(intake)).toThrow("高风险");
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
      expect(() => assertConflictReviewAllowsConversion(intake)).toThrow("还没有结论");
    });

    it("throws if conclusion is NEED_INFO", () => {
      const intake = makeIntake({ name: "c", idNumber: "123" }, [], [baseCheck({ conclusion: "NEED_INFO", queryPayload: { queries: [{ role: "CLIENT_PARTY", name: "c", idNumber: "123" }] }})]);
      expect(() => assertConflictReviewAllowsConversion(intake)).toThrow("信息不足");
    });

    it("throws if conclusion is SAME_SUBJECT", () => {
      const intake = makeIntake({ name: "c", idNumber: "123" }, [], [baseCheck({ conclusion: "SAME_SUBJECT", queryPayload: { queries: [{ role: "CLIENT_PARTY", name: "c", idNumber: "123" }] }})]);
      expect(() => assertConflictReviewAllowsConversion(intake)).toThrow("存在利益冲突");
    });

    it("throws if conclusion is unknown value", () => {
      const intake = makeIntake({ name: "c", idNumber: "123" }, [], [baseCheck({ conclusion: "UNKNOWN" as any, queryPayload: { queries: [{ role: "CLIENT_PARTY", name: "c", idNumber: "123" }] }})]);
      expect(() => assertConflictReviewAllowsConversion(intake)).toThrow("结论异常");
    });

    it("throws if high risk with whitespace-only note (trim to empty)", () => {
      const intake = makeIntake({ name: "c", idNumber: "123" }, [], [baseCheck({
        conclusion: "DIFFERENT",
        queryPayload: { queries: [{ role: "CLIENT_PARTY", name: "c", idNumber: "123" }] },
        hits: [{ severity: "HIGH" }],
        note: "   "
      })]);
      expect(() => assertConflictReviewAllowsConversion(intake)).toThrow("高风险");
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
