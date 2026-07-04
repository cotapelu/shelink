// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClientCombobox } from "./client-combobox";

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>
}));

vi.mock("@/components/ui/command", () => ({
  Command: ({ children }: any) => <div>{children}</div>,
  CommandGroup: ({ children }: any) => <div>{children}</div>,
  CommandInput: ({ value, onValueChange }: any) => (
    <input value={value} onChange={(e) => onValueChange(e.target.value)} data-testid="cmd-input" />
  ),
  CommandItem: ({ children, value, onSelect }: any) => (
    <div data-testid={`cmd-item-${value}`} onClick={() => onSelect?.(value)}>
      {children}
    </div>
  ),
  CommandList: ({ children }: any) => <div>{children}</div>
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(" ")
}));

vi.mock("@/server/yuandian/enterprise", () => ({
  searchEnterpriseCandidates: vi.fn(),
  getEnterpriseDetail: vi.fn()
}));

describe("ClientCombobox", () => {
  const mockOnPickExisting = vi.fn();
  const mockOnTypeNew = vi.fn();
  const mockOnPickYuandian = vi.fn();
  const mockOnClear = vi.fn();

  const defaultOptions = [
    { id: "c1", name: "Client A" },
    { id: "c2", name: "Client B" }
  ];

  const defaultProps = {
    clientId: "",
    clientName: "",
    clientType: "COMPANY",
    options: defaultOptions,
    onPickExisting: mockOnPickExisting,
    onTypeNew: mockOnTypeNew,
    onPickYuandian: mockOnPickYuandian,
    onClear: mockOnClear,
    triggerClassName: undefined
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders trigger button with placeholder", () => {
    render(<ClientCombobox {...defaultProps} />);
    expect(screen.getByText("搜索或直接输入名称")).toBeInTheDocument();
  });

  it("displays clientName when provided", () => {
    render(<ClientCombobox {...defaultProps} clientName="Test Client" />);
    expect(screen.getByText("Test Client")).toBeInTheDocument();
  });

  it("shows '新客户' tag when clientId empty and clientName exists", () => {
    render(<ClientCombobox {...defaultProps} clientName="New Client" />);
    expect(screen.getByText("新客户")).toBeInTheDocument();
  });
});