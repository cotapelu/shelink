// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClaimSection } from "./claim-section";
import type { UseFormRegister } from "react-hook-form";

// Mock Input component
vi.mock("@/components/ui/input", () => ({
  Input: ({ ...props }: any) => <input {...props} data-testid="input" />
}));

// Mock Field component (includes error display)
vi.mock("./field", () => ({
  Field: ({ children, label, error, className }: any) => (
    <div className={className}>
      <label>{label}</label>
      {error && <span role="alert">{error.message || error}</span>}
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
    expect(screen.getByText("Giá trị yêu cầu (VNĐ)")).toBeInTheDocument();
    expect(screen.getByText("Mô tả yêu cầu (các yêu cầu không phải tiền hoặc khiếu nại khác)")).toBeInTheDocument();
  });

  it("registers claimAmount with valueAsNumber", () => {
    render(<ClaimSection register={mockRegister} />);
    const amountInput = screen.getByPlaceholderText("0.00");
    expect(mockRegister).toHaveBeenCalledWith("claimAmount", { valueAsNumber: true });
  });

  it("registers claimDescription", () => {
    render(<ClaimSection register={mockRegister} />);
    const descriptionInput = screen.getByPlaceholderText(/Ví dụ: yêu cầu xác nhận hợp đồng có hiệu lực/);
    expect(mockRegister).toHaveBeenCalledWith("claimDescription");
  });

  it("renders two input fields", () => {
    render(<ClaimSection register={mockRegister} />);
    const inputs = screen.getAllByTestId("input");
    expect(inputs).toHaveLength(2);
  });

  it("applies responsive className to description field wrapper", () => {
    render(<ClaimSection register={mockRegister} />);
    // The Field for claimDescription should have sm:col-span-3 class
    const fields = document.querySelectorAll('[class*="sm:col-span-3"]');
    expect(fields.length).toBeGreaterThan(0);
  });

  it("claimAmount input has font-mono class", () => {
    render(<ClaimSection register={mockRegister} />);
    const amountInput = screen.getByPlaceholderText("0.00");
    expect(amountInput.className).toContain("font-mono");
  });

  describe("Input Attributes", () => {
    it("claimAmount input has type number and step 0.01", () => {
      render(<ClaimSection register={mockRegister} />);
      const amountInput = screen.getByPlaceholderText("0.00");
      expect(amountInput).toHaveAttribute("type", "number");
      expect(amountInput).toHaveAttribute("step", "0.01");
      expect(amountInput).toHaveAttribute("inputMode", "decimal");
    });

    it("claimDescription input has correct placeholder", () => {
      render(<ClaimSection register={mockRegister} />);
      const descInput = screen.getByPlaceholderText(/Ví dụ: yêu cầu xác nhận hợp đồng có hiệu lực/);
      expect(descInput).toBeInTheDocument();
    });
  });
});
