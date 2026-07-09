import { render, screen } from "@testing-library/react";
import { SealRowRequester } from "./seal-row-requester";

describe("SealRowRequester", () => {
  it("renders requester name", () => {
    render(<SealRowRequester name="Alice" />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });
});
