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
  YUANDIAN_DEFAULTS,
  readStoredYuandianSettings,
  readPublicYuandianSettings,
  getYuandianSettings,
  saveYuandianSettings
} from "@/lib/yuandian/settings";
import { prisma } from "@/lib/prisma";
import { encryptBuffer, decryptBuffer } from "@/lib/storage/crypto";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn()
    }
  }
}));

vi.mock("@/lib/storage/crypto", () => ({
  encryptBuffer: vi.fn(),
  decryptBuffer: vi.fn()
}));

describe("YUANDIAN_DEFAULTS", () => {
  it("has correct baseUrl", () => {
    expect(YUANDIAN_DEFAULTS.baseUrl).toBe("https://open.chineselaw.com/open");
  });
  it("has correct caseDetailHost", () => {
    expect(YUANDIAN_DEFAULTS.caseDetailHost).toBe("https://www.chineselaw.com");
  });
});

describe("readStoredYuandianSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns defaults when no row", async () => {
    (prisma.systemSetting.findUnique as any).mockResolvedValue(null);

    const result = await readStoredYuandianSettings();

    expect(result.baseUrl).toBe(YUANDIAN_DEFAULTS.baseUrl);
    expect(result.caseDetailHost).toBe(YUANDIAN_DEFAULTS.caseDetailHost);
    expect(result.apiKeyCipher).toBeNull();
  });

  it("merges stored values with defaults", async () => {
    (prisma.systemSetting.findUnique as any).mockResolvedValue({
      value: {
        baseUrl: "https://custom.example.com",
        caseDetailHost: "https://custom.example.com",
        apiKeyCipher: { ct: "cQ==", iv: "aQ==", tag: "dA==" }
      }
    });

    const result = await readStoredYuandianSettings();

    expect(result.baseUrl).toBe("https://custom.example.com");
    expect(result.caseDetailHost).toBe("https://custom.example.com");
    expect(result.apiKeyCipher).toEqual({ ct: "cQ==", iv: "aQ==", tag: "dA==" });
  });
});

describe("readPublicYuandianSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns masked key when configured", async () => {
    (prisma.systemSetting.findUnique as any).mockResolvedValue({
      value: {
        apiKeyCipher: { ct: "Y3Q=", iv: "aXY=", tag: "dGFn" },
        baseUrl: "https://open.chineselaw.com/open"
      }
    });
    (decryptBuffer as any).mockReturnValue(Buffer.from("long-secret-key"));

    const result = await readPublicYuandianSettings();

    expect(result.configured).toBe(true);
    expect(result.apiKeyMasked).toBe("long••••-key"); // first 4 + last 4
    expect(result.baseUrl).toBe("https://open.chineselaw.com/open");
  });

  it("returns not configured when no key", async () => {
    (prisma.systemSetting.findUnique as any).mockResolvedValue({
      value: { baseUrl: "https://open.chineselaw.com/open" }
    });

    const result = await readPublicYuandianSettings();

    expect(result.configured).toBe(false);
    expect(result.apiKeyMasked).toBe("");
  });
});

describe("getYuandianSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns resolved settings with apiKey", async () => {
    (prisma.systemSetting.findUnique as any).mockResolvedValue({
      value: {
        apiKeyCipher: { ct: "Y3Q=", iv: "aXY=", tag: "dGFn" },
        baseUrl: "https://custom.example.com",
        caseDetailHost: "https://custom.host"
      }
    });
    (decryptBuffer as any).mockReturnValue(Buffer.from("secret-key"));

    const result = await getYuandianSettings();

    expect(result.apiKey).toBe("secret-key");
    expect(result.baseUrl).toBe("https://custom.example.com");
    expect(result.caseDetailHost).toBe("https://custom.host");
    expect(result.configured).toBe(true);
  });

  it("returns not configured when no key", async () => {
    (prisma.systemSetting.findUnique as any).mockResolvedValue({
      value: { baseUrl: "https://open.chineselaw.com/open" }
    });

    const result = await getYuandianSettings();

    expect(result.apiKey).toBe("");
    expect(result.configured).toBe(false);
  });
});

describe("saveYuandianSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates new setting when not exists", async () => {
    (prisma.systemSetting.findUnique as any).mockResolvedValue(null);
    (encryptBuffer as any).mockReturnValue({ ciphertext: Buffer.from("ct"), iv: Buffer.from("iv"), authTag: Buffer.from("tag") });
    (prisma.systemSetting.upsert as any).mockResolvedValue({});

    await saveYuandianSettings({ apiKey: "new-key", baseUrl: "https://new.example.com" });

    expect(prisma.systemSetting.upsert).toHaveBeenCalledWith({
      where: { key: "yuandianSettings" },
      update: expect.any(Object),
      create: expect.objectContaining({
        key: "yuandianSettings",
        value: expect.objectContaining({
          apiKeyCipher: expect.any(Object),
          baseUrl: "https://new.example.com",
          caseDetailHost: YUANDIAN_DEFAULTS.caseDetailHost
        })
      })
    });
  });

  it("updates existing setting", async () => {
    (prisma.systemSetting.findUnique as any).mockResolvedValue({
      value: { apiKeyCipher: { ct: "old", iv: "old", tag: "old" }, baseUrl: "https://old.example.com" }
    });
    (encryptBuffer as any).mockReturnValue({ ciphertext: Buffer.from("newct"), iv: Buffer.from("newiv"), authTag: Buffer.from("newtag") });
    (prisma.systemSetting.upsert as any).mockResolvedValue({});

    await saveYuandianSettings({ apiKey: "updated-key", baseUrl: "https://updated.example.com" });

    expect(prisma.systemSetting.upsert).toHaveBeenCalledWith({
      where: { key: "yuandianSettings" },
      update: expect.objectContaining({
        value: expect.objectContaining({
          apiKeyCipher: expect.any(Object),
          baseUrl: "https://updated.example.com",
          caseDetailHost: YUANDIAN_DEFAULTS.caseDetailHost
        })
      }),
      create: expect.any(Object)
    });
  });

  it("clears key when clearKey is true", async () => {
    (prisma.systemSetting.findUnique as any).mockResolvedValue({
      value: { apiKeyCipher: { ct: "old", iv: "old", tag: "old" }, baseUrl: "https://old.example.com" }
    });
    (prisma.systemSetting.upsert as any).mockResolvedValue({});

    await saveYuandianSettings({ clearKey: true });

    expect(prisma.systemSetting.upsert).toHaveBeenCalledWith({
      where: { key: "yuandianSettings" },
      update: expect.objectContaining({
        value: expect.objectContaining({
          apiKeyCipher: null
        })
      }),
      create: expect.any(Object)
    });
  });
});
