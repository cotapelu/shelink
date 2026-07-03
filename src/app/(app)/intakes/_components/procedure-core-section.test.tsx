// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProcedureCoreSection } from "./procedure-core-section";
import type { ProcedureType } from "@prisma/client";

// Mock Select components (simple rendering)
vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: any) => <div data-testid="select">{children}</div>,
  SelectTrigger: () => <div data-testid="select-trigger" />,
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
  SelectValue: ({ placeholder }: any) => <span data-testid="select-value">{placeholder}</span>
}));

// Mock Input
vi.mock("@/components/ui/input", () => ({
  Input: ({ ...props }: any) => <input {...props} data-testid="input" />
}));

// Mock Field
vi.mock("./field", () => ({
  Field: ({ children, label, required, error }: any) => (
    <div>
      <label>
        {label} {required && "*"}
      </label>
      {error && <p role="alert">{error}</p>}
      {children}
    </div>
  )
}));

// Mock enums
vi.mock("@/lib/enums", () => ({
  procedureTypeLabel: {
    LITIGATION: "诉讼",
    ARBITRATION: "仲裁",
    ADMINISTRATION: "行政"
  }
}));

describe("ProcedureCoreSection", () => {
  const defaultProps = {
    firstProcedureType: undefined,
    jurisdiction: "",
    firstAgency: "",
    procedureOptions: ["LITIGATION", "ARBITRATION", "ADMINISTRATION"] as ProcedureType[],
    agencyOpts: ["Court A", "Arbitration B"],
    setValue: () => {},
    errors: {},
    onProcedureChange: undefined
  };

  it("renders three fields with labels", () => {
    render(<ProcedureCoreSection {...defaultProps} />);
    expect(screen.getByText(/当前程序\s*\*/)).toBeInTheDocument();
    expect(screen.getByText("管辖地")).toBeInTheDocument();
    expect(screen.getByText("争议解决机构")).toBeInTheDocument();
  });

  it("renders procedure options", () => {
    render(<ProcedureCoreSection {...defaultProps} />);
    expect(screen.getByTestId("select-item-LITIGATION")).toBeInTheDocument();
    expect(screen.getByTestId("select-item-ARBITRATION")).toBeInTheDocument();
    expect(screen.getByTestId("select-item-ADMINISTRATION")).toBeInTheDocument();
  });

  it("renders procedure type labels from enums", () => {
    render(<ProcedureCoreSection {...defaultProps} />);
    expect(screen.getByText("诉讼")).toBeInTheDocument();
    expect(screen.getByText("仲裁")).toBeInTheDocument();
    expect(screen.getByText("行政")).toBeInTheDocument();
  });

  it("renders jurisdiction input", () => {
    render(<ProcedureCoreSection {...defaultProps} jurisdiction="测试" />);
    const input = screen.getByPlaceholderText("输入管辖地");
    expect(input).toHaveValue("测试");
  });

  it("renders agency options", () => {
    render(<ProcedureCoreSection {...defaultProps} />);
    expect(screen.getByTestId("select-item-Court A")).toBeInTheDocument();
    expect(screen.getByTestId("select-item-Arbitration B")).toBeInTheDocument();
  });

  it("displays error for firstProcedureType", () => {
    const propsWithError = {
      ...defaultProps,
      errors: { firstProcedureType: { message: "Required" } }
    };
    render(<ProcedureCoreSection {...propsWithError} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });
});
