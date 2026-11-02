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
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

const ALGORITHM = "AES-256-GCM" as const;
const KEY_LENGTH = 32; // 256 bit
const IV_LENGTH = 12; // 96 bit recommended for GCM
const AUTH_TAG_LENGTH = 16;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.STORAGE_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("Chưa đặt STORAGE_ENCRYPTION_KEY. Tạo trong .env bằng: openssl rand -base64 32");
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== KEY_LENGTH) {
    throw new Error(
      `STORAGE_ENCRYPTION_KEY sai độ dài: cần 32 byte (sau base64 ~44 ký tự), thực tế ${buf.length}`
    );
  }
  cachedKey = buf;
  return cachedKey;
}

/**
 * Mã hoá một Buffer, trả về ciphertext / iv / authTag (đều là Buffer, bên gọi tự base64).
 */
export function encryptBuffer(plain: Buffer): {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  algorithm: string;
} {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH
  });
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext: ct, iv, authTag: tag, algorithm: ALGORITHM };
}

/**
 * Giải mã. iv / authTag ở dạng base64.
 */
export function decryptBuffer(
  ciphertext: Buffer,
  ivBase64: string,
  authTagBase64: string
): Buffer {
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH
  });
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}
