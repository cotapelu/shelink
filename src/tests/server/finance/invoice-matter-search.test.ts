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
  invoiceMatterSearchWhere,
  invoiceMatterSearchLimit
} from "@/server/finance/invoice-matter-search";
import { matterAssociationFilter } from "@/lib/permissions";

vi.mock("@/lib/permissions", () => ({
  matterAssociationFilter: vi.fn()
}));

describe("invoiceMatterSearchWhere", () => {
  const userId = "user-123";
  const mockAssociationWhere = { members: { has: userId } };

  beforeEach(() => {
    vi.clearAllMocks();
    (matterAssociationFilter as any).mockReturnValue(mockAssociationWhere);
  });

  it("returns associationWhere spread directly when query is empty/whitespace", () => {
    const result = invoiceMatterSearchWhere(userId, "");
    expect(result).toEqual({
      deletedAt: null,
      ...mockAssociationWhere
    });
    expect(matterAssociationFilter).toHaveBeenCalledWith(userId);
  });

  it("handles undefined query (same as empty)", () => {
    const result = invoiceMatterSearchWhere(userId);
    expect(result).toEqual({
      deletedAt: null,
      ...mockAssociationWhere
    });
  });

  it("returns associationWhere spread directly when query is whitespace only", () => {
    const result = invoiceMatterSearchWhere(userId, "   ");
    expect(result).toEqual({
      deletedAt: null,
      ...mockAssociationWhere
    });
  });

  it("combines associationWhere and searchWhere when query provided", () => {
    const result = invoiceMatterSearchWhere(userId, "test");
    expect(result).toEqual({
      deletedAt: null,
      AND: [
        mockAssociationWhere,
        {
          OR: [
            { title: { contains: "test", mode: "insensitive" } },
            { internalCode: { contains: "test", mode: "insensitive" } },
            { firmCaseNo: { contains: "test", mode: "insensitive" } }
          ]
        }
      ]
    });
  });

  it("trims query before checking emptiness", () => {
    const result = invoiceMatterSearchWhere(userId, "  query  ");
    expect(result).toEqual({
      deletedAt: null,
      AND: [
        mockAssociationWhere,
        {
          OR: [
            { title: { contains: "query", mode: "insensitive" } },
            { internalCode: { contains: "query", mode: "insensitive" } },
            { firmCaseNo: { contains: "query", mode: "insensitive" } }
          ]
        }
      ]
    });
  });

  it("searchWhere uses insensitive mode for all three fields", () => {
    const result = invoiceMatterSearchWhere(userId, "ABC");
    const and = result.AND as any[];
    const searchWhere = and.find(cond => cond.OR);
    expect(searchWhere.OR).toHaveLength(3);
    expect(searchWhere.OR[0].title).toEqual({ contains: "ABC", mode: "insensitive" });
    expect(searchWhere.OR[1].internalCode).toEqual({ contains: "ABC", mode: "insensitive" });
    expect(searchWhere.OR[2].firmCaseNo).toEqual({ contains: "ABC", mode: "insensitive" });
  });
});

describe("invoiceMatterSearchLimit", () => {
  it("returns 12 when no query", () => {
    expect(invoiceMatterSearchLimit()).toBe(12);
    expect(invoiceMatterSearchLimit("")).toBe(12);
    expect(invoiceMatterSearchLimit("   ")).toBe(12);
  });

  it("returns 10 when query provided", () => {
    expect(invoiceMatterSearchLimit("test")).toBe(10);
    expect(invoiceMatterSearchLimit("  q  ")).toBe(10);
  });
});
