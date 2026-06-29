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
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchEnterpriseCandidates,
  getEnterpriseBaseInfo,
  EnterpriseCandidate,
  MappedEnterpriseInfo
} from "@/lib/yuandian/enterprise";
import { getYuandianSettings } from "@/lib/yuandian/settings";
import { YuandianNotConfiguredError, YuandianApiError } from "@/lib/yuandian/client";

vi.mock("@/lib/yuandian/settings", () => ({
  getYuandianSettings: vi.fn()
}));

global.fetch = vi.fn();

describe("searchEnterpriseCandidates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws YuandianNotConfiguredError when not configured", async () => {
    (getYuandianSettings as any).mockResolvedValue({ configured: false });

    await expect(searchEnterpriseCandidates("Test Co")).rejects.toThrow(YuandianNotConfiguredError);
  });

  it("returns empty array for empty name", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open"
    });

    const result = await searchEnterpriseCandidates("");
    expect(result).toEqual([]);
  });

  it("constructs correct URL with encoding", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "test-key",
      baseUrl: "https://open.chineselaw.com/open"
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: [] })
    });

    await searchEnterpriseCandidates("Test Company", 20);

    const [url, options] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("https://open.chineselaw.com/open/rh_enterpriseSearch?name=Test%20Company&top_k=20");
    expect(options.headers["X-API-Key"]).toBe("test-key");
  });

  it("clamps topK to 50", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open"
    });
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ status: "success", data: [] }) });

    await searchEnterpriseCandidates("Test", 100);
    const url = (global.fetch as any).mock.calls[0][0];
    expect(url).toContain("top_k=50");
  });

  it("handles HTTP error", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open"
    });
    (global.fetch as any).mockResolvedValue({ ok: false, status: 400 });

    await expect(searchEnterpriseCandidates("Test")).rejects.toThrow(YuandianApiError);
  });

  it("handles non-success status", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open"
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "error", message: "Bad", code: 1001 })
    });

    await expect(searchEnterpriseCandidates("Test")).rejects.toThrow(YuandianApiError);
  });

  it("handles network error (fetch rejects)", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open"
    });
    (global.fetch as any).mockRejectedValue(new Error("Network failure"));

    await expect(searchEnterpriseCandidates("Test")).rejects.toThrow();
  });

  it("handles JSON parse error", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open"
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => { throw new Error("Invalid JSON"); }
    });

    await expect(searchEnterpriseCandidates("Test")).rejects.toThrow();
  });

  it("returns empty array when data field missing", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open"
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success" }) // no data
    });

    const result = await searchEnterpriseCandidates("Test");
    expect(result).toEqual([]);
  });

  it("returns data array on success", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open"
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "success",
        data: [{ id: "1", 企业名称: "公司A", 统一社会信用代码: "123" }]
      })
    });

    const result = await searchEnterpriseCandidates("公司");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
    expect(result[0].企业名称).toBe("公司A");
  });

  it("returns empty array when data is null", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open"
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: null })
    });

    const result = await searchEnterpriseCandidates("Test");
    expect(result).toEqual([]);
  });

});

describe("getEnterpriseBaseInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws YuandianNotConfiguredError when not configured", async () => {
    (getYuandianSettings as any).mockResolvedValue({ configured: false });

    await expect(getEnterpriseBaseInfo("id123")).rejects.toThrow(YuandianNotConfiguredError);
  });

  it("returns mapped enterprise info on success", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open"
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "success",
        data: {
          id: "ent123",
          企业名称: "测试公司",
          统一社会信用代码: "91110000XXXXXX",
          法定代表人: "张三",
          注册资本: "100万",
          注册地址: "北京",
          经营状态: "存续",
          经营范围: "软件开发",
          成立日期: "2020-01-01"
        }
      })
    });

    const result = await getEnterpriseBaseInfo("ent123");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("ent123");
    expect(result!.name).toBe("测试公司");
    expect(result!.creditCode).toBe("91110000XXXXXX");
    expect(result!.legalRep).toBe("张三");
    expect(result!.registeredCapital).toBe("100万");
    expect(result!.address).toBe("北京");
    expect(result!.status).toBe("存续");
    expect(result!.businessScope).toBe("软件开发");
    expect(result!.establishedDate).toBe("2020-01-01");
  });

  it("handles non-string values by converting to empty string", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open"
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "success",
        data: {
          id: "ent123",
          企业名称: "测试公司",
          统一社会信用代码: "91110000XXXXXX",
          法定代表人: null,
          注册资本: "100万",
          注册地址: "北京",
          经营状态: "存续",
          经营范围: "软件开发",
          成立日期: "2020-01-01"
        }
      })
    });

    const result = await getEnterpriseBaseInfo("ent123");
    expect(result).not.toBeNull();
    expect(result!.legalRep).toBe("");
  });

  it("returns null when data is null", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open"
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: null })
    });

    const result = await getEnterpriseBaseInfo("id");
    expect(result).toBeNull();
  });

  it("handles missing fields gracefully", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open"
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: { id: "123" } })
    });

    const result = await getEnterpriseBaseInfo("123");
    expect(result!.id).toBe("123");
    expect(result!.name).toBe("");
    expect(result!.creditCode).toBe("");
  });

  it("constructs correct URL", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open"
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: null })
    });

    await getEnterpriseBaseInfo("my-id");
    const [url] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("https://open.chineselaw.com/open/rh_enterpriseBaseInfo?id=my-id");
  });

  it("handles HTTP error", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open"
    });
    (global.fetch as any).mockResolvedValue({ ok: false, status: 500 });

    await expect(getEnterpriseBaseInfo("id")).rejects.toThrow(YuandianApiError);
  });

  it("handles non-success status (status!=success)", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open"
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "error", message: "Fail", code: 100 })
    });

    await expect(getEnterpriseBaseInfo("id")).rejects.toThrow(YuandianApiError);
  });  
});
