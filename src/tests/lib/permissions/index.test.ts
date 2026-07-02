/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isManager,
  matterVisibilityFilter,
  matterAssociationFilter,
  intakeVisibilityFilter,
  clientVisibilityFilter,
  assertManagerOrRole
} from "@/lib/permissions/index";

describe("isManager", () => {
  it("returns true for ADMIN", () => expect(isManager("ADMIN")).toBe(true));
  it("returns true for PRINCIPAL_LAWYER", () => expect(isManager("PRINCIPAL_LAWYER")).toBe(true));
  it("returns false for LAWYER", () => expect(isManager("LAWYER")).toBe(false));
  it("returns false for ASSISTANT", () => expect(isManager("ASSISTANT")).toBe(false));
  it("returns false for FINANCE", () => expect(isManager("FINANCE")).toBe(false));
});

describe("matterVisibilityFilter", () => {
  it("returns empty for manager or FINANCE", () => {
    expect(matterVisibilityFilter("u1", "ADMIN")).toEqual({});
    expect(matterVisibilityFilter("u1", "PRINCIPAL_LAWYER")).toEqual({});
    expect(matterVisibilityFilter("u1", "FINANCE")).toEqual({});
  });

  it("filters for LAWYER: owned or member", () => {
    expect(matterVisibilityFilter("u1", "LAWYER")).toEqual({
      OR: [{ ownerId: "u1" }, { members: { some: { userId: "u1" } } }]
    });
  });

  it("filters for ASSISTANT: member only", () => {
    expect(matterVisibilityFilter("u1", "ASSISTANT")).toEqual({
      members: { some: { userId: "u1" } }
    });
  });
});

describe("matterAssociationFilter", () => {
  it("returns OR for ownership or membership", () => {
    expect(matterAssociationFilter("u1")).toEqual({
      OR: [{ ownerId: "u1" }, { members: { some: { userId: "u1" } } }]
    });
  });
});

describe("intakeVisibilityFilter", () => {
  it("returns empty for ADMIN or PRINCIPAL_LAWYER", () => {
    expect(intakeVisibilityFilter("u1", "ADMIN")).toEqual({});
    expect(intakeVisibilityFilter("u1", "PRINCIPAL_LAWYER")).toEqual({});
  });

  it("filters for FINANCE: same as non-manager (OR)", () => {
    // FINANCE is not a manager per isManager()
    expect(intakeVisibilityFilter("u1", "FINANCE")).toEqual({
      OR: [
        { createdById: "u1" },
        { ownerUserId: "u1" },
        { coUserIds: { has: "u1" } }
      ]
    });
  });

  it("filters for LAWYER: createdBy, owner, or coUser", () => {
    expect(intakeVisibilityFilter("u1", "LAWYER")).toEqual({
      OR: [
        { createdById: "u1" },
        { ownerUserId: "u1" },
        { coUserIds: { has: "u1" } }
      ]
    });
  });

  it("filters for ASSISTANT: OR like any non-manager", () => {
    expect(intakeVisibilityFilter("u1", "ASSISTANT")).toEqual({
      OR: [
        { createdById: "u1" },
        { ownerUserId: "u1" },
        { coUserIds: { has: "u1" } }
      ]
    });
  });
});

describe("clientVisibilityFilter", () => {
  it("returns empty for manager or FINANCE", () => {
    expect(clientVisibilityFilter("u1", "ADMIN")).toEqual({});
    expect(clientVisibilityFilter("u1", "PRINCIPAL_LAWYER")).toEqual({});
    expect(clientVisibilityFilter("u1", "FINANCE")).toEqual({});
  });

  it("filters for LAWYER via matters or intakes", () => {
    expect(clientVisibilityFilter("u1", "LAWYER")).toEqual({
      OR: [
        {
          matters: {
            some: {
              deletedAt: null,
              OR: [
                { ownerId: "u1" },
                { members: { some: { userId: "u1" } } }
              ]
            }
          }
        },
        { intakes: { some: intakeVisibilityFilter("u1", "LAWYER") } }
      ]
    });
  });

  it("filters for ASSISTANT via matters or intakes", () => {
    expect(clientVisibilityFilter("u1", "ASSISTANT")).toEqual({
      OR: [
        {
          matters: {
            some: {
              deletedAt: null,
              members: { some: { userId: "u1" } }
            }
          }
        },
        { intakes: { some: intakeVisibilityFilter("u1", "ASSISTANT") } }
      ]
    });
  });
});

describe("assertManagerOrRole", () => {
  it("allows manager", () => {
    expect(() => assertManagerOrRole("ADMIN")).not.toThrow();
    expect(() => assertManagerOrRole("PRINCIPAL_LAWYER")).not.toThrow();
  });

  it("allows if role in allowed list", () => {
    expect(() => assertManagerOrRole("LAWYER", "LAWYER", "ASSISTANT")).not.toThrow();
    expect(() => assertManagerOrRole("ASSISTANT", "LAWYER", "ASSISTANT")).not.toThrow();
  });

  it('throws if not manager and role not allowed', () => {
    expect(() => assertManagerOrRole('LAWYER', 'ASSISTANT')).toThrow('Không đủ quyền');
    expect(() => assertManagerOrRole('ASSISTANT', 'LAWYER')).toThrow('Không đủ quyền');
  });
});
