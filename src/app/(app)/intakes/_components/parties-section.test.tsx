// @ts-nocheck
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock dependencies BEFORE importing component
vi.mock("@/lib/utils", () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(" ")
}));

vi.mock("@/lib/enums", () => ({
  litigationStandingLabel: {
    PLAINTIFF: "Nguyên đơn",
    DEFENDANT: "Bị đơn",
    THIRD_PARTY: "Người thứ ba"
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
    mode: "litigation" as const,
    parties: [{ id: "1" }],
    watchedParties: [{ role: "OPPOSING_PARTY" }],
    ourStanding: undefined,
    ourStandingOptions: ["PLAINTIFF", "DEFENDANT"] as LitigationStanding[],
    oppositeStandingOptions: ["THIRD_PARTY"] as LitigationStanding[],
    setValue: mockSetValue,
    errors: {} as any,
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
    expect(screen.getByText("Vai trò")).toBeInTheDocument();
    expect(screen.getByText("Loại chủ thể")).toBeInTheDocument();
    expect(screen.getByText("Họ tên / Tên")).toBeInTheDocument();
    expect(screen.getByText("Số giấy tờ / Mã số doanh nghiệp")).toBeInTheDocument();
    expect(screen.getByText(/Lập trường tố tụng/)).toBeInTheDocument();
    expect(screen.getByText("Người liên hệ")).toBeInTheDocument();
    expect(screen.getByText("Điện thoại liên hệ")).toBeInTheDocument();
    expect(screen.getByText("Thao tác")).toBeInTheDocument();
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
    expect(screen.getByText("Lập trường tố tụng")).toBeInTheDocument();
  });

  it("does not show ourStanding for non-litigation mode", () => {
    render(<PartiesSection {...defaultProps} mode="counsel" />);
    expect(screen.queryByText("Lập trường tố tụng")).not.toBeInTheDocument();
  });

  it("passes errors prop down", () => {
    const propsWithError = {
      ...defaultProps,
      errors: { ourStanding: { message: "Required" } } as any
    };
    render(<PartiesSection {...propsWithError} />);
    // Ensure component does not crash with errors prop
    expect(screen.getByTestId("party-card-0")).toBeInTheDocument();
  });
});
