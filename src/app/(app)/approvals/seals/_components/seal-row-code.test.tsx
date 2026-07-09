import { render, screen, fireEvent } from "@testing-library/react";
import { SealRowCode } from "./seal-row-code";

describe("SealRowCode", () => {
  it("renders code as button with detail action", () => {
    const onDetail = vi.fn();
    render(<SealRowCode code="S123" onDetail={onDetail} />);

    expect(screen.getByText("S123")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(onDetail).toHaveBeenCalled();
  });
});
