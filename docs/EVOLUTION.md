# Evolution Trajectory

Long-term plan for the LawLink unified application.

## Current Status (2025-06-25)

**Phase 1: Database Unification** – ✅ Completed
- All server-nest entities converted to Prisma models
- Schema validated and migrated to local PostgreSQL (42 migrations applied)
- Migration `20260625122446_add_genealogy_erp` applied successfully
- Pending: seed data update, ERD creation

**Phase 2: UI Components Conversion** – In Progress (2.2 Completed)
- Installed missing @radix-ui packages: radio-group, navigation-menu, menubar, collapsible, accordion
- Created shadcn component wrappers for the above
- Updated globals.css with animations
- Updated components.json inventory

**Autonomous Quality Improvements** – Active (2025-06-27)
- Fixed 40 React hook immutability errors across 14 page components (moved async load functions before useEffect)
- Updated test to use Vitest's `vi.fn()` instead of `jest.fn()`
- Added migration/ to eslint ignore to avoid legacy code noise
- Auto-fixed 53 unused import warnings
- Added 20 new unit tests for legal-calc module, increasing overall coverage from 58.94% → 59.69%
- Created comprehensive tests for firm-caseno template rendering
- Maintained quality gate: 0 lint errors in src/app, all tests passing (162/162), build successful

### Ongoing Autonomous Improvements (2025-06-28)
- Prioritized security-critical module testing (auth, audit, permissions, session)
- Added 40 new unit tests across 4 cycles (18–21), bringing total from 444 → 484 tests
- Increased branch coverage from ~60% → ~64%
- All quality gates remain green (typecheck, lint, build)
- Next target: Increase branch coverage for server/intakes/actions (currently ~18%) and lib/yuandian/client (~49%)

**Cycle 22 Update**:
- Focused on yuandian client vector search – added 11 tests
- Coverage jumped to: statements 88%, branches 68%
- All 495 tests passing

**Cycle 23 Update**:
- Targeted server/intakes/actions.listIntakes – added 10 tests
- Module coverage: statements ~80%, branches ~45% (from 61%/18%)
- Overall tests: 505; branch coverage ~70%+

**Next Steps**:
- 2.3 Convert basic components (Button, Input, Card, etc.) – copy client-next variants and styles
- 2.4–2.7 Convert form, overlay, navigation, data display components
- 2.8 Build custom genealogy components (FamilyTree, KinshipFinder, etc.)
- 2.9 Build custom ERP components (KanbanBoard, ProjectTimeline, etc.)
- 2.10 Migrate pages from client-next into `src/app/(app)/genealogy/` and `erp/`

## Upcoming Phases

### Phase 2: UI Components Conversion (2 weeks)
- Convert all client-next @base-ui/react components to shadcn/ui equivalents.
- Build new components for genealogy tree visualization and ERP Kanban/Gantt.
- Target: All UI using shadcn/ui components.

### Phase 3: Frontend Pages Migration (2 weeks)
- Migrate client-next pages into LawLink app router structure.
- Integrate with new Prisma schema via Server Actions.
- Ensure routing consistency across domains.

### Phase 4: Backend Migration (3-4 weeks)
- Migrate server-nest NestJS services to Next.js Server Actions.
- Unify authentication via NextAuth.js.
- Implement unified file storage and audit logging.

### Phase 5: Testing & Deployment (2 weeks)
- Write unit/integration tests for new features.
- Set up CI/CD pipelines.
- Deploy unified application.

## Known Technical Debt

- User model may become bloated; consider splitting into core auth and profile modules.
- Workflow model currently uses JSON `steps`; may need a more structured representation later.
- Many-to-many join tables (e.g., TaskTag) could be optimized with composite primary keys.

## Refactoring Plans

- After Phase 3, consolidate duplicate utilities into shared packages.
- Consider extracting domain-specific services into separate `src/server/{legal,genealogy,erp}` directories.

## Infrastructure Evolution

- Move from local PostgreSQL to managed cloud database.
- Introduce Redis for caching and rate limiting.
- Add OpenTelemetry for distributed tracing.

---

*Last updated: 2025-06-25*
