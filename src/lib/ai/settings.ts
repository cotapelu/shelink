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
/**
 * v0.9.1 Đọc/ghi cấu hình AI (giao thức tương thích OpenAI)
 *
 * SystemSetting một key `aiSettings`, value là JSON đã mã hoá:
 *   { apiKeyCipher, baseUrl, textModel, visionModel }
 * apiKey mã hoá bằng cùng khoá với storage/crypto (STORAGE_ENCRYPTION_KEY).
 *
 * Provider mặc định: 通义千问 / Qwen (quyết định PRD §13.8.2 — hạn mức miễn phí Alibaba Bailian lớn).
 * Người dùng có thể đổi sang bất kỳ endpoint tương thích OpenAI nào: DeepSeek / Kimi / 智谱 / OpenAI / OpenRouter / Ollama.
 */
import { prisma } from "@/lib/prisma";
import { encryptBuffer, decryptBuffer } from "@/lib/storage/crypto";

const AI_SETTINGS_KEY = "aiSettings";

export const AI_DEFAULTS = {
  baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  textModel: "qwen-turbo",
  visionModel: "qwen-vl-max"
} as const;

export interface StoredAiSettings {
  apiKeyCipher: { ct: string; iv: string; tag: string } | null;
  baseUrl: string;
  textModel: string;
  visionModel: string;
}

export interface ResolvedAiSettings {
  apiKey: string; // Đã giải mã, chỉ dùng nội bộ server
  baseUrl: string;
  textModel: string;
  visionModel: string;
  configured: boolean;
}

function encryptKey(plain: string): StoredAiSettings["apiKeyCipher"] {
  if (!plain) return null;
  const enc = encryptBuffer(Buffer.from(plain, "utf-8"));
  return {
    ct: enc.ciphertext.toString("base64"),
    iv: enc.iv.toString("base64"),
    tag: enc.authTag.toString("base64")
  };
}

function decryptKey(cipher: StoredAiSettings["apiKeyCipher"]): string {
  if (!cipher) return "";
  const ct = Buffer.from(cipher.ct, "base64");
  return decryptBuffer(ct, cipher.iv, cipher.tag).toString("utf-8");
}

export async function readStoredAiSettings(): Promise<StoredAiSettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: AI_SETTINGS_KEY } });
  const stored = (row?.value as Partial<StoredAiSettings> | null) ?? {};
  return {
    apiKeyCipher: stored.apiKeyCipher ?? null,
    baseUrl: stored.baseUrl || AI_DEFAULTS.baseUrl,
    textModel: stored.textModel || AI_DEFAULTS.textModel,
    visionModel: stored.visionModel || AI_DEFAULTS.visionModel
  };
}

/** Cho UI dùng: che mẫn + đã cấu hình chưa */
export async function readPublicAiSettings(): Promise<{
  configured: boolean;
  baseUrl: string;
  textModel: string;
  visionModel: string;
  apiKeyMasked: string;
}> {
  const s = await readStoredAiSettings();
  const key = decryptKey(s.apiKeyCipher);
  return {
    configured: !!key,
    baseUrl: s.baseUrl,
    textModel: s.textModel,
    visionModel: s.visionModel,
    apiKeyMasked: key ? `${key.slice(0, 4)}••••${key.slice(-4)}` : ""
  };
}

/** Cho server gọi nội bộ: lấy cấu hình dùng được đã giải mã */
export async function getAiSettings(): Promise<ResolvedAiSettings> {
  const s = await readStoredAiSettings();
  const apiKey = decryptKey(s.apiKeyCipher);
  return {
    apiKey,
    baseUrl: s.baseUrl,
    textModel: s.textModel,
    visionModel: s.visionModel,
    configured: !!apiKey
  };
}

export async function saveAiSettings(input: {
  apiKey?: string; // Để trống = giữ giá trị cũ; truyền null tường minh = xoá
  baseUrl?: string;
  textModel?: string;
  visionModel?: string;
  clearKey?: boolean;
}) {
  const current = await readStoredAiSettings();
  const next: StoredAiSettings = {
    apiKeyCipher: input.clearKey
      ? null
      : input.apiKey
        ? encryptKey(input.apiKey)
        : current.apiKeyCipher,
    baseUrl: input.baseUrl ?? current.baseUrl,
    textModel: input.textModel ?? current.textModel,
    visionModel: input.visionModel ?? current.visionModel
  };

  await prisma.systemSetting.upsert({
    where: { key: AI_SETTINGS_KEY },
    update: { value: next as object },
    create: { key: AI_SETTINGS_KEY, value: next as object }
  });

  return { ok: true };
}
