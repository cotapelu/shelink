import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContactsSection } from "../contacts-section";


const mockContacts: any[] = [
  {
    id: "ct1",
    clientId: "c1",
    name: "Alice",
    title: "Manager",
    phone: "0123456789",
    email: "alice@example.com",
    wechat: "alice_wx",
    isPrimary: true,
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "ct2",
    clientId: "c1",
    name: "Bob",
    title: null,
    phone: null,
    email: null,
    wechat: null,
    isPrimary: false,
    order: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

describe("ContactsSection", () => {
  it("renders empty state when no contacts", () => {
    render(<ContactsSection contacts={[]} />);
    expect(screen.getByText("暂无联系人")).toBeInTheDocument();
  });

  it("renders table with contacts", () => {
    render(<ContactsSection contacts={mockContacts} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Manager")).toBeInTheDocument();
    expect(screen.getByText("0123456789")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("alice_wx")).toBeInTheDocument();
  });

  it("shows dash for null optional fields", () => {
    render(<ContactsSection contacts={mockContacts} />);
    // Bob row contains dashes for title, phone, email, wechat
    const rows = screen.getAllByRole("row");
    // Row 1 is header, row 2 is Alice, row 3 is Bob
    expect(rows[2]).toHaveTextContent("—");
  });
});
