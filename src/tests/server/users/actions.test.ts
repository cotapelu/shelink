// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listUsers,
  listActiveColleagues,
  createUser,
  updateUserRole,
  toggleUserActive,
  resetUserPassword,
  changeMyPassword,
  saveMyAvatar,
} from "@/server/users/actions";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

vi.mock("@/lib/auth/session");
vi.mock("@/server/audit");
vi.mock("next/cache");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      // delete not used
    },
  },
}));
vi.mock("bcryptjs");

const mockRequireSession = vi.mocked(requireSession, true);
const mockAudit = vi.mocked(audit, true);
const mockRevalidatePath = vi.mocked(revalidatePath, true);
const mockPrisma = vi.mocked(prisma, true);
const mockBcryptHash = vi.mocked(bcrypt.hash, true);
const mockBcryptCompare = vi.mocked(bcrypt.compare, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: "u1", role: "LAWYER", email: "lawyer@test.com" },
  } as any);
  mockBcryptHash.mockResolvedValue("hashed_password");
  mockBcryptCompare.mockResolvedValue(true);
});

const CUID = (n: number) => `c${n.toString().padStart(24, "0")}`;

describe("users/actions", () => {
  describe("listUsers", () => {
    it("should require admin", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      await expect(listUsers()).rejects.toThrow("Chỉ admin được thực hiện");
    });

    it("should list users with select fields", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "admin", role: "ADMIN" },
      } as any);
      mockPrisma.user.findMany.mockResolvedValue([]);
      await listUsers();
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            name: true,
            email: true,
            role: true,
            phone: true,
            active: true,
            lastLoginAt: true,
            createdAt: true,
          }),
        })
      );
    });
  });

  describe("listActiveColleagues", () => {
    it("should list active users with basic info", async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "u2", name: "User 2", role: "LAWYER" },
      ]);
      const result = await listActiveColleagues();
      expect(result).toHaveLength(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { active: true },
          select: { id: true, name: true, role: true },
        })
      );
    });
  });

  describe("createUser", () => {
    it("should require admin", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      await expect(
        createUser({ name: "New", email: "new@test.com", password: "pass123", role: "LAWYER" })
      ).rejects.toThrow("Chỉ admin được thực hiện");
    });

    it("should create user with hashed password and default active=true", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "admin", role: "ADMIN" },
      } as any);
      mockPrisma.user.findUnique.mockResolvedValue(null); // email not exists
      mockPrisma.user.create.mockResolvedValue({
        id: CUID(2),
        name: "New User",
        email: "new@example.com",
        role: "LAWYER",
        active: true,
      });

      const result = await createUser({
        name: "New User",
        email: "new@example.com",
        password: "password123",
        role: "LAWYER",
      });

      expect(result).toEqual({ ok: true, id: CUID(2) });
      expect(mockBcryptHash).toHaveBeenCalledWith("password123", 12);
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "New User",
            email: "new@example.com",
            passwordHash: "hashed_password",
            role: "LAWYER",
            phone: null,
            active: true,
          }),
        })
      );
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "USER_CREATE",
          targetType: "User",
          detail: { email: "new@example.com", role: "LAWYER" },
        })
      );
    });

    it("should reject duplicate email", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "admin", role: "ADMIN" },
      } as any);
      mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });

      await expect(
        createUser({ name: "New", email: "dup@example.com", password: "longenough123", role: "LAWYER" })
      ).rejects.toThrow("Email đã được sử dụng");
    });
  });

  describe("updateUserRole", () => {
    it("should require admin", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      await expect(updateUserRole({ id: CUID(2), role: "ADMIN" })).rejects.toThrow(
        "Chỉ admin được thực hiện"
      );
    });

    it("should prevent self role change", async () => {
      const myId = CUID(1);
      mockRequireSession.mockResolvedValue({
        user: { id: myId, role: "ADMIN" },
      } as any);
      await expect(
        updateUserRole({ id: myId, role: "LAWYER" })
      ).rejects.toThrow("Không thể sửa vai trò của chính mình");
    });

    it("should update role and audit", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "ADMIN" },
      } as any);
      mockPrisma.user.update.mockResolvedValue({});

      await updateUserRole({ id: CUID(2), role: "PRINCIPAL_LAWYER" });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: CUID(2) },
        data: { role: "PRINCIPAL_LAWYER" },
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "USER_ROLE_UPDATE",
          targetId: CUID(2),
          detail: { role: "PRINCIPAL_LAWYER" },
        })
      );
    });
  });

  describe("toggleUserActive", () => {
    it("should require admin", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      await expect(toggleUserActive(CUID(2))).rejects.toThrow(
        "Chỉ admin được thực hiện"
      );
    });

    it("should prevent self toggle", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "admin", role: "ADMIN" },
      } as any);
      mockPrisma.user.findUnique.mockResolvedValue({ id: "admin", active: true });
      await expect(toggleUserActive("admin")).rejects.toThrow(
        "Không thể vô hiệu hóa chính mình"
      );
    });

    it("should toggle from active to inactive", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "admin", role: "ADMIN" },
      } as any);
      mockPrisma.user.findUnique.mockResolvedValue({ id: CUID(2), active: true });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await toggleUserActive(CUID(2));

      expect(result).toEqual({ ok: true, active: false });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "USER_DEACTIVATE",
          targetId: CUID(2),
        })
      );
    });

    it("should toggle from inactive to active", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "admin", role: "ADMIN" },
      } as any);
      mockPrisma.user.findUnique.mockResolvedValue({ id: CUID(2), active: false });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await toggleUserActive(CUID(2));

      expect(result).toEqual({ ok: true, active: true });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "USER_ACTIVATE",
          targetId: CUID(2),
        })
      );
    });
  });

  describe("resetUserPassword", () => {
    it("should require admin", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      await expect(
        resetUserPassword({ id: CUID(2), newPassword: "newpass123" })
      ).rejects.toThrow("Chỉ admin được thực hiện");
    });

    it("should hash new password and update", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "ADMIN" },
      } as any);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await resetUserPassword({
        id: CUID(2),
        newPassword: "newStrongPass123!@#",
      });

      expect(result).toEqual({ ok: true });
      expect(mockBcryptHash).toHaveBeenCalledWith("newStrongPass123!@#", 12);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: CUID(2) },
        data: { passwordHash: "hashed_password" },
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "USER_PASSWORD_RESET",
          targetId: CUID(2),
        })
      );
    });
  });

  describe("changeMyPassword", () => {
    it("should require current password match", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        passwordHash: "existing_hash",
      });
      mockBcryptCompare.mockResolvedValue(false);

      await expect(
        changeMyPassword({ currentPassword: "wrong", newPassword: "newStrongPass123!@#" })
      ).rejects.toThrow("Mật khẩu hiện tại không đúng");
    });

    it("should change password on success", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        passwordHash: "old_hash",
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await changeMyPassword({
        currentPassword: "oldpass",
        newPassword: "newpass123",
      });

      expect(result).toEqual({ ok: true });
      expect(mockBcryptCompare).toHaveBeenCalledWith("oldpass", "old_hash");
      expect(mockBcryptHash).toHaveBeenCalledWith("newpass123", 12);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: { passwordHash: "hashed_password" },
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "USER_PASSWORD_CHANGE_SELF",
        })
      );
    });
  });

  describe("saveMyAvatar", () => {
    it("should accept valid base64 image", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.user.update.mockResolvedValue({});

      const avatar = "data:image/png;base64,ABCD1234";
      const result = await saveMyAvatar({ avatar });

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: { avatar },
      });
    });

    it("should reject non-image type", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      const avatar = "data:text/plain;base64,ABC";
      await expect(saveMyAvatar({ avatar })).rejects.toThrow(
        "Avatar phải là ảnh PNG / JPG / WebP / SVG"
      );
    });

    it("should reject oversized avatar", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      const huge = "data:image/png;base64," + "x".repeat(300 * 1024);
      await expect(saveMyAvatar({ avatar: huge })).rejects.toThrow(
        "Avatar quá lớn"
      );
    });

    it("should accept null to remove avatar", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.user.update.mockResolvedValue({});
      const result = await saveMyAvatar({ avatar: null });
      expect(result).toEqual({ ok: true });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: { avatar: null },
      });
    });
  });

  // deleteMyAvatar is a separate function but not exported? The file may have deleteMyAvatar. Let's check: we didn't see it in read up to 250; maybe it's after. But we'll ignore if not exported.
});
