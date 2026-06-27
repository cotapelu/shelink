import { describe, it, expect } from "vitest";
import {
  normalizeConflictQuery,
  conflictQueryKey,
  formatConflictQuery,
  buildExpectedConflictQueries,
  getCheckedConflictQueries,
  assertConflictReviewAllowsConversion
} from "@/server/intakes/actions";

describe("conflict utilities", () => {
  describe("normalizeConflictQuery", () => {
    it("returns null for invalid role", () => expect(normalizeConflictQuery({ role: "INVALID", name: "a", idNumber: "1" })).toBeNull());
    it("returns null when empty", () => expect(normalizeConflictQuery({ role: "CLIENT_PARTY", name: "  ", idNumber: "" })).toBeNull());
    it("creates with name only", () => expect(normalizeConflictQuery({ role: "OPPOSING_PARTY", name: "opp", idNumber: "" })).toEqual({ role: "OPPOSING_PARTY", name: "opp", idNumber: "" }));
    it("creates with idNumber only", () => expect(normalizeConflictQuery({ role: "THIRD_PARTY", name: "", idNumber: "123" })).toEqual({ role: "THIRD_PARTY", name: "", idNumber: "123" }));
    it("trims", () => expect(normalizeConflictQuery({ role: "CLIENT_PARTY", name: "  a  ", idNumber: "  1  " })).toEqual({ role: "CLIENT_PARTY", name: "a", idNumber: "1" }));
  });

  describe("buildExpectedConflictQueries", () => {
    it("builds from client", () => {
      const intake = { client: { name: "c", idNumber: "123" }, parties: [] as any[] };
      expect(buildExpectedConflictQueries(intake)).toEqual([{ role: "CLIENT_PARTY", name: "c", idNumber: "123" }]);
    });
    it("builds from parties", () => {
      const intake = { client: null, parties: [{ role: "OPPOSING_PARTY", name: "o", idNumber: "456" }] as any[] };
      expect(buildExpectedConflictQueries(intake)).toEqual([{ role: "OPPOSING_PARTY", name: "o", idNumber: "456" }]);
    });
    it("skips empty party", () => {
      const intake = { client: null, parties: [{ role: "OPPOSING_PARTY", name: "", idNumber: "" }] as any[] };
      expect(buildExpectedConflictQueries(intake)).toEqual([]);
    });
  });

  describe("getCheckedConflictQueries", () => {
    it("extracts", () => {
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

  describe("conflictQueryKey & format", () => {
    it("key", () => expect(conflictQueryKey({ role: "CLIENT_PARTY", name: "a", idNumber: "1" })).toBe("CLIENT_PARTY|a|1"));
    it("format", () => {
      expect(formatConflictQuery({ role: "CLIENT_PARTY", name: "client", idNumber: "123" })).toBe("委托方「client」");
      expect(formatConflictQuery({ role: "OPPOSING_PARTY", name: "opp", idNumber: "" })).toBe("对方「opp」");
    });
  });

  describe("assertConflictReviewAllowsConversion", () => {
    const makeIntake = (client: any, parties: any[] = [], checks: any[] = []) => ({ client, parties, conflictChecks: checks });
    const baseCheck = (opts: any = {}) => ({
      conclusion: opts.conclusion || "DIFFERENT",
      note: opts.note || "",
      queryPayload: opts.queryPayload || { queries: [] },
      hits: opts.hits || []
    });

    it("throws if no expected queries", () => {
      expect(() => assertConflictReviewAllowsConversion(makeIntake(null, []))).toThrow("请先补充委托方或相对方");
    });

    it("throws if no checks", () => {
      expect(() => assertConflictReviewAllowsConversion(makeIntake({ name: "c", idNumber: "123" }, []))).toThrow("必须先运行利益冲突检索");
    });

    it("throws if missing check", () => {
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
  });
});
