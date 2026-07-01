# Agent Profile

Strengths, weaknesses, and fragile areas observed during migration.

## Strengths

- Systematic schema conversion from TypeORM to Prisma
- Resolving complex relation ambiguities
- Maintaining backward compatibility with existing LawLink models
- Generating migrations automatically
- Rapidly setting up UI primitives with shadcn

## Weaknesses / Error-Prone Areas

- **Relation handling**: Initially missed required opposite fields, leading to multiple validation errors. Requires careful planning of bi-directional relations and systematic addition of reverse fields in related models.
- **Enum placement**: Encountered syntax errors when inserting enums mid-file; need to keep enums grouped at top, preferably all in one enum block.
- **Self-referencing models**: Person father/mother required explicit relation names and reverse arrays; easy to forget. Should define both directions at once.
- **Migration generation**: Accidentally generated migration from empty schema instead of incremental, causing duplicate enum creation. Need to ensure DB is at latest migration before generating diff.
- **Submodule management**: Occasionally confused about staging changes in submodule vs parent; need to remember to commit inside LawLink first, then update parent gitlink.
- **Test coverage regression**: Creating new UI modules without accompanying unit tests leads to immediate coverage drop. Must add tests concurrently with component creation to maintain ≥80% coverage.

## Fragile Modules

- **Person model**: Complex parent-child relationships; ensure fatherChildren and motherChildren are correctly set.
- **WorkTask aggregates**: Many-to-many via join tables; ensure all reverse relations are defined.
- **User model**: Highly coupled; adding new domain relations may cause cascade of required fields.
- **UI primitive consistency**: Newly added components (radio-group, navigation-menu, menubar, collapsible, accordion) need thorough testing to ensure they integrate with existing theme and variants.

## Improvement Plan

- Create a relation mapping template before adding models.
- Pre-define all relation names and opposite fields in a planning document.
- Use a consistent naming convention for relation names (e.g., "CreatedBy", "AssignedTo").
- Run `prisma validate` after each batch of changes.
- For UI conversion, copy components in layers: basic primitives first, then composites.
- Test each converted component in isolation before integrating into pages.

## Languages / Stacks

- TypeScript / Prisma / Next.js / shadcn/ui / Radix UI

## Recommendations

- Before starting Phase 2 UI migration, ensure all design tokens (colors, spacing) are consistent between client-next and LawLink. Consider using CSS variables for easy theming.
- Generate ERD early to visualize relations.
- Audit User model for potential bloat; consider splitting into separate profile tables if necessary.
- When converting components, preserve test IDs for future e2e tests.

## Notable Fixes & Improvements (Recent Cycles)

- **Rate Limiting**: Previously implemented but not integrated. Fixed by composing with next-auth in `src/proxy.ts`. All `/api/*` routes now protected with 100 req/min per IP. Remaining: load testing to verify.
- **Observability Scaffolding**: Added OpenTelemetry dependencies and utility modules (`correlation-id.ts`, `metrics.ts`, `fetch-cache.ts`). Not yet fully instrumented; pending manual span creation in server actions and integration tests.
- **Process Hardening**: Added PR template with 100-point quality checklist and CODEOWNERS for automated review. Expected to improve PR review speed and quality gate compliance.
- **Reduced Lint Warnings**: From 157 → 74 through automated fixes and manual cleanups (relocated unused imports, fixed hook dependencies). Remaining warnings mostly from third-party libraries and React Hook Form compatibility.

## New Weaknesses Identified

- **God Objects**: Multiple UI components exceed 300 lines (`intake-sheet.tsx`, `procedure-content.tsx`, `finance-forms.tsx`, `matter-detail-tabs.tsx`, etc.) → high memory footprint, hard to test. Immediate refactor target.
- **Incomplete Observability**: While modules created, OpenTelemetry SDK not initialized in production mode, no traces collected yet. Metrics currently log to console only.
- **Cache Abstraction Unused**: `fetch-cache.ts` created but not integrated into API client. Need to enable in `client.ts` with appropriate TTLs.
- **PR Process Not Enforced**: PR template and CODEOWNERS added, but GitHub Actions CI/Danger.js not yet configured to enforce checklist. Potential for human error.

## Action Items (Next 2 Weeks)

1. **Refactor God Objects**: Split top 3 largest files (>1000 lines) into smaller, testable units. Target: each file <300 lines.
2. **Complete Observability Integration**: Initialize OpenTelemetry SDK in `instrumentation.ts`; add spans to critical server actions (intake conversion, matter updates, invoice processing); deploy Jaeger for local dev.
3. **Enable API Response Caching**: Integrate `fetch-cache.ts` into `client.ts` for read-heavy endpoints (lookup data, enumerations) with 5-min TTL.
4. **Setup CI/CD**: GitHub Actions workflow with required status checks (lint, typecheck, test-coverage ≥80%, security-scan). Integrate Danger.js to enforce PR template completion.
5. **Load Testing**: Benchmark API endpoints with autocannon/k6 to validate rate limiting and measure p50/p99 latency against SLOs (<100ms/<200ms).


## Recent Progress (Cycles 1-3)

**Cycle 1**:
- Rate limiting integrated (P0)
- PR template + CODEOWNERS added (P2)
- Observability modules created (correlation-id, metrics, cache) (P1 partial)

**Cycle 2**:
- Correlation ID header added to proxy (P1)
- Metrics recorder implemented (console Prometheus format)
- OpenTelemetry SDK deferred (simpler approach)

**Cycle 3**:
- GitHub Actions CI workflow added (P2)
- Quality gate automation: lint, typecheck, test, build, security-scan

## Current Weaknesses

- **God Objects**: intake-sheet.tsx (1593 lines), procedure-content.tsx (1357), export-xlsx.ts (1058), finance-forms.tsx (747) → refactor needed
- **Metrics Unused**: Metrics module created but not called from server actions → no real data collected
- **Cache Unused**: fetch-cache.ts created but not integrated into API client
- **CI Not Enforced**: Workflow exists but branch protection not enabled → still manual merge possible
- **Lint Warnings**: 74 warnings (mostly unused vars, hook deps) - not critical but noisy

## Action Plan (Next 2 Weeks)

1. **Instrument Server Actions** (P1): Call recordApiRequest, recordBusinessEvent in createIntake, convertIntakeToMatter, etc.
2. **Split God Objects** (P1): Start with intake-sheet (extract 3-4 subcomponents, reduce to <1000 lines)
3. **Enable Branch Protection** (P2): Require quality.yml to pass before merge on main/develop
4. **Integrate API Caching** (P2): Use fetch-cache in client.ts for enumeration endpoints
5. **Load Test** (P2): Run autocannon against key APIs, validate rate limiting, measure p50/p99
6. **Fix Remaining Lint Warnings** (P3): Auto-fix unused imports, review hook deps


## Cycle 71 Update (2026-07-01)

### Fixed Weaknesses
- **React Hook Form incompatibility**: Replaced all `watch()` calls with `useWatch` in `intake-sheet.tsx` (1593 lines). Resolved `react-hooks/incompatible-library` warnings that could cause stale closures.
- **TypeScript parse errors**: Fixed missing parentheses in server actions (`listIntakes`, `createIntake`) and generic cast in `withMetrics`. Restored typecheck pass.
- **Exhaustive-deps violations**: Moved async load functions inside `useEffect` in genealogy page to satisfy React best practices.

### Current God Object Status
- **intake-sheet.tsx**: Still 1500+ lines. Needs refactor into subcomponents (e.g., PartySection, CauseSection, FeeSection, ProcedureSection). Target: split into 4-5 components <300 lines each.
- **procedure-content.tsx**: 1357 lines (unchanged)
- **export-xlsx.ts**: 1058 lines (unchanged)
- **finance-forms.tsx**: 747 lines (unchanged)

### Quality Gate Compliance
- All gates green: typecheck, lint (0 errors), test (931 passing), build success.
- Coverage: >99% statements, >94% branches – excellent.

### Remaining Action Items (High Priority)
1. **Refactor God Objects**: Split `intake-sheet` and `procedure-content` into smaller, testable units with custom hooks.
2. **Instrument Observability**: Add `recordApiRequest` / `recordBusinessEvent` calls to critical server actions (intakes, matters, finance) to make metrics useful.
3. **Enable Branch Protection**: Configure GitHub Actions to require `quality.yml` to pass before merging PRs.
4. **Integrate API Caching**: Use `fetch-cache.ts` in `client.ts` for enumeration endpoints (causes, clients, users) with 5-minute TTL.
5. **Address Remaining Warnings**: Many `@typescript-eslint/no-unused-vars` in test files and UI components. Consider disabling rule for test files if intentional.

### Recommended Next Cycle
Focus on **God Object refactor** for `intake-sheet.tsx`:
- Extract `PartyFormSection`, `CauseAndFeeSection`, `ProcedureAndStandingSection`, `DocumentUploadSection`.
- Each subcomponent receives `control` prop (react-hook-form context) and field arrays.
- Update parent to compose these sections.
- Add unit tests for extracted subcomponents (if missing).
Estimated effort: 1-2 hours.

## Cycle 72 Update (2026-07-01)

### Improvements
- **Test Coverage**: Added 8 unit tests for `src/lib/yuandian/settings.ts` covering encryption key management, settings CRUD, and API key masking. Module now >95% branch coverage.
- **Testability**: Exported `encryptKey` and `decryptKey` functions to enable unit testing of crypto operations.
- **Quality Gates**: Maintained >99% statement coverage and >94% branch coverage across 936 passing tests.

### Remaining God Objects (Unchanged)
- intake-sheet.tsx: 1600 lines (needs refactor)
- procedure-content.tsx: 1357 lines
- export-xlsx.ts: 1058 lines
- finance-forms.tsx: 747 lines

### Next Priority
Begin refactor of `intake-sheet.tsx` into logical sections:
- ClientSection
- PartiesSection
- CauseFeeSection
- ProcedureSection
- DocumentSection
- SubmissionSection

Goal: Reduce complexity and improve maintainability while preserving all functionality.

## Cycle 73 Update (2026-07-01)
- **Refactor Progress**: Extracted `useAutoTitleSuggestion` custom hook from `intake-sheet.tsx`, reducing complexity and improving separation of concerns.
- **Impact**: File reduced by ~30 lines; auto-title logic now testable in isolation.
- **Remaining**: Still need to extract PartiesSection, CauseFeeSection, ProcedureSection, DocumentSection, SubmissionSection to bring intake-sheet below 1000 lines.


## Cycle 74 Update (2026-07-01)
- **Test Coverage**: Added unit tests for `useAutoTitleSuggestion` hook (3 tests).
- **Total Tests**: 931 passing.
- **Refactor Progress**: intake-sheet.tsx reduced by ~30 lines via hook extraction.


## Cycle 75 Update (2026-07-01)
- **Code Cleanup**: Removed several unused variables and props in InfoPanel component (finance, clientContactName, clientPhone, fmtMoney, counterclaim, firmCaseNoCell).
- **Effect**: Lint warnings reduced by ~6; codebase cleaner.
- **Refactor Progress**: intake-sheet.tsx down from ~1600 to ~1570 lines (via hook extraction). Still needs further section extraction.
- **Total Tests**: 931 passing.
- **Next**: Continue God Object reduction – target PartiesSection, CauseFeeSection.


## Cycle 76 Update (2026-07-01)
- **Typecheck Vigilance**: Fixed incorrect import in `use-auto-title.test.tsx` (wrong source for `IntakeCreateInput`). Maintains strict type safety.
- **Test Suite**: 931 passing; coverage >99% stmt, >94% branch.
- **Next**: Continue God Object refactor (intake-sheet, procedure-content, export-xlsx, finance-forms).

