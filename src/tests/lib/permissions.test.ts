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
import { describe, it, expect } from "vitest";
import { isManager, matterVisibilityFilter, intakeVisibilityFilter, clientVisibilityFilter } from "@/lib/permissions";

describe("isManager", () => {
  it("ADMIN 是 manager", () => expect(isManager("ADMIN")).toBe(true));
  it("PRINCIPAL_LAWYER 是 manager", () => expect(isManager("PRINCIPAL_LAWYER")).toBe(true));
  it("LAWYER 不是 manager", () => expect(isManager("LAWYER")).toBe(false));
  it("ASSISTANT 不是 manager", () => expect(isManager("ASSISTANT")).toBe(false));
  it("FINANCE 不是 manager", () => expect(isManager("FINANCE")).toBe(false));
});

describe("matterVisibilityFilter", () => {
  const userId = "user-1";

  it("ADMIN 看全部（返回空 where）", () => {
    expect(matterVisibilityFilter(userId, "ADMIN")).toEqual({});
  });

  it("FINANCE 看全部", () => {
    expect(matterVisibilityFilter(userId, "FINANCE")).toEqual({});
  });

  it("LAWYER 看自己拥有或参与的案件", () => {
    const filter = matterVisibilityFilter(userId, "LAWYER");
    expect(filter).toHaveProperty("OR");
    const or = (filter as { OR: unknown[] }).OR;
    expect(or).toHaveLength(2);
    expect(or[0]).toEqual({ ownerId: userId });
    expect(or[1]).toEqual({ members: { some: { userId } } });
  });

  it("ASSISTANT 只看自己参与的案件", () => {
    const filter = matterVisibilityFilter(userId, "ASSISTANT");
    expect(filter).toEqual({ members: { some: { userId } } });
  });
});

describe("intakeVisibilityFilter", () => {
  const userId = "user-1";

  it("ADMIN 看全部", () => {
    expect(intakeVisibilityFilter(userId, "ADMIN")).toEqual({});
  });

  it("LAWYER 看自己创建或参与的", () => {
    const filter = intakeVisibilityFilter(userId, "LAWYER");
    expect(filter).toHaveProperty("OR");
    const or = (filter as { OR: unknown[] }).OR;
    expect(or).toHaveLength(3);
  });
});
