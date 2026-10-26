import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimelineSection } from "../timeline-section";
import type { ClientTimelineEvent } from "@/server/clients/timeline";

const events: ClientTimelineEvent[] = [
  {
    id: "payment:p1",
    source: "PAYMENT",
    occurredAt: new Date("2026-02-20"),
    title: "Đã thu tiền",
    amount: 250000,
    currency: "VND",
    detail: "Dự án LL-2026-CC-0001",
    href: "/matters/m1"
  },
  {
    id: "note:n1",
    source: "NOTE",
    occurredAt: new Date("2026-02-10"),
    title: "Gọi điện · Anh B (Chi)",
    detail: "Trao đổi phí",
    href: "/matters/m1"
  },
  {
    id: "intake:i1",
    source: "INTAKE",
    occurredAt: new Date("2026-01-05"),
    title: "Tiếp nhận mới",
    href: "/intakes/i1"
  }
];

describe("TimelineSection", () => {
  it("renders empty state when there are no events", () => {
    render(<TimelineSection events={[]} />);
    expect(screen.getByText("Chưa có tương tác")).toBeInTheDocument();
  });

  it("renders heading and every event as a linked row", () => {
    render(<TimelineSection events={events} />);
    expect(screen.getByText("Lịch sử tương tác")).toBeInTheDocument();
    expect(screen.getByText("Đã thu tiền")).toBeInTheDocument();
    expect(screen.getByText("Gọi điện · Anh B (Chi)")).toBeInTheDocument();
    expect(screen.getByText("Tiếp nhận mới")).toBeInTheDocument();
    const paymentLink = screen.getByText("Đã thu tiền").closest("a");
    expect(paymentLink).toHaveAttribute("href", "/matters/m1");
  });

  it("formats the payment amount with its currency", () => {
    render(<TimelineSection events={events} />);
    expect(screen.getByText(/¥250,000/)).toBeInTheDocument();
  });
});
