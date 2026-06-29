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
  selectReviewPrompt,
  reviewPromptLabel,
  CONTRACT_PROMPT,
  PLEADING_PROMPT,
  EVIDENCE_PROMPT,
  JUDGMENT_PROMPT,
  GENERIC_PROMPT
} from "@/lib/ai/review-prompts";

describe("selectReviewPrompt — 按 DocumentCategory 分流", () => {
  it("CONTRACT → 合同 prompt", () => {
    expect(selectReviewPrompt("CONTRACT")).toBe(CONTRACT_PROMPT);
  });
  it("PLEADING → 诉状/申请书 prompt", () => {
    expect(selectReviewPrompt("PLEADING")).toBe(PLEADING_PROMPT);
  });
  it("EVIDENCE → 证据 prompt", () => {
    expect(selectReviewPrompt("EVIDENCE")).toBe(EVIDENCE_PROMPT);
  });
  it("JUDGMENT → 裁判文书 prompt", () => {
    expect(selectReviewPrompt("JUDGMENT")).toBe(JUDGMENT_PROMPT);
  });
  it("PROCEDURE → 通用兜底", () => {
    expect(selectReviewPrompt("PROCEDURE")).toBe(GENERIC_PROMPT);
  });
  it("OTHER → 通用兜底", () => {
    expect(selectReviewPrompt("OTHER")).toBe(GENERIC_PROMPT);
  });
  it("null → 通用兜底", () => {
    expect(selectReviewPrompt(null)).toBe(GENERIC_PROMPT);
  });
  it("undefined → 通用兜底", () => {
    expect(selectReviewPrompt(undefined)).toBe(GENERIC_PROMPT);
  });
});

describe("reviewPromptLabel — 中文标签", () => {
  it("各 category 返回对应中文", () => {
    expect(reviewPromptLabel("CONTRACT")).toBe("合同审查");
    expect(reviewPromptLabel("PLEADING")).toBe("诉状/申请书审查");
    expect(reviewPromptLabel("EVIDENCE")).toBe("证据审查");
    expect(reviewPromptLabel("JUDGMENT")).toBe("裁判文书分析");
  });
  it("兜底类目 / null / undefined → 通用文书审查", () => {
    expect(reviewPromptLabel("PROCEDURE")).toBe("通用文书审查");
    expect(reviewPromptLabel("OTHER")).toBe("通用文书审查");
    expect(reviewPromptLabel(null)).toBe("通用文书审查");
    expect(reviewPromptLabel(undefined)).toBe("通用文书审查");
  });
});

describe("prompt 内容契约", () => {
  it("所有 prompt 都包含输出格式 JSON 数组规范", () => {
    for (const p of [
      CONTRACT_PROMPT,
      PLEADING_PROMPT,
      EVIDENCE_PROMPT,
      JUDGMENT_PROMPT,
      GENERIC_PROMPT
    ]) {
      expect(p).toContain("MISSING");
      expect(p).toContain("RISK");
      expect(p).toContain("ISSUE");
      expect(p).toContain("SUGGESTION");
      expect(p).toContain("HIGH");
      expect(p).toContain("MEDIUM");
      expect(p).toContain("LOW");
      expect(p).toContain("JSON");
    }
  });
  it("所有 prompt 都要求空数组兜底", () => {
    for (const p of [
      CONTRACT_PROMPT,
      PLEADING_PROMPT,
      EVIDENCE_PROMPT,
      JUDGMENT_PROMPT,
      GENERIC_PROMPT
    ]) {
      expect(p).toMatch(/空数组|\[\s*\]/);
    }
  });
  it("CONTRACT prompt 关注合同特征要素", () => {
    expect(CONTRACT_PROMPT).toContain("违约责任");
    expect(CONTRACT_PROMPT).toContain("争议解决");
    expect(CONTRACT_PROMPT).toContain("不可抗力");
  });
  it("PLEADING prompt 关注诉讼程序与诉请", () => {
    expect(PLEADING_PROMPT).toContain("诉讼请求");
    expect(PLEADING_PROMPT).toContain("管辖");
    expect(PLEADING_PROMPT).toContain("诉讼时效");
  });
  it("EVIDENCE prompt 关注三性与证据链", () => {
    expect(EVIDENCE_PROMPT).toContain("真实性");
    expect(EVIDENCE_PROMPT).toContain("合法性");
    expect(EVIDENCE_PROMPT).toContain("关联性");
    expect(EVIDENCE_PROMPT).toContain("证据链");
  });
  it("JUDGMENT prompt 关注裁判分析与应对策略", () => {
    expect(JUDGMENT_PROMPT).toContain("二审");
    expect(JUDGMENT_PROMPT).toContain("再审");
    expect(JUDGMENT_PROMPT).toMatch(/应对|策略|不利/);
  });
});
