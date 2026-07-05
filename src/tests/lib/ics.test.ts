import { describe, it, expect } from "vitest";
import { buildIcs, IcsEvent } from "@/lib/ics";

describe("ics", () => {
  it("builds a simple ICS string", () => {
    const event: IcsEvent = {
      uid: "12345",
      title: "Test Meeting",
      start: new Date("2025-06-01T10:00:00Z"),
      end: new Date("2025-06-01T11:00:00Z"),
      description: "Discuss project",
      location: "Office"
    };
    const ics = buildIcs({ events: [event] });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:12345");
    expect(ics).toContain("SUMMARY:Test Meeting");
    expect(ics).toContain("DTSTART:20250601T100000Z");
    expect(ics).toContain("DTEND:20250601T110000Z");
    expect(ics).toContain("DESCRIPTION:Discuss project");
    expect(ics).toContain("LOCATION:Office");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("handles all-day events", () => {
    const event: IcsEvent = {
      uid: "a1",
      title: "All Day Event",
      start: new Date("2025-06-02"),
      allDay: true
    };
    const ics = buildIcs({ events: [event] });
    expect(ics).toContain("DTSTART;VALUE=DATE:20250602");
    // No DTEND for all-day? Usually end date is exclusive; but not needed for this test.
  });

  it("includes reminders when provided", () => {
    const event: IcsEvent = {
      uid: "rem1",
      title: "Reminder Event",
      start: new Date("2025-06-03T09:00:00Z"),
      reminderMinutes: [15, 30]
    };
    const ics = buildIcs({ events: [event] });
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("TRIGGER:-PT15M");
    // Might have two triggers; at least check one.
    expect(ics).toContain("ACTION:DISPLAY");
  });
});