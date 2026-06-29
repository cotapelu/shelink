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
import { getIntakeById } from "@/server/intakes/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    intake: {
      findFirst: vi.fn(),
      findUnique: vi.fn()
    }
  }
}));
vi.mock("@/lib/auth/session");
vi.mock("@/server/audit", () => ({ audit: vi.fn() }));

describe("getIntakeById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockIntakeFull = {
    id: "i1",
    title: "Test Intake",
    status: "PENDING",
    client: { id: "c1", name: "Client A", type: "COMPANY" },
    cause: { id: "cause1", name: "Contract" },
    ownerUser: { id: "u1", name: "Alice", role: "LAWYER" },
    parties: [{ role: "OPPOSING_PARTY", name: "Opponent" }],
    conflictChecks: [],
    matter: { id: "m1", internalCode: "IC-001", title: "Matter Title" },
    documents: []
  };

  it("allows ADMIN to access any intake", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    (prisma.intake.findUnique as any).mockResolvedValue(mockIntakeFull);

    const result = (await getIntakeById("i1"))!;

    expect(requireSession).toHaveBeenCalled();
    expect(prisma.intake.findFirst).not.toHaveBeenCalled(); // no visibility check
    expect(prisma.intake.findUnique).toHaveBeenCalledWith({
      where: { id: "i1" },
      include: expect.any(Object)
    });
    expect(result).toEqual(mockIntakeFull);
  });

  it("allows PRINCIPAL_LAWYER to access any intake", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u2", role: "PRINCIPAL_LAWYER" } });
    (prisma.intake.findUnique as any).mockResolvedValue(mockIntakeFull);

    await getIntakeById("i1");

    expect(prisma.intake.findFirst).not.toHaveBeenCalled();
  });

  it("non-manager must pass visibility check", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u3", role: "LAWYER" } });
    (prisma.intake.findFirst as any).mockResolvedValue({ id: "i1" });
    (prisma.intake.findUnique as any).mockResolvedValue(mockIntakeFull);

    await getIntakeById("i1");

    expect(prisma.intake.findFirst).toHaveBeenCalledWith({
      where: {
        id: "i1",
        OR: [
          { createdById: "u3" },
          { ownerUserId: "u3" },
          { coUserIds: { has: "u3" } }
        ]
      },
      select: { id: true }
    });
  });

  it("throws if non-manager fails visibility check", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u4", role: "LAWYER" } });
    (prisma.intake.findFirst as any).mockResolvedValue(null);

    await expect(getIntakeById("i1")).rejects.toThrow("收案记录不存在");
  });

  it("includes correct relations", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u5", role: "LAWYER" } });
    (prisma.intake.findFirst as any).mockResolvedValue({ id: "i1" });
    (prisma.intake.findUnique as any).mockResolvedValue(mockIntakeFull);

    await getIntakeById("i1");

    const includeArg = (prisma.intake.findUnique as any).mock.calls[0][0].include;
    expect(includeArg.client).toEqual(true);
    expect(includeArg.cause).toEqual(true);
    expect(includeArg.ownerUser.select).toEqual({ id: true, name: true, role: true });
    expect(includeArg.parties.orderBy).toEqual([{ role: "asc" }, { ordinal: "asc" }]);
    expect(includeArg.conflictChecks.orderBy).toEqual({ checkedAt: "desc" });
    expect(includeArg.conflictChecks.include.hits).toBe(true);
    expect(includeArg.conflictChecks.include.decidedBy.select).toEqual({ id: true, name: true });
    expect(includeArg.matter.select).toEqual({ id: true, internalCode: true, title: true });
    expect(includeArg.documents.where).toEqual({ deletedAt: null });
    expect(includeArg.documents.orderBy).toEqual({ createdAt: "desc" });
    expect(includeArg.documents.select).toEqual({ id: true, name: true, category: true, size: true, createdAt: true });
  });

  it("handles empty documents gracefully", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u6", role: "LAWYER" } });
    (prisma.intake.findFirst as any).mockResolvedValue({ id: "i1" });
    (prisma.intake.findUnique as any).mockResolvedValue({ ...mockIntakeFull, documents: [] });

    const result = (await getIntakeById("i1"))!;
    expect(result.documents).toEqual([]);
  });
});
