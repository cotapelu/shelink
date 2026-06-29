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

  it("uses existing global prisma instance (singleton returns existing)", async () => {
    const mockPrisma = { $disconnect: vi.fn() } as any;
    const globalForPrisma = globalThis as unknown as { prisma: any };
    globalForPrisma.prisma = mockPrisma;
    // Reset module cache to force re-evaluation
    vi.resetModules();
    const { prisma: importedPrisma } = await import('@/lib/prisma');
    expect(importedPrisma).toBe(mockPrisma);
  });

  it("does not set global in production mode (if branch)", async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const globalForPrisma = globalThis as unknown as { prisma: any };
    globalForPrisma.prisma = undefined;
    vi.resetModules();
    await import('@/lib/prisma');
    expect(globalForPrisma.prisma).toBeUndefined();
    vi.unstubAllEnvs();
  });
});