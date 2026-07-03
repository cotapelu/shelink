// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClaimSection } from "./claim-section";
import type { UseFormRegister } from "react-hook-form";

// Mock Input component
vi.mock("@/components/ui/input", () => ({
  Input: ({ ...props }: any) => <input {...props} data-testid="input" />
}));

// Mock Field component
vi.mock("./field", () => ({
  Field: ({ children, label }: any) => (
    <div>
      <label>{label}</label>
      {children}
    </div>
  )
}));

describe("ClaimSection", () => {
  const mockRegister = vi.fn(() => ({
    onChange: vi.fn(),
    onBlur: vi.fn(),
    ref: vi.fn()
  }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders claim amount and description fields", () => {
    render(<ClaimSection register={mockRegister} />);
    expect(screen.getByText("标的额（元）")).toBeInTheDocument();
    expect(screen.getByText("标的描述（非金钱标的或其他诉求）")).toBeInTheDocument();
  });

  it("registers claimAmount with valueAsNumber", () => {
    render(<ClaimSection register={mockRegister} />);
    const amountInput = screen.getByPlaceholderText("0.00");
    expect(mockRegister).toHaveBeenCalledWith("claimAmount", { valueAsNumber: true });
  });

  it("registers claimDescription", () => {
    render(<ClaimSection register={mockRegister} />);
    const descriptionInput = screen.getByPlaceholderText(/如：请求确认合同有效/);
    expect(mockRegister).toHaveBeenCalledWith("claimDescription");
  });

  it("renders two input fields", () => {
    render(<ClaimSection register={mockRegister} />);
    const inputs = screen.getAllByTestId("input");
    expect(inputs).toHaveLength(2);
  });
});
