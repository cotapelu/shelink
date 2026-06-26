# Migration Decisions

## 2025-06-25: Database ORM

**Decision**: Use Prisma as sole ORM (convert server-nest TypeORM entities to Prisma models in LawLink)

**Rationale**:
- LawLink already uses Prisma with existing schema
- Single ORM simplifies maintenance
- Avoid dual-ORM complexity (Prisma + TypeORM)

**Alternatives Considered**:
1. Keep TypeORM – rejected due to having two ORMs in same codebase
2. Convert LawLink to TypeORM – rejected because LawLink Prisma schema is mature (50+ models)

**Implementation**: All server-nest entities will be manually converted to Prisma models and merged into `prisma/schema.prisma`.

---

## 2025-06-25: Authentication System

**Decision**: Use NextAuth.js as sole auth provider; remove Passport JWT from server-nest

**Rationale**:
- LawLink already has NextAuth with credentials provider
- Server actions use `getServerSession()` for auth
- Cookie-based sessions simplify cross-domain auth (no token management)

**Alternatives**:
1. JWT-only – rejected due to need for session management and refresh tokens
2. Keep both – rejected due to complexity

**Implementation**:
- All server actions will call `getServerSession(authOptions)` to get current user
- client-next will replace custom JWT with NextAuth `useSession()`
- server-nest auth controllers will NOT be migrated

---

## 2025-06-25: UI Library

**Decision**: Use shadcn/ui (Radix UI) as sole UI library; convert client-next @base-ui components

**Rationale**:
- LawLink already uses shadcn/ui
- Need to reuse UI components from LawLink
- shadcn has 35+ components, larger ecosystem than @base-ui
- Better long-term: Radix + shadcn is industry standard

**Alternatives**:
1. Keep @base-ui – would need to copy all LawLink components to @base-ui (wasted effort)
2. Use both – rejected due to bundle bloat and maintenance

**Implementation**:
- Convert all client-next components to shadcn equivalents (see COMPONENT_MAPPING.md)
- Build custom genealogy/ERP components using Radix primitives
- All pages use shadcn components only

---

## 2025-06-25: Backend Architecture

**Decision**: Migrate server-nest NestJS services to Next.js Server Actions within LawLink

**Rationale**:
- Single codebase (LawLink) easier to deploy and maintain
- Server actions provide tight integration with Next.js (caching, revalidation)
- No need to maintain separate NestJS app

**Alternatives**:
1. Keep server-nest as microservice – would require cross-app communication, auth sync, deployment overhead
2. Convert LawLink to NestJS – rejected because LawLink frontend is Next.js, mixing frameworks messy

**Implementation**:
- Convert each NestJS module (persons, tasks, projects, etc.) to Server Actions
- Use Prisma directly (no service layer unless complex)
- Keep business logic in actions with Zod validation

---

## 2025-06-25: Domain Organization

**Decision**: Keep all domains (legal, genealogy, erp) in same Next.js app with clear folder separation

**Rationale**:
- Single deployment unit
- Shared components/libraries
- Easy navigation between domains if needed

**Folder Structure**:
- `src/app/(app)/legal/` – existing LawLink legal pages
- `src/app/(app)/genealogy/` – migrated client-next pages
- `src/app/(app)/erp/` – new ERP pages
- `src/server/legal/`, `src/server/genealogy/`, `src/server/erp/` – server actions by domain
- `src/components/domain/` – domain-specific components

**Alternatives**:
1. Separate monorepo packages – over-engineering for now
2. Feature flags to disable domains – not needed initially

---

## 2025-06-25: Database Schema Conflicts

**Decision**: Merge all tables into single PostgreSQL database with unified Prisma schema

**Handling conflicts**:
- `Task`: Legal domain vs ERP domain → rename LawLink's to `LegalTask`, keep `Task` for ERP
- `Notification`: Merge into single table with polymorphic `entityType`/`entityId` or separate columns
- `File`: Already shared – use same table for all domains with nullable foreign keys (`matterId`, `personId`, `taskId`)
- `User`: Single User table with roles from both domains

**Principle**: Prefer merging if fields are compatible; otherwise prefix/rename to avoid collision.

---

## Pending Decisions

- [ ] Should we use polymorphic associations (entityType + entityId) for File, Comment, AuditLog?
- [ ] How to handle permissions across domains? Unified Permission enum with all scopes?
- [ ] Should we keep BullMQ queues in LawLink? (Yes, need to setup)
- [ ] OpenTelemetry: Keep existing server-nest setup, migrate to LawLink?

