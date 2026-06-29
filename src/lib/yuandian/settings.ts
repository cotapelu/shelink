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
/**
 * v0.19: 元典开放平台（chineselaw.com）API 配置读写
 *
 * 复用 AI 设置同一加密机制（STORAGE_ENCRYPTION_KEY），独立的 SystemSetting key。
 * 元典提供法律法规 / 案例 / 企业三类 API；本期接入"案例检索"。
 */
import { prisma } from "@/lib/prisma";
import { encryptBuffer, decryptBuffer } from "@/lib/storage/crypto";

const YUANDIAN_SETTINGS_KEY = "yuandianSettings";

export const YUANDIAN_DEFAULTS = {
  baseUrl: "https://open.chineselaw.com/open",
  // 案例详情前端域名（用于列表"查看全文"外跳）
  caseDetailHost: "https://www.chineselaw.com"
} as const;

export interface StoredYuandianSettings {
  apiKeyCipher: { ct: string; iv: string; tag: string } | null;
  baseUrl: string;
  caseDetailHost: string;
}

export interface ResolvedYuandianSettings {
  apiKey: string;
  baseUrl: string;
  caseDetailHost: string;
  configured: boolean;
}

function encryptKey(plain: string): StoredYuandianSettings["apiKeyCipher"] {
  if (!plain) return null;
  const enc = encryptBuffer(Buffer.from(plain, "utf-8"));
  return {
    ct: enc.ciphertext.toString("base64"),
    iv: enc.iv.toString("base64"),
    tag: enc.authTag.toString("base64")
  };
}

function decryptKey(cipher: StoredYuandianSettings["apiKeyCipher"]): string {
  if (!cipher) return "";
  const ct = Buffer.from(cipher.ct, "base64");
  return decryptBuffer(ct, cipher.iv, cipher.tag).toString("utf-8");
}

export async function readStoredYuandianSettings(): Promise<StoredYuandianSettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: YUANDIAN_SETTINGS_KEY } });
  const stored = (row?.value as Partial<StoredYuandianSettings> | null) ?? {};
  return {
    apiKeyCipher: stored.apiKeyCipher ?? null,
    baseUrl: stored.baseUrl || YUANDIAN_DEFAULTS.baseUrl,
    caseDetailHost: stored.caseDetailHost || YUANDIAN_DEFAULTS.caseDetailHost
  };
}

export async function readPublicYuandianSettings(): Promise<{
  configured: boolean;
  baseUrl: string;
  caseDetailHost: string;
  apiKeyMasked: string;
}> {
  const s = await readStoredYuandianSettings();
  const key = decryptKey(s.apiKeyCipher);
  return {
    configured: !!key,
    baseUrl: s.baseUrl,
    caseDetailHost: s.caseDetailHost,
    apiKeyMasked: key ? `${key.slice(0, 4)}••••${key.slice(-4)}` : ""
  };
}

export async function getYuandianSettings(): Promise<ResolvedYuandianSettings> {
  const s = await readStoredYuandianSettings();
  const apiKey = decryptKey(s.apiKeyCipher);
  return {
    apiKey,
    baseUrl: s.baseUrl,
    caseDetailHost: s.caseDetailHost,
    configured: !!apiKey
  };
}

export async function saveYuandianSettings(input: {
  apiKey?: string;
  baseUrl?: string;
  caseDetailHost?: string;
  clearKey?: boolean;
}) {
  const current = await readStoredYuandianSettings();
  const next: StoredYuandianSettings = {
    apiKeyCipher: input.clearKey
      ? null
      : input.apiKey
        ? encryptKey(input.apiKey)
        : current.apiKeyCipher,
    baseUrl: input.baseUrl ?? current.baseUrl,
    caseDetailHost: input.caseDetailHost ?? current.caseDetailHost
  };

  await prisma.systemSetting.upsert({
    where: { key: YUANDIAN_SETTINGS_KEY },
    update: { value: next as object },
    create: { key: YUANDIAN_SETTINGS_KEY, value: next as object }
  });

  return { ok: true };
}
