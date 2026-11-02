import { render, screen, fireEvent } from "@testing-library/react";
import { SealRowActions } from "./seal-row-actions";

const defaultProps = {
  row: {
    id: "1",
    code: "S123",
    sealType: "FINANCE_SEAL",
    status: "PENDING",
    requestedAt: new Date(),
    requestedById: "user1",
    requestedBy: { id: "user1", name: "Alice" },
    purpose: "test",
    matter: null,
    stampedDoc: null,
    approvedBy: null,
    stampedByUser: null,
    draftDoc: null,
    createdAt: new Date(),
    updatedAt: new Date()
  } as any,
  currentUser: { id: "user1", role: "LAWYER" },
  canApprove: true,
  onAction: vi.fn()
};

describe("SealRowActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows approve and cancel for PENDING when canApprove and owner", () => {
    render(<SealRowActions {...defaultProps} />);
    expect(screen.getByText("Duyệt")).toBeInTheDocument();
    expect(screen.getByText("Thu hồi")).toBeInTheDocument();
  });

  it("calls onAction('approve') on approve click", () => {
    render(<SealRowActions {...defaultProps} />);
    fireEvent.click(screen.getByText("Duyệt"));
    expect(defaultProps.onAction).toHaveBeenCalledWith("approve");
  });

  it("calls onAction('cancel') on cancel click", () => {
    render(<SealRowActions {...defaultProps} />);
    fireEvent.click(screen.getByText("Thu hồi"));
    expect(defaultProps.onAction).toHaveBeenCalledWith("cancel");
  });

  it("does not show cancel for non-owner", () => {
    render(<SealRowActions {...defaultProps} currentUser={{ id: "user2", role: "LAWYER" }} />);
    expect(screen.queryByText("Thu hồi")).not.toBeInTheDocument();
  });

  it("shows stamp button for APPROVED when canStamp", () => {
    const approvedRow = { ...defaultProps.row, status: "APPROVED" };
    render(<SealRowActions {...defaultProps} row={approvedRow} />);
    expect(screen.getByText("Bổ sung bản đóng dấu")).toBeInTheDocument();
  });

  it("shows download for STAMPED with stampedDoc", () => {
    const stampedRow = { ...defaultProps.row, status: "STAMPED", stampedDoc: { id: "doc1", name: "file.pdf", size: 123 } };
    render(<SealRowActions {...defaultProps} row={stampedRow} />);
    expect(screen.getByText("Tải xuống")).toBeInTheDocument();
  });
});
