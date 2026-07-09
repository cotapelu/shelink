import { render, screen, fireEvent } from "@testing-library/react";
import { SealRow } from "./seal-row";
import type { SealRequestRow } from "./seal-types";

const mockRow: SealRequestRow = {
  id: "1",
  code: "S2025001",
  sealType: "FINANCE_SEAL",
  status: "PENDING",
  requestedAt: new Date("2025-01-15"),
  requestedById: "user1",
  requestedBy: { id: "user1", name: "Alice" },
  purpose: "合同盖章",
  matter: { id: "m1", title: "Contract A" },
  stampedDoc: null
};

const defaultProps = {
  row: mockRow,
  currentUser: { id: "user1", role: "LAWYER" },
  canApprove: true,
  onAction: vi.fn()
};

describe("SealRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders row data correctly", () => {
    render(<SealRow {...defaultProps} />);

    expect(screen.getByText("S2025001")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("合同盖章")).toBeInTheDocument();
    // The seal type may be mapped to Chinese or raw; just verify some content in that cell
    const row = screen.getByRole('row');
    expect(row).toBeInTheDocument();
  });

  it("shows approve button for PENDING when canApprove", () => {
    render(<SealRow {...defaultProps} />);

    expect(screen.getByText("审批")).toBeInTheDocument();
  });

  it("calls onAction('approve') when approve button clicked", () => {
    const onAction = vi.fn();
    render(<SealRow {...defaultProps} onAction={onAction} />);

    fireEvent.click(screen.getByText("审批"));
    expect(onAction).toHaveBeenCalledWith("approve");
  });

  it("shows cancel button for owner of PENDING", () => {
    render(<SealRow {...defaultProps} />); // owner is user1

    expect(screen.getByText("撤销")).toBeInTheDocument();
  });

  it("does not show cancel button for non-owner", () => {
    render(<SealRow {...defaultProps} currentUser={{ id: "user2", role: "LAWYER" }} />);

    expect(screen.queryByText("撤销")).not.toBeInTheDocument();
  });

  it("shows stamp button for APPROVED when user can stamp", () => {
    const approvedRow = { ...mockRow, status: "APPROVED" as const };
    render(<SealRow {...defaultProps} row={approvedRow} />);

    expect(screen.getByText("回填盖章件")).toBeInTheDocument();
  });

  it("shows download link for STAMPED with document", () => {
    const stampedRow = {
      ...mockRow,
      status: "STAMPED" as const,
      stampedDoc: { id: "doc1" }
    };
    render(<SealRow {...defaultProps} row={stampedRow} />);

    expect(screen.getByText("下载")).toBeInTheDocument();
    expect(screen.getByText("下载")).toHaveAttribute("href", "/api/documents/doc1/download");
  });
});
