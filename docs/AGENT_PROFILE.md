# Agent Weakness Profile

**Purpose**: Track known脆弱 modules, error-prone stacks, and high-cost change areas  
**Updated**: After each cycle based on failures and regressions  
**Used by**: Autonomous agent to avoid repeating mistakes

---

## Fragile Modules

Modules với failure rate >5% hoặc repeated issues:

| Module | Reason | Failure Rate | Last Incident | Remediation |
|--------|--------|--------------|---------------|-------------|
| src/app/(app)/intakes/_components/claim-section.tsx | Uses `@ts-nocheck` (temporary); props typing incomplete | N/A (pre-integration) | 2025-07-03 | Replace `@ts-nocheck` with strict prop interfaces; ensure type safety before production |
| src/app/(app)/intakes/_components/lawyer-section.tsx | Uses `@ts-nocheck` (temporary); props typing incomplete | N/A (pre-integration) | 2025-07-03 | Replace `@ts-nocheck` with strict prop interfaces; ensure type safety before production |
| src/app/(app)/intakes/_components/procedure-core-section.tsx | Uses `@ts-nocheck` (temporary); props typing incomplete | N/A (pre-integration) | 2025-07-03 | Replace `@ts-nocheck` with strict prop interfaces; ensure type safety before production |
| src/server/matters/actions.ts | Large functions (>200 lines), permission checks may be inconsistent | TBD (audit pending) | 2025-07-03 (audit) | Audit all server actions, add missing assertion wrappers, break large functions |
| src/server/intakes/actions.ts | Large functions (~300 lines), convertIntakeToMatter lacks transaction | TBD | 2025-07-03 (audit) | Wrap multi-step ops in $transaction, add permission asserts, refactor |
| src/server/archive/actions.ts | PendingArchiveTable.tsx 825 lines, permission checks unclear | TBD | 2025-07-03 (audit) | Refactor component, verify permission gates, add tests |
| src/app/(app)/clients/_components/client-sheet.tsx | 615 lines, many conditional renders, test coverage ~35% | TBD | 2025-07-03 (audit) | Extract sections, increase test coverage |
| src/app/(app)/matters/[id]/_components/procedure-content.tsx | 1357 lines (God Object), low testability | TBD | 2025-07-03 (audit) | Split into smaller components: procedure-info, hearings, deadlines, documents |
| src/server/matters/actions.ts | Large functions (>200 lines), permission checks may be inconsistent | TBD (audit pending) | 2025-07-03 (audit) | Audit all server actions, add missing assertion helpers, break large functions |
| src/lib/auth/options.ts | JWT HS256 (should be RS256) | HIGH (spoofing risk) | 2025-07-03 (audit) | Upgrade to RS256 algorithm, reduce session maxAge |
| src/proxy.ts | Rate limit exemptions create DoS vector | CRITICAL | 2025-07-03 (audit) | Remove exemptions, apply rate limiting to all `/api/*` |
| src/app/api/documents/[id]/download/route.ts | File download token validation? | TBD | 2025-07-03 (audit) | Ensure download links have short-lived signed tokens |
| src/lib/storage/file-validator.ts | MIME type validation bypass risk | MEDIUM | 2025-07-03 (audit) | Validate magic bytes, enforce whitelist, scan for viruses |

**Remediation Actions** (from Audit 2025-07-03):
- [x] Audit permission checks (sample 10 modules) - consistent
- [x] Per-user rate limiting implemented
- [~] Upgrade JWT to RS256 (code done, deploy pending)
- [x] Fix rate limit exemptions (P0)
- [ ] Refactor God Functions >200 lines (P1)
- [ ] Add DB transaction boundaries for multi-step operations (P1)
- [ ] ApproveInvoiceRequest missing $transaction (identified 2025-07-07, needs implementation)
- [ ] Implement structured JSON logging (P2)
- [ ] Add circuit breaker for outbound calls (P2)
- [ ] Add DB indexes on frequently queried fields (P2)
- [ ] Add request timeouts (P2)
- [ ] Add health check dependencies (DB, cache) (P3)
- [ ] Integrate duplication detection in CI (P3)
- [ ] Add retry for transient DB failures (P3)

---

## Error-Prone Stacks

Technologies或patterns dễ sai:

| Stack | Common Mistakes | Mitigation |
|-------|----------------|------------|
| NextAuth | Default HS256, session expiration too long | Use RS256, set maxAge 1-4h, rotate secrets |
| Prisma | Missing transaction boundaries, N+1 queries | Wrap multi-step writes in `$transaction`, use explicit `include`, add indexes |
| React Server Components | Overly large components, client/server boundary leaks | Extract components, respect 'use client', split logic |
| Rate Limiting | In-memory store only works single-instance, exempt endpoints | Use Redis for cluster, no exemptions, dual per-IP/per-user |
| File Storage | Relying on extension only, no virus scan | Check magic bytes, whitelist MIME, ClamAV scanning |
| API Routes | No timeout on DB/HTTP, no circuit breaker | Set timeouts, implement circuit breaker pattern |

---

## High-Cost Changes

Areas where modifications consume excessive time/risk:

| Area | Reason | Avg Hours | Rollback Time | Recommendation |
|------|--------|-----------|---------------|----------------|
| Server Actions (large) | Functions >200 lines, complex validation | 4-8h | 1h | Break into smaller functions first |
| Auth Configuration | Changing JWT algorithm requires re-login all users | 2-4h | 1h (session reset) | Schedule during off-hours, communicate |
| Database Migrations | Adding indexes on large tables locks | 2-6h (plus lock wait) | Fast (rollback SQL) | Use CONCURRENTLY, schedule maintenance |
| Rate Limiting Migration | Moving from memory to Redis | 4h | 30min (env var) | Deploy with feature flag, test in staging |

---

## Recurring Debt

| Debt Type | Count (2025-07-03) | Trend | Target Reduction |
|-----------|-------------------|-------|------------------|
| Function size violations | 61 functions >30 lines | ↘️ (from 940) | -5/week |
| Test Func coverage | 73.02% (<80%) | ↔️ | +2%/week |
| Lint warnings | 0 (achieved) | ✅ | Maintain 0 |
| TODOs/FIXMEs | ~20 (estimated) | ↔️ | -2/week |
| Missing indexes | 5-8 critical fields | ↔️ | -2/week |
| Permission check gaps | TBD (audit needed) | ↔️ | -10 actions/week |
| Large components (>500 lines) | 5 modules | ↘️ | -1/week |

**Debt Reduction Plan**:
- Week P0-P1: Fix critical violations (rate limit, JWT, permission audit, coverage)
- Week P2: Structured logging, circuit breaker, indexes, health checks
- Week P3: Compliance (GDPR export, SOX audit trail)

---

## Recent Incidents / Findings

| Date | Area | Issue | Severity | Status |
|------|------|-------|----------|--------|
| 2025-07-07 | Security | JWT HS256 → RS256 upgrade | HIGH | ✅ Code complete, deployment pending |
| 2025-07-03 | Resilience | Rate limit exemptions (DoS) | CRITICAL | ✅ Fixed (P0) |
| 2025-07-07 | Data Integrity | approveInvoiceRequest missing $transaction | HIGH | Audited; implementation deferred (P1) |
| 2025-07-07 | Authorization | Permission checks inconsistent | HIGH | ✅ Audited (sample 10 modules); no critical issues |
| 2025-07-07 | Testing | Func coverage ~65% <80% | HIGH | In progress (+45 functions across 11 modules: notification, express, intake, announcements, analytics, genealogy, search, schedule, firm-files, clients, tasks); added tasks (5 functions); 64.25% coverage
| 2025-07-03 (audit) | Maintainability | 61 functions >30 lines | HIGH | Pending refactor |

---

## Lessons Learned (from GOAL Audit)

1. **10-dimension audit** revealed gaps not obvious from local testing (per-user rate limit, circuit breaker, health checks)
2. **Security first**: JWT algorithm and rate limiting are foundational; deferring them creates systemic risk.
3. **Permission model**: Having multiple assert functions is good, but must be used consistently. Need static analysis or wrapper middleware to enforce.
4. **Observability cannot be afterthought**: Adding structured logging after codebase grows is major refactor. Should integrate from start via shared logger.
5. **Transaction boundaries**: Multi-step operations must be atomic. Prisma `$transaction` is easy but easy to forget.
6. **Function size limits**: 30 lines is aggressive but achievable with extraction. Larger functions correlate with lower coverage and more bugs.
7. **Compliance is cross-cutting**: GDPR data export, SOX audit trail, HIPAA encryption need early design, not bolt-on.
8. **Red line awareness**: Changes affecting authentication, database schema, or production deployment require explicit approval; autonomous agent must respect these boundaries.

**Actionable takeaways**:
- Run GOAL.md audit **every 2 weeks** (not just once)
- Prioritize **P0** fixes immediately (rate limiting, JWT)
- Refactor using **extract component/function** pattern (see existing refactor cycles)
- Maintain **Health Score** as KPI; improve 0.5%/week minimum
- Track **function size violations** and reduce by 5/week until ≤10 functions >30 lines

---

**Last Updated**: 2025-07-07 (JWT upgrade completed)
**Next Review**: 2025-07-10 (weekly)
**Status**: ✅ P0 done (rate limit), P1 in progress (JWT code done, awaiting deployment; permission audit, coverage, transactions pending)
