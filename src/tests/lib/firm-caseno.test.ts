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
