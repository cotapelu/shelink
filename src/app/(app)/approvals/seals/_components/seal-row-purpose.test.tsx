import { render, screen } from "@testing-library/react";
import { SealRowPurpose } from "./seal-row-purpose";

describe("SealRowPurpose", () => {
  it("renders purpose text with title attribute", () => {
    render(<SealRowPurpose purpose="Đóng dấu hợp đồng" />);
    const cell = screen.getByText("Đóng dấu hợp đồng");
    expect(cell).toHaveAttribute("title", "Đóng dấu hợp đồng");
  });
});
