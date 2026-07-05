import { describe, it, expect, beforeEach } from "vitest";
import { encryptBuffer, decryptBuffer, sha256 } from "@/lib/storage/crypto";
import { createHash } from "node:crypto";

beforeEach(() => {
  // Set a deterministic 32-byte base64 key (all zeros)
  process.env.STORAGE_ENCRYPTION_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
});

describe("storage/crypto", () => {
  it("encryptBuffer and decryptBuffer are reversible", () => {
    const plain = Buffer.from("hello world");
    const { ciphertext, iv, authTag, algorithm } = encryptBuffer(plain);

    expect(algorithm).toBe("AES-256-GCM");
    expect(iv.length).toBe(12);
    expect(authTag.length).toBe(16);
    expect(ciphertext.length).toBeGreaterThan(0);

    // Decrypt
    const ivBase64 = iv.toString("base64");
    const authTagBase64 = authTag.toString("base64");
    const recovered = decryptBuffer(ciphertext, ivBase64, authTagBase64);

    expect(recovered).toEqual(plain);
  });

  it("sha256 produces correct hex digest", () => {
    const data = Buffer.from("test");
    const expected = createHash("sha256").update(data).digest("hex");
    expect(sha256(data)).toBe(expected);
  });
});