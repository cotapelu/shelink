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
