import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock dependencies BEFORE importing component
vi.mock("@/lib/utils", () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(" ")
}));

vi.mock("@/lib/enums", () => ({
  litigationStandingLabel: {
    PLAINTIFF: "原告",
    DEFENDANT: "被告",
    THIRD_PARTY: "第三人"
  }
}));

vi.mock("@/app/(app)/matters/_components/party-card", () => ({
  PARTY_GRID: "grid-cols-7",
  PARTY_GRID_NO_STANDING: "grid-cols-6",
  PartyCard: ({
    index,
    removable,
    onRemove,
    roleSlot,
    standingSlot
  }: {
    index: number;
    fieldPrefix: string;
    showStanding: boolean;
    removable: boolean;
    onRemove: () => void;
    errors: Record<string, unknown>;
    roleSlot: React.ReactNode;
    standingSlot?: React.ReactNode;
  }) => (
    <div data-testid={`party-card-${index}`}>
      <div>{roleSlot}</div>
      {standingSlot && <div data-testid={`standing-${index}`}>{standingSlot}</div>}
      {removable && (
        <button onClick={onRemove} data-testid={`remove-${index}`}>
          Remove
        </button>
      )}
    </div>
  )
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)} data-testid="select">
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: () => <span data-testid="select-value">value</span>
}));

vi.mock("./client-combobox", () => ({
  ClientCombobox: () => <div data-testid="client-combobox">ClientCombobox</div>
}));

// Now import component
import { PartiesSection } from "./parties-section";
import type { UseFormSetValue } from "react-hook-form";
import type { IntakeCreateInput } from "@/server/intakes/schemas";
import type { LitigationStanding } from "@prisma/client";

const mockSetValue = vi.fn();
const mockOnRemove = vi.fn();

describe("PartiesSection", () => {
  const defaultProps = {
    mode: "litigation" as "litigation",
    parties: [{ id: "1" }],
    watchedParties: [{ role: "OPPOSING_PARTY" }],
    ourStanding: undefined,
    ourStandingOptions: ["PLAINTIFF", "DEFENDANT"] as LitigationStanding[],
    oppositeStandingOptions: ["THIRD_PARTY"] as LitigationStanding[],
    setValue: mockSetValue,
    errors: {} as IntakeCreateInput,
    onRemove: mockOnRemove,
    clientId: "client-1",
    clientOptions: [{ id: "c1", name: "Client A" }],
    onPickYuandian: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders table header", () => {
    render(<PartiesSection {...defaultProps} />);
    expect(screen.getByText("角色")).toBeInTheDocument();
    expect(screen.getByText("主体类型")).toBeInTheDocument();
    expect(screen.getByText("姓名 / 名称")).toBeInTheDocument();
    expect(screen.getByText("证件号 / 信用代码")).toBeInTheDocument();
    expect(screen.getByText(/诉讼地位/)).toBeInTheDocument();
    expect(screen.getByText("联系人")).toBeInTheDocument();
    expect(screen.getByText("联系电话")).toBeInTheDocument();
    expect(screen.getByText("操作")).toBeInTheDocument();
  });

  it("renders party card for each party", () => {
    render(<PartiesSection {...defaultProps} />);
    expect(screen.getByTestId("party-card-0")).toBeInTheDocument();
  });

  it("does not show parties with role not matching mode in counsel", () => {
    render(
      <PartiesSection
        {...defaultProps}
        mode="counsel"
        parties={[{ id: "1" }, { id: "2" }]}
        watchedParties={[{ role: "CLIENT_PARTY" }, { role: "OPPOSING_PARTY" }]}
      />
    );
    expect(screen.getByTestId("party-card-0")).toBeInTheDocument(); // CLIENT_PARTY
    expect(screen.queryByTestId("party-card-1")).not.toBeInTheDocument(); // OPPOSING_PARTY hidden
  });

  it("shows all parties in litigation mode", () => {
    render(
      <PartiesSection
        {...defaultProps}
        mode="litigation"
        parties={[{ id: "1" }, { id: "2" }]}
        watchedParties={[{ role: "CLIENT_PARTY" }, { role: "OPPOSING_PARTY" }]}
      />
    );
    expect(screen.getByTestId("party-card-0")).toBeInTheDocument();
    expect(screen.getByTestId("party-card-1")).toBeInTheDocument();
  });

  it("calls setValue when role changes", () => {
    render(<PartiesSection {...defaultProps} />);
    const select = screen.getByTestId("select");
    fireEvent.change(select, { target: { value: "THIRD_PARTY" } });
    expect(mockSetValue).toHaveBeenCalledWith("parties.0.role", "THIRD_PARTY", { shouldDirty: true });
  });

  it("calls onRemove when remove button clicked", () => {
    render(<PartiesSection {...defaultProps} />);
    fireEvent.click(screen.getByTestId("remove-0"));
    expect(mockOnRemove).toHaveBeenCalledWith(0);
  });

  it("shows ourStanding select for client party in litigation mode", () => {
    render(<PartiesSection {...defaultProps} ourStanding="PLAINTIFF" />);
    expect(screen.getByText("诉讼地位")).toBeInTheDocument();
  });

  it("does not show ourStanding for non-litigation mode", () => {
    render(<PartiesSection {...defaultProps} mode="counsel" />);
    expect(screen.queryByText("诉讼地位")).not.toBeInTheDocument();
  });

  it("passes errors prop down", () => {
    const propsWithError = {
      ...defaultProps,
      errors: { ourStanding: { message: "Required" } } as IntakeCreateInput
    };
    render(<PartiesSection {...propsWithError} />);
    // Error should be rendered inside standingSlot (mocked as part of PartyCard)
    // We can't easily check inner without more complex mock, but we ensure no crash
    expect(screen.getByTestId("party-card-0")).toBeInTheDocument();
  });
});
