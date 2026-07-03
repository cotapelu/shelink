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
| src/server/matters/actions.ts | Large functions (>200 lines), permission checks may be inconsistent | TBD (audit pending) | 2025-07-03 (audit) | Audit all server actions, add missing assertion helpers, break large functions |
| src/lib/auth/options.ts | JWT HS256 (should be RS256) | HIGH (spoofing risk) | 2025-07-03 (audit) | Upgrade to RS256 algorithm, reduce session maxAge |
| src/proxy.ts | Rate limit exemptions create DoS vector | CRITICAL | 2025-07-03 (audit) | Remove exemptions, apply rate limiting to all `/api/*` |
| src/app/api/documents/[id]/download/route.ts | File download token validation? | TBD | 2025-07-03 (audit) | Ensure download links have short-lived signed tokens |
| src/lib/storage/file-validator.ts | MIME type validation bypass risk | MEDIUM | 2025-07-03 (audit) | Validate magic bytes, enforce whitelist, scan for viruses |

**Remediation Actions** (from Audit 2025-07-03):
- [ ] Audit ALL server actions for permission assertions (P1)
- [ ] Refactor God Functions >200 lines (P1)
- [ ] Upgrade JWT to RS256 (P1)
- [ ] Fix rate limit exemptions (P0)
- [ ] Implement per-user rate limiting (P1)
- [ ] Add DB transaction boundaries for multi-step operations (P1)
- [ ] Implement structured JSON logging (P2)
- [ ] Add circuit breaker for outbound calls (P2)
- [ ] Add DB indexes on frequently queried fields (Deadline.date, Hearing.startsAt, AuditLog) (P2)
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

**Debt Reduction Plan**:
- Week 1: Fix P0+P1 violations from audit (target Health 85)
- Week 2-3: Refactor God Objects (intake-sheet, procedure-content, client-sheet) → reduce complexity violations by 300
- Week 4: Add missing indexes, implement transactions → data integrity score 100
- Month 2: Establish observability (structured logs, metrics) → SRE readiness

---

## Recent Failures / Incidents

| Date | Area | Failure Mode | Root Cause | Fix Applied | Recurrence Risk |
|------|------|--------------|------------|-------------|-----------------|
| 2025-07-03 (audit) | Security | JWT HS256 allows token forgery if secret leaks | Default NextAuth config | Plan: upgrade to RS256 | LOW after fix |
| 2025-07-03 (audit) | Resilience | DoS possible via rate limit exemptions | Hardcoded bypass | Remove exemptions, add per-user limit | LOW after fix |
| 2025-07-03 (audit) | Authorization | Permission checks inconsistent across actions | Manual asserts, omissions | Audit all actions, wrapper middleware | MEDIUM until complete |

---

## Lessons Learned (from Audit)

1. **GOAL.md 10-dimension audit** revealed critical gaps that were not obvious from local testing.
2. **Security first**: JWT algorithm and rate limiting are foundational; deferring them creates systemic risk.
3. **Permission model complexity**: Having multiple assert functions (`assertCanAccess`, `assertCanModify`, `assertCanHandle`) is good, but must be used consistently. Need static analysis to enforce.
4. **Observability tooling cannot be afterthought**: Adding structured logging after codebase grows is major refactor. Should be integrated from start via shared logger.
5. **Health Score metric**: Combining coverage, complexity, duplication, tests gives single number that tracks well. Need automate calculation.
6. **Transaction boundaries**: Multi-step operations (convertIntakeToMatter) must be atomic. Prisma `$transaction` is easy but easy to forget.
7. **Function size limits**: 30 lines is aggressive but achievable with extraction. Larger functions correlate with lower coverage and more bugs.
8. **Compliance is cross-cutting**: GDPR data export, SOX audit trail, HIPAA encryption need early design, not bolt-on.

**Actionable takeaways for autonomous agent**:
- Run GOAL.md audit **every 2 weeks** (not just once)
- Prioritize **P0** fixes immediately (rate limiting, JWT)
- Refactor using **extract component/function** pattern (see existing refactor cycles for methodology)
- Maintain **Health Score** as KPI; improve 0.5%/week minimum
- Track **function size violations** and reduce by 5/week until ≤10 functions >30 lines

---

**Last Updated**: 2025-07-03 (Audit 1)
**Next Review**: 2025-07-10 (Weekly)
**Status**: 🔥 2 CRITICAL, 6 HIGH, 8 MEDIUM violations identified; Sprint 1 initiated
3. Unused imports/variables accumulate quickly; integrate a linter auto-fix in pre-commit.
4. Replacing `<img>` with `next/image` improves performance metrics and removes Next.js warnings.
5. Stub functions should use parameters in error messages to avoid unused variable warnings.

6. Wrapping frequently used functions in `useCallback` prevents exhaustive-deps warnings and optimizes renders.
7. Moving constant objects out of component bodies reduces GC pressure and satisfies dependency arrays.
8. Unused parameters: either consume (e.g., `void param`) or explicitly disable lint; `_` prefix alone insufficient by default.
9. Achieving zero lint warnings is possible via systematic batch cleanup and improves maintainability.

---

**Last Updated**: 2025-06-30 (Cycle 5 updates)  
**Next Review**: After 5 cycles or when failure rate >5%
