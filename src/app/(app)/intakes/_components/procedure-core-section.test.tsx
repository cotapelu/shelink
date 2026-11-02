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
    LITIGATION: "Tố tụng",
    ARBITRATION: "Trọng tài",
    ADMINISTRATION: "Hành chính"
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
    expect(screen.getByText(/Thủ tục hiện tại\s*\*/)).toBeInTheDocument();
    expect(screen.getByText("Địa giới")).toBeInTheDocument();
    expect(screen.getByText("Cơ quan giải quyết tranh chấp")).toBeInTheDocument();
  });

  it("renders procedure options", () => {
    render(<ProcedureCoreSection {...defaultProps} />);
    expect(screen.getByTestId("select-item-LITIGATION")).toBeInTheDocument();
    expect(screen.getByTestId("select-item-ARBITRATION")).toBeInTheDocument();
    expect(screen.getByTestId("select-item-ADMINISTRATION")).toBeInTheDocument();
  });

  it("renders procedure type labels from enums", () => {
    render(<ProcedureCoreSection {...defaultProps} />);
    expect(screen.getByText("Tố tụng")).toBeInTheDocument();
    expect(screen.getByText("Trọng tài")).toBeInTheDocument();
    expect(screen.getByText("Hành chính")).toBeInTheDocument();
  });

  it("renders jurisdiction input", () => {
    render(<ProcedureCoreSection {...defaultProps} jurisdiction="测试" />);
    const input = screen.getByPlaceholderText("Nhập địa giới");
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
