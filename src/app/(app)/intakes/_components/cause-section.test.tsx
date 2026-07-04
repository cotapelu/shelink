// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CauseSection } from "./cause-section";

// Mock Field component
vi.mock("./field", () => ({
  Field: ({ children, label, required, error }: any) => (
    <div data-testid="field">
      <label>
        {label} {required && "*"}
      </label>
      {error && <span role="alert">{error}</span>}
      {children}
    </div>
  )
}));

// Mock CauseCombobox
vi.mock("./cause-combobox", () => ({
  CauseCombobox: ({ category, value, onChange }: any) => (
    <div data-testid="cause-combobox" data-category={category} data-value={value}>
      <button data-testid="combobox-trigger" onClick={() => onChange("c1", "Cause 1")}>
        Select Cause
      </button>
    </div>
  )
}));

// Mock Buttons (lucide icons rendered as children)
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

describe("CauseSection", () => {
  const mockSetValue = vi.fn();
  const defaultProps = {
    category: "CIVIL_COMMERCIAL" as any,
    causeId: undefined,
    setValue: mockSetValue,
    errors: {}
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders label and combobox", () => {
    render(<CauseSection {...defaultProps} />);
    expect(screen.getByText("案由 *")).toBeInTheDocument();
    expect(screen.getByTestId("cause-combobox")).toBeInTheDocument();
  });

  it("renders AI recommendation and manual selection buttons", () => {
    render(<CauseSection {...defaultProps} />);
    expect(screen.getByText("AI推荐")).toBeInTheDocument();
    expect(screen.getByText("手动选择")).toBeInTheDocument();
  });

  it("calls setValue when combobox selection changes", () => {
    render(<CauseSection {...defaultProps} />);
    fireEvent.click(screen.getByTestId("combobox-trigger"));
    expect(mockSetValue).toHaveBeenCalledWith("causeId", "c1", { shouldDirty: true });
  });

  it("displays error when errors.causeId exists", () => {
    const propsWithError = {
      ...defaultProps,
      errors: { causeId: { message: "Required" } }
    };
    render(<CauseSection {...propsWithError} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });

  it("does not display error when no error", () => {
    render(<CauseSection {...defaultProps} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
