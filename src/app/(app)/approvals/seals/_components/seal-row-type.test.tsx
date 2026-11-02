import { render, screen } from "@testing-library/react";
import { SealRowType } from "./seal-row-type";

describe("SealRowType", () => {
  it("renders mapped Chinese label", () => {
    render(<SealRowType type="FINANCE_SEAL" />);
    expect(screen.getByText("Dấu tài chính")).toBeInTheDocument();
  });

  it("falls back to raw type when not mapped", () => {
    render(<SealRowType type="UNKNOWN" />);
    expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
  });
});
