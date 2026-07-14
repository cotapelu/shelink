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
    expect(screen.getByText("Nguyên nhân vụ án *")).toBeInTheDocument();
    expect(screen.getByTestId("cause-combobox")).toBeInTheDocument();
  });

  it("renders AI recommendation and manual selection buttons", () => {
    render(<CauseSection {...defaultProps} />);
    expect(screen.getByText("Gợi ý AI")).toBeInTheDocument();
    expect(screen.getByText("Chọn thủ công")).toBeInTheDocument();
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

  it("AI recommendation button has correct attributes (type, className)", () => {
    render(<CauseSection {...defaultProps} />);
    const aiBtn = screen.getByText("Gợi ý AI").closest("button");
    expect(aiBtn).toHaveAttribute("type", "button");
    expect(aiBtn.className).toContain("gap-1.5");
  });

  it("manual selection button has correct attributes", () => {
    render(<CauseSection {...defaultProps} />);
    const manualBtn = screen.getByText("Chọn thủ công").closest("button");
    expect(manualBtn).toHaveAttribute("type", "button");
    expect(manualBtn.className).toContain("gap-1.5");
  });

  it("passes category and value props to CauseCombobox", () => {
    render(<CauseSection {...defaultProps} category="PATENT" causeId="c123" />);
    const combo = screen.getByTestId("cause-combobox");
    expect(combo).toHaveAttribute("data-category", "PATENT");
    expect(combo).toHaveAttribute("data-value", "c123");
  });

  describe("Error Display Tests", () => {
    it("displays error message when errors.causeId provided", () => {
      const propsWithError = {
        ...defaultProps,
        errors: { causeId: { message: "Phải chọn nguyên nhân vụ án" } } as any
      };
      render(<CauseSection {...propsWithError} />);
      expect(screen.getByRole("alert")).toHaveTextContent("Phải chọn nguyên nhân vụ án");
    });
  });
});
