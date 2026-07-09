import { render, screen } from "@testing-library/react";
import { SealRowStatus } from "./seal-row-status";

describe("SealRowStatus", () => {
  it("renders status label", () => {
    render(<SealRowStatus status="PENDING" />);
    expect(screen.getByText("待审批")).toBeInTheDocument();
  });
});
