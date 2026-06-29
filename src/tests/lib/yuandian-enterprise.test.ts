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
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getEnterpriseSummary } from "@/lib/yuandian/enterprise";
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
});
