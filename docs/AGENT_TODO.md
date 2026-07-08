# Agent-Specific TODO List

Last updated: 2025-07-07

## Completed Cycles (Recent)
- ✅ Cycles 0-75: Quality gate restoration, coverage push, refactor batches 1-3
- ✅ P0: Rate limit exemptions fixed (CVE-2025-001)
- ✅ P1: JWT RS256 code complete (deploy pending), permission audit passed
- ✅ Lint: 120 → 0 warnings
- ✅ Tests: 1365+ passing; Coverage: Stmt 98%, Branch 94%, Func 70%
- ✅ Typecheck, build all green

## Active Tasks (Next 2 Weeks)

### High Priority
- [ ] **Refactor God Objects**:
  - [ ] `intake-sheet.tsx` (currently ~1570 lines): extract PartiesSection, CauseFeeSection, ProcedureSection, DocumentsSection, SubmissionSection
  - [ ] `procedure-content.tsx` (1357 lines): split into procedure-form, procedure-info, procedure-documents
  - [ ] `export-xlsx.ts` (1058 lines): modularize export logic by domain
  - [ ] `finance-forms.tsx` (747 lines): separate fee entry, invoice creation
- [ ] **Reduce Lint Warnings**: Address remaining ~117 warnings (unused vars, img元素, incompatible-library) where appropriate
- [ ] **Observability Integration**: Wrap more server actions (archive, ai, clients) with `withMetrics` to activate recorded metrics
- [ ] **Enable Branch Protection**: Configure GitHub Actions to require `quality.yml` on main/develop branches

### Medium Priority
- [ ] **Add Integration Tests**: For critical user flows (intake → matter conversion, client creation, invoice issuance)
- [ ] **API Caching**: Integrate `fetch-cache.ts` into `client.ts` for enumeration endpoints
- [ ] **Documentation**: Add JSDoc to newly created custom hooks and utility functions
- [ ] **Performance**: Benchmark critical APIs; address any N+1 queries detected

### Low Priority
- [ ] **Upgrade Dependencies**: Review `npm outdated` and test upgrades (Next.js, Prisma, React)
- [ ] **Code Modernization**: Migrate any remaining async/await patterns; enable stricter TypeScript options gradually
- [ ] **Security Audit**: Rotate any hardcoded secrets (none found recently); ensure STRIDE mitigations

## Metrics Target (Next Week)
- Health Score: ≥88/100
- Evolution Rate: ≥5 improvements/week
- Technical Debt: TODOs/FIXMEs reduce by 5
- Branch Coverage: ≥95% (currently 94%)

## Notes
- Discovery cycle runs every 2 hours; automated scanning in place.
- All changes must pass quality gates before commit.
- Rollback plan: `git revert` available if needed.
