/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
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

  it("throws if not manager and role not allowed", () => {
    expect(() => assertManagerOrRole("LAWYER", "ASSISTANT")).toThrow("权限不足");
    expect(() => assertManagerOrRole("ASSISTANT", "LAWYER")).toThrow("权限不足");
  });
});
