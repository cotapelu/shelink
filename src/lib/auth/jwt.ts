/*
 * Custom JWT encode/decode using RS256 (RSA signatures)
 * Following GOAL.md security requirement: JWT RS256 algorithm
 */
import { SignJWT, jwtVerify } from 'jose';
import type { JWTEncodeParams, JWTDecodeParams, JWT } from 'next-auth/jwt';

const privateKeyPem = process.env.JWT_PRIVATE_KEY!;
const publicKeyPem = process.env.JWT_PUBLIC_KEY!;

// Validate at module load (throws if missing)
if (!process.env.JWT_PRIVATE_KEY || !process.env.JWT_PUBLIC_KEY) {
  throw new Error(
    'JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be set in environment. ' +
    'Generate RSA key pair: ssh-keygen -t rsa -b 4096 -m PEM -f jwt'
  );
}

// Convert PEM to CryptoKey
async function importRsaPrivateKey(pem: string): Promise<CryptoKey> {
  // Remove PEM header/footer and line breaks
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '')
                 .replace(/-----END PRIVATE KEY-----/, '')
                 .replace(/\n/g, '');
  const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'pkcs8',
    binary.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function importRsaPublicKey(pem: string): Promise<CryptoKey> {
  // Handle various formats: "ssh-rsa" or PEM
  let b64 = pem.trim();
  if (b64.startsWith('ssh-rsa ')) {
    // Convert SSH public key format to DER (skip "ssh-rsa " prefix and base64 decode)
    // Note: full conversion is complex; for simplicity, we expect PEM format in production.
    // For development, we use PEM in .env.
    throw new Error('SSH public key format not supported; please use PEM format');
  }
  // Assume PEM format
  b64 = b64.replace(/-----BEGIN PUBLIC KEY-----/, '')
            .replace(/-----END PUBLIC KEY-----/, '')
            .replace(/\n/g, '');
  const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'spki',
    binary.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

let cachedPrivateKey: CryptoKey | null = null;
let cachedPublicKey: CryptoKey | null = null;

async function getPrivateKey(): Promise<CryptoKey> {
  if (!cachedPrivateKey) {
    cachedPrivateKey = await importRsaPrivateKey(privateKeyPem);
  }
  return cachedPrivateKey;
}

async function getPublicKey(): Promise<CryptoKey> {
  if (!cachedPublicKey) {
    cachedPublicKey = await importRsaPublicKey(publicKeyPem);
  }
  return cachedPublicKey;
}

/**
 * Encode JWT using RS256
 * Params: { token: payload object, maxAge?: seconds, secret?: ignored, salt?: ignored }
 */
export async function encode(params: JWTEncodeParams): Promise<string> {
  const { token = {}, maxAge = 4 * 60 * 60 } = params; // default 4h (NextAuth default is 30d)
  const now = Math.floor(Date.now() / 1000);

  const privateKey = await getPrivateKey();

  return await new SignJWT(token)
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime(now + maxAge)
    .setJti(crypto.randomUUID())
    .sign(privateKey);
}

/**
 * Decode/verify JWT
 * Params: { token: string, secret?: ignored, salt?: ignored }
 * Returns payload or null if invalid
 */
export async function decode(params: JWTDecodeParams): Promise<JWT | null> {
  const { token } = params;
  if (!token) return null;

  try {
    const publicKey = await getPublicKey();
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ['RS256'],
      clockTolerance: 15,
    });
    return payload as JWT;
  } catch (err) {
    // Invalid token, expired, etc.
    return null;
  }
}
