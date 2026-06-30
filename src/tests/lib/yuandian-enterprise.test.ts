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
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getEnterpriseSummary, searchEnterpriseCandidates, getEnterpriseBaseInfo } from "@/lib/yuandian/enterprise";
import { YuandianNotConfiguredError, YuandianApiError } from "@/lib/yuandian/client";
import type { ResolvedYuandianSettings } from "@/lib/yuandian/settings";

const configured: ResolvedYuandianSettings = {
  apiKey: "k",
  baseUrl: "https://open.example.com/open",
  caseDetailHost: "https://www.example.com",
  configured: true
};

const unconfigured: ResolvedYuandianSettings = {
  ...configured,
  apiKey: "",
  configured: false
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

// 完整聚合 mock 数据生成器
function aggData(
  overrides: Partial<{
    失信被执行人: number;
    被执行人: number;
    股权冻结: number;
    严重违法: number;
    经营异常: number;
  }> = {}
) {
  const v = {
    失信被执行人: 0,
    被执行人: 0,
    股权冻结: 0,
    严重违法: 0,
    经营异常: 0,
    ...overrides
  };
  return {
    status: "success",
    code: 200,
    data: {
      id: "eid-1",
      name: "测试公司",
      失信被执行人统计: { 总数: v.失信被执行人, 省份: [] },
      被执行人统计: { 总数: v.被执行人, 立案年份: [] },
      股权冻结统计: { 总数: v.股权冻结 },
      严重违法统计: { 总数: v.严重违法, 类别: [{ key: "重大", count: v.严重违法 }] },
      经营异常统计: { 总数: v.经营异常, 列入经营异常名录原因: [] },
      法院公告统计: {
        总数: 5,
        起诉方: 1,
        应诉方: 4,
        法院: [
          { key: "北京海淀法院", count: 3 },
          { key: "上海浦东法院", count: 2 }
        ]
      },
      开庭公告统计: { 总数: 10, 起诉方: 2, 应诉方: 8 },
      行政处罚统计: { 总数: 0 },
      欠税公告统计: { 总数: 0 },
      变更记录统计: { 总数: 3 },
      对外担保统计: { 总数: 0 },
      股权出质统计: { 总数: 1 },
      对外投资统计: { 总数: 8 },
      商标统计: { 总数: 50 },
      专利统计: { 总数: 12 },
      软件著作权统计: { 总数: 0 },
      作品著作权统计: { 总数: 0 },
      网站备案统计: { 总数: 2 }
    }
  };
}

describe("getEnterpriseSummary", () => {
  it("未配置 → throw NotConfigured", async () => {
    await expect(
      getEnterpriseSummary({ id: "x" }, unconfigured)
    ).rejects.toBeInstanceOf(YuandianNotConfiguredError);
  });

  it("id 和 socialCode 同时为空 → throw", async () => {
    await expect(getEnterpriseSummary({}, configured)).rejects.toThrow(/至少传一个/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("正常请求：URL 参数 + 字段映射 + Top 提取", async () => {
    fetchMock.mockResolvedValue(jsonRes(aggData()));
    const r = await getEnterpriseSummary({ id: "eid-1" }, configured);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("rh_enterpriseAggregationSummary?");
    expect(url).toContain("id=eid-1");
    expect(init.method).toBe("GET");
    expect(init.headers["X-API-Key"]).toBe("k");

    expect(r).not.toBeNull();
    expect(r!.id).toBe("eid-1");
    expect(r!.name).toBe("测试公司");
    expect(r!.coreRisks).toHaveLength(5);
    expect(r!.coreRisks.map((c) => c.category)).toEqual([
      "失信被执行人",
      "被执行人",
      "股权冻结",
      "严重违法",
      "经营异常"
    ]);
    // 法院公告 top 提取
    const court = r!.litigation.find((s) => s.category === "法院公告")!;
    expect(court.total).toBe(5);
    expect(court.asPlaintiff).toBe(1);
    expect(court.asDefendant).toBe(4);
    expect(court.top).toEqual([
      { key: "北京海淀法院", count: 3 },
      { key: "上海浦东法院", count: 2 }
    ]);
  });

  it("data === null → 返回 null", async () => {
    fetchMock.mockResolvedValue(jsonRes({ status: "success", code: 200, data: null }));
    const r = await getEnterpriseSummary({ socialCode: "abc" }, configured);
    expect(r).toBeNull();
  });

  it("status=failed → 抛 ApiError", async () => {
    fetchMock.mockResolvedValue(jsonRes({ status: "failed", code: 500, message: "boom" }));
    await expect(
      getEnterpriseSummary({ id: "x" }, configured)
    ).rejects.toBeInstanceOf(YuandianApiError);
  });

  it("HTTP 401 → 抛 ApiError", async () => {
    fetchMock.mockResolvedValue(jsonRes({}, false, 401));
    await expect(
      getEnterpriseSummary({ id: "x" }, configured)
    ).rejects.toBeInstanceOf(YuandianApiError);
  });

  it("socialCode 优先走 tyshxydm 参数", async () => {
    fetchMock.mockResolvedValue(jsonRes(aggData()));
    await getEnterpriseSummary({ socialCode: "91110000XXXX" }, configured);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("tyshxydm=91110000XXXX");
    expect(url).not.toContain("id=");
  });

  it("both id and socialCode provided → both params present", async () => {
    fetchMock.mockResolvedValue(jsonRes(aggData()));
    await getEnterpriseSummary({ id: "id1", socialCode: "code1" }, configured);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("id=id1");
    expect(url).toContain("tyshxydm=code1");
  });

  it("handles category with missing TOP_FIELD mapping (top remains undefined)", async () => {
    const customData = {
      status: "success",
      code: 200,
      data: {
        id: "eid",
        name: "Test",
        失信被执行人统计: { 总数: 1 },
        被执行人统计: { 总数: 2 },
        股权冻结统计: { 总数: 3 },
        严重违法统计: { 总数: 4 },
        经营异常统计: { 总数: 5 },
        // litigation and auxiliary keys not provided → should be filtered out
        法院公告统计: { 总数: 5, 起诉方: 1, 应诉方: 4, 省份: [{ key: "北京", count: 5 }] } // 省份 not in TOP_FIELD_BY_CATEGORY for 法院公告
      }
    };
    fetchMock.mockResolvedValue(jsonRes(customData));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r).not.toBeNull();
    const court = r!.litigation.find(s => s.category === "法院公告");
    expect(court).toBeDefined();
    expect(court!.top).toBeUndefined(); // because topField mapping not found
  });

  it("handles node that is not an object in pickStat (returns null)", async () => {
    const customData = {
      status: "success",
      code: 200,
      data: {
        id: "eid",
        name: "Test",
        失信被执行人统计: null, // should be filtered out
        被执行人统计: "not an object", // should be filtered out
        股权冻结统计: { 总数: 3 },
        严重违法统计: { 总数: 4 },
        经营异常统计: { 总数: 5 }
      }
    };
    fetchMock.mockResolvedValue(jsonRes(customData));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r).not.toBeNull();
    expect(r!.coreRisks.length).toBe(3); // only 股权冻结, 严重违法, 经营异常
    expect(r!.coreRisks.find(c => c.category === "失信被执行人")).toBeUndefined();
  });

  it("handles total not a number (defaults to 0)", async () => {
    const customData = {
      status: "success",
      code: 200,
      data: {
        id: "eid",
        name: "Test",
        失信被执行人统计: { 总数: "five" }, // not a number
        被执行人统计: { 总数: 2 },
        股权冻结统计: { 总数: 3 },
        严重违法统计: { 总数: 4 },
        经营异常统计: { 总数: 5 }
      }
    };
    fetchMock.mockResolvedValue(jsonRes(customData));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r).not.toBeNull();
    const dishou = r!.coreRisks.find(c => c.category === "失信被执行人");
    expect(dishou).toBeDefined();
    expect(dishou!.total).toBe(0);
  });

  it("handles top array items that are not proper objects (filtered)", async () => {
    const customData = {
      status: "success",
      code: 200,
      data: {
        id: "eid",
        name: "Test",
        失信被执行人统计: { 总数: 1, 执行法院: [1, 2, 3] as any }, // non-object items
        被执行人统计: { 总数: 2 },
        股权冻结统计: { 总数: 3 },
        严重违法统计: { 总数: 4 },
        经营异常统计: { 总数: 5 }
      }
    };
    fetchMock.mockResolvedValue(jsonRes(customData));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r).not.toBeNull();
    const dishou = r!.coreRisks.find(c => c.category === "失信被执行人");
    expect(dishou!.top).toEqual([]); // all filtered, empty array
  });

  it("handles top array with valid items (extracts up to 5)", async () => {
    const customData = {
      status: "success",
      code: 200,
      data: {
        id: "eid",
        name: "Test",
        失信被执行人统计: { 总数: 1, 执行法院: [
          { key: "Court A", count: 10 },
          { key: "Court B", count: 5 },
          { key: "Court C", count: 3 }
        ]},
        被执行人统计: { 总数: 2 },
        股权冻结统计: { 总数: 3 },
        严重违法统计: { 总数: 4 },
        经营异常统计: { 总数: 5 }
      }
    };
    fetchMock.mockResolvedValue(jsonRes(customData));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    const dishou = r!.coreRisks.find(c => c.category === "失信被执行人");
    expect(dishou!.top).toEqual([
      { key: "Court A", count: 10 },
      { key: "Court B", count: 5 },
      { key: "Court C", count: 3 }
    ]);
  });

  it("handles top array empty after slice (returns empty)", async () => {
    const customData = {
      status: "success",
      code: 200,
      data: {
        id: "eid",
        name: "Test",
        失信被执行人统计: { 总数: 1, 执行法院: [] }, // empty array
        被执行人统计: { 总数: 2 },
        股权冻结统计: { 总数: 3 },
        严重违法统计: { 总数: 4 },
        经营异常统计: { 总数: 5 }
      }
    };
    fetchMock.mockResolvedValue(jsonRes(customData));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    const dishou = r!.coreRisks.find(c => c.category === "失信被执行人");
    expect(dishou!.top).toEqual([]);
  });

  it("handles asPlaintiff/asDefendant with zero value (kept)", async () => {
    const customData = {
      status: "success",
      code: 200,
      data: {
        id: "eid",
        name: "Test",
        法院公告统计: { 总数: 5, 起诉方: 0, 应诉方: 0 }
      }
    };
    fetchMock.mockResolvedValue(jsonRes(customData));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    const court = r!.litigation.find(s => s.category === "法院公告");
    expect(court!.asPlaintiff).toBe(0);
    expect(court!.asDefendant).toBe(0);
  });

  it("filters unknown categories not in CORE_RISK_KEYS", async () => {
    const customData = {
      status: "success",
      code: 200,
      data: {
        id: "eid",
        name: "Test",
        // include an unknown category (should be ignored)
        未知统计: { 总数: 99 },
        失信被执行人统计: { 总数: 1 }
      }
    };
    fetchMock.mockResolvedValue(jsonRes(customData));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r!.coreRisks.length).toBe(1);
    expect(r!.coreRisks[0].category).toBe("失信被执行人");
  });

  it("handles asPlaintiff/asDefendant undefined when missing", async () => {
    const customData = {
      status: "success",
      code: 200,
      data: {
        id: "eid",
        name: "Test",
        法院公告统计: { 总数: 5 } // no 起诉方/应诉方
      }
    };
    fetchMock.mockResolvedValue(jsonRes(customData));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    const court = r!.litigation.find(s => s.category === "法院公告");
    expect(court!.asPlaintiff).toBeUndefined();
    expect(court!.asDefendant).toBeUndefined();
  });

  it("handles response with missing auxiliary keys (all filtered)", async () => {
    const customData = {
      status: "success",
      code: 200,
      data: {
        id: "eid",
        name: "Test",
        // only core risks and litigation
        失信被执行人统计: { 总数: 1 },
        被执行人统计: { 总数: 2 }
      }
    };
    fetchMock.mockResolvedValue(jsonRes(customData));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r!.auxiliary).toEqual([]);
  });

  it("handles topField defined but top array non-array (top remains undefined)", async () => {
    const customData = {
      status: "success",
      code: 200,
      data: {
        id: "eid",
        name: "Test",
        失信被执行人统计: { 总数: 1, 执行法院: "not an array" as any },
        被执行人统计: { 总数: 2 },
        股权冻结统计: { 总数: 3 },
        严重违法统计: { 总数: 4 },
        经营异常统计: { 总数: 5 }
      }
    };
    fetchMock.mockResolvedValue(jsonRes(customData));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    const dishou = r!.coreRisks.find(c => c.category === "失信被执行人");
    expect(dishou!.top).toBeUndefined();
  });
});

describe("computeRiskLevel（通过聚合响应间接验证）", () => {
  it("失信被执行人 > 0 → HIGH", async () => {
    fetchMock.mockResolvedValue(jsonRes(aggData({ 失信被执行人: 2 })));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r!.level).toBe("HIGH");
  });

  it("被执行人 > 0（无失信）→ MEDIUM", async () => {
    fetchMock.mockResolvedValue(jsonRes(aggData({ 被执行人: 1 })));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r!.level).toBe("MEDIUM");
  });

  it("股权冻结 > 0 → MEDIUM", async () => {
    fetchMock.mockResolvedValue(jsonRes(aggData({ 股权冻结: 3 })));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r!.level).toBe("MEDIUM");
  });

  it("严重违法 > 0（无被执行/股权冻结）→ MEDIUM", async () => {
    fetchMock.mockResolvedValue(jsonRes(aggData({ 严重违法: 1 })));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r!.level).toBe("MEDIUM");
  });

  it("仅经营异常 > 0 → LOW", async () => {
    fetchMock.mockResolvedValue(jsonRes(aggData({ 经营异常: 1 })));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r!.level).toBe("LOW");
  });

  it("所有核心风险 = 0 → NONE", async () => {
    fetchMock.mockResolvedValue(jsonRes(aggData()));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r!.level).toBe("NONE");
  });

  it("失信 + 经营异常 同时 > 0 → 仍 HIGH（最严重者优先）", async () => {
    fetchMock.mockResolvedValue(
      jsonRes(aggData({ 失信被执行人: 1, 经营异常: 5 }))
    );
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r!.level).toBe("HIGH");
  });

  it("handles non-success status with code and message", async () => {
    fetchMock.mockResolvedValue(
      jsonRes({ status: "failed", code: 1001, message: "Custom error" })
    );
    await expect(getEnterpriseSummary({ id: "x" }, configured)).rejects.toBeInstanceOf(YuandianApiError);
  });

  it("handles top array with invalid item types (filters properly)", async () => {
    const customData = {
      status: "success",
      code: 200,
      data: {
        id: "eid",
        name: "Test",
        失信被执行人统计: { 总数: 1, 执行法院: [null, "string", 123, { key: "Court", count: 2 }] },
        被执行人统计: { 总数: 2 },
        股权冻结统计: { 总数: 3 },
        严重违法统计: { 总数: 4 },
        经营异常统计: { 总数: 5 }
      }
    };
    fetchMock.mockResolvedValue(jsonRes(customData));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    const dishou = r!.coreRisks.find(c => c.category === "失信被执行人");
    expect(dishou!.top).toEqual([{ key: "Court", count: 2 }]);
  });

  it("handles topField defined but value not an array (top remains undefined)", async () => {
    const customData = {
      status: "success",
      code: 200,
      data: {
        id: "eid",
        name: "Test",
        失信被执行人统计: { 总数: 1, 执行法院: "not an array" as any },
        被执行人统计: { 总数: 2 },
        股权冻结统计: { 总数: 3 },
        严重违法统计: { 总数: 4 },
        经营异常统计: { 总数: 5 }
      }
    };
    fetchMock.mockResolvedValue(jsonRes(customData));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    const dishou = r!.coreRisks.find(c => c.category === "失信被执行人");
    expect(dishou!.top).toBeUndefined();
  });

  it("filters out core risk category when total is 0 AND category not in CORE_RISK_KEYS (defense-in-depth)", async () => {
    const customData = {
      status: "success",
      code: 200,
      data: {
        id: "eid",
        name: "Test",
        // includes a non-core category
        其他统计: { 总数: 99 },
        失信被执行人统计: { 总数: 0 }
      }
    };
    fetchMock.mockResolvedValue(jsonRes(customData));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    // only失信被执行人 (even with 0) appears because it's in CORE_RISK_KEYS
    expect(r!.coreRisks.length).toBe(1);
    expect(r!.coreRisks[0].category).toBe("失信被执行人");
    expect(r!.coreRisks[0].total).toBe(0);
  });

  it("throws when fetch response not ok (e.g., 500)", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({})
    } as any);
    await expect(getEnterpriseSummary({ id: "x" }, configured)).rejects.toBeInstanceOf(YuandianApiError);
  });

  it("throws when fetch aborts (timeout)", async () => {
    fetchMock.mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(new DOMException("Aborted")), 10)));
    await expect(getEnterpriseSummary({ id: "x" }, configured)).rejects.toThrow();
  });

  it("throws when JSON parse fails", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new SyntaxError("Invalid JSON"))
    } as any);
    await expect(getEnterpriseSummary({ id: "x" }, configured)).rejects.toThrow();
  });
});

describe("searchEnterpriseCandidates", () => {
  it("not configured → throw NotConfigured", async () => {
    await expect(searchEnterpriseCandidates("Test", undefined, { ...unconfigured } as any)).rejects.toBeInstanceOf(YuandianNotConfiguredError);
    fetchMock.mockResolvedValue({ json: vi.fn().mockResolvedValue([]) } as any); // should not be called
  });

  it("empty name after trim → returns [] without fetch", async () => {
    const results = await searchEnterpriseCandidates("   ", undefined, configured);
    expect(results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clamps top_k to max 50", async () => {
    fetchMock.mockResolvedValue(jsonRes({ status: "success", data: [] }));
    await searchEnterpriseCandidates("Test", 100, configured);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("top_k=50");
  });

  it("honors lower top_k", async () => {
    fetchMock.mockResolvedValue(jsonRes({ status: "success", data: [] }));
    await searchEnterpriseCandidates("Test", 5, configured);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("top_k=5");
  });

  it("constructs URL with encoded name and default top_k=10", async () => {
    fetchMock.mockResolvedValue(jsonRes({ status: "success", data: [] }));
    await searchEnterpriseCandidates("TestCorp", undefined, configured);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("rh_enterpriseSearch?");
    expect(url).toContain("name=TestCorp");
    expect(url).toContain("top_k=10");
  });

  it("throws when response not ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: vi.fn().mockResolvedValue({}) } as any);
    await expect(searchEnterpriseCandidates("Test", undefined, configured)).rejects.toBeInstanceOf(YuandianApiError);
  });

  it("throws when status != success", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ status: "failed", message: "error" }) } as any);
    await expect(searchEnterpriseCandidates("Test", undefined, configured)).rejects.toBeInstanceOf(YuandianApiError);
  });

  it("returns array when status=success and data present", async () => {
    const mockData = [{ id: "1", name: "A" }, { id: "2", name: "B" }];
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ status: "success", data: mockData }) } as any);
    const results = await searchEnterpriseCandidates("Test", undefined, configured);
    expect(results).toEqual(mockData);
  });

  it("returns empty array when data is null", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ status: "success", data: null }) } as any);
    const results = await searchEnterpriseCandidates("Test", undefined, configured);
    expect(results).toEqual([]);
  });

  it("handles fetch abort (timeout)", async () => {
    fetchMock.mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(new DOMException("Aborted")), 10)));
    await expect(searchEnterpriseCandidates("Test", undefined, configured)).rejects.toThrow();
  });
});

describe("getEnterpriseBaseInfo", () => {
  it("not configured → throw NotConfigured", async () => {
    await expect(getEnterpriseBaseInfo("eid", unconfigured)).rejects.toBeInstanceOf(YuandianNotConfiguredError);
  });

  it("throws when fetch response not ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: vi.fn().mockResolvedValue({}) } as any);
    await expect(getEnterpriseBaseInfo("eid", configured)).rejects.toBeInstanceOf(YuandianApiError);
  });

  it("throws when status != success", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ status: "failed", message: "error" }) } as any);
    await expect(getEnterpriseBaseInfo("eid", configured)).rejects.toBeInstanceOf(YuandianApiError);
  });

  it("returns null when data is null", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ status: "success", data: null }) } as any);
    const r = await getEnterpriseBaseInfo("eid", configured);
    expect(r).toBeNull();
  });

  it("maps fields correctly using getStr", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        status: "success",
        data: {
          企业名称: "Test Corp",
          统一社会信用代码: "123456789012345678",
          法定代表人: "Jane Doe",
          注册资本: "100万",
          注册地址: "Beijing",
          经营状态: "在营",
          经营范围: "tech",
          成立日期: "2020-01-01"
        }
      })
    } as any);
    const r = await getEnterpriseBaseInfo("eid", configured);
    expect(r).not.toBeNull();
    expect(r!.id).toBe("eid");
    expect(r!.name).toBe("Test Corp");
    expect(r!.creditCode).toBe("123456789012345678");
    expect(r!.legalRep).toBe("Jane Doe");
    expect(r!.registeredCapital).toBe("100万");
    expect(r!.address).toBe("Beijing");
    expect(r!.status).toBe("在营");
    expect(r!.businessScope).toBe("tech");
    expect(r!.establishedDate).toBe("2020-01-01");
  });

  it("uses fallback '' for missing optional fields via getStr", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        status: "success",
        data: { id: "eid" } // missing all expected keys
      })
    } as any);
    const r = await getEnterpriseBaseInfo("eid", configured);
    expect(r).not.toBeNull();
    expect(r!.name).toBe("");
    expect(r!.creditCode).toBe("");
    expect(r!.legalRep).toBe("");
    expect(r!.registeredCapital).toBe("");
    expect(r!.address).toBe("");
    expect(r!.status).toBe("");
    expect(r!.businessScope).toBe("");
    expect(r!.establishedDate).toBe("");
  });

  it("maps id from data.id when present, else falls back to parameter", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        status: "success",
        data: { id: "response-id", 企业名称: "Test" }
      })
    } as any);
    const r = await getEnterpriseBaseInfo("param-id", configured);
    expect(r!.id).toBe("response-id"); // uses data.id
  });

  it("falls back to parameter id when data.id missing", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        status: "success",
        data: { 企业名称: "Test" }
      })
    } as any);
    const r = await getEnterpriseBaseInfo("param-id", configured);
    expect(r!.id).toBe("param-id");
  });

  it("handles fetch abort (timeout)", async () => {
    fetchMock.mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(new DOMException("Aborted")), 10)));
    await expect(getEnterpriseBaseInfo("eid", configured)).rejects.toThrow();
  });

  it("handles JSON parse error", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new SyntaxError("Invalid JSON"))
    } as any);
    await expect(getEnterpriseBaseInfo("eid", configured)).rejects.toThrow();
  });
});
