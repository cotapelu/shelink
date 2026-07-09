import { render, screen } from "@testing-library/react";
import { SealRowMatter } from "./seal-row-matter";

describe("SealRowMatter", () => {
  it("renders link when matter exists", () => {
    const matter = { id: "m1", title: "Contract A" };
    render(<SealRowMatter matter={matter} />);
    const link = screen.getByRole("link");
    expect(link).toHaveTextContent("Contract A");
    expect(link).toHaveAttribute("href", "/matters/m1");
  });

  it("renders placeholder when matter is null", () => {
    render(<SealRowMatter matter={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
