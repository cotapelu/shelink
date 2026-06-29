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
