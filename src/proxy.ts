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
 *
 * Lưu ý auth: dự án dùng JWT RS256 tùy chỉnh (authOptions.jwt.encode/decode),
 * KHÔNG dùng next-auth `withAuth` — vì withAuth gọi next-auth/jwt `getToken`
 * với decode mặc định (jwtDecrypt/JWE), không đọc được token RS256-JWS,
 * khiến session hợp lệ vẫn bị coi là chưa đăng nhập.
 * Dùng getServerSession(authOptions) để đọc đúng token do chính mình ký.
 */

const RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000
};

/** Route không cần đăng nhập */
const PUBLIC_PATH_PATTERNS: RegExp[] = [
  /^\/login$/,
  /^\/api\/auth\//,
  /^\/api\/health$/,
  /^\/_next\//,
  /^\/favicon\.ico$/,
  /^\/static\//,
  /\.[a-zA-Z0-9]+$/ // tài nguyên tĩnh có phần mở rộng (.css/.js/.png/...)
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return request.headers.get("host") || "unknown";
}

/** Key rate limit: ưu tiên userId nếu đã đăng nhập, fallback IP */
function rateLimitKey(request: Request, pathname: string, userId?: string): string {
  const identifier = getClientIdentifier(request);
  return userId ? `${userId}:${pathname}` : `${identifier}:${pathname}`;
}

/** Response 429 khi vượt rate limit */
function tooManyRequestsResponse(): Response {
  return NextResponse.json(
    {
      error: "rate_limit_exceeded",
      message: "Too many requests. Please slow down.",
      retryAfter: Math.floor(RATE_LIMIT_CONFIG.windowMs / 1000)
    },
    { status: 429 }
  );
}

/** Gắn header rate limit cho response đi tiếp */
function withRateLimitHeaders(response: Response, key: string, correlationId: string): void {
  const remaining = getTokens(key, RATE_LIMIT_CONFIG);
  const resetTime = Math.floor(Date.now() / 1000) + Math.floor(RATE_LIMIT_CONFIG.windowMs / 1000);
  response.headers.set("X-RateLimit-Limit", RATE_LIMIT_CONFIG.maxRequests.toString());
  response.headers.set("X-RateLimit-Remaining", remaining.toString());
  response.headers.set("X-RateLimit-Reset", resetTime.toString());
  response.headers.set("Retry-After", Math.floor(RATE_LIMIT_CONFIG.windowMs / 1000).toString());
  response.headers.set("X-Correlation-ID", correlationId);
}

/** Đọc session NextAuth; route public thì bỏ qua (tiết kiệm 1 lần decode) */
async function readSession(isPublic: boolean) {
  const session = isPublic ? null : await getServerSession(authOptions);
  const userId = session && session.user ? session.user.id : undefined;
  return { session, userId };
}

/** Chưa đăng nhập → đá về /login, giữ callbackUrl */
function redirectToLogin(request: Request, callbackUrl: string): Response {
  const signInUrl = new URL("/login", request.url);
  signInUrl.searchParams.set("callbackUrl", callbackUrl);
  return NextResponse.redirect(signInUrl);
}

/** Kiểm tra 1 request: rate limit → auth → trả response (429/redirect/pass-through) */
async function gateRequest(request: Request, url: URL, isPublic: boolean, correlationId: string): Promise<Response> {
  const pathname = url.pathname;
  const { session, userId } = await readSession(isPublic);
  const isApiPath = pathname.startsWith("/api/") && !isPublic;
  const key = rateLimitKey(request, pathname, userId);

  if (isApiPath && !isAllowed(key, RATE_LIMIT_CONFIG)) {
    return tooManyRequestsResponse();
  }
  if (!isPublic && !session) {
    return redirectToLogin(request, pathname + url.search);
  }

  const response = NextResponse.next();
  if (isApiPath) {
    withRateLimitHeaders(response, key, correlationId);
  }
  return response;
}

export default async function proxy(request: Request) {
  const url = new URL(request.url);
  return gateRequest(request, url, isPublicPath(url.pathname), generateCorrelationId());
}
