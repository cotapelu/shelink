import { computeEvents, FamilyEvent } from "@/utils/eventHelpers";

describe("eventHelpers - computeEvents", () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const createPerson = (overrides: Partial<any> = {}) => ({
    id: "p1",
    full_name: "John Doe",
    birth_year: 1990,
    birth_month: 5,
    birth_day: 15,
    death_year: null,
    death_month: null,
    death_day: null,
    is_deceased: false,
    ...overrides,
  });

  it("should generate birthday event", () => {
    const persons = [createPerson()];
    const events = computeEvents(persons);
    expect(events.length).toBeGreaterThanOrEqual(1);
    const birthday = events.find(e => e.type === "birthday");
    expect(birthday).toBeDefined();
    expect(birthday!.personId).toBe("p1");
    expect(birthday!.personName).toBe("John Doe");
    expect(birthday!.eventDateLabel).toBe("15/05");
    expect(birthday!.originYear).toBe(1990);
    expect(birthday!.originMonth).toBe(5);
    expect(birthday!.originDay).toBe(15);
    // daysUntil should be >=0
    expect(typeof birthday!.daysUntil).toBe("number");
  });

  it("should not generate birthday if birth_day/month missing", () => {
    const person = createPerson({ birth_day: null, birth_month: null });
    const events = computeEvents([person]);
    const birthday = events.find(e => e.type === "birthday");
    expect(birthday).toBeUndefined();
  });

  it("should generate death anniversary when deceased", () => {
    // This will use lunar conversion; we trust library. Simple check: event exists.
    const person = createPerson({
      is_deceased: true,
      death_year: 2020,
      death_month: 3,
      death_day: 10,
    });
    const events = computeEvents([person]);
    const deathEvent = events.find(e => e.type === "death_anniversary");
    expect(deathEvent).toBeDefined();
    expect(deathEvent!.personId).toBe("p1");
  });

  it("should include custom events", () => {
    const customEvent = {
      id: "ce1",
      name: "Wedding Anniversary",
      content: "Happy Marriage",
      event_date: "2023-05-20",
    };
    const persons = [createPerson()];
    const events = computeEvents(persons, [customEvent]);
    const custom = events.find(e => e.type === "custom_event");
    expect(custom).toBeDefined();
    expect(custom!.personId).toBe("ce1"); // custom event uses its own id
    expect(custom!.personName).toBe("Wedding Anniversary");
  });
});
