import { render, screen } from "@testing-library/react";
import { KpiCard } from "./kpi-card";
import { CheckCircle2 } from "lucide-react";

describe("KpiCard", () => {
  it("renders label and value with icon", () => {
    render(
      <KpiCard
        icon={<CheckCircle2 data-testid="icon" />}
        label="Total"
        value={42}
        accent="rgb(22 163 74)"
      />
    );

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    // Verify the value element exists
    const valueEl = screen.getByText("42");
    expect(valueEl).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });
});
