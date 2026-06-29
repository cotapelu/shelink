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
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  searchPtalCases,
  buildCaseDetailUrl,
  YuandianNotConfiguredError,
  YuandianApiError
} from "@/lib/yuandian/client";
import { getYuandianSettings } from "@/lib/yuandian/settings";

// Mock settings
vi.mock("@/lib/yuandian/settings", () => ({
  getYuandianSettings: vi.fn()
}));

// Mock global fetch
global.fetch = vi.fn();

describe("buildCaseDetailUrl", () => {
  it("constructs URL with trailing slash handling", () => {
    const url = buildCaseDetailUrl("https://www.chineselaw.com", "/case/123");
    expect(url).toBe("https://www.chineselaw.com/case/123");
  });

  it("adds leading slash to relative path", () => {
    const url = buildCaseDetailUrl("https://www.chineselaw.com", "case/123");
    expect(url).toBe("https://www.chineselaw.com/case/123");
  });

  it("trims trailing slash from host", () => {
    const url = buildCaseDetailUrl("https://www.chineselaw.com/", "case/123");
    expect(url).toBe("https://www.chineselaw.com/case/123");
  });
});

describe("searchPtalCases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws YuandianNotConfiguredError when not configured", async () => {
    (getYuandianSettings as any).mockResolvedValue({ configured: false, apiKey: "", baseUrl: "", caseDetailHost: "" });

    await expect(
      searchPtalCases({ ay: ["test"] })
    ).rejects.toThrow(YuandianNotConfiguredError);
  });

  it("throws error when no search params provided", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key123",
      baseUrl: "https://open.chineselaw.com/open",
      caseDetailHost: "https://www.chineselaw.com"
    });

    await expect(
      searchPtalCases({})
    ).rejects.toThrow("至少填写一个检索条件");
  });

  it("constructs correct request body for simple search", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "test-key",
      baseUrl: "https://open.chineselaw.com/open",
      caseDetailHost: "https://www.chineselaw.com"
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: { total: 1, lst: [{ id: "1", ah: "案号1", title: "Title", ay: [], jbdw: "", ajlb: "", xzqh_p: "", wszl: "", cprq: "", content: "", url: "", score: 0 }] } })
    });

    await searchPtalCases({
      ay: ["民商诉讼"],
      top_k: 20
    });

    const fetchCall = (global.fetch as any).mock.calls[0];
    expect(fetchCall[0]).toBe("https://open.chineselaw.com/open/rh_ptal_search");
    expect(fetchCall[1].method).toBe("POST");
    expect(fetchCall[1].headers["X-API-Key"]).toBe("test-key");
    const body = JSON.parse(fetchCall[1].body);
    expect(body.ay).toEqual(["民商诉讼"]);
    expect(body.top_k).toBe(20);
  });

  it("includes multiple params in body", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open",
      caseDetailHost: "https://www.chineselaw.com"
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: { total: 0, lst: [] } })
    });

    await searchPtalCases({
      ay: ["刑案"],
      qw: "关键词",
      xzqh_p: ["北京"],
      wszl: ["判决书"],
      top_k: 5
    });

    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.ay).toEqual(["刑案"]);
    expect(body.qw).toBe("关键词");
    expect(body.search_mode).toBe("and");
    expect(body.xzqh_p).toEqual(["北京"]);
    expect(body.wszl).toEqual(["判决书"]);
    expect(body.top_k).toBe(5);
  });

  it("trims qw parameter", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open",
      caseDetailHost: "https://www.chineselaw.com"
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: { total: 0, lst: [] } })
    });

    await searchPtalCases({ qw: "  some query  " });

    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.qw).toBe("some query");
  });

  it("clamps top_k between 1 and 50", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open",
      caseDetailHost: "https://www.chineselaw.com"
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: { total: 0, lst: [] } })
    });

    await searchPtalCases({ qw: "test", top_k: 100 });
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.top_k).toBe(50);

    await searchPtalCases({ qw: "test", top_k: 0 });
    const body2 = JSON.parse((global.fetch as any).mock.calls[1][1].body);
    expect(body2.top_k).toBe(1);
  });

  it("handles HTTP error response", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open",
      caseDetailHost: "https://www.chineselaw.com"
    });

    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400
    });

    await expect(searchPtalCases({ qw: "test" }))
      .rejects.toThrow(YuandianApiError);
  });

  it("handles non-success status in response", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open",
      caseDetailHost: "https://www.chineselaw.com"
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "error", message: "Invalid request", code: 1001 })
    });

    await expect(searchPtalCases({ qw: "test" }))
      .rejects.toThrow(YuandianApiError);
  });

  it("returns empty result when data is null", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open",
      caseDetailHost: "https://www.chineselaw.com"
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: null })
    });

    const result = await searchPtalCases({ qw: "test" });
    expect(result).toEqual({ total: 0, items: [] });
  });

  // Timeout test requires more complex mocking; skipped for unit test scope

  it("throws when all params empty/undefined", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open",
      caseDetailHost: "https://www.chineselaw.com"
    });

    await expect(searchPtalCases({ ay: [] as any, qw: "", xzqh_p: [] as any, wszl: [] as any, ajlb: undefined, ja_start: undefined, ja_end: undefined })).rejects.toThrow("至少填写一个检索条件");
  });

  it("excludes empty arrays and undefined from body", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open",
      caseDetailHost: "https://www.chineselaw.com"
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: { total: 0, lst: [] } })
    });

    // Only qw is non-empty after trim; ay empty, xzqh empty, wszl empty
    await searchPtalCases({ ay: [], qw: "query ", xzqh_p: [] as any, wszl: [] as any });

    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.ay).toBeUndefined();
    expect(body.xzqh_p).toBeUndefined();
    expect(body.wszl).toBeUndefined();
    expect(body.qw).toBe("query");
  });

  it("includes ja_start and ja_end in body", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open",
      caseDetailHost: "https://www.chineselaw.com"
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: { total: 0, lst: [] } })
    });

    await searchPtalCases({ qw: "test", ja_start: "2024-01-01", ja_end: "2024-01-31" });

    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.ja_start).toBe("2024-01-01");
    expect(body.ja_end).toBe("2024-01-31");
  });

  it("propagates JSON parse error", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open",
      caseDetailHost: "https://www.chineselaw.com"
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => { throw new Error("JSON parse failed"); }
    });

    await expect(searchPtalCases({ qw: "test" })).rejects.toThrow("JSON parse failed");
  });

  it("defaults top_k to 10 when not provided", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open"
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: { total: 0, lst: [] } })
    });

    await searchPtalCases({ ay: ["test"] });

    const [url, opts] = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.top_k).toBe(10);
  });

  it("clamps top_k to max 50", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open"
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: { total: 0, lst: [] } })
    });

    await searchPtalCases({ ay: ["test"], top_k: 100 });

    const [url, opts] = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.top_k).toBe(50);
  });

  it("clamps top_k to min 1", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open"
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: { total: 0, lst: [] } })
    });

    await searchPtalCases({ ay: ["test"], top_k: 0 });

    const [url, opts] = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.top_k).toBe(1);
  });

  it("does not add search_mode when qw is whitespace only (with other param)", async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: "key",
      baseUrl: "https://open.chineselaw.com/open"
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: { total: 0, lst: [] } })
    });

    await searchPtalCases({ ay: ["test"], qw: "   " });

    const [url, opts] = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.qw).toBeUndefined();
    expect(body.search_mode).toBeUndefined();
    expect(body.ay).toEqual(["test"]);
  });

});
