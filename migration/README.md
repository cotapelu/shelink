# LawLink Unified Migration

This directory contains all migration planning documents and artifacts for merging client-next and server-nest into LawLink.

## Directory Structure

```
migration/
├── audit/                    # Codebase inventory files
│   ├── lawlink-*.txt        # LawLink component/action/model counts
│   ├── client-next-*.txt    # client-next inventory
│   ├── server-nest-*.txt    # server-nest inventory
│   ├── COMPONENT_MAPPING.md
│   ├── ENTITY_MAPPING.md
│   ├── API_MAPPING.md
│   └── INVENTORY_SUMMARY.md
├── planning/                 # Migration planning docs
│   ├── DECISIONS.md         # Architectural decisions log
│   ├── PHASE0_CHECKLIST.md  # Phase 0 completion
│   └── COMPONENTS_TO_CONVERT.md
├── backups/                  # Git bundles and DB dumps
│   ├── client-next.bundle
│   ├── server-nest.bundle
│   ├── lawlink_db.sql (pending)
│   └── server-nest_db.sql (pending)
├── database/
│   ├── ENTITIES_TO_CONVERT.md
│   └── source-entities/server-nest/  # Place for extracted TypeORM entities
└── TODO.md                  # Full migration plan (this is main doc)

See `docs/TODO.md` for complete 11-phase migration plan.
