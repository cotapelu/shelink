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
