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
