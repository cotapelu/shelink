import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClientInfoSection } from "../client-info-section";
import type { Client } from "@prisma/client";

const mockClient: any = {
  id: "c1",
  internalCode: "C001",
  name: "Test Client",
  type: "COMPANY",
  cooperationStatus: "SIGNED",
  gender: "MALE",
  idNumber: "1234567890",
  phone: "0123456789",
  email: "test@example.com",
  address: "123 Main St",
  source: "Referral",
  industry: "Technology",
  contacts: [],
  matters: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  tags: [],
  primaryContactId: null,
  firmCaseNo: null,
  customValues: {}
};

describe("ClientInfoSection", () => {
  const finance = { receivable: 100000, received: 60000, outstanding: 40000 };

  it("renders client name and badges", () => {
    render(<ClientInfoSection client={mockClient} finance={finance} />);
    expect(screen.getByText("Test Client")).toBeInTheDocument();
    expect(screen.getByText("Công ty")).toBeInTheDocument();
    expect(screen.getByText("Đã ký hợp đồng")).toBeInTheDocument();
  });

  it("displays client details correctly", () => {
    render(<ClientInfoSection client={mockClient} finance={finance} />);
    expect(screen.getByText("1234567890")).toBeInTheDocument();
    expect(screen.getByText("0123456789")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
    expect(screen.getByText("Referral")).toBeInTheDocument();
    expect(screen.getByText("Technology")).toBeInTheDocument();
  });

  it("shows dash for optional fields when null", () => {
    const clientWithNulls: Client = {
      ...mockClient,
      gender: null,
      idNumber: null,
      phone: null,
      email: null,
      address: null
    };
    render(<ClientInfoSection client={clientWithNulls} finance={finance} />);
    // The dash component renders a span with class text-muted-foreground/50 containing "—"
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("displays finance stats", () => {
    render(<ClientInfoSection client={mockClient} finance={finance} />);
    expect(screen.getByText("¥100,000")).toBeInTheDocument();
    expect(screen.getByText("¥60,000")).toBeInTheDocument();
    expect(screen.getByText("¥40,000")).toBeInTheDocument();
  });

  it("renders gender label when gender present", () => {
    render(<ClientInfoSection client={mockClient} finance={finance} />);
    // genderLabel[MALE] = "Nam"
    expect(screen.getByText("Nam")).toBeInTheDocument();
  });

  it("renders fallback Briefcase icon for unknown client type", () => {
    const unknownType = { ...mockClient, type: "UNKNOWN" as any };
    render(<ClientInfoSection client={unknownType} finance={finance} />);
    const icon = document.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("renders fallback tone for unknown cooperationStatus", () => {
    const unknownStatus = { ...mockClient, cooperationStatus: "UNKNOWN" as any };
    render(<ClientInfoSection client={unknownStatus} finance={finance} />);
    const badge = document.querySelector("span.bg-muted");
    expect(badge).toBeInTheDocument();
  });
});
