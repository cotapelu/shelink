# Violations & Improvement Plan

**Generated**: 2025-06-30  
**Discovery Cycle**: Baseline  
**Framework**: AUTO-CONTINUE.md v2.2

---

## Summary

| Category | Count | Severity Distribution |
|----------|-------|-----------------------|
| Quality (CODE_SMELL) | 32 | Medium: 32 |
| Test Coverage Gap | 2 | High: 2 |
| Configuration | 1 | Low: 1 |
| **Total** | **35** | **Critical: 0, High: 2, Medium: 32, Low: 1** |

---

## Violations by Severity

### 🔴 CRITICAL (0)
*None*

### 🟠 HIGH (0)
*All HIGH violations resolved*

*Previously resolved:*
- HIGH-1: server/preservations/actions.ts ✅ (Sprint 1)
- HIGH-2: lib/telemetry/metrics.ts ✅ (Sprint 2)

---

### 🟡 MEDIUM (32)

#### Quality Warnings - Unused Variables

**Files affected** (23 files với unused imports/variables):

1. `src/app/(app)/clients/[id]/_components/__tests__/matters-section.test.tsx` - 'Matter' unused
2. `src/app/(app)/clients/_components/client-sheet.tsx` - 'watch' unused
3. `src/app/(app)/intakes/_components/intake-sheet.tsx` - 4 unused (useWatch, watchedTitle, causeName, titleTouched)
4. `src/app/(app)/matters/[id]/_components/finance-forms.tsx` - 'user' unused
5. `src/app/(app)/matters/[id]/_components/info-panel.tsx` - 2 unused (FinancePayload, clientContact)
6. `src/app/(app)/matters/[id]/_components/invoice-section.tsx` - 2 unused (FileText, Badge)
7. `src/app/(app)/matters/[id]/_components/matter-detail-tabs.tsx` - 5 unused (Info, folders, folderDocuments, templates, preservations)
8. `src/app/(app)/matters/[id]/_components/matter-preservation-panel.tsx` - 6 unused imports + 'isPending'
9. `src/app/(app)/matters/[id]/_components/procedure-documents-section.tsx` - 'counts' unused
10. `src/app/(app)/matters/[id]/_components/procedure-forms.tsx` - 5 issues (Upload, suggestHandlingAgency, procedureId, useEffect deps)
11. `src/app/(app)/matters/[id]/_components/procedure-info-panel.tsx` - 'Pencil' unused
12. `src/app/(app)/matters/_components/matters-table.tsx` - 'matterCategoryLabel' unused
13. `src/app/(app)/preservation/_components/preservations-view.tsx` - 5 unused (Link, RotateCw, e, isPending)
14. `src/app/(app)/preservations/page.tsx` - 'Button' unused
15. `src/app/(app)/seals/page.tsx` - 'Button' unused
16. `src/app/(app)/sms/page.tsx` - 'Button' unused
17. `src/app/actions/data.ts` - 2 unused (type, formData)
18. `src/app/actions/user.ts` - 4 unused (data, userId, role)
19. `src/app/config.ts` - anonymous default export (style)
20. `src/components/Avatar/Avatar.tsx` - using `<img>` instead of Next.js Image (performance)
21. `src/components/Table/Table.tsx` - React compilation warning (useMemo/useCallback compatibility)

**Impact**: Code bloat, potential confusion, maintenance overhead  
**Severity**: Medium (code quality, not functional)  
**Total**: ~40 individual warnings  
**Fix Strategy**: Remove unused imports/variables, fix anonymous exports, replace `<img>` with Image  
**Estimated Effort**: 8-12 hours  
**Priority**: P2

---

### 🟢 LOW (1)

#### LOW-1: Deprecated Next.js Config
- **File**: `next.config.mjs`
- **Issue**: `experimental.instrumentationHook` is no longer needed/invalid
- **Impact**: Warning at build time, potential future breakage
- **Fix**: Remove `instrumentationHook` from config
- **Effort**: 5 minutes
- **Priority**: P3

---

## Improvement Plan (Next 2 Weeks)

### Sprint 1: High-Priority Fixes (Days 1-5)

**Goal**: Eliminate HIGH violations, improve critical coverage

**Tasks**:

1. **[T] server/preservations/actions.ts: Add comprehensive unit tests**
   - Target: Branch coverage ≥80%
   - Strategy: Mock Prisma, test all branches, error paths
   - Subtasks:
     - Setup test fixtures and mocks (2h)
     - Test each action handler (12h)
     - Add integration tests (2h)
   - Estimated: 16h

2. **[T] lib/telemetry/metrics.ts: Add unit tests**
   - Target: Branch coverage ≥90%
   - Strategy: Mock telemetry backend, verify metrics emitted
   - Estimated: 4h

3. **[R] Reduce complexity of server/preservations/actions.ts**
   - Split long functions (>50 lines)
   - Extract validation logic
   - Reduce cyclomatic complexity ≤10
   - Estimated: 8h (could be part of test effort)

4. **[S] Security audit: Verify auth on all state-changing endpoints**
   - Review Server Actions and API routes
   - Ensure NextAuth session checks
   - Document findings
   - Estimated: 4h

**Total Estimated**: 32 hours  
**Success Criteria**:
- HIGH violations cleared
- Coverage: statements ≥92%, branches ≥87%
- No security gaps found

---

### Sprint 2: Code Quality & Debt (Days 6-10)

**Goal**: Eliminate MEDIUM violations, improve code hygiene

**Tasks**:

1. **[R] Cleanup unused imports/variables**
   - Batch 1: Components with most warnings (procedure-forms, matter-preservation-panel)
   - Batch 2: Remaining files
   - Estimated: 10h

2. **[R] Refactor components to use Next.js Image**
   - Replace `<img>` with `next/image`
   - Optimize images with proper sizes
   - Estimated: 2h

3. **[D] Update JSDoc for public APIs**
   - lib/*.ts (exposed utilities)
   - server/*/actions.ts (Server Actions)
   - Estimated: 6h

4. **[U] Update dependencies (non-major)**
   - Run `npm outdated`
   - Update patch/minor versions
   - Test compatibility
   - Estimated: 2h

5. **[O] Add structured logging with correlation IDs**
   - Audit current logging
   - Add request ID propagation
   - JSON format logs
   - Estimated: 4h

**Total Estimated**: 24 hours

---

### Sprint 3: Observability & Performance (Days 11-15)

**Goal**: Enhance observability, monitor performance

**Tasks**:

1. **[O] Implement health endpoints**
   - `/health/live` (process alive)
   - `/health/ready` (db, redis, external dependencies)
   - Estimated: 2h

2. **[O] Add Prometheus metrics**
   - `http_requests_total` (method, path, status)
   - `http_request_duration_seconds` (histogram)
   - `errors_total` (type, component)
   - Estimated: 4h

3. **[O] Add OpenTelemetry tracing**
   - Setup OTLP endpoint
   - Instrument Next.js app
   - Trace cross-service calls
   - Estimated: 6h

4. **[P] Database optimization audit**
   - Find N+1 queries (Prisma include/select)
   - Add missing indexes (prisma migrate)
   - Optimize slow queries
   - Estimated: 6h

**Total Estimated**: 18 hours

---

## Task Catalog Reference

| Type | Category | Actions |
|-----|----------|---------|
| R | Refactor | Split large classes/functions, extract interfaces, apply SOLID |
| P | Performance | Caching, query optimization, lazy loading, memoization |
| S | Security | RBAC, WAF, encryption, secret rotation, audit logging |
| T | Tests | Branch coverage >85%, fuzzing, integration tests, property-based |
| D | Documentation | JSDoc, ADRs, README improvements, architecture diagrams |
| O | Observability | OpenTelemetry, metrics (Prometheus), structured logs |
| C | Compliance | GDPR/PCI/HIPAA controls (data retention, consent, audit) |
| U | Upgrade | Dependencies updates, migrate to new major versions |
| M | Modernization | Async/await, TypeScript strict mode, CI/CD, containerization |

---

## Success Metrics

- **Test Coverage**: ≥92% statements, ≥87% branches (from current 90.24%/84.89%)
- **Quality Gate Score**: ≥95 points (max 100)
- **Zero HIGH violations**
- **Zero Critical violations**
- **Health Score**: Increase to ≥75 (from 0 baseline)

---

**Next Step**: Start Sprint 1, Task 1 immediately. Write test first, then implement fixes for `server/preservations/actions.ts`.
