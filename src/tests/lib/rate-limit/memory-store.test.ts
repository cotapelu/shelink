import { describe, it, expect } from "vitest";
import { checkRateLimit, getRemainingTokens } from "@/lib/rate-limit/memory-store";

function makeKey() {
  return `test_${Math.random().toString(36).substr(2, 9)}`;
}

describe("memory-store rate limit", () => {
  describe("checkRateLimit", () => {
    it("allows first request with positive capacity", () => {
      const key = makeKey();
      expect(checkRateLimit(key, 5, 1)).toBe(true);
    });

    it("denies when capacity is zero", () => {
      const key = makeKey();
      expect(checkRateLimit(key, 0, 1)).toBe(false);
    });

    it("consumes tokens up to capacity then denies", () => {
      const key = makeKey();
      // capacity 3
      expect(checkRateLimit(key, 3, 1)).toBe(true);
      expect(checkRateLimit(key, 3, 1)).toBe(true);
      expect(checkRateLimit(key, 3, 1)).toBe(true);
      // exhausted
      expect(checkRateLimit(key, 3, 1)).toBe(false);
    });

    it("tracks separate keys independently", () => {
      const keyA = makeKey();
      const keyB = makeKey();

      // consume A to 0
      expect(checkRateLimit(keyA, 2, 1)).toBe(true);
      expect(checkRateLimit(keyA, 2, 1)).toBe(true);
      expect(checkRateLimit(keyA, 2, 1)).toBe(false);

      // B should still have full capacity
      expect(checkRateLimit(keyB, 3, 1)).toBe(true);
      expect(checkRateLimit(keyB, 3, 1)).toBe(true);
      expect(checkRateLimit(keyB, 3, 1)).toBe(true);
      expect(checkRateLimit(keyB, 3, 1)).toBe(false);
    });
  });

  describe("getRemainingTokens", () => {
    it("returns full capacity for unused key", () => {
      const key = makeKey();
      expect(getRemainingTokens(key, 10, 2)).toBe(10);
    });

    it("returns decreased tokens after consumption", () => {
      const key = makeKey();
      // consume 2 out of 5
      checkRateLimit(key, 5, 1);
      checkRateLimit(key, 5, 1);
      expect(getRemainingTokens(key, 5, 1)).toBe(3);
    });
  });
});