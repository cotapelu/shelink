import { describe, it, expect } from "vitest";
import {
  buildClientTimeline,
  CLIENT_TIMELINE_LIMIT,
  type ClientTimelineInput
} from "./timeline";

function baseInput(overrides: Partial<ClientTimelineInput> = {}): ClientTimelineInput {
  return {
    intakes: [],
    matters: [],
    notes: [],
    payments: [],
    quotes: [],
    contracts: [],
    ...overrides
  };
}

const d = (iso: string) => new Date(iso);

describe("buildClientTimeline", () => {
  it("returns [] for empty input", () => {
    expect(buildClientTimeline(baseInput())).toEqual([]);
  });

  it("merges sources and sorts newest first", () => {
    const events = buildClientTimeline(
      baseInput({
        intakes: [{ id: "i1", title: "Tư vấn", status: "INTAKE", receivedAt: d("2026-01-01"), declinedReason: null }],
        payments: [{ id: "p1", matterId: "m1", amount: 500000, occurredAt: d("2026-03-01") }],
        quotes: [
          { id: "q1", code: "QT-1", title: "BG", status: "SENT", issuedAt: d("2026-02-01"), createdAt: d("2026-01-15"), total: 1000, currency: "VND" }
        ]
      })
    );
    expect(events.map((e) => e.id)).toEqual(["payment:p1", "quote:q1", "intake:i1"]);
    expect(events[0].source).toBe("PAYMENT");
  });

  it("produces matter lifecycle events only when the date exists", () => {
    const events = buildClientTimeline(
      baseInput({
        matters: [
          { id: "m1", internalCode: "LL-2026-CC-0001", title: "Dự án A", createdAt: d("2026-01-01"), firstAcceptedAt: d("2026-01-02"), closedAt: null, archivedAt: d("2026-04-01") }
        ]
      })
    );
    const ids = events.map((e) => e.id);
    expect(ids).toContain("matter:m1:open");
    expect(ids).toContain("matter:m1:accept");
    expect(ids).not.toContain("matter:m1:close");
    expect(ids).toContain("matter:m1:archive");
    const open = events.find((e) => e.id === "matter:m1:open")!;
    expect(open.title).toBe("Mở dự án");
    expect(open.detail).toBe("LL-2026-CC-0001 · Dự án A");
    expect(open.href).toBe("/matters/m1");
  });

  it("formats notes with channel + who + author and truncates long content", () => {
    const long = "x".repeat(200);
    const events = buildClientTimeline(
      baseInput({
        matters: [{ id: "m1", internalCode: "LL-1", title: "A", createdAt: d("2026-01-01"), firstAcceptedAt: null, closedAt: null, archivedAt: null }],
        notes: [
          { id: "n1", matterId: "m1", channel: "PHONE", withWhom: "Anh B", content: long, occurredAt: d("2026-02-02"), authorName: "Chi" },
          { id: "n2", matterId: "unknown", channel: "EMAIL", withWhom: null, content: "Ngắn", occurredAt: d("2026-02-03"), authorName: null }
        ]
      })
    );
    const n1 = events.find((e) => e.id === "note:n1")!;
    expect(n1.title).toBe("Gọi điện · Anh B (Chi)");
    expect(n1.detail).toHaveLength(141); // 140 ký tự + dấu …
    expect(n1.detail!.endsWith("…")).toBe(true);
    expect(n1.href).toBe("/matters/m1");
    const n2 = events.find((e) => e.id === "note:n2")!;
    expect(n2.title).toBe("Email");
    expect(n2.detail).toBe("Ngắn");
    expect(n2.href).toBeUndefined(); // matter không thuộc khách → không link
  });

  it("maps intake status to Vietnamese labels; DECLINED surfaces the reason", () => {
    const events = buildClientTimeline(
      baseInput({
        intakes: [
          { id: "i1", title: "Vụ A", status: "CONVERTED", receivedAt: d("2026-01-01"), declinedReason: null },
          { id: "i2", title: "Vụ B", status: "DECLINED", receivedAt: d("2026-01-02"), declinedReason: "Trùng lợi ích" }
        ]
      })
    );
    const converted = events.find((e) => e.id === "intake:i1")!;
    expect(converted.title).toBe("Đã chuyển thành dự án");
    expect(converted.detail).toBe("Vụ A");
    const declined = events.find((e) => e.id === "intake:i2")!;
    expect(declined.title).toBe("Từ chối");
    expect(declined.detail).toBe("Lý do: Trùng lợi ích");
    expect(declined.href).toBe("/intakes/i2");
  });

  it("carries amount + currency; quote falls back issuedAt→createdAt, contract signedAt→createdAt", () => {
    const events = buildClientTimeline(
      baseInput({
        quotes: [
          { id: "q1", code: "QT-1", title: "BG", status: "DRAFT", issuedAt: null, createdAt: d("2026-05-01"), total: 250000, currency: "VND" }
        ],
        contracts: [
          { id: "c1", code: "CT-1", title: "HĐ", status: "ACTIVE", signedAt: null, createdAt: d("2026-06-01"), amount: 990000, currency: "VND" }
        ]
      })
    );
    const q = events.find((e) => e.id === "quote:q1")!;
    expect(q.occurredAt).toEqual(d("2026-05-01"));
    expect(q.amount).toBe(250000);
    expect(q.currency).toBe("VND");
    expect(q.href).toBe("/quotes/q1");
    const c = events.find((e) => e.id === "contract:c1")!;
    expect(c.occurredAt).toEqual(d("2026-06-01"));
    expect(c.amount).toBe(990000);
    expect(c.href).toBe("/contracts/c1");
  });

  it("caps the result at CLIENT_TIMELINE_LIMIT", () => {
    const notes = Array.from({ length: CLIENT_TIMELINE_LIMIT + 20 }, (_, i) => ({
      id: `n${i}`,
      matterId: "m1",
      channel: "OTHER" as const,
      withWhom: null,
      content: `n${i}`,
      occurredAt: new Date(2026, 0, 1, 0, i),
      authorName: null
    }));
    const events = buildClientTimeline(
      baseInput({
        matters: [{ id: "m1", internalCode: "LL-1", title: "A", createdAt: d("2026-01-01"), firstAcceptedAt: null, closedAt: null, archivedAt: null }],
        notes
      })
    );
    expect(events).toHaveLength(CLIENT_TIMELINE_LIMIT);
  });
});
