/* eslint-disable @typescript-eslint/no-unused-vars */
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@prisma/client", () => {
  const mockCtor = vi.fn().mockImplementation(function(this: any) {
    return {
      $connect: vi.fn(),
      $disconnect: vi.fn(),
      $on: vi.fn(),
      $transaction: vi.fn(),
    };
  });
  return { PrismaClient: mockCtor };
});

describe("prisma singleton branch coverage", () => {
  let MockedPrismaClient: any;

  beforeEach(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    const { PrismaClient } = await import("@prisma/client");
    MockedPrismaClient = PrismaClient;
    MockedPrismaClient.mockClear();
    delete (globalThis as any).prisma;
  });

  it("creates new PrismaClient with dev logs when NODE_ENV=development and global undefined", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { prisma } = await import("@/lib/prisma");
    expect(MockedPrismaClient).toHaveBeenCalledTimes(1);
    const options = MockedPrismaClient.mock.calls[0][0];
    expect(options.log).toEqual(["query", "error", "warn"]);
    expect((globalThis as any).prisma).toBe(prisma);
  });

  it("creates new PrismaClient with prod logs when NODE_ENV=production and global undefined", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { prisma } = await import("@/lib/prisma");
    expect(MockedPrismaClient).toHaveBeenCalledTimes(1);
    const options = MockedPrismaClient.mock.calls[0][0];
    expect(options.log).toEqual(["error"]);
    expect((globalThis as any).prisma).toBeUndefined();
  });

  it("returns existing global prisma when already set", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const existing = { existing: true } as any;
    (globalThis as any).prisma = existing;
    const { prisma } = await import("@/lib/prisma");
    expect(MockedPrismaClient).not.toHaveBeenCalled();
    expect(prisma).toBe(existing);
  });

  it("does not set global in production even after creating new", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { prisma } = await import("@/lib/prisma");
    expect(MockedPrismaClient).toHaveBeenCalledTimes(1);
    expect((globalThis as any).prisma).toBeUndefined();
  });
});
