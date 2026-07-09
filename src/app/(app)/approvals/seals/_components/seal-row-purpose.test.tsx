import { render, screen } from "@testing-library/react";
import { SealRowPurpose } from "./seal-row-purpose";

describe("SealRowPurpose", () => {
  it("renders purpose text with title attribute", () => {
    render(<SealRowPurpose purpose="合同盖章用" />);
    const cell = screen.getByText("合同盖章用");
    expect(cell).toHaveAttribute("title", "合同盖章用");
  });
});
