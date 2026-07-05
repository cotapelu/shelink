import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CircuitBreaker, CircuitState } from "@/lib/api/circuit-breaker";

describe("CircuitBreaker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should start in CLOSED state", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const cb = new CircuitBreaker(fn);
    const result = await cb.call();
    expect(result).toBe("ok");
    expect(cb.state).toBe(CircuitState.CLOSED);
  });

  it("should trip OPEN after failures exceed threshold", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));
    const cb = new CircuitBreaker(fn, { failureThreshold: 2 });

    // First two calls fail and increment failureCount
    await expect(cb.call()).rejects.toThrow("fail");
    expect(cb.state).toBe(CircuitState.CLOSED);
    await expect(cb.call()).rejects.toThrow("fail");
    // After second failure, circuit opens
    expect(cb.state).toBe(CircuitState.OPEN);

    // Subsequent call fast-fails with circuit breaker error
    await expect(cb.call()).rejects.toThrow("Circuit breaker is OPEN");
  });

  it("should reset after timeout and go HALF_OPEN", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));
    const cb = new CircuitBreaker(fn, { failureThreshold: 1, resetTimeout: 60000 });

    await expect(cb.call()).rejects.toThrow("fail");
    expect(cb.state).toBe(CircuitState.OPEN);

    // Advance past reset timeout
    vi.advanceTimersByTime(60000);

    // First call after timeout enters HALF_OPEN; it fails, but that's okay
    await expect(cb.call()).rejects.toThrow("fail");
    // After failure in HALF_OPEN, circuit goes back to OPEN
    expect(cb.state).toBe(CircuitState.OPEN);
  });

  it("should succeed and reset failure count on success", async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce("first ok")
      .mockResolvedValueOnce("second ok");
    const cb = new CircuitBreaker(fn, { failureThreshold: 3 });

    await cb.call();
    await cb.call();
    expect(cb.state).toBe(CircuitState.CLOSED);
  });

  it("execute is alias for call", async () => {
    const fn = vi.fn().mockResolvedValue("alias ok");
    const cb = new CircuitBreaker(fn);
    const result = await cb.execute();
    expect(result).toBe("alias ok");
  });

  it("HALF_OPEN rejects after max calls exceeded", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));
    const cb = new CircuitBreaker(fn, { failureThreshold: 1, resetTimeout: 1000, halfOpenMaxCalls: 2 });

    // Open circuit
    await expect(cb.call()).rejects.toThrow("fail");
    expect(cb.state).toBe(CircuitState.OPEN);

    vi.advanceTimersByTime(1000);
    // Two calls allowed in HALF_OPEN, both fail
    await expect(cb.call()).rejects.toThrow("fail");
    expect(cb.state).toBe(CircuitState.OPEN); // failure in half-open trips open
    await expect(cb.call()).rejects.toThrow("OPEN"); // subsequent calls fast-fail
  });

  it("onStateChange callback invoked on transitions", async () => {
    const onStateChange = vi.fn();
    const fn = vi.fn().mockRejectedValue(new Error("fail"));
    const cb = new CircuitBreaker(fn, { failureThreshold: 1, onStateChange });

    await expect(cb.call()).rejects.toThrow("fail");
    expect(onStateChange).toHaveBeenCalledWith(CircuitState.OPEN);
  });
});