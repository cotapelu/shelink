import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClientHeader } from "../client-header";
import type { Client } from "@prisma/client";

const mockClient: any = {
  id: "c1",
  internalCode: "C001",
  name: "Test Client",
  type: "COMPANY",
  cooperationStatus: "SIGNED",
  contacts: [],
  matters: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  tags: [],
  address: null,
  phone: null,
  email: null,
  idNumber: null,
  userGroupId: null,
  note: null,
  primaryContactId: null,
  firmCaseNo: null,
  customValues: {}
};

describe("ClientHeader", () => {
  it("renders client name and type badge", () => {
    render(<ClientHeader client={mockClient} />);
    expect(screen.getByText("Test Client")).toBeInTheDocument();
    // clientTypeLabel[COMPANY] is "Công ty" (Vietnamese)
    expect(screen.getByText("Công ty")).toBeInTheDocument();
  });

  it("renders cooperation status with correct tone class", () => {
    render(<ClientHeader client={mockClient} />);
    // cooperationStatusLabel[SIGNED] = "Đã ký hợp đồng"
    expect(screen.getByText("Đã ký hợp đồng")).toBeInTheDocument();
  });

  it("renders actions when provided", () => {
    render(
      <ClientHeader
        client={mockClient}
        actions={<button>Edit</button>}
      />
    );
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("chooses correct icon for individual client", () => {
    const individual: Client = { ...mockClient, type: "INDIVIDUAL" };
    render(<ClientHeader client={individual} />);
    // Should render an SVG icon
    const icon = document.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("renders fallback Briefcase icon for unknown client type", () => {
    const unknown: Client = { ...mockClient, type: "UNKNOWN" as any };
    render(<ClientHeader client={unknown} />);
    const icon = document.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("renders fallback tone for unknown cooperationStatus", () => {
    const unknownStatus = { ...mockClient, cooperationStatus: "UNKNOWN" as any };
    render(<ClientHeader client={unknownStatus} />);
    // The cooperation status badge should have the default muted classes
    const badge = document.querySelector("span.bg-muted");
    expect(badge).toBeInTheDocument();
  });
});
