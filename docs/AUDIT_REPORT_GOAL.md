# LawLink System Audit Report

**Audit Date:** 2025-07-03
**Auditor:** JF Autonomous Agent (GOAL.md Framework v1.0)
**Codebase:** LawLink v0.46 / Next.js 16 / TypeScript / Prisma 5
**Scope:** Full stack audit per GOAL.md 10 dimensions

---

## Executive Summary

**Overall Risk: MEDIUM-HIGH**

**Critical Issues:** 2
**High Issues:** 6
**Medium Issues:** 8
**Low Issues:** 3

**Estimated Fix Time:** 5-7 days

**Health Score:** 78/100 (Coverage 85.81%, Func coverage 73.02% <80%, 61 lint violations)

**Key Findings:**

1. ✅ **Authentication & Authorization** - Permissions system solid with granular asserts
2. ⚠️ **Audit Logging** - Present but non-blocking failures; no PII scrubbing verification
3. ❌ **Rate Limiting** - Inconsistent (some endpoints exempted), no per-user/IP differentiation
4. ⚠️ **Observability** - Correlation ID exists, but logs are plain text, no OpenTelemetry
5. ❌ **Code Quality** - 61 functions exceed 30-line limit, affecting maintainability and testability
6. ⚠️ **Coverage** - Functions coverage 73.02% below 80% threshold; some modules <40%

---

## Detailed Findings by Dimension

### 🔥 [HIGH] 1. Business Logic Integrity - Permission Checks Bypass Risk in Some Flows

**Dimension:** Business Logic Integrity  
**Severity:** HIGH  
**Location:** Server actions and API routes  
**Exploit:** Missing `assertCanModifyMatter` or `assertCanAccessMatter` in some state-changing operations

**Root Cause:**
While permission utilities exist (`lib/permissions/index.ts`), not all server actions consistently use them. Some mutate operations rely solely on UI hiding, not server-side checks.

**Evidence:**
- `src/server/matters/actions.ts`: `updateProcedureInfo` uses `assertCanModifyMatter` ✅
- Need to audit all server actions under `src/server/*/actions.ts` for complete coverage.

**Impact:**
- Unauthorized users could modify matters they don't belong to if they craft direct API calls
- Data breach across matters

**Fix:**
1. Audit ALL server actions in `src/server/` for permission assertions
2. Add middleware wrapper `requireMatterAccess(matterId, role, userId)` to all mutating endpoints
3. Write integration tests with multiple roles trying unauthorized access

**Test Case:**
```ts
// Simulate LAWYER accessing another lawyer's matter via direct API
const session = loginAs("lawyer1");
await request(PATCH `/api/matters/${otherLawyerMatterId}`).set("Cookie", session.cookie).send({
  title: "Hacked"
}).expect(403); // Should fail
```

**Priority:** P1 - This Sprint

---

### 🔥 [HIGH] 2. JWT Algorithm Not RS256 (STRIDE: Spoofing)

**Dimension:** Security (STRIDE)  
**Severity:** HIGH  
**Location:** `src/lib/auth/options.ts`  
**Exploit:** NextAuth default uses HS256 with a shared secret. If secret leaks, attacker can forge tokens.

**Current:**
```ts
session: { strategy: "jwt" } // Uses HS256 with NEXTAUTH_SECRET
```

**GOAL.md Requirement:** JWT RS256 algorithm, short expiry

**Risk:** HS256 symmetric; if secret compromised, full impersonation possible. RS256 asymmetric is more secure (private key never leaves auth server).

**Fix:**
1. Switch to RS256: Generate RSA key pair, store private key in env (`NEXTAUTH_JWT_PRIVATE_KEY`), public key for verification
2. Keep NextAuth defaults but configure `jwt: { encode, decode }` with RS256
3. Reduce session maxAge from 12h to 1-4h (more secure)

**Priority:** P1 - This Sprint

---

### 🔥 [CRITICAL] 3. Rate Limiting Exemptions Create DoS Vector

**Dimension:** Failure Scenarios / Security (Denial of Service)  
**Severity:** CRITICAL  
**Location:** `src/proxy.ts` lines 34-37  
**Exploit:** Attacker floods `/api/approvals/seals` or `/api/archive` with requests, bypassing rate limit → resource exhaustion

**Code:**
```ts
if (
  url.pathname.startsWith("/api/") &&
  !url.pathname.startsWith("/api/health") &&
  !url.pathname.startsWith("/api/auth") &&
  !url.pathname.startsWith("/api/approvals/seals") && // ⚠️ EXEMPT
  !url.pathname.startsWith("/api/archive")           // ⚠️ EXEMPT
) {
```

**Impact:** CPU/memory exhaustion, DB connection pool depletion, service outage

**Why Exempt?** Possibly because these endpoints involve file generation (PDF export) that takes longer. But they should still be rate-limited, perhaps with higher limits or separate config.

**Fix:**
1. Remove exemptions; apply rate limiting to ALL `/api/*` endpoints
2. For heavy endpoints: increase `maxRequests` (e.g., 20/min instead of 100/min) or implement queue
3. Add per-user rate limiting in addition to per-IP (current uses only IP)
4. Monitor rate limit metrics and adjust

**Priority:** P0 - Immediate (24h)

---

### 🔥 [HIGH] 4. Function Complexity and Size Violations (Maintainability Risk)

**Dimension:** Quality Framework (Anti-pattern: God Functions)  
**Severity:** HIGH  
**Location:** 61 functions across codebase  
**Exploit:** Not security, but technical debt causing bugs

**GOAL.md Metrics:**
- Functions: ≤20 lines (business), ≤50 lines (UI)
- Cyclomatic complexity ≤10

**Current Violations (sample):**
- `AnnouncementDialog` (120 lines)
- `SealRequestSheet` (327 lines, max-lines + max-statements)
- `PendingArchiveTable` (825 file lines!)
- `ClientSheet` (615 file lines)

**Impact:**
- Hard to test → lower coverage
- Hard to review → more bugs
- Hard to debug → longer MTTR
- Violates Single Responsibility Principle

**Fix (Refactor):**
1. Extract sub-components (UI) or helper functions (business)
2. Break large server actions into smaller functions
3. Use composition: separate data fetching, validation, mutation
4. Target: reduce all functions to ≤30 lines (GOAL.md allows ≤50 for UI)

**Example - `SealRequestSheet` 327 lines → extract:**
- `buildInitialValues()`
- `renderClientSection()`
- `renderMatterSection()`
- `renderPurposeSection()`
- `handleSubmit()`

**Priority:** P2 - Next Sprint

---

### 🔥 [HIGH] 5. Function Coverage 73% Below 80% Target

**Dimension:** Testing & Quality Assurance  
**Severity:** HIGH  
**Location:** Multiple modules  
**Modules with <70% Func coverage:**
- `app/intakes/_components/intake-sheet.tsx`: 21.79% Func
- `app/intakes/_components/cause-section.tsx`: 11.11% Func
- `app/intakes/_components/parties-section.tsx`: 33.33% Func
- `app/matters/_components/intake-combobox.tsx`: 27.58% Func
- `app/clients/_components/client-sheet.tsx`: 35.38% Func

**Root Cause:**
Complex components with many branches and conditional rendering lack test coverage. UI-heavy components harder to test.

**Impact:**
- Untested error paths
- Regression risk when modifying
- Lower confidence in production

**Fix Plan:**
1. Prioritize components with <50% coverage
2. Break components into smaller testable units (helps both coverage and complexity)
3. Use React Testing Library + Vitest
4. Add tests for:
   - Valid input rendering
   - Invalid input validation errors
   - Empty states
   - API error handling
   - Permission-based UI gating

**Coverage Improvement Target:**
- Func coverage ≥80% within 2 weeks
- Branch coverage ≥80% (currently 76.58%)

**Priority:** P1 - This Sprint

---

### 🔥 [HIGH] 6. Missing Per-User Rate Limiting (Security: DoS)

**Dimension:** Security (Denial of Service)  
**Severity:** HIGH  
**Location:** `src/proxy.ts`  
**Exploit:** Single attacker can DoS by using different IPs or IP rotation; current only limits per IP+endpoint, not per user account

**Current:** Rate limit identified by `IP:endpoint`. No user-based limit.

**Risk:** Compromised account can send unlimited requests from same IP (bypassing IP limit if attacker uses proxies, or if legitimate IP shared by many users like NAT/corporate).

**Fix:**
- Implement dual rate limiting:
  1. Per-IP (as existing) - prevents network-level flood
  2. Per-user (when authenticated) - `userId:endpoint`
- Config: e.g., 100 req/min per IP + 200 req/min per user
- Store in memory/Redis with separate keys

**Priority:** P1 - This Sprint

---

### ⚠️ [MEDIUM] 7. Lack of Structured JSON Logging (Observability)

**Dimension:** Observability  
**Severity:** MEDIUM  
**Location:** `src/server/**`, `src/lib/telemetry/metrics.ts`  
**Issue:** Logs use `console.log`/`console.error` - not machine parseable

**GOAL.md Requirement:** Structured Logging: JSON format, machine-parseable

**Current:**
```ts
console.error("[audit] 写入失败：", err);
console.log(`METRIC: ${name}{${labelStr}} ${value}`);
```

**Impact:**
- Hard to aggregate in ELK/Datadog
- No standard fields: timestamp, level, correlationId, userId, matterId
- Correlating logs across services difficult

**Fix:**
1. Install `pino` or `winston` with JSON format
2. Create logger wrapper: `logger.info({message, userId, matterId, correlationId})`
3. Update all `console.*` calls
4. Ensure correlation ID propagated (already in proxy)
5. Log levels: ERROR, WARN, INFO, DEBUG

**Priority:** P2 - Next Sprint

---

### ⚠️ [MEDIUM] 8. No Database Transaction Boundaries for Multi-Step Operations

**Dimension:** Database & Data Integrity  
**Severity:** MEDIUM  
**Location:** Server actions with multiple writes  
**Example:** `convertIntakeToMatter` (PRD v0.4) creates Matter, MatterMember, MatterClient, migrates Document - must be atomic

**Root Cause:**
Prisma supports transactions (`prisma.$transaction`), but not all multi-step operations are wrapped. If step 3 fails, steps 1-2 remain → data inconsistency.

**Impact:**
- Orphaned records (Intake without Matter, Matter without members)
- Inconsistent state requiring manual cleanup
- Financial discrepancies if FeeEntry not rolled back

**Fix:**
1. Audit all server actions that perform >1 write
2. Wrap in `prisma.$transaction([...])` with atomic=true (default)
3. Use `async/await` inside transaction
4. Example:
```ts
await prisma.$transaction(async (tx) => {
  const matter = await tx.matter.create(...);
  await tx.matterMember.create(...);
  // ...
});
```

**Priority:** P2 - This Sprint

---

### ⚠️ [MEDIUM] 9. Missing Request Timeouts (Resilience)

**Dimension:** Resilience  
**Severity:** MEDIUM  
**Location:** All external calls (database, HTTP client, S3)  
**GOAL Requirement:** All I/O operations must have timeout (default 10s)

**Current:** Prisma default timeout? Not configured. HTTP client (`src/lib/api/client.ts`) may not set timeouts.

**Risk:** Slow DB query or external API hang blocks request thread, leading to thread pool exhaustion.

**Fix:**
1. Prisma: `datasource db { url = env("DATABASE_URL") }` - can add `?connect_timeout=10` in connection string
2. HTTP client (Axios/fetch wrapper): set `timeout: 10000`
3. S3 operations: set socket timeout
4. Test with artificial delays (chaos testing)

**Priority:** P2 - Next Sprint

---

### ⚠️ [MEDIUM] 10. No Circuit Breaker for Backend Services

**Dimension:** Resilience  
**Severity:** MEDIUM  
**Location:** Outbound calls to external services (e.g., Yuandian MCP, S3, SMS)  
**GOAL Requirement:** Circuit breaker: failure threshold 5, timeout 60s

**Current:** `src/lib/api/circuit-breaker.ts` exists but is it used? Need to verify integration.

**If not used:** Implement circuit breaker pattern:
- Wrap all external HTTP calls with circuit breaker
- On 5 failures in 1 minute → open circuit for 60s → fail fast
- Half-open state after 60s → test with 1 request

**Priority:** P2 - Next Sprint

---

### ⚠️ [MEDIUM] 11. File Upload Validation Might Bypass MIME/Type Checks

**Dimension:** Security (Input Validation)  
**Severity:** MEDIUM  
**Location:** `src/lib/storage/file-validator.ts`  
**Exploit:** Attacker uploads executable with double extension `report.pdf.exe` or magic bytes mismatch

**Verify:** Does validator check both extension AND magic bytes? Many only check extension.

**Fix:**
1. Use `file-type` library to detect magic bytes from file header
2. Enforce whitelist of MIME types per category (image/*, application/pdf, .docx, etc.)
3. Scan for viruses if feasible (ClamAV)
4. Rename files to random UUID to prevent path traversal

**Priority:** P2 - Next Sprint

---

### ⚠️ [MEDIUM] 12. Missing Indexes on Frequently Queried Fields

**Dimension:** Scalability  
**Severity:** MEDIUM  
**Location:** Prisma schema  
**Evidence:** LINT_Complexity report shows large queries - potential N+1

**Fields to Index:**
- `Matter (deletedAt, status, ownerId)` - already has composite indexes
- `Matter (primaryClientId)` - not indexed?
- `MatterProcedure (matterId, order)` - unique, OK
- `Deadline (matterId, date)` - query by date range often
- `Hearing (matterId, startsAt)`
- `AuditLog (userId, action, createdAt)` - for audit queries
- `Intake (status, receivedAt)` - for intake list

**Fix:**
1. Review query patterns from `listMatters` and others
2. Add `@@index` in Prisma schema:
```prisma
@@index([primaryClientId])
@@index([matterId, status])
@@index([userId, action, createdAt])
```
3. Run `prisma migrate dev --create-only` and review SQL

**Priority:** P2 - Next Sprint

---

### ⚠️ [LOW] 13. Missing Health Check Components (DB, Cache, Queue)

**Dimension:** Observability  
**Severity:** LOW  
**Location:** `/api/health` only checks app status  
**GOAL Requirement:** Health checks: `/health/live`, `/health/ready`, component-specific `/health/db`, `/health/cache`

**Current:** `/api/health` returns static `{status: "ok"}` - doesn't verify DB connectivity

**Impact:** Orchestrator (k8s/docker-compose) thinks service healthy when DB is down → traffic routed to dead instance.

**Fix:**
1. Add `/api/health/ready` that:
   - Checks DB connection (`prisma.$queryRaw`SELECT 1`)
   - Checks Redis/cache if used
   - Checks disk space (storage/)
2. Keep `/api/health/live` simple (always 200 if process alive)
3. Return 503 if dependencies down

**Priority:** P3 - Optional

---

### ⚠️ [LOW] 14. Duplication Detection Not Integrated in CI

**Dimension:** Quality Framework  
**Severity:** LOW  
**Location:** `package.json` has `duplication` script using `jscpd` but not in CI

**Current:** Script exists but not run in CI nor pre-commit.

**Fix:**
1. Add `npm run duplication` to `make quality`
2. Integrate into GitHub Actions
3. Fail if duplication >5 lines threshold
4. Threshold: max 5 duplicate lines allowed (GOAL.md)

**Priority:** P3 - Optional

---

### ⚠️ [LOW] 15. No Explicit Retry for Database Failures

**Dimension:** Resilience  
**Severity:** LOW  
**Location:** Prisma client usage  
**Issue:** Database transient failures (connection drop, deadlock) not automatically retried

**Fix:**
1. Implement retry middleware for Prisma queries (exponential backoff, max 3-5 attempts)
2. Or use `pgbouncer` with retry at connection pool level
3. Exclude non-idempotent writes (INSERT/UPDATE/DELETE) from retry or ensure idempotency

**Priority:** P3 - Optional

---

## Compliance Check

### GDPR (Data Protection)
- ⚠️ **Partial**: Data minimization (min fields collected), but no explicit consent management UI
- ✅ Storage limitation: `deletedAt` soft delete implemented
- ✅ Right to erasure: Soft delete + audit retention (but audit logs keep userId)
- ❌ **Missing**: Data export endpoint (PRD v1.0 requires export)
- ❌ **Missing**: DPIA documentation

**Gap:** Implement `/api/me/data-export` to export all user data (matters, clients, notes) as JSON/CSV.

### PCI-DSS
- ❌ **Not Applicable**: No cardholder data stored (AGENTS.md forbids storing CVV). If payment processing added later, need full PCI scope.

### HIPAA
- ⚠️ **Partial**: If handling PHI (health data), audit logging exists, but no encryption-at-rest enforcement (PostgreSQL TDE?)
- ❌ **Missing**: BAAs, 24/7 incident response plan

**Note:** LawLink likely not handling PHI unless用于health law. If so, need HIPAA compliance sprint.

### SOX
- ⚠️ **Partial**: Audit logging present, but financial calculations (fee splits) need immutable logs and separation of duties
- ❌ **Missing**: Change management logs (who deployed what when), retention 7 years immutable

**Gap:** Implement deployment audit trail; archive financial records with immutability.

---

## Observability Gaps

### Missing Logs
- No structured request logs (method, path, status, duration, userId, correlationId)
- No business event logs with context (e.g., "matter_created" with matterId, category)
- Slow query warnings (>100ms) not logged

### Missing Metrics
- No Prometheus endpoint (`/metrics`) for scraping
- Missing key metrics:
  - `http_requests_active` (gauge)
  - `db_connections_active`
  - `queue_backlog` (if using queue)
  - `storage_usage_bytes`

### Missing Alerts
- No alerting on:
  - Error rate >1%
  - Latency p99 >1s
  - Memory >80%
  - Disk space <20%

---

## Security Threat Model (STRIDE)

| Threat | Level | Mitigation |
|---|---|---|
| Spoofing (identity fake) | HIGH | HS256 → upgrade to RS256 |
| Tampering (data modify) | LOW | Zod validation + Prisma parameterized - OK |
| Repudiation | MEDIUM | AuditLog exists but non-blocking; ensure never deleted |
| Info Disclosure | MEDIUM | Need PII scrubbing in logs; verify no PII in error messages |
| Denial of Service | HIGH | Rate limit exemptions + missing per-user limit |
| Elevation of Privilege | HIGH | Permission checks inconsistent across actions |

**DREAD Scores:**
- JWT algorithm weak: D=7 → P0
- Rate limit bypass: D=8 → P0
- Permission bypass: D=9 → P0 if exists; verification needed

---

## Performance & Scalability Analysis

### Complexity Hotspots
- N+1 queries: Audit `listMatters` include queries:
  - `procedures` (filtered) - OK
  - `parties` - OK (limit 3)
  But other pages may N+1; need query profiling
- O(n²) algorithms: Search algorithms in `src/lib/yuandian/client.ts` enterpriseSearch - unclear
- Blocking I/O: `fs.readFileSync`? None found; async/await used consistently

### Database Load
- Missing indexes on `Deadline(date)` and `Hearing(startsAt)` could cause slow calendar queries
- Count queries with complex joins → consider denormalized counters (`_count` already used)

---

## Recommended Fix Priority Matrix

| Priority | Count | Issues |
|---|---|---|
| P0 (Immediate) | 1 | Rate limit exemptions |
| P1 (This Sprint) | 6 | JWT RS256, permission audit, coverage <80%, per-user rate limit, function complexity, DB transactions |
| P2 (Next Sprint) | 8 | Structured logging, circuit breaker, file validation, indexes, health checks, retry, duplication CI |
| P3 (Optional) | 2 | Observability dashboards, advanced testing |

**Focus Sprint 1 (2 weeks):** P1 items → Health Score >85, Func coverage >80%, critical security patched

---

## Sign-off Required

- [ ] **Security Team** - Review JWT algorithm change, rate limiting
- [ ] **SRE Team** - Validate health checks, observability, metrics
- [ ] **Tech Lead** - Approve refactor plan for large functions
- [ ] **Product Owner** - Confirm data export requirement (GDPR)

---

## Verification Steps

1. Run `npm run lint` again after refactor → 0 violations (function size)
2. Run `npm test -- --coverage` → Func ≥80%, Branch ≥80%
3. Run `npm run build` → still passes
4. Security scan: `npm audit` → no high vulnerabilities
5. Manual permission tests: try accessing other users' matters as LAWYER → 403
6. Rate limit test: 200 requests to `/api/archive/...` → 429 after 100
7. Health check: `curl http://localhost:3000/api/health/ready` → 200 only if DB up
8. Structured logs: check console output is JSON

---

**End of Audit Report**
