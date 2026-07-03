// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { isAllowed, getTokens } from "@/lib/rate-limit/rate-limiter";
import proxy from "@/proxy";

// Mock dependencies
vi.mock("@/lib/rate-limit/rate-limiter", () => ({
  isAllowed: vi.fn(() => true),
  getTokens: vi.fn(() => 100)
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn()
}));

vi.mock("next-auth/middleware", () => ({
  withAuth: vi.fn(() => (req: NextRequest) => Promise.resolve(new Response("OK")))
}));

vi.mock("@/lib/telemetry/correlation-id", () => ({
  generateCorrelationId: () => "corr-123"
}));

import { getServerSession } from "next-auth";

describe("Proxy - Per-User Rate Limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses userId in rate limit key when authenticated", async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: "user-123" } });

    const request = new Request("http://localhost:3000/api/test");
    await proxy(request);

    expect(isAllowed).toHaveBeenCalledWith(
      "user-123:/api/test",
      expect.any(Object)
    );
  });

  it("falls back to IP when not authenticated", async () => {
    (getServerSession as any).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4" }
    });
    await proxy(request);

    expect(isAllowed).toHaveBeenCalledWith(
      "1.2.3.4:/api/test",
      expect.any(Object)
    );
  });

  it("uses x-real-ip when x-forwarded-for missing", async () => {
    (getServerSession as any).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/test", {
      headers: { "x-real-ip": "5.6.7.8" }
    });
    await proxy(request);

    expect(isAllowed).toHaveBeenCalledWith(
      "5.6.7.8:/api/test",
      expect.any(Object)
    );
  });

  it("does not apply rate limiting to /api/health", async () => {
    (getServerSession as any).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/health");
    await proxy(request);

    expect(isAllowed).not.toHaveBeenCalled();
  });

  it("does not apply to /api/auth routes", async () => {
    (getServerSession as any).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/auth/signin");
    await proxy(request);

    expect(isAllowed).not.toHaveBeenCalled();
  });
});
