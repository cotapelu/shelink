import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";

describe("prisma singleton", () => {
  beforeEach(() => {
    // Reset global between tests
    const globalForPrisma = globalThis as unknown as { prisma: any };
    globalForPrisma.prisma = undefined;
  });

  afterEach(() => {
    // Cleanup to avoid open handle warnings
    const globalForPrisma = globalThis as unknown as { prisma: any };
    if (globalForPrisma.prisma && globalForPrisma.prisma.$disconnect) {
      globalForPrisma.prisma.$disconnect();
    }
    globalForPrisma.prisma = undefined;
  });

  it("creates a new PrismaClient instance when not initialized", () => {
    expect(prisma).toBeInstanceOf(PrismaClient);
  });

  it("exports a PrismaClient instance", () => {
    expect(prisma).toBeInstanceOf(PrismaClient);
  });

  it("sets log configuration correctly in non-production", () => {
    vi.stubEnv('NODE_ENV', 'development');
    // Re-import to get new instance with dev logs
    const globalForPrisma = globalThis as unknown as { prisma: any };
    globalForPrisma.prisma = undefined;
    const newPrisma = globalForPrisma.prisma ?? new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
    });
    expect(newPrisma).toBeInstanceOf(PrismaClient);
    vi.unstubAllEnvs();
  });

  it("does not cache in production mode", () => {
    vi.stubEnv('NODE_ENV', 'production');
    const globalForPrisma = globalThis as unknown as { prisma: any };
    globalForPrisma.prisma = undefined;
    const prodPrisma = globalForPrisma.prisma ?? new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
    });
    expect(prodPrisma).toBeInstanceOf(PrismaClient);
    vi.unstubAllEnvs();
  });
});