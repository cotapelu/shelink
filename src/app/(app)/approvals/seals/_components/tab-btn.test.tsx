import { render, screen, fireEvent } from "@testing-library/react";
import { TabBtn, Count } from "./tab-btn";
import { vi } from "vitest";

describe("TabBtn", () => {
  it("renders children and calls onClick", () => {
    const handleClick = vi.fn();
    render(
      <TabBtn active={false} onClick={handleClick}>
        <span>My Tab</span>
        <Count n={5} />
      </TabBtn>
    );

    expect(screen.getByText("My Tab")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("shows active indicator when active", () => {
    const { container } = render(
      <TabBtn active={true} onClick={() => {}}>
        Active Tab
      </TabBtn>
    );

    const activeLine = container.querySelector(".bg-primary");
    expect(activeLine).toBeInTheDocument();
  });

  it("does not show active indicator when inactive", () => {
    const { container } = render(
      <TabBtn active={false} onClick={() => {}}>
        Inactive Tab
      </TabBtn>
    );

    const activeLine = container.querySelector(".bg-primary");
    expect(activeLine).not.toBeInTheDocument();
  });
});

describe("Count", () => {
  it("renders count number", () => {
    render(<Count n={3} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("returns null when n is 0", () => {
    const { container } = render(<Count n={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("applies hot style when hot prop is true", () => {
    render(<Count n={5} hot />);
    const badge = screen.getByText("5");
    expect(badge).toHaveClass("bg-amber-500/15", "text-amber-700");
  });
});
