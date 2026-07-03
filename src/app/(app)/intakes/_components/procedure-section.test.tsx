// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProcedureSection } from "./procedure-section";

// Mock components
vi.mock("@/components/ui/input", () => ({
  Input: ({ ...props }: any) => <input {...props} data-testid="input" />
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: any) => <div data-testid="select">{children}</div>,
  SelectTrigger: () => <div data-testid="select-trigger" />,
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
  SelectValue: ({ placeholder }: any) => <span data-testid="select-value">{placeholder}</span>
}));

vi.mock("./field", () => ({
  Field: ({ children, label, required, error }: any) => (
    <div data-testid="field">
      <label>
        {label} {required && "*"}
      </label>
      {error && <p role="alert">{error}</p>}
      {children}
    </div>
  )
}));

vi.mock("@/lib/enums", () => ({
  procedureTypeLabel: { LITIGATION: "诉讼", ARBITRATION: "仲裁" },
  litigationStandingLabel: { PLAINTIFF: "原告", DEFENDANT: "被告" },
  barFilingLabel: { YES: "是", NO: "否" },
  BAR_FILING_OPTIONS: ["YES", "NO"]
}));

describe("ProcedureSection", () => {
  const mockSetValue = vi.fn();
  const defaultProps = {
    kind: "litigation" as "litigation",
    firstProcedureType: undefined,
    jurisdiction: "",
    firstAgency: "",
    ourStanding: undefined,
    barFiling: undefined,
    counterclaim: false,
    procedureOptions: ["LITIGATION", "ARBITRATION"] as any,
    agencyOpts: ["Court A"],
    ourStandingOptions: ["PLAINTIFF", "DEFENDANT"] as any,
    oppositeStandingOptions: ["THIRD_PARTY"] as any,
    register: () => ({}),
    setValue: mockSetValue,
    errors: {},
    onProcedureChange: undefined
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders main fields (procedure, jurisdiction, agency)", () => {
    render(<ProcedureSection {...defaultProps} />);
    expect(screen.getByText(/当前程序\s*\*/)).toBeInTheDocument();
    expect(screen.getByText("管辖地")).toBeInTheDocument();
    expect(screen.getByText("争议解决机构")).toBeInTheDocument();
  });

  it("renders procedure options", () => {
    render(<ProcedureSection {...defaultProps} />);
    expect(screen.getByTestId("select-item-LITIGATION")).toBeInTheDocument();
    expect(screen.getByTestId("select-item-ARBITRATION")).toBeInTheDocument();
  });

  it("renders barFiling select", () => {
    render(<ProcedureSection {...defaultProps} />);
    expect(screen.getByText("是否需向律协备案")).toBeInTheDocument();
  });

  it("renders agency options", () => {
    render(<ProcedureSection {...defaultProps} />);
    expect(screen.getByTestId("select-item-Court A")).toBeInTheDocument();
  });

  it("displays error for firstProcedureType", () => {
    const propsWithError = {
      ...defaultProps,
      errors: { firstProcedureType: { message: "Required" } }
    };
    render(<ProcedureSection {...propsWithError} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });

  it("renders with jurisdiction value", () => {
    render(<ProcedureSection {...defaultProps} jurisdiction="北京市" />);
    const input = screen.getByPlaceholderText("输入管辖地");
    expect(input).toHaveValue("北京市");
  });
});
