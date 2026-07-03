// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LawyerSection } from "./lawyer-section";

// Mock Select components
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, multiple }: any) => (
    <div data-testid="select" data-multiple={multiple}>
      {children}
    </div>
  ),
  SelectTrigger: () => <div data-testid="select-trigger" />,
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
  SelectValue: ({ placeholder }: any) => <span data-testid="select-value">{placeholder}</span>
}));

// Mock Field
vi.mock("./field", () => ({
  Field: ({ children, label, required }: any) => (
    <div>
      <label>
        {label} {required && "*"}
      </label>
      {children}
    </div>
  )
}));

describe("LawyerSection", () => {
  const mockSetValue = vi.fn();
  const defaultColleagues = [
    { id: "u1", name: "Alice", role: "LAWYER" },
    { id: "u2", name: "Bob", role: "PRINCIPAL_LAWYER" },
    { id: "u3", name: "Charlie", role: "ASSISTANT" },
    { id: "u4", name: "David", role: "ADMIN" }
  ];

  const defaultProps = {
    ownerUserId: undefined,
    coUserIds: [],
    barFiling: undefined,
    counterclaim: false,
    setValue: mockSetValue,
    errors: {},
    colleagues: defaultColleagues
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all three fields with required indicator", () => {
    render(<LawyerSection {...defaultProps} />);
    expect(screen.getByText(/主办律师\s*\*/)).toBeInTheDocument();
    expect(screen.getByText("协办人员（可多选）")).toBeInTheDocument();
    expect(screen.getByText("是否需向律协备案")).toBeInTheDocument();
  });

  it("renders lawyer options in owner select", () => {
    render(<LawyerSection {...defaultProps} />);
    // Should have items for roles LAWYER and PRINCIPAL_LAWYER (u1, u2)
    expect(screen.getAllByTestId("select-item-u1").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("select-item-u2").length).toBeGreaterThan(0);
  });

  it("excludes ADMIN from co-select", () => {
    render(<LawyerSection {...defaultProps} ownerUserId="u1" />);
    // u4 ADMIN should not appear anywhere
    expect(screen.queryByTestId("select-item-u4")).not.toBeInTheDocument();
  });

  it("includes non-ADMIN colleagues in co-select", () => {
    render(<LawyerSection {...defaultProps} />);
    // ASSISTANT u3 should be in co-select
    expect(screen.getAllByTestId("select-item-u3").length).toBeGreaterThan(0);
  });

  it("handles empty colleagues list", () => {
    render(<LawyerSection {...defaultProps} colleagues={[]} />);
    // No select items should be present
    expect(screen.queryByTestId("select-item-u1")).not.toBeInTheDocument();
    // Fields still rendered
    expect(screen.getByText(/主办律师\s*\*/)).toBeInTheDocument();
  });

  it("does not crash when errors prop passed", () => {
    render(<LawyerSection {...defaultProps} errors={{ ownerUserId: { message: "Required" } }} />);
    expect(screen.getByText(/主办律师\s*\*/)).toBeInTheDocument();
  });

  it("renders with counterclaim prop", () => {
    render(<LawyerSection {...defaultProps} counterclaim={true} />);
    expect(screen.getByText(/主办律师\s*\*/)).toBeInTheDocument();
  });
});
