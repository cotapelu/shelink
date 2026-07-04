// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ClientSheet } from "./client-sheet";

// Mock UI components (simplified)
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ ...props }: any) => <input {...props} data-testid="input" />
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({ ...props }: any) => <textarea {...props} data-testid="textarea" />
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: any) => <label>{children}</label>
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ ...props }: any) => <input type="checkbox" {...props} data-testid="checkbox" />
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

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: any) => (open ? <div data-testid="sheet">{children}</div> : null),
  SheetContent: ({ children }: any) => <div data-testid="sheet-content">{children}</div>,
  SheetHeader: ({ children }: any) => <div data-testid="sheet-header">{children}</div>,
  SheetTitle: ({ children }: any) => <h3 data-testid="sheet-title">{children}</h3>,
  SheetDescription: ({ children }: any) => <p data-testid="sheet-description">{children}</p>,
  SheetFooter: ({ children }: any) => <div data-testid="sheet-footer">{children}</div>
}));

vi.mock("@/server/clients/actions", () => ({
  createClient: vi.fn(),
  updateClient: vi.fn()
}));

vi.mock("@/server/clients/schemas", () => ({
  clientCreateSchema: { parse: vi.fn((v) => v) }
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() }
}));

vi.mock("@/lib/enums", () => ({
  cooperationStatusLabel: { SIGNED: "已签约" },
  COOPERATION_STATUS_OPTIONS: ["SIGNED"],
  genderLabel: { MALE: "男", FEMALE: "女" },
  GENDER_OPTIONS: ["MALE", "FEMALE"]
}));

vi.mock("react-hook-form", async () => {
  const actual = await vi.importActual("react-hook-form");
  return {
    ...actual,
    useForm: () => ({
      register: vi.fn(),
      control: {},
      handleSubmit: vi.fn((cb) => cb),
      setValue: vi.fn(),
      reset: vi.fn(),
      formState: { errors: {} }
    }),
    useFieldArray: () => ({
      fields: [],
      append: vi.fn(),
      remove: vi.fn()
    }),
    useWatch: () => undefined,
    zodResolver: () => async (data) => data
  };
});

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "u1" } } })
}));

describe("ClientSheet", () => {
  const mockOnOpenChange = vi.fn();
  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    editingClient: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders sheet when open", () => {
    render(<ClientSheet {...defaultProps} />);
    expect(screen.getByTestId("sheet")).toBeInTheDocument();
    expect(screen.getByText("新建客户")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<ClientSheet {...defaultProps} open={false} />);
    expect(screen.queryByTestId("sheet")).not.toBeInTheDocument();
  });

  it("displays edit title when editingClient provided", () => {
    const editingClient = { id: "1", name: "Test", type: "COMPANY" } as any;
    render(<ClientSheet {...defaultProps} editingClient={editingClient} />);
    expect(screen.getByText("编辑客户")).toBeInTheDocument();
  });

  it("renders basic fields (name, type)", () => {
    render(<ClientSheet {...defaultProps} />);
    expect(screen.getByText("客户名称")).toBeInTheDocument();
    expect(screen.getByText("类型")).toBeInTheDocument();
  });

  it("calls onOpenChange with false when cancel button clicked", () => {
    render(<ClientSheet {...defaultProps} />);
    // Find cancel button by text "取消"
    const cancelBtn = screen.getByText("取消");
    fireEvent.click(cancelBtn);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
