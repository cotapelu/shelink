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
