// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Mock Prisma before authOptions import
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));

const mockPrismaUser = vi.mocked(prisma.user, true);
const mockBcryptCompare = vi.spyOn(bcrypt, "compare");

beforeEach(() => {
  vi.clearAllMocks();
  mockBcryptCompare.mockResolvedValue(true);
});

describe("authOptions - CredentialsProvider authorize", () => {
  const credentials = { email: "test@example.com", password: "secret" };

  it("should return null if validation fails", async () => {
    const result = await authOptions.providers[0].authorize?.({
      ...credentials,
      email: "invalid"
    } as any);
    expect(result).toBeNull();
  });

  it("should return null if user not found", async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null);
    const result = await authOptions.providers[0].authorize?.(credentials as any);
    expect(result).toBeNull();
  });

  it("should return null if user inactive", async () => {
    mockPrismaUser.findUnique.mockResolvedValue({
      id: "1",
      email: "test@example.com",
      passwordHash: "hashed",
      active: false,
      name: "Test",
      role: "USER",
      avatar: null
    });
    const result = await authOptions.providers[0].authorize?.(credentials as any);
    expect(result).toBeNull();
  });

  it("should return null if password mismatch", async () => {
    mockPrismaUser.findUnique.mockResolvedValue({
      id: "1",
      email: "test@example.com",
      passwordHash: "hashed",
      active: true,
      name: "Test",
      role: "USER",
      avatar: null
    });
    mockBcryptCompare.mockResolvedValue(false);
    const result = await authOptions.providers[0].authorize?.(credentials as any);
    expect(result).toBeNull();
  });

  it.skip("should return user object on success", async () => {
    const user = {
      id: "1",
      email: "test@example.com",
      passwordHash: "hashed",
      active: true,
      name: "Test",
      role: "LAWYER",
      avatar: "avatar.png"
    };
    mockPrismaUser.findUnique.mockResolvedValue(user);
    mockPrismaUser.update.mockResolvedValue({} as any);

    const result = await authOptions.providers[0].authorize?.(credentials as any);

    // Verify mocks called
    expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
      where: { email: credentials.email }
    });
    expect(mockBcryptCompare).toHaveBeenCalledWith(credentials.password, user.passwordHash);

    expect(result).toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    });
    // Verify last login update attempted (fire-and-forget)
    expect(mockPrismaUser.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { lastLoginAt: expect.any(Date) }
    });
  });
});

describe("authOptions - JWT callback", () => {
  it("should add user info to token when user provided", async () => {
    const token: any = {};
    const user = { id: "1", role: "ADMIN", avatar: "url" };
    const session = await authOptions.callbacks?.jwt?.({ token, user });
    expect(session).toEqual({
      id: "1",
      role: "ADMIN",
      avatar: "url"
    });
  });

  it("should return token unchanged when no user", async () => {
    const token: any = { id: "1", role: "USER" };
    const user = undefined;
    const session = await authOptions.callbacks?.jwt?.({ token, user });
    expect(session).toEqual(token);
  });
});

describe("authOptions - Session callback", () => {
  it("should merge token into session.user", async () => {
    const session: any = { user: {} };
    const token = { id: "1", role: "LAWYER", avatar: null };
    const result = await authOptions.callbacks?.session?.({ session, token });
    expect(result.user).toEqual({
      id: "1",
      role: "LAWYER",
      avatar: null
    });
  });

  it("should handle session.user undefined", async () => {
    const session: any = { user: undefined };
    const token = { id: "2", role: "ASSISTANT" };
    const result = await authOptions.callbacks?.session?.({ session, token });
    // The callback code checks if (session.user), so when undefined it returns session unchanged.
    expect(result).toEqual({ user: undefined });
  });
});
