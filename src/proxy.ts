import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isAllowed, getTokens, RateLimitConfig } from "@/lib/rate-limit/rate-limiter";
import { generateCorrelationId } from "@/lib/telemetry/correlation-id";
import { authOptions } from "@/lib/auth/options";


/**
 * Combined authentication + rate limiting middleware
 *
 * Next.js 16 uses proxy.ts instead of middleware.ts
 * This proxy composes:
 *  1. Rate limiting (Token Bucket) for API routes
 *  2. Authentication via next-auth
 *
 * Rate limit: 100 requests per minute per IP (per endpoint)
 * Excluded: /api/health, /api/auth/* (public endpoints)
 */

const RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000
};

function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return request.headers.get("host") || "unknown";
}

export default async function proxy(request: Request) {
  const url = new URL(request.url);
  const correlationId = generateCorrelationId();

  // Get session (if available) to include userId in rate limit key
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  // Apply rate limiting to all API routes (excluding health & auth)
  if (
    url.pathname.startsWith("/api/") &&
    !url.pathname.startsWith("/api/health") &&
    !url.pathname.startsWith("/api/auth")
  ) {
    const identifier = getClientIdentifier(request);
    // Per-user rate limiting: if user logged in, use userId as primary key; else fallback to IP-only
    const key = userId ? `${userId}:${url.pathname}` : `${identifier}:${url.pathname}`;

    if (!isAllowed(key, RATE_LIMIT_CONFIG)) {
      return NextResponse.json(
        {
          error: "rate_limit_exceeded",
          message: "Too many requests. Please slow down.",
          retryAfter: Math.floor(RATE_LIMIT_CONFIG.windowMs / 1000)
        },
        { status: 429 }
      );
    }
  }

  // Always apply authentication via next-auth
  const authMiddleware = withAuth({ pages: { signIn: "/login" } }) as (req: Request) => Promise<Response>;
  const response = await authMiddleware(request);

  // If rate limiting was applied (and not rejected), add headers to successful responses
  if (
    url.pathname.startsWith("/api/") &&
    !url.pathname.startsWith("/api/health") &&
    !url.pathname.startsWith("/api/auth")
  ) {
    const identifier = getClientIdentifier(request);
    const key = userId ? `${userId}:${url.pathname}` : `${identifier}:${url.pathname}`;
    const remaining = getTokens(key, RATE_LIMIT_CONFIG);
    const resetTime = Math.floor(Date.now() / 1000) + Math.floor(RATE_LIMIT_CONFIG.windowMs / 1000);

    response.headers.set("X-RateLimit-Limit", RATE_LIMIT_CONFIG.maxRequests.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", resetTime.toString());
    response.headers.set("Retry-After", Math.floor(RATE_LIMIT_CONFIG.windowMs / 1000).toString());
    response.headers.set("X-Correlation-ID", correlationId);
  }

  return response;
}

// Note: No exported config matcher - Next.js 16 proxy applies globally
// Public routes are exempted in the logic above (health, auth)
