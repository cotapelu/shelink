// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProcedureSection } from "./procedure-section";

// Mock components
vi.mock("@/components/ui/input", () => ({
  Input: ({ ...props }: any) => <input {...props} data-testid="input" />
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: any) => <div data-testid="select">{children}</div>,
  SelectTrigger: () => <div data-testid="select-trigger" />,
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value, onSelect }: any) => (
    <div data-testid={`select-item-${value}`} onClick={() => onSelect?.(value)}>
      {children}
    </div>
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
  const mockOnProcedureChange = vi.fn();
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
    onProcedureChange: mockOnProcedureChange
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders main fields (procedure, jurisdiction, agency)", () => {
    render(<ProcedureSection {...defaultProps} />);
    expect(screen.getByText(/Thủ tục hiện tại\s*\*/)).toBeInTheDocument();
    expect(screen.getByText("Có thẩm quyền")).toBeInTheDocument();
    expect(screen.getByText("Cơ quan giải quyết tranh chấp")).toBeInTheDocument();
  });

  it("renders procedure options", () => {
    render(<ProcedureSection {...defaultProps} />);
    expect(screen.getByTestId("select-item-LITIGATION")).toBeInTheDocument();
    expect(screen.getByTestId("select-item-ARBITRATION")).toBeInTheDocument();
  });

  it("renders barFiling select", () => {
    render(<ProcedureSection {...defaultProps} />);
    expect(screen.getByText("Cần với Hiệp hội Luật sư không?")).toBeInTheDocument();
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
    const input = screen.getByPlaceholderText("Nhập địa điểm có thẩm quyền");
    expect(input).toHaveValue("北京市");
  });

  describe("Counterclaim", () => {
    it("renders counterclaim select with options", () => {
      render(<ProcedureSection {...defaultProps} />);
      expect(screen.getByText("Có phản tố không?")).toBeInTheDocument();
      expect(screen.getByTestId("select-item-yes")).toBeInTheDocument();
      expect(screen.getByTestId("select-item-no")).toBeInTheDocument();
    });
  });

  describe("Standing selection", () => {
    it("renders our standing options", () => {
      render(<ProcedureSection {...defaultProps} />);
      expect(screen.getByTestId("select-item-PLAINTIFF")).toBeInTheDocument();
      expect(screen.getByTestId("select-item-DEFENDANT")).toBeInTheDocument();
    });
  });
});
