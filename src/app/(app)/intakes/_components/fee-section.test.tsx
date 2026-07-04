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
    FIXED: "固定收费",
    CONTINGENCY: "风险代理",
    TIMED: "按时计费"
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
    kind: "litigation" as "litigation",
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
    expect(screen.getByText("固定收费")).toBeInTheDocument();
    expect(screen.getByText("风险代理")).toBeInTheDocument();
    expect(screen.getByText("按时计费")).toBeInTheDocument();
  });

  it("shows only FIXED and TIMED when kind is counsel (excludes CONTINGENCY)", () => {
    render(<FeeSection {...defaultProps} kind="counsel" />);
    expect(screen.getByText("固定收费")).toBeInTheDocument();
    expect(screen.getByText("按时计费")).toBeInTheDocument();
    expect(screen.queryByText("风险代理")).not.toBeInTheDocument();
  });

  it("shows all three types for litigation kind", () => {
    render(<FeeSection {...defaultProps} kind="litigation" />);
    expect(screen.getByText("固定收费")).toBeInTheDocument();
    expect(screen.getByText("按时计费")).toBeInTheDocument();
    expect(screen.getByText("风险代理")).toBeInTheDocument();
  });

  it("calls setValue when fee type button clicked", () => {
    render(<FeeSection {...defaultProps} />);
    fireEvent.click(screen.getByText("固定收费"));
    expect(mockSetValue).toHaveBeenCalledWith("feeType", "FIXED", { shouldDirty: true });
  });

  it("displays FIXED fee fields when feeType is FIXED", () => {
    render(<FeeSection {...defaultProps} feeType="FIXED" />);
    expect(screen.getByText(/总金额（元）/)).toBeInTheDocument();
    expect(screen.getByText(/付款节点 \/ 分期约定/)).toBeInTheDocument();
  });

  it("displays TIMED fee fields when feeType is TIMED", () => {
    render(<FeeSection {...defaultProps} feeType="TIMED" />);
    expect(screen.getByText(/小时费率（元 \/ 小时）/)).toBeInTheDocument();
    expect(screen.getByText(/计费说明 \/ 结算周期/)).toBeInTheDocument();
  });

  it("displays CONTINGENCY fields when feeType is CONTINGENCY", () => {
    render(<FeeSection {...defaultProps} feeType="CONTINGENCY" />);
    expect(screen.getByText(/基础办案费（元）/)).toBeInTheDocument();
    expect(screen.getByText(/风险代理收费方式/)).toBeInTheDocument();
    expect(screen.getByText(/付款节点/)).toBeInTheDocument();
  });

  it("shows hint for contingency terms", () => {
    render(<FeeSection {...defaultProps} feeType="CONTINGENCY" />);
    expect(screen.getByText(/判决\/调解执行到位后按到账金额/)).toBeInTheDocument();
  });

  it("shows fee note field when feeType is set", () => {
    render(<FeeSection {...defaultProps} feeType="FIXED" />);
    expect(screen.getByText("费用备注（可选）")).toBeInTheDocument();
  });

  it("does not show fee note when feeType is undefined", () => {
    render(<FeeSection {...defaultProps} />);
    expect(screen.queryByText("费用备注（可选）")).not.toBeInTheDocument();
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
    const scheduleInput = screen.getByPlaceholderText(/签约付/);
    expect(mockRegister).toHaveBeenCalledWith("feeSchedule");
  });

  it("highlights selected fee type button with primary style", () => {
    render(<FeeSection {...defaultProps} feeType="FIXED" />);
    const fixedBtn = screen.getByText("固定收费");
    // Check that the button has primary border and background classes
    expect(fixedBtn.className).toContain("border-primary");
    expect(fixedBtn.className).toContain("bg-primary/15");
    expect(fixedBtn.className).toContain("text-primary");
  });

  it("unselected fee type buttons have muted style", () => {
    render(<FeeSection {...defaultProps} feeType="FIXED" />);
    const contingencyBtn = screen.getByText("风险代理");
    // Should NOT have primary styles
    expect(contingencyBtn.className).not.toContain("border-primary");
    expect(contingencyBtn.className).not.toContain("bg-primary/15");
    expect(contingencyBtn.className).not.toContain("text-primary");
  });
});
