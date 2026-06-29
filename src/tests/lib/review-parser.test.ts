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
import { parseReviewItems } from "@/lib/ai/review-parser";

describe("parseReviewItems", () => {
  it("正常路径：4 条不同 type / severity 解析 + 按严重度排序", () => {
    const json = JSON.stringify([
      { type: "SUGGESTION", severity: "LOW", title: "措辞建议", detail: "可改用更规范术语" },
      { type: "MISSING", severity: "HIGH", title: "违约责任缺失", detail: "未约定违约金计算方式" },
      { type: "RISK", severity: "MEDIUM", title: "管辖约定模糊", detail: "未指定具体法院" },
      { type: "ISSUE", severity: "HIGH", title: "金额前后不符", detail: "正文 5 万但附件 5.5 万" }
    ]);
    const items = parseReviewItems(json);
    expect(items).toHaveLength(4);
    expect(items[0].severity).toBe("HIGH");
    expect(items[1].severity).toBe("HIGH");
    expect(items[2].severity).toBe("MEDIUM");
    expect(items[3].severity).toBe("LOW");
  });

  it("空数组合法", () => {
    expect(parseReviewItems("[]")).toEqual([]);
  });

  it("title/detail 缺失的条目丢弃", () => {
    const json = JSON.stringify([
      { type: "RISK", severity: "HIGH", title: "", detail: "x" },
      { type: "RISK", severity: "HIGH", title: "有效", detail: "" },
      { type: "RISK", severity: "HIGH", title: "保留", detail: "完整" }
    ]);
    const items = parseReviewItems(json);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("保留");
  });

  it("非法 type/severity 回退默认值", () => {
    const json = JSON.stringify([
      { type: "UNKNOWN_TYPE", severity: "CRIT", title: "T", detail: "D" }
    ]);
    const items = parseReviewItems(json);
    expect(items[0].type).toBe("ISSUE");
    expect(items[0].severity).toBe("MEDIUM");
  });

  it("大小写不规范也能识别", () => {
    const json = JSON.stringify([
      { type: "missing", severity: "high", title: "T", detail: "D" }
    ]);
    const items = parseReviewItems(json);
    expect(items[0].type).toBe("MISSING");
    expect(items[0].severity).toBe("HIGH");
  });

  it("JSON 被 markdown ``` 包裹也能抽取", () => {
    const wrapped = "好的，分析如下：\n```json\n[{\"type\":\"RISK\",\"severity\":\"HIGH\",\"title\":\"X\",\"detail\":\"Y\"}]\n```";
    const items = parseReviewItems(wrapped);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("X");
  });

  it("非数组（对象）抛错", () => {
    expect(() => parseReviewItems('{"items": []}')).toThrow(/无法解析/);
  });

  it("无 JSON 抛错", () => {
    expect(() => parseReviewItems("抱歉，无法处理")).toThrow(/无法解析/);
  });
});
