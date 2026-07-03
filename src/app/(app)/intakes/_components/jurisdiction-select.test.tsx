// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JurisdictionSelect } from "./jurisdiction-select";

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, disabled }: any) => (
    <div data-testid="select" data-value={value} data-disabled={disabled}>
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

// Mock china-regions
vi.mock("@/lib/china-regions", () => ({
  provinces: ["北京市", "上海市"],
  citiesOf: vi.fn((province: string) => {
    if (province === "北京市") return ["市辖区"];
    if (province === "上海市") return ["市辖区"];
    return [];
  }),
  areasOf: vi.fn((province: string, city: string) => {
    if (province === "北京市" && city === "市辖区") return ["东城区", "西城区"];
    if (province === "上海市" && city === "市辖区") return ["黄浦区", "徐汇区"];
    return [];
  }),
  joinJurisdiction: vi.fn((...parts: string[]) => parts.filter(Boolean).join("/")),
  parseJurisdiction: vi.fn((v: string) => {
    const [province, city, area] = v.split("/");
    return { province: province || "", city: city || "", area: area || "" };
  })
}));

describe("JurisdictionSelect", () => {
  const defaultOnChange = vi.fn();
  const defaultProps = {
    value: "",
    onChange: defaultOnChange
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders button with placeholder when no value", () => {
    render(<JurisdictionSelect {...defaultProps} />);
    expect(screen.getByText("选择管辖地")).toBeInTheDocument();
  });

  it("renders button with formatted display when value present", () => {
    render(<JurisdictionSelect {...defaultProps} value="北京市/市辖区/东城区" />);
    expect(screen.getByText("北京市 / 市辖区 / 东城区")).toBeInTheDocument();
  });

  it("renders province select with provinces", () => {
    render(<JurisdictionSelect {...defaultProps} />);
    expect(screen.getByTestId("select-item-北京市")).toBeInTheDocument();
    expect(screen.getByTestId("select-item-上海市")).toBeInTheDocument();
  });

  it("disables city and area selects when no province selected", () => {
    render(<JurisdictionSelect {...defaultProps} />);
    const selects = screen.getAllByTestId("select");
    // city select is second, area is third
    expect(selects[1].getAttribute("data-disabled")).toBe("true");
    expect(selects[2].getAttribute("data-disabled")).toBe("true");
  });

  it("enables city select when province selected", () => {
    render(<JurisdictionSelect {...defaultProps} value="北京市" />);
    const selects = screen.getAllByTestId("select");
    expect(selects[1].getAttribute("data-disabled")).toBe("false");
  });

  it("populates city options after province selected", () => {
    render(<JurisdictionSelect {...defaultProps} value="北京市" />);
    expect(screen.getByTestId("select-item-市辖区")).toBeInTheDocument();
  });

  it("shows clear button when value is set", () => {
    render(<JurisdictionSelect {...defaultProps} value="北京市" />);
    expect(screen.getByText("清空")).toBeInTheDocument();
  });

  it("calls onChange with empty string when clear button clicked", () => {
    render(<JurisdictionSelect {...defaultProps} value="北京市" />);
    const clearBtn = screen.getByText("清空");
    clearBtn.click();
    expect(defaultOnChange).toHaveBeenCalledWith("");
  });
});
