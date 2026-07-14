// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useWatch } from "react-hook-form";
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
  cooperationStatusLabel: { SIGNED: "Đã ký hợp đồng" },
  COOPERATION_STATUS_OPTIONS: ["SIGNED"],
  genderLabel: { MALE: "Nam", FEMALE: "Nữ" },
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
    useWatch: vi.fn(() => undefined),
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
    expect(screen.getByText("Tạo mới")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<ClientSheet {...defaultProps} open={false} />);
    expect(screen.queryByTestId("sheet")).not.toBeInTheDocument();
  });

  it("displays edit title when editingClient provided", () => {
    const editingClient = { id: "1", name: "Test", type: "COMPANY" } as any;
    render(<ClientSheet {...defaultProps} editingClient={editingClient} />);
    expect(screen.getByText("Chỉnh sửa")).toBeInTheDocument();
  });

  it("renders basic fields (name, type)", () => {
    render(<ClientSheet {...defaultProps} />);
    expect(screen.getByText("Tên khách hàng")).toBeInTheDocument();
    expect(screen.getByText("Loại")).toBeInTheDocument();
  });

  it("calls onOpenChange with false when cancel button clicked", () => {
    render(<ClientSheet {...defaultProps} />);
    // Find cancel button by text "Hủy"
    const cancelBtn = screen.getByText("Hủy");
    fireEvent.click(cancelBtn);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  describe("Type-specific fields", () => {
    beforeEach(() => {
      vi.mocked(useWatch).mockReturnValue(undefined);
    });

    it("shows idNumber field for INDIVIDUAL type", () => {
      vi.mocked(useWatch).mockImplementation((arg: any) => {
        if (arg.name === "type") return "INDIVIDUAL";
        return undefined;
      });
      render(<ClientSheet {...defaultProps} />);
      expect(screen.getByText("Số CMND/CCCD")).toBeInTheDocument();
    });

    it("shows unified social credit code field for COMPANY type", () => {
      vi.mocked(useWatch).mockImplementation((arg: any) => {
        if (arg.name === "type") return "COMPANY";
        return undefined;
      });
      render(<ClientSheet {...defaultProps} />);
      expect(screen.getByText("Mã số doanh nghiệp")).toBeInTheDocument();
    });
  });
});
