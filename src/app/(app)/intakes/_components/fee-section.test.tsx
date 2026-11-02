// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FeeSection } from "./fee-section";
import type { UseFormRegister, UseFormSetValue } from "react-hook-form";
import type { IntakeCreateInput } from "@/server/intakes/schemas";
import type { FeeType } from "@prisma/client";

// Mock dependencies
vi.mock("@/lib/utils", () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(" ")
}));

vi.mock("@/lib/enums", () => ({
  feeTypeLabel: {
    FIXED: "Phí cố định",
    CONTINGENCY: "Theo kết quả",
    TIMED: "Theo giờ"
  }
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ ...props }: { [key: string]: unknown }) => <input {...props} data-testid="input" />
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({ ...props }: { [key: string]: unknown }) => <textarea {...props} data-testid="textarea" />
}));

vi.mock("./field", () => ({
  Field: ({ children, label, required, hint }: { children: React.ReactNode; label: string; required?: boolean; hint?: string }) => (
    <div>
      <label>
        {label} {required && "*"}
      </label>
      {hint && <small>{hint}</small>}
      {children}
    </div>
  )
}));

const mockRegister: any = vi.fn(() => ({ onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() }));
const mockSetValue = vi.fn();

describe("FeeSection", () => {
  const defaultProps = {
    kind: "litigation" as const,
    feeType: undefined,
    register: mockRegister,
    setValue: mockSetValue,
    errors: undefined
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders fee type selection buttons", () => {
    render(<FeeSection {...defaultProps} />);
    expect(screen.getByText("Phí cố định")).toBeInTheDocument();
    expect(screen.getByText("Theo kết quả")).toBeInTheDocument();
    expect(screen.getByText("Theo giờ")).toBeInTheDocument();
  });

  it("shows only FIXED and TIMED when kind is counsel (excludes CONTINGENCY)", () => {
    render(<FeeSection {...defaultProps} kind="counsel" />);
    expect(screen.getByText("Phí cố định")).toBeInTheDocument();
    expect(screen.getByText("Theo giờ")).toBeInTheDocument();
    expect(screen.queryByText("Theo kết quả")).not.toBeInTheDocument();
  });

  it("shows all three types for litigation kind", () => {
    render(<FeeSection {...defaultProps} kind="litigation" />);
    expect(screen.getByText("Phí cố định")).toBeInTheDocument();
    expect(screen.getByText("Theo giờ")).toBeInTheDocument();
    expect(screen.getByText("Theo kết quả")).toBeInTheDocument();
  });

  it("calls setValue when fee type button clicked", () => {
    render(<FeeSection {...defaultProps} />);
    fireEvent.click(screen.getByText("Phí cố định"));
    expect(mockSetValue).toHaveBeenCalledWith("feeType", "FIXED", { shouldDirty: true });
  });

  it("displays FIXED fee fields when feeType is FIXED", () => {
    render(<FeeSection {...defaultProps} feeType="FIXED" />);
    expect(screen.getByText(/Tổng số tiền \(VNĐ\)/)).toBeInTheDocument();
    expect(screen.getByText(/Mốc thanh toán \/ Thoả thuận trả góp/)).toBeInTheDocument();
  });

  it("displays TIMED fee fields when feeType is TIMED", () => {
    render(<FeeSection {...defaultProps} feeType="TIMED" />);
    expect(screen.getByText(/Phí theo giờ \(VNĐ \/ giờ\)/)).toBeInTheDocument();
    expect(screen.getByText(/Diễn giải tính phí \/ Chu kỳ quyết toán/)).toBeInTheDocument();
  });

  it("displays CONTINGENCY fields when feeType is CONTINGENCY", () => {
    render(<FeeSection {...defaultProps} feeType="CONTINGENCY" />);
    expect(screen.getByText(/Phí xử lý cơ bản \(VNĐ\)/)).toBeInTheDocument();
    expect(screen.getByText(/Cách tính phí theo kết quả/)).toBeInTheDocument();
    expect(screen.getByText(/Mốc thanh toán/)).toBeInTheDocument();
  });

  it("shows hint for contingency terms", () => {
    render(<FeeSection {...defaultProps} feeType="CONTINGENCY" />);
    expect(screen.getByText(/sau khi bản án\/hòa giải thi hành xong thì thu/)).toBeInTheDocument();
  });

  it("shows fee note field when feeType is set", () => {
    render(<FeeSection {...defaultProps} feeType="FIXED" />);
    expect(screen.getByText("Ghi chú phí (tuỳ chọn)")).toBeInTheDocument();
  });

  it("does not show fee note when feeType is undefined", () => {
    render(<FeeSection {...defaultProps} />);
    expect(screen.queryByText("Ghi chú phí (tuỳ chọn)")).not.toBeInTheDocument();
  });

  it("registers input fields correctly", () => {
    render(<FeeSection {...defaultProps} feeType="FIXED" />);
    const amountInput = screen.getByPlaceholderText("0.00");
    expect(mockRegister).toHaveBeenCalledWith("feeAmount", { valueAsNumber: true });
  });

  it("registers contingency fee amount", () => {
    render(<FeeSection {...defaultProps} feeType="CONTINGENCY" />);
    const amountInput = screen.getByPlaceholderText("0.00");
    expect(mockRegister).toHaveBeenCalledWith("feeAmount", { valueAsNumber: true });
  });

  it("registers schedule fields for each fee type", () => {
    render(<FeeSection {...defaultProps} feeType="FIXED" />);
    const scheduleInput = screen.getByPlaceholderText(/trả .* khi ký/);
    expect(mockRegister).toHaveBeenCalledWith("feeSchedule");
  });

  it("highlights selected fee type button with primary style", () => {
    render(<FeeSection {...defaultProps} feeType="FIXED" />);
    const fixedBtn = screen.getByText("Phí cố định");
    // Check that the button has primary border and background classes
    expect(fixedBtn.className).toContain("border-primary");
    expect(fixedBtn.className).toContain("bg-primary/15");
    expect(fixedBtn.className).toContain("text-primary");
  });

  it("unselected fee type buttons have muted style", () => {
    render(<FeeSection {...defaultProps} feeType="FIXED" />);
    const contingencyBtn = screen.getByText("Theo kết quả");
    // Should NOT have primary styles
    expect(contingencyBtn.className).not.toContain("border-primary");
    expect(contingencyBtn.className).not.toContain("bg-primary/15");
    expect(contingencyBtn.className).not.toContain("text-primary");
  });
});
