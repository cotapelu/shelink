import { describe, it, expect, beforeEach, vi } from "vitest";
import { getEnterpriseSummary } from "@/lib/yuandian/enterprise";
import { YuandianNotConfiguredError } from "@/lib/yuandian/client";
import * as settings from "@/lib/yuandian/settings";
import type { ResolvedYuandianSettings } from "@/lib/yuandian/settings";

const configured: ResolvedYuandianSettings = {
  apiKey: "k",
  baseUrl: "https://open.example.com/open",
  caseDetailHost: "https://www.example.com",
  configured: true
};

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as never;
});

function jsonRes(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body)
  } as unknown as Response;
}

describe("getEnterpriseSummary edge cases", () => {
  it("fallback to empty string when d.id is not string and identifier.id undefined", async () => {
    const customData = {
      status: "success",
      code: 200,
      data: {
        id: 123,
        name: "Test",
        失信被执行人统计: { 总数: 1 }
      }
    };
    fetchMock.mockResolvedValue(jsonRes(customData));
    const r = await getEnterpriseSummary({ socialCode: "91310000..." } as any, configured);
    expect(r!.id).toBe("");
  });

  it("fallback to empty string when d.name is not string", async () => {
    const customData = {
      status: "success",
      code: 200,
      data: {
        id: "valid-id",
        name: null,
        失信被执行人统计: { 总数: 1 }
      }
    };
    fetchMock.mockResolvedValue(jsonRes(customData));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r!.name).toBe("");
  });

  it("pickStat: topField mapping exists but value is null -> top undefined", async () => {
    const customData = {
      status: "success",
      code: 200,
      data: {
        id: "eid",
        name: "Test",
        失信被执行人统计: { 总数: 1, 执行法院: null },
        被执行人统计: { 总数: 2 }
      }
    };
    fetchMock.mockResolvedValue(jsonRes(customData));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    const dishou = r!.coreRisks.find(c => c.category === "失信被执行人");
    expect(dishou!.top).toBeUndefined();
  });

  it("pickStat: topField mapping exists but value is non-array (number)", async () => {
    const customData = {
      status: "success",
      code: 200,
      data: {
        id: "eid",
        name: "Test",
        失信被执行人统计: { 总数: 1, 执行法院: 123 },
        被执行人统计: { 总数: 2 }
      }
    };
    fetchMock.mockResolvedValue(jsonRes(customData));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    const dishou = r!.coreRisks.find(c => c.category === "失信被执行人");
    expect(dishou!.top).toBeUndefined();
  });

  it("getEnterpriseSummary: missing id field uses fallback identifier.id", async () => {
    const customData = {
      status: "success",
      code: 200,
      data: {
        name: "Test",
        失信被执行人统计: { 总数: 1 }
      }
    };
    fetchMock.mockResolvedValue(jsonRes(customData));
    const r = await getEnterpriseSummary({ id: "fallback-id" }, configured);
    expect(r!.id).toBe("fallback-id");
  });

  it("getEnterpriseSummary: missing name field returns empty string", async () => {
    const customData = {
      status: "success",
      code: 200,
      data: {
        id: "eid",
        失信被执行人统计: { 总数: 1 }
      }
    };
    fetchMock.mockResolvedValue(jsonRes(customData));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r!.name).toBe("");
  });

  it("getEnterpriseSummary: both id and socialCode missing throws", async () => {
    await expect(getEnterpriseSummary({}, configured)).rejects.toThrow("企业 ID 与统一社会信用代码至少传一个");
  });
});
