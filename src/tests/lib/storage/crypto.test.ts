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
/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const validKey = 'qFq6VnpxaDqi4VSszMquzWpzSPUf8tI+rbmVVgB1zws='; // 32 bytes base64

describe('crypto', () => {
  beforeEach(() => {
    vi.stubEnv('STORAGE_ENCRYPTION_KEY', validKey);
    vi.resetModules(); // Clear module cache to reset cachedKey
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('encrypts and decrypts round-trip successfully', async () => {
    const { encryptBuffer, decryptBuffer } = await import('@/lib/storage/crypto');
    const plaintext = Buffer.from('Hello, LawLink! 你好世界');
    const enc = encryptBuffer(plaintext);

    // Check structure
    expect(enc).toEqual({
      ciphertext: expect.any(Buffer),
      iv: expect.any(Buffer),
      authTag: expect.any(Buffer),
      algorithm: 'AES-256-GCM'
    });

    // Convert iv/authTag to base64 for decrypt
    const ivB64 = enc.iv.toString('base64');
    const authTagB64 = enc.authTag.toString('base64');

    const decrypted = decryptBuffer(enc.ciphertext, ivB64, authTagB64);
    expect(decrypted).toEqual(plaintext);
  });

  it('throws if STORAGE_ENCRYPTION_KEY is not set', async () => {
    vi.stubEnv('STORAGE_ENCRYPTION_KEY', undefined);
    const { encryptBuffer } = await import('@/lib/storage/crypto');
    expect(() => encryptBuffer(Buffer.from('test'))).toThrow('STORAGE_ENCRYPTION_KEY 未设置');
  });

  it('throws if STORAGE_ENCRYPTION_KEY length is invalid', async () => {
    vi.stubEnv('STORAGE_ENCRYPTION_KEY', 'shortkey');
    const { encryptBuffer } = await import('@/lib/storage/crypto');
    expect(() => encryptBuffer(Buffer.from('test'))).toThrow('STORAGE_ENCRYPTION_KEY 长度错误');
  });

  it('sha256 returns correct hex digest', async () => {
    const { sha256 } = await import('@/lib/storage/crypto');
    const hash = sha256(Buffer.from('hello'));
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('decrypt throws on invalid authTag (tampered)', async () => {
    const { encryptBuffer, decryptBuffer } = await import('@/lib/storage/crypto');
    const enc = encryptBuffer(Buffer.from('secret data'));

    // Tamper with authTag by flipping bits
    const tamperedAuth = Buffer.from(enc.authTag);
    tamperedAuth[0] ^= 0xff;
    const authB64 = tamperedAuth.toString('base64');

    expect(() => decryptBuffer(enc.ciphertext, enc.iv.toString('base64'), authB64))
      .toThrow(); // Node crypto throws on invalid auth tag
  });

  it('decrypt throws on invalid base64 iv', async () => {
    const { decryptBuffer } = await import('@/lib/storage/crypto');
    expect(() => decryptBuffer(Buffer.from('cipher'), 'not-base64', 'dGVzdA=='))
      .toThrow();
  });

  it('decrypt throws when ciphertext is corrupted', async () => {
    const { encryptBuffer, decryptBuffer } = await import('@/lib/storage/crypto');
    const enc = encryptBuffer(Buffer.from('data'));

    // Corrupt ciphertext
    const corrupted = Buffer.from(enc.ciphertext);
    corrupted[0] ^= 0xff;
    expect(() => decryptBuffer(corrupted, enc.iv.toString('base64'), enc.authTag.toString('base64')))
      .toThrow();
  });
});
