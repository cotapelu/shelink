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
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn()
    }
  }
}));

vi.mock("@/server/notifications/create", () => ({
  createNotification: vi.fn()
}));

import { notifyRoleApprovers, notifyDirectApprovers } from "@/server/notifications/approval";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/server/notifications/create";

describe("notifyRoleApprovers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finds users by roles and calls notifyUsers", async () => {
    (prisma.user.findMany as any).mockResolvedValue([
      { id: "u1" },
      { id: "u2" },
      { id: "u3" }
    ]);
    (createNotification as any).mockResolvedValue({});

    await notifyRoleApprovers({
      roles: ["ADMIN", "PRINCIPAL_LAWYER"],
      title: "Test",
      href: "/test",
      refType: "Intake",
      refId: "i1"
    });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { active: true, role: { in: expect.arrayContaining(["ADMIN", "PRINCIPAL_LAWYER"]) } },
      select: { id: true }
    });
    // 3 users => 3 notifications
    expect(createNotification).toHaveBeenCalledTimes(3);
  });

  it("deduplicates roles", async () => {
    (prisma.user.findMany as any).mockResolvedValue([{ id: "u1" }]);
    (createNotification as any).mockResolvedValue({});

    await notifyRoleApprovers({
      roles: ["ADMIN", "ADMIN", "PRINCIPAL_LAWYER" as any],
      title: "Test",
      href: "/test",
      refType: "Intake",
      refId: "i1"
    });

    // role dedup inside function: Set used
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { active: true, role: { in: expect.arrayContaining(["ADMIN", "PRINCIPAL_LAWYER"]) } },
      select: { id: true }
    });
  });

  it("excludes specified userId", async () => {
    (prisma.user.findMany as any).mockResolvedValue([{ id: "u1" }, { id: "u2" }]);
    (createNotification as any).mockResolvedValue({});

    await notifyRoleApprovers({
      roles: ["ADMIN"],
      excludeUserId: "u1",
      title: "Test",
      href: "/test",
      refType: "Intake",
      refId: "i1"
    });

    // Only u2 should receive notification
    expect(createNotification).toHaveBeenCalledWith({
      userId: "u2",
      type: "SYSTEM",
      priority: "HIGH",
      title: "Test",
      content: undefined,
      href: "/test",
      refType: "Intake",
      refId: "i1"
    });
  });

  it("does nothing when no users found", async () => {
    (prisma.user.findMany as any).mockResolvedValue([]);
    (createNotification as any).mockResolvedValue({});

    await notifyRoleApprovers({
      roles: ["ADMIN"],
      title: "Test",
      href: "/test",
      refType: "Intake",
      refId: "i1"
    });

    expect(createNotification).not.toHaveBeenCalled();
  });
});

describe("notifyDirectApprovers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finds users by ids and calls notifyUsers", async () => {
    (prisma.user.findMany as any).mockResolvedValue([
      { id: "u1" },
      { id: "u2" }
    ]);
    (createNotification as any).mockResolvedValue({});

    await notifyDirectApprovers({
      userIds: ["u1", "u2", "u1"],
      title: "Direct",
      href: "/direct",
      refType: "Matter",
      refId: "m1"
    });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { active: true, id: { in: expect.arrayContaining(["u1", "u2"]) } },
      select: { id: true }
    });
    // dedup: u1 & u2 => 2 notifications
    expect(createNotification).toHaveBeenCalledTimes(2);
  });

  it("excludes specified userId", async () => {
    (prisma.user.findMany as any).mockResolvedValue([{ id: "u1" }, { id: "u2" }]);
    (createNotification as any).mockResolvedValue({});

    await notifyDirectApprovers({
      userIds: ["u1", "u2"],
      excludeUserId: "u1",
      title: "Test",
      href: "/test",
      refType: "Intake",
      refId: "i1"
    });

    // Only u2 receives notification
    expect(createNotification).toHaveBeenCalledWith({
      userId: "u2",
      type: "SYSTEM",
      priority: "HIGH",
      title: "Test",
      content: undefined,
      href: "/test",
      refType: "Intake",
      refId: "i1"
    });
  });

  it("handles empty userIds array", async () => {
    // Set empty result for this test
    (prisma.user.findMany as any).mockResolvedValue([]);

    await notifyDirectApprovers({
      userIds: [],
      title: "Test",
      href: "/test",
      refType: "Intake",
      refId: "i1"
    });

    // findMany still called with empty in array, but no notifications
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { active: true, id: { in: [] } },
      select: { id: true }
    });
    expect(createNotification).not.toHaveBeenCalled();
  });
});
