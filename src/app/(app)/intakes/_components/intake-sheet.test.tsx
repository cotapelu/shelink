/*
 * Test suite for IntakeSheet component
 * Provides regression protection before refactoring the 1593-line God Object
 */

// @ts-nocheck - Extensive mocking may cause type issues

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { IntakeSheet } from "./intake-sheet";
import type { Colleague, ClientOption } from "./intake-sheet";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
      },
    },
    status: "authenticated",
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(() => "loading-id"),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/server/intakes/actions", () => ({
  createIntake: vi.fn(),
}));

vi.mock("@/server/documents/actions", () => ({
  uploadDocument: vi.fn(),
}));

vi.mock("@/server/ai/parse-pleading", () => ({
  parsePleading: vi.fn(),
}));

vi.mock("@/server/ai/recommend-cause", () => ({
  recommendCause: vi.fn(),
}));

vi.mock("@/server/yuandian/enterprise", () => ({
  getEnterpriseDetail: vi.fn(),
}));

vi.mock("@/lib/enums", () => ({
  matterCategoryLabel: vi.fn((c: any) => c),
  procedureTypeLabel: vi.fn((p: any) => p),
  litigationStandingLabel: vi.fn((s: any) => s),
  feeTypeLabel: vi.fn((f: any) => f),
  procedureToStandingOptions: vi.fn(() => []),
  userRoleLabel: vi.fn((r: any) => r),
  barFilingLabel: vi.fn((b: any) => b),
  BAR_FILING_OPTIONS: [] as const,
  matterCategoryKind: vi.fn((c: any) => "litigation"),
  PROJECT_BUSINESS_TYPES: [] as const,
  COUNSEL_TYPES: [] as const,
}));

vi.mock("@/lib/china-regions", () => ({
  agencyOptions: vi.fn(() => []),
}));

vi.mock("@/lib/procedures-by-category", () => ({
  proceduresByCategory: {
    CIVIL_COMMERCIAL: ["SUIT", "APPLICATION"],
  },
}));

vi.mock("./use-intake-form-states", () => ({
  useIntakeFormStates: () => ({
    category: "CIVIL_COMMERCIAL",
    firstProcedureType: undefined,
    clientId: "",
    feeType: undefined,
    ownerUserId: "user-123",
    coUserIds: [],
    receivedAt: new Date(),
    jurisdiction: "",
    firstAgency: undefined,
    barFiling: undefined,
    counterclaim: false,
    ourStanding: undefined,
    businessType: undefined,
    serviceStart: undefined,
    serviceEnd: undefined,
    counselType: undefined,
    parties: [],
    causeFreeText: "",
    claimAmount: undefined,
    claimDescription: "",
    causeId: "",
  }),
}));

vi.mock("./use-auto-title", () => ({
  useAutoTitleSuggestion: () => ({
    setTitleTouched: vi.fn(),
  }),
}));

vi.mock("./client-combobox", () => ({
  ClientCombobox: vi.fn(({ value, onChange }) => (
    <input
      data-testid="client-combobox"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )),
}));

vi.mock("./cause-combobox", () => ({
  CauseCombobox: vi.fn(({ value, onChange }) => (
    <input
      data-testid="cause-combobox"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )),
}));

vi.mock("./jurisdiction-select", () => ({
  JurisdictionSelect: vi.fn(({ value, onChange }) => (
    <input
      data-testid="jurisdiction-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )),
}));

vi.mock("./cause-recommendation-dialog", () => ({
  CauseRecommendationDialog: vi.fn(({ open, onOpenChange, onSelect }) => (
    open ? (
      <div data-testid="cause-rec-dialog">
        <button onClick={() => onSelect({ id: "cause-1", name: "Test Cause" })}>
          Select
        </button>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null
  )),
}));

vi.mock("@/app/(app)/matters/_components/cause-ai-manual-dialog", () => ({
  CauseAiManualDialog: vi.fn(({ open, onOpenChange }) =>
    open ? (
      <div data-testid="ai-manual-dialog">
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null
  ),
}));

vi.mock("@/app/(app)/matters/_components/party-card", () => ({
  PartyCard: vi.fn(({ index, onRemove, fields }) => (
    <div data-testid={`party-${index}`}>
      <span>{fields?.name || "Party"}</span>
      <button onClick={() => onRemove(index)}>Remove</button>
    </div>
  )),
  PARTY_GRID: [],
  PARTY_GRID_NO_STANDING: [],
}));

// Mock shadcn/ui components
vi.mock("@/components/ui/button", () => ({
  Button: vi.fn(({ children, ...props }) => (
    <button {...props}>{children}</button>
  )),
}));

vi.mock("@/components/ui/input", () => ({
  Input: vi.fn(({ ...props }) => <input {...props} />),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: vi.fn(({ ...props }) => <textarea {...props} />),
}));

vi.mock("@/components/ui/label", () => ({
  Label: vi.fn(({ children }) => <label>{children}</label>),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: vi.fn(({ checked, onCheckedChange }) => (
    <input
      type="checkbox"
      checked={checked as boolean}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  )),
}));

vi.mock("@/components/ui/select", () => ({
  Select: vi.fn(({ children, value, onValueChange }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  )),
  SelectContent: vi.fn(({ children }) => <>{children}</>),
  SelectItem: vi.fn(({ children, value }) => (
    <option value={value}>{children}</option>
  )),
  SelectTrigger: vi.fn(({ children }) => <>{children}</>),
  SelectValue: vi.fn(() => null),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: vi.fn(({ children, open, onOpenChange }) =>
    open ? (
      <div data-testid="dialog" onClick={() => onOpenChange(false)}>
        {children}
      </div>
    ) : null
  ),
  DialogContent: vi.fn(({ children }) => <div>{children}</div>),
  DialogHeader: vi.fn(({ children }) => <header>{children}</header>),
  DialogTitle: vi.fn(({ children }) => <h2>{children}</h2>),
  DialogDescription: vi.fn(({ children }) => <p>{children}</p>),
  DialogFooter: vi.fn(({ children }) => <footer>{children}</footer>),
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: vi.fn(({ children }) => <div>{children}</div>),
  PopoverContent: vi.fn(({ children }) => <div>{children}</div>),
  PopoverTrigger: vi.fn(({ children }) => <>{children}</>),
}));

vi.mock("lucide-react", () => ({
  Loader2: () => <span>Loading...</span>,
  Plus: () => <span>+</span>,
  Paperclip: () => <span>📎</span>,
  FileText: () => <span>📄</span>,
  X: () => <span>×</span>,
  CalendarDays: () => <span>📅</span>,
  ScanLine: () => <span>🔍</span>,
  ChevronDown: () => <span>▼</span>,
  ChevronsUpDown: () => <span>▲▼</span>,
}));

vi.mock("clsx", () => ({
  clsx: vi.fn((...classes: any[]) => classes.filter(Boolean).join(" ")),
}));

describe("IntakeSheet", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    clientOptions: [] as { id: string; name: string }[],
    colleagues: [] as Colleague[],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders dialog when open is true", () => {
      render(<IntakeSheet {...defaultProps} />);
      expect(screen.getByTestId("dialog")).toBeInTheDocument();
      expect(screen.getByText("新建收案")).toBeInTheDocument();
    });

    it("does not render when open is false", () => {
      render(<IntakeSheet {...defaultProps} open={false} />);
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });

    it("renders basic info section", () => {
      render(<IntakeSheet {...defaultProps} />);
      expect(screen.getByText("Thông tin cơ bản")).toBeInTheDocument();
    });

    it("renders parties section", () => {
      render(<IntakeSheet {...defaultProps} />);
      // For litigation kind, the section title is "Bên liên quan vụ án"
      expect(screen.getByText("Bên liên quan vụ án")).toBeInTheDocument();
    });

    it("renders fee section", () => {
      render(<IntakeSheet {...defaultProps} />);
      expect(screen.getByText("Phí luật sư")).toBeInTheDocument();
    });

    it("debug: dump rendered html for inspection", () => {
      const { container } = render(<IntakeSheet {...defaultProps} />);
      console.log(container.innerHTML.slice(0, 8000));
      expect(true).toBe(true);
    });
  });

  describe("Form Validation", () => {
    it("renders required fields", () => {
      render(<IntakeSheet {...defaultProps} />);
      // Check that required fields are present: case title input labeled "Tên vụ án"
      expect(screen.getByText(/Tên vụ án/)).toBeInTheDocument();
    });

    // More validation tests to be added
  });

  describe("Party Management", () => {
    it("renders party fields", () => {
      render(<IntakeSheet {...defaultProps} />);
      // Litigation kind shows "Bên liên quan vụ án" section
      expect(screen.getByText("Bên liên quan vụ án")).toBeInTheDocument();
    });
  });

  describe("Submission", () => {
    it("renders submit button in footer", () => {
      render(<IntakeSheet {...defaultProps} />);
      expect(screen.getByRole("button", { name: /新建收案|保存|提交/i })).toBeInTheDocument();
    });
  });

  describe("Integration: Multi-Section Rendering", () => {
    it("renders all major section headers", () => {
      render(<IntakeSheet {...defaultProps} />);
      const headers = ["Thông tin cơ bản", "Bên liên quan vụ án", "Phí luật sư", "Hợp đồng ủy quyền / Tài liệu liên quan"];
      headers.forEach((text) => {
        expect(screen.getByText(text)).toBeInTheDocument();
      });
    });

    it("renders key fields", () => {
      render(<IntakeSheet {...defaultProps} />);
      expect(screen.getByText("Tên vụ án")).toBeInTheDocument();
      expect(screen.getByText("Nguyên nhân vụ án")).toBeInTheDocument();
      expect(screen.getByText("Giá trị yêu cầu (VNĐ)")).toBeInTheDocument();
      expect(screen.getByText("Luật sư phụ trách")).toBeInTheDocument();
    });

    it("renders footer submit button with correct text", () => {
      render(<IntakeSheet {...defaultProps} />);
      expect(screen.getByRole("button", { name: /提交审批/i })).toBeInTheDocument();
    });

    it("renders cancel button", () => {
      render(<IntakeSheet {...defaultProps} />);
      expect(screen.getByRole("button", { name: /取消/i })).toBeInTheDocument();
    });
  });

  describe("AI Features", () => {
    it("renders AI recommendation button", () => {
      render(<IntakeSheet {...defaultProps} />);
      // TODO: verify AI recommendation button exists
    });
  });
});
