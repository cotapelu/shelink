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
  AI_DEFAULTS,
  readStoredAiSettings,
  readPublicAiSettings,
  getAiSettings,
  saveAiSettings
} from "@/lib/ai/settings";
import { prisma } from "@/lib/prisma";
import { encryptBuffer, decryptBuffer } from "@/lib/storage/crypto";

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

describe("AI_DEFAULTS", () => {
  it("has correct default baseUrl", () => {
    expect(AI_DEFAULTS.baseUrl).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1");
  });
  it("has correct default models", () => {
    expect(AI_DEFAULTS.textModel).toBe("qwen-turbo");
    expect(AI_DEFAULTS.visionModel).toBe("qwen-vl-max");
  });
});

describe("readStoredAiSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns defaults when no row", async () => {
    (prisma.systemSetting.findUnique as any).mockResolvedValue(null);

    const result = await readStoredAiSettings();

    expect(result.baseUrl).toBe(AI_DEFAULTS.baseUrl);
    expect(result.textModel).toBe(AI_DEFAULTS.textModel);
    expect(result.visionModel).toBe(AI_DEFAULTS.visionModel);
    expect(result.apiKeyCipher).toBeNull();
  });

  it("merges stored values with defaults", async () => {
    (prisma.systemSetting.findUnique as any).mockResolvedValue({
      value: {
        apiKeyCipher: { ct: "cQ==", iv: "aQ==", tag: "dA==" },
        baseUrl: "https://custom.example.com",
        textModel: "gpt-4",
        visionModel: "gpt-4-vision"
      }
    });

    const result = await readStoredAiSettings();

    expect(result.baseUrl).toBe("https://custom.example.com");
    expect(result.textModel).toBe("gpt-4");
    expect(result.visionModel).toBe("gpt-4-vision");
    expect(result.apiKeyCipher).toEqual({ ct: "cQ==", iv: "aQ==", tag: "dA==" });
  });
});

describe("readPublicAiSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns masked key when configured", async () => {
    (prisma.systemSetting.findUnique as any).mockResolvedValue({
      value: {
        apiKeyCipher: { ct: "dGVzdA==", iv: "aXY=", tag: "dGFn" },
        baseUrl: AI_DEFAULTS.baseUrl
      }
    });
    (decryptBuffer as any).mockReturnValue(Buffer.from("test-key-123456"));

    const result = await readPublicAiSettings();

    expect(result.configured).toBe(true);
    expect(result.apiKeyMasked).toBe("test••••3456");
    expect(result.baseUrl).toBe(AI_DEFAULTS.baseUrl);
  });

  it("returns not configured when no key", async () => {
    (prisma.systemSetting.findUnique as any).mockResolvedValue({
      value: { baseUrl: AI_DEFAULTS.baseUrl }
    });

    const result = await readPublicAiSettings();

    expect(result.configured).toBe(false);
    expect(result.apiKeyMasked).toBe("");
  });
});

describe("getAiSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns resolved settings with apiKey", async () => {
    (prisma.systemSetting.findUnique as any).mockResolvedValue({
      value: {
        apiKeyCipher: { ct: "c2VjcmV0", iv: "aXY=", tag: "dGFn" },
        baseUrl: "https://custom.example.com",
        textModel: "gpt-4",
        visionModel: "gpt-4-vision"
      }
    });
    (decryptBuffer as any).mockReturnValue(Buffer.from("secret-api-key"));

    const result = await getAiSettings();

    expect(result.apiKey).toBe("secret-api-key");
    expect(result.baseUrl).toBe("https://custom.example.com");
    expect(result.textModel).toBe("gpt-4");
    expect(result.visionModel).toBe("gpt-4-vision");
    expect(result.configured).toBe(true);
  });

  it("returns not configured when empty apiKey", async () => {
    (prisma.systemSetting.findUnique as any).mockResolvedValue({
      value: { baseUrl: AI_DEFAULTS.baseUrl, apiKeyCipher: null }
    });

    const result = await getAiSettings();

    expect(result.apiKey).toBe("");
    expect(result.configured).toBe(false);
  });
});

describe("saveAiSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates new setting when not exists", async () => {
    (prisma.systemSetting.findUnique as any).mockResolvedValue(null);
    (encryptBuffer as any).mockReturnValue({
      ciphertext: Buffer.from("newct"),
      iv: Buffer.from("newiv"),
      authTag: Buffer.from("newtag")
    });
    (prisma.systemSetting.upsert as any).mockResolvedValue({});

    await saveAiSettings({ apiKey: "new-key", baseUrl: "https://new.example.com" });

    expect(prisma.systemSetting.upsert).toHaveBeenCalledWith({
      where: { key: "aiSettings" },
      update: expect.any(Object),
      create: expect.objectContaining({
        key: "aiSettings",
        value: expect.objectContaining({
          apiKeyCipher: expect.any(Object),
          baseUrl: "https://new.example.com",
          textModel: AI_DEFAULTS.textModel,
          visionModel: AI_DEFAULTS.visionModel
        })
      })
    });
  });

  it("updates existing setting", async () => {
    (prisma.systemSetting.findUnique as any).mockResolvedValue({
      value: { apiKeyCipher: { ct: "old", iv: "old", tag: "old" }, baseUrl: "https://old.example.com" }
    });
    (encryptBuffer as any).mockReturnValue({
      ciphertext: Buffer.from("newct"),
      iv: Buffer.from("newiv"),
      authTag: Buffer.from("newtag")
    });
    (prisma.systemSetting.upsert as any).mockResolvedValue({});

    await saveAiSettings({ apiKey: "updated-key", baseUrl: "https://updated.example.com" });

    expect(prisma.systemSetting.upsert).toHaveBeenCalledWith({
      where: { key: "aiSettings" },
      update: expect.objectContaining({
        value: expect.objectContaining({
          apiKeyCipher: expect.any(Object),
          baseUrl: "https://updated.example.com",
          textModel: AI_DEFAULTS.textModel,
          visionModel: AI_DEFAULTS.visionModel
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

    await saveAiSettings({ clearKey: true });

    expect(prisma.systemSetting.upsert).toHaveBeenCalledWith({
      where: { key: "aiSettings" },
      update: expect.objectContaining({
        value: expect.objectContaining({
          apiKeyCipher: null
        })
      }),
      create: expect.any(Object)
    });
  });

  it("preserves unchanged fields when only updating apiKey", async () => {
    (prisma.systemSetting.findUnique as any).mockResolvedValue({
      value: {
        apiKeyCipher: { ct: "old", iv: "old", tag: "old" },
        baseUrl: "https://existing.example.com",
        textModel: "existing-text-model",
        visionModel: "existing-vision-model"
      }
    });
    (encryptBuffer as any).mockReturnValue({
      ciphertext: Buffer.from("newct"),
      iv: Buffer.from("newiv"),
      authTag: Buffer.from("newtag")
    });
    (prisma.systemSetting.upsert as any).mockResolvedValue({});

    await saveAiSettings({ apiKey: "new-key" });

    expect(prisma.systemSetting.upsert).toHaveBeenCalledWith({
      where: { key: "aiSettings" },
      update: expect.objectContaining({
        value: expect.objectContaining({
          baseUrl: "https://existing.example.com",
          textModel: "existing-text-model",
          visionModel: "existing-vision-model"
        })
      }),
      create: expect.any(Object)
    });
  });
});
