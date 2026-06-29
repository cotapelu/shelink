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
