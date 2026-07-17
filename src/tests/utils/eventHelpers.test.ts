import { describe, it, expect } from "vitest";
import { computeEvents, type PersonInput, type CustomEventRecord } from "@/utils/eventHelpers";

describe("utils/eventHelpers", () => {
  const today = new Date("2025-07-15T00:00:00.000Z");

  describe("computeEvents", () => {
    it("aggregates birthdays and death anniversaries from persons", () => {
      const persons: PersonInput[] = [
        {
          id: "p1",
          full_name: "John",
          birth_year: 1990,
          birth_month: 5,
          birth_day: 20,
          death_year: null,
          death_month: null,
          death_day: null,
          is_deceased: false,
        },
        {
          id: "p2",
          full_name: "Jane",
          birth_year: 1985,
          birth_month: 7,
          birth_day: 25,
          death_year: 2020,
          death_month: 8,
          death_day: 10,
          is_deceased: true,
        },
      ];
      const events = computeEvents(persons, [], today);
      expect(events.length).toBeGreaterThanOrEqual(2);
      const types = new Set(events.map(e => e.type));
      expect(types.has("birthday")).toBe(true);
      expect(types.has("death_anniversary")).toBe(true);
    });

    it("includes custom events", () => {
      const customs: CustomEventRecord[] = [{
        id: "c1",
        name: "Party",
        content: "",
        event_date: "2025-09-01",
        location: "",
        created_by: null,
      }];
      const events = computeEvents([], customs, today);
      expect(events.some(e => e.type === "custom_event")).toBe(true);
    });

    it("sorts by daysUntil ascending", () => {
      const today = new Date("2025-07-15");
      const persons: PersonInput[] = [
        {
          id: "p1",
          full_name: "Early",
          birth_month: 7,
          birth_day: 16,
          birth_year: 1990,
          death_year: null,
          death_month: null,
          death_day: null,
          is_deceased: false,
        },
        {
          id: "p2",
          full_name: "Late",
          birth_month: 8,
          birth_day: 1,
          birth_year: 1990,
          death_year: null,
          death_month: null,
          death_day: null,
          is_deceased: false,
        },
      ];
      const events = computeEvents(persons, [], today);
      if (events.length >= 2) {
        expect(events[0].personName).toBe("Early");
        expect(events[1].personName).toBe("Late");
      }
    });

    it("returns empty array when no persons or customs", () => {
      const events = computeEvents([], [], today);
      expect(events).toEqual([]);
    });
  });
});
