# Codebase Inventory Summary

Generated: $(date)

## LawLink (Next.js Fullstack)

### UI Components
Total UI components in `src/components/`: See `lawlink-components.txt` (shadcn/ui + custom)

### Server Actions
Total server action files: See `lawlink-server-actions.txt` (~80 files)
- organized in `src/server/[module]/actions.ts`

### Database Models
Total Prisma models: See `lawlink-models.txt` (~50 models)

### Lines of Code
[Run manually: `find src -name "*.ts" -o -name "*.tsx" | xargs wc -l`]

---

## client-next (Genealogy FE)

### UI Components
Total: See `client-next-components.txt`
- Location: `components/`
- Framework: @base-ui/react (25 primitives) + custom components

### Pages
Total pages: See `client-next-pages.txt`
- Location: `app/(app)/` (App Router)
- Routes: dashboard, persons, relationships, lineage, events, settings

### Hooks
Total hooks: See `client-next-hooks.txt`
- Location: `hooks/`
- Examples: useAuth, useDebounce, useLocalStorage, useModal, usePermission

### API Client
Enterprise API client with:
- Retry with exponential backoff
- Circuit breaker
- Request/response caching
- Correlation IDs
- Metrics recording
- Location: `lib/api/`

---

## server-nest (ERP Backend)

### Entities
Total entities: See `server-nest-entities.txt`
- Location: `src/modules/*/entities/`
- Count: ~20 entity files

### Controllers
Total controllers: See `server-nest-controllers.txt`
- RESTful API endpoints

### Services
Total services: See `server-nest-services.txt`
- Business logic layer

### DTOs
Total DTOs: See `server-nest-dtos.txt`
- Request/response validation

### Modules
Total modules: See `server-nest-modules.txt`
- NestJS feature modules
- Includes: persons, relationships, events, task-management, project-management, workflow-management, notification, files, auth, user-management

---

## Conversion Summary

| Aspect | From | To | Effort |
|--------|------|----|--------|
| UI Components | @base-ui/react | shadcn/ui | 2 weeks |
| Pages (FE) | client-next | LawLink (genealogy/) | 2 weeks |
| Backend (BE) | NestJS server | Next.js Server Actions | 3-4 weeks |
| Database | TypeORM entities | Prisma models | 2 weeks |
| Auth | Custom JWT + Passport | NextAuth only | 1 week |
| Utils | All repos merged | consolidated | 1 week |

**Total**: 11-12 weeks

