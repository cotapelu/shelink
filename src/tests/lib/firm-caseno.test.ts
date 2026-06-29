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
import { renderCaseNoTemplate, CaseNoTokens } from "@/lib/matters/firm-caseno";

describe("renderCaseNoTemplate", () => {
  const tokens: CaseNoTokens = {
    year: 2026,
    firmShortName: "普",
    categoryAbbr: "民",
    categoryWord: "民诉",
    seq: 1
  };

  it("renders default template", () => {
    const result = renderCaseNoTemplate("{年}-{所}{类词}-{序3}", tokens);
    expect(result).toBe("2026-普民诉-001");
  });

  it("handles 2-digit year", () => {
    const result = renderCaseNoTemplate("{年2}-{所}{类}-{序4}", tokens);
    expect(result).toBe("26-普民-0001");
  });

  it("renders different template", () => {
    const result = renderCaseNoTemplate("{所}{类词}{序3}", tokens);
    expect(result).toBe("普民诉001");
  });

  it("pads sequence correctly", () => {
    const result = renderCaseNoTemplate("{序4}", { ...tokens, seq: 42 });
    expect(result).toBe("0042");
  });

  it("handles all tokens independently", () => {
    const result = renderCaseNoTemplate("{年}{年2}{所}{类}{类词}{序3}{序4}", tokens);
    expect(result).toBe("202626普民民诉0010001");
  });
});
