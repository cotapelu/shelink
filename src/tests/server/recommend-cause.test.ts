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

const { aiChatMock, searchCausesMock } = vi.hoisted(() => ({
  aiChatMock: vi.fn(),
  searchCausesMock: vi.fn()
}));

vi.mock("@/lib/auth/session", () => ({
  requireSession: vi.fn().mockResolvedValue({ user: { id: "u1" } })
}));

vi.mock("@/lib/ai/client", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/ai/client")>("@/lib/ai/client");
  return {
    ...actual,
    aiChat: aiChatMock
  };
});

vi.mock("@/server/causes/actions", () => ({
  searchCauses: searchCausesMock
}));

import { recommendCause } from "@/server/ai/recommend-cause";

function fakeCause(over: Partial<{ id: string; name: string; level: number }>) {
  return {
    id: over.id ?? "c1",
    code: null,
    name: over.name ?? "民间借贷纠纷",
    shortName: null,
    level: over.level ?? 4,
    parentId: null,
    l1Name: "合同、准合同纠纷",
    l2Name: "借贷合同"
  };
}

beforeEach(() => {
  aiChatMock.mockReset();
  searchCausesMock.mockReset();
});

describe("recommendCause", () => {
  it("LLM 返回 3 条全部命中 → 返回 3 条", async () => {
    aiChatMock.mockResolvedValue({
      content: JSON.stringify([
        { name: "民间借贷纠纷", reason: "借款关系明确", confidence: "HIGH" },
        { name: "买卖合同纠纷", reason: "可能涉及货款", confidence: "MEDIUM" },
        { name: "保证合同纠纷", reason: "存在担保人", confidence: "LOW" }
      ]),
      raw: {}
    });
    searchCausesMock.mockImplementation(async ({ query }: { query: string }) => [
      fakeCause({ id: query, name: query })
    ]);

    const res = await recommendCause({
      category: "CIVIL_COMMERCIAL",
      situation: "原告借给被告 50 万，到期未还"
    });
    expect(res).toHaveLength(3);
    expect(res[0].cause.name).toBe("民间借贷纠纷");
    expect(res[0].confidence).toBe("HIGH");
    expect(res[1].confidence).toBe("MEDIUM");
  });

  it("反查找不到的候选被丢弃", async () => {
    aiChatMock.mockResolvedValue({
      content: JSON.stringify([
        { name: "民间借贷纠纷", reason: "x", confidence: "HIGH" },
        { name: "不存在的案由", reason: "x", confidence: "LOW" },
        { name: "保证合同纠纷", reason: "x", confidence: "MEDIUM" }
      ]),
      raw: {}
    });
    searchCausesMock.mockImplementation(async ({ query }: { query: string }) =>
      query === "不存在的案由" ? [] : [fakeCause({ id: query, name: query })]
    );

    const res = await recommendCause({
      category: "CIVIL_COMMERCIAL",
      situation: "测试用案情描述"
    });
    expect(res).toHaveLength(2);
    expect(res.map((r) => r.cause.name)).toEqual(["民间借贷纠纷", "保证合同纠纷"]);
  });

  it("二级（level<3）的反查结果会被过滤", async () => {
    aiChatMock.mockResolvedValue({
      content: JSON.stringify([
        { name: "合同纠纷", reason: "笼统", confidence: "LOW" },
        { name: "民间借贷纠纷", reason: "x", confidence: "HIGH" }
      ]),
      raw: {}
    });
    searchCausesMock.mockImplementation(async ({ query }: { query: string }) => {
      if (query === "合同纠纷") return [fakeCause({ id: "l2", name: "合同纠纷", level: 2 })];
      return [fakeCause({ id: query, name: query, level: 4 })];
    });

    const res = await recommendCause({
      category: "CIVIL_COMMERCIAL",
      situation: "测试用案情描述"
    });
    expect(res).toHaveLength(1);
    expect(res[0].cause.name).toBe("民间借贷纠纷");
  });

  it("全部反查失败 → 抛错", async () => {
    aiChatMock.mockResolvedValue({
      content: JSON.stringify([
        { name: "案由甲", reason: "x", confidence: "HIGH" },
        { name: "案由乙", reason: "x", confidence: "MEDIUM" }
      ]),
      raw: {}
    });
    searchCausesMock.mockResolvedValue([]);

    await expect(
      recommendCause({ category: "CIVIL_COMMERCIAL", situation: "测试用案情描述" })
    ).rejects.toThrow(/案由库/);
  });

  it("LLM 返回非 JSON → 抛错", async () => {
    aiChatMock.mockResolvedValue({
      content: "抱歉，我无法回答这个问题",
      raw: {}
    });
    await expect(
      recommendCause({ category: "CIVIL_COMMERCIAL", situation: "测试用案情描述" })
    ).rejects.toThrow(/无法解析/);
  });

  it("situation 太短 → 抛错", async () => {
    await expect(
      recommendCause({ category: "CIVIL_COMMERCIAL", situation: "短" })
    ).rejects.toThrow(/太短/);
    expect(aiChatMock).not.toHaveBeenCalled();
  });

  it("置信度大小写不规范也能识别", async () => {
    aiChatMock.mockResolvedValue({
      content: JSON.stringify([
        { name: "民间借贷纠纷", reason: "x", confidence: "high" },
        { name: "买卖合同纠纷", reason: "x", confidence: "中" },
        { name: "保证合同纠纷", reason: "x", confidence: "Low" }
      ]),
      raw: {}
    });
    searchCausesMock.mockImplementation(async ({ query }: { query: string }) => [
      fakeCause({ id: query, name: query })
    ]);

    const res = await recommendCause({
      category: "CIVIL_COMMERCIAL",
      situation: "测试用案情描述"
    });
    expect(res[0].confidence).toBe("HIGH");
    expect(res[1].confidence).toBe("MEDIUM"); // fallback
    expect(res[2].confidence).toBe("LOW");
  });
});
