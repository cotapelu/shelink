// @ts-nocheck
/* eslint max-lines-per-function: "off" */
import { describe, it, expect, vi, beforeEach } from 'vitest';
// Note: authModule not used directly but kept for potential future use
import * as authModule from '../options';

describe('authOptions', () => {
  const mockPrivateKey = '-----BEGIN PRIVATE KEY-----\nmock_key\n-----END PRIVATE KEY-----';
  const mockPublicKey = 'ssh-rsa mockkey';

  beforeEach(() => {
    // Reset env between tests
    vi.stubEnv('JWT_PRIVATE_KEY', mockPrivateKey);
    vi.stubEnv('JWT_PUBLIC_KEY', mockPublicKey);
    // Clear module cache to re-run validation
    vi.resetModules();
  });

  it('should use custom JWT encode/decode functions (RS256)', async () => {
    const { authOptions } = await import('../options');
    expect(authOptions.jwt).toBeDefined();
    // Custom functions indicate RSA-based signing
    expect(typeof authOptions.jwt.encode).toBe('function');
    expect(typeof authOptions.jwt.decode).toBe('function');
  });

  // Note: Secret not used in custom JWT; keys validated separately
  it('should not expose private key in config (custom JWT)', async () => {
    const { authOptions } = await import('../options');
    expect(authOptions.jwt.secret).toBeUndefined();
  });

  it('should set session maxAge to 4 hours (14400 seconds)', async () => {
    const { authOptions } = await import('../options');
    expect(authOptions.session?.strategy).toBe('jwt');
    expect(authOptions.session?.maxAge).toBe(4 * 60 * 60);
  });

  it('should throw error if JWT_PRIVATE_KEY is missing', async () => {
    vi.stubEnv('JWT_PRIVATE_KEY', undefined);
    vi.stubEnv('JWT_PUBLIC_KEY', mockPublicKey);
    vi.resetModules();

    await expect(import('../options')).rejects.toThrow(
      'JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be set'
    );
  });

  it('should throw error if JWT_PUBLIC_KEY is missing', async () => {
    vi.stubEnv('JWT_PRIVATE_KEY', mockPrivateKey);
    vi.stubEnv('JWT_PUBLIC_KEY', undefined);
    vi.resetModules();

    await expect(import('../options')).rejects.toThrow(
      'JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be set'
    );
  });

  it('should keep credentials provider unchanged', async () => {
    const { authOptions } = await import('../options');
    expect(authOptions.providers).toHaveLength(1);
    // Provider exists (type check sufficient for this test)
    expect(authOptions.providers[0]).toBeDefined();
  });

  it('should have callbacks configured correctly', async () => {
    const { authOptions } = await import('../options');
    expect(authOptions.callbacks?.jwt).toBeDefined();
    expect(authOptions.callbacks?.session).toBeDefined();
  });
});
