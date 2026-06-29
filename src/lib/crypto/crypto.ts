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
 * Crypto utilities for sensitive data at rest
 * Uses Web Crypto API (native browser) with fallback to Node.js crypto in server context
 *
 * SECURITY: All tokens stored in localStorage are encrypted with AES-GCM
 * Key derivation from environment secret (should be set in production)
 */

const ALGO = 'AES-GCM';
const NODE_ALGO = 'aes-256-gcm';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // GCM recommended IV size
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

// In production, this should come from env var (never hardcoded)
const getEncryptionKey = async (): Promise<CryptoKey> => {
  const secret = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;

  if (!secret) {
    // Dev mode: use a fixed key (WARNING: not secure for production!)
    if (process.env.NODE_ENV === 'development') {
      console.warn('[CRYPTO] Using development encryption key. Set NEXT_PUBLIC_ENCRYPTION_KEY in production.');
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode('dev-secret-key-please-change-in-prod'),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );
      return crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: enc.encode('giapha-os-salt'), // Fixed salt for dev (use random in prod!)
          iterations: PBKDF2_ITERATIONS,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: ALGO, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
      );
    }
    throw new Error('NEXT_PUBLIC_ENCRYPTION_KEY not set. Cannot encrypt tokens.');
  }

  // Production: derive key from env secret
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Use a random salt per installation (store in a separate config)
  const salt = process.env.NEXT_PUBLIC_ENCRYPTION_SALT
    ? enc.encode(process.env.NEXT_PUBLIC_ENCRYPTION_SALT)
    : enc.encode('static-salt-change-me'); // FIXME: use random salt in prod!

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGO, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
};

export async function encrypt(plaintext: string): Promise<string> {
  if (typeof window === 'undefined') {
    // Server-side: use Node.js crypto
    const nodeCrypto = await import('node:crypto');
    const key = Buffer.from(process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'dev-secret').slice(0, 32);
    const iv = nodeCrypto.randomBytes(IV_LENGTH);
    const cipher = nodeCrypto.createCipheriv(NODE_ALGO, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const tag = cipher.getAuthTag(); // GCM auth tag
    // Format: iv:encrypted:tag (all base64)
    return `${iv.toString('base64')}:${encrypted}:${tag.toString('base64')}`;
  }

  // Browser: Web Crypto API
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGO, iv, tagLength: TAG_LENGTH * 8 },
    key,
    new TextEncoder().encode(plaintext)
  );

  // Combine IV + encrypted data + tag (tag is appended by Web Crypto automatically)
  const ivBase64 = btoa(String.fromCharCode(...iv));
  const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  return `${ivBase64}:${encryptedBase64}`;
}

export async function decrypt(ciphertext: string): Promise<string> {
  if (typeof window === 'undefined') {
    // Server-side: Node.js crypto
    const nodeCrypto = await import('node:crypto');
    const key = Buffer.from(process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'dev-secret').slice(0, 32);
    const parts = ciphertext.split(':');
    if (parts.length !== 3) throw new Error('Invalid ciphertext format');
    const [ivB64, encryptedB64, tagB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const encrypted = Buffer.from(encryptedB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const decipher = nodeCrypto.createDecipheriv(NODE_ALGO, key, iv);
    decipher.setAuthTag(tag); // GCM authentication tag
    let decrypted = decipher.update(encrypted, undefined, 'utf8') || '';
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Browser: Web Crypto API
  const key = await getEncryptionKey();
  const [ivB64, encryptedB64] = ciphertext.split(':');
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  const encrypted = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGO, iv, tagLength: TAG_LENGTH * 8 },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Utility: clear all stored tokens (for logout)
 */
export function clearEncryptedStorage(): void {
  if (typeof window !== 'undefined') {
    const keys = ['auth_token', 'refresh_token', 'user_data'];
    keys.forEach(key => {
      try {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_enc`);
      } catch (e) {
        console.error('[CRYPTO] Failed to clear storage:', e);
      }
    });
  }
}
