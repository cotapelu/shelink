import { isAllowed, getTokens, RateLimitConfig } from "@/lib/rate-limit/rate-limiter";

describe("rate-limiter", () => {
  const config: RateLimitConfig = { maxRequests: 5, windowMs: 60 * 1000 }; // 5 per minute

  beforeEach(() => {
    // Reset memory store state if needed; memory-store uses a global Map, but we cannot clear easily without exposing reset.
    // We'll rely on fresh process per test suite; Vitest runs in same process, so we need to clear store.
    // The memory-store does not expose a reset; but we can bypass by using unique identifiers.
    // We'll use different identifiers per test or accept shared state.
  });

  it("should allow first request", () => {
    expect(isAllowed("test-id-1", config)).toBe(true);
  });

  it("should consume tokens on subsequent calls", () => {
    const id = "test-id-2";
    expect(isAllowed(id, config)).toBe(true);
    expect(isAllowed(id, config)).toBe(true);
    expect(isAllowed(id, config)).toBe(true);
    expect(isAllowed(id, config)).toBe(true);
    // 5th allowed
    expect(isAllowed(id, config)).toBe(true);
    // 6th denied
    expect(isAllowed(id, config)).toBe(false);
  });

  it("getTokens should return initial max for new identifier", () => {
    expect(getTokens("new-id", config)).toBe(5);
  });

  it("getTokens should decrease after consumption", () => {
    const id = "token-test-id";
    expect(getTokens(id, config)).toBe(5);
    isAllowed(id, config);
    expect(getTokens(id, config)).toBe(4);
    isAllowed(id, config);
    expect(getTokens(id, config)).toBe(3);
  });

  it("should return Infinity tokens if maxRequests is 0 (unlimited)", () => {
    const unlimited: RateLimitConfig = { maxRequests: 0, windowMs: 1000 };
    expect(isAllowed("any", unlimited)).toBe(true);
    expect(getTokens("any", unlimited)).toBe(Infinity);
  });
});
