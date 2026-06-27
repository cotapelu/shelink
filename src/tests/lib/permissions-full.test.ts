import { describe, it, expect } from "vitest";
import {
  isManager,
  matterVisibilityFilter,
  matterAssociationFilter,
  intakeVisibilityFilter,
  clientVisibilityFilter,
  assertManagerOrRole
} from "@/lib/permissions";

describe("isManager", () => {
  it("identifies ADMIN as manager", () => {
    expect(isManager("ADMIN")).toBe(true);
  });

  it("identifies PRINCIPAL_LAWYER as manager", () => {
    expect(isManager("PRINCIPAL_LAWYER")).toBe(true);
  });

  it("rejects LAWYER as manager", () => {
    expect(isManager("LAWYER")).toBe(false);
  });

  it("rejects ASSISTANT as manager", () => {
    expect(isManager("ASSISTANT")).toBe(false);
  });

  it("rejects FINANCE as manager", () => {
    expect(isManager("FINANCE")).toBe(false);
  });

  it("rejects unknown roles", () => {
    expect(isManager("UNKNOWN")).toBe(false);
  });
});

describe("matterVisibilityFilter", () => {
  const userId = "user-123";

  it("ADMIN gets empty filter (see all)", () => {
    expect(matterVisibilityFilter(userId, "ADMIN")).toEqual({});
  });

  it("PRINCIPAL_LAWYER gets empty filter", () => {
    expect(matterVisibilityFilter(userId, "PRINCIPAL_LAWYER")).toEqual({});
  });

  it("FINANCE gets empty filter", () => {
    expect(matterVisibilityFilter(userId, "FINANCE")).toEqual({});
  });

  it("LAWYER gets OR filter for owned or member", () => {
    const result = matterVisibilityFilter(userId, "LAWYER");
    expect(result).toHaveProperty("OR");
    const or = result.OR as Array<unknown>;
    expect(or).toHaveLength(2);
    expect(or[0]).toEqual({ ownerId: userId });
    expect(or[1]).toEqual({ members: { some: { userId } } });
  });

  it("ASSISTANT gets member-only filter", () => {
    const result = matterVisibilityFilter(userId, "ASSISTANT");
    expect(result).toEqual({ members: { some: { userId } } });
  });

  it("handles edge case: empty userId", () => {
    const result = matterVisibilityFilter("", "LAWYER");
    expect(result).toHaveProperty("OR");
  });
});

describe("matterAssociationFilter", () => {
  const userId = "user-456";

  it("returns OR filter for owner or member", () => {
    const result = matterAssociationFilter(userId);
    expect(result).toHaveProperty("OR");
    const or = result.OR as Array<unknown>;
    expect(or).toHaveLength(2);
    expect(or[0]).toEqual({ ownerId: userId });
    expect(or[1]).toEqual({ members: { some: { userId } } });
  });

  it("works with empty userId", () => {
    const result = matterAssociationFilter("");
    expect(result).toHaveProperty("OR");
  });
});

describe("intakeVisibilityFilter", () => {
  const userId = "user-789";

  it("ADMIN gets empty filter", () => {
    expect(intakeVisibilityFilter(userId, "ADMIN")).toEqual({});
  });

  it("LAWYER gets OR filter for createdBy, ownerUserId, or coUserIds", () => {
    const result = intakeVisibilityFilter(userId, "LAWYER");
    expect(result).toHaveProperty("OR");
    const or = result.OR as Array<unknown>;
    expect(or).toHaveLength(3);
    expect(or[0]).toEqual({ createdById: userId });
    expect(or[1]).toEqual({ ownerUserId: userId });
    expect(or[2]).toEqual({ coUserIds: { has: userId } });
  });

  it("ASSISTANT same as LAWYER", () => {
    const result = intakeVisibilityFilter(userId, "ASSISTANT");
    expect(result).toHaveProperty("OR");
    expect((result.OR as Array<unknown>).length).toBe(3);
  });
});

describe("clientVisibilityFilter", () => {
  const userId = "user-999";

  it("ADMIN gets empty filter", () => {
    expect(clientVisibilityFilter(userId, "ADMIN")).toEqual({});
  });

  it("FINANCE gets empty filter", () => {
    expect(clientVisibilityFilter(userId, "FINANCE")).toEqual({});
  });

  it("LAWYER gets OR with matters and intakes", () => {
    const result = clientVisibilityFilter(userId, "LAWYER");
    expect(result).toHaveProperty("OR");
    const or = result.OR as Array<unknown>;
    expect(or).toHaveLength(2);
    expect(or[0]).toHaveProperty("matters");
    expect(or[1]).toHaveProperty("intakes");
  });

  it("ASSISTANT same as LAWYER", () => {
    const result = clientVisibilityFilter(userId, "ASSISTANT");
    expect(result).toHaveProperty("OR");
    expect((result.OR as Array<unknown>).length).toBe(2);
  });
});

describe("assertManagerOrRole", () => {
  it("allows ADMIN without specific roles", () => {
    expect(() => assertManagerOrRole("ADMIN")).not.toThrow();
  });

  it("allows PRINCIPAL_LAWYER without specific roles", () => {
    expect(() => assertManagerOrRole("PRINCIPAL_LAWYER")).not.toThrow();
  });

  it("allows role in allowed list", () => {
    expect(() => assertManagerOrRole("LAWYER", "LAWYER", "ASSISTANT")).not.toThrow();
  });

  it("rejects role not in allowed list", () => {
    expect(() => assertManagerOrRole("ASSISTANT", "LAWYER")).toThrow("权限不足");
  });

  it("handles multiple allowed roles", () => {
    expect(() => assertManagerOrRole("LAWYER", "LAWYER", "ASSISTANT", "FINANCE")).not.toThrow();
  });
});

// Note: assert* functions require Prisma db, tested in integration tests
