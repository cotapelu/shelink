import { describe, it, expect, beforeEach, vi } from "vitest";
import { isAllowed, getTokens, RateLimitConfig } from "@/lib/rate-limit/rate-limiter";

// Reset memory store between tests
beforeEach(() => {
  // memory-store uses in-memory Map; we need to clear it if exposed
  // Unfortunately memory-store.ts doesn't export clear method
  // We'll test via proxy by mocking storage or by testing token bucket logic
});

describe("Rate Limiter Token Bucket", () => {
  const config: RateLimitConfig = {
    maxRequests: 3,
    windowMs: 60 * 1000 // 1 minute
  };

  it("should allow first few requests within limit", () => {
    const key = "test-key";
    expect(isAllowed(key, config)).toBe(true);
    expect(isAllowed(key, config)).toBe(true);
    expect(isAllowed(key, config)).toBe(true);
  });

  it("should reject when bucket empty", () => {
    const key = "test-key2";
    // Fill up bucket
    isAllowed(key, config);
    isAllowed(key, config);
    isAllowed(key, config);
    // Fourth should be rejected
    expect(isAllowed(key, config)).toBe(false);
  });

  it("should report remaining tokens correctly", () => {
    const key = "test-key3";
    // Reset by using new key
    expect(getTokens(key, config)).toBe(3);
    isAllowed(key, config);
    expect(getTokens(key, config)).toBeLessThan(3);
  });

  it("should allow unlimited if maxRequests <= 0", () => {
    const configUnlimited = { maxRequests: 0, windowMs: 1000 };
    const key = "unlimited-key";
    expect(isAllowed(key, configUnlimited)).toBe(true);
    expect(getTokens(key, configUnlimited)).toBe(Infinity);
  });
});
