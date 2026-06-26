# Server-Nest Entities to Convert to Prisma

## persons module
- [ ] person.entity.ts
- [ ] relationship.entity.ts
- [ ] event.entity.ts
- [ ] lineage.entity.ts (if exists)

## task-management module
- [ ] task.entity.ts
- [ ] task-assignment.entity.ts
- [ ] sub-task.entity.ts
- [ ] task-history.entity.ts
- [ ] team.entity.ts

## project-management module
- [ ] project.entity.ts
- [ ] project-member.entity.ts

## workflow-management module
- [ ] workflow.entity.ts
- [ ] workflow-transition.entity.ts
- [ ] workflow-step.entity.ts

## notification module
- [ ] notification.entity.ts

## files module (if separate)
- [ ] file.entity.ts (compare with LawLink File model)

## user-management module
- [ ] user.entity.ts (compare/merge with LawLink User)

## auth module (SKIP - use NextAuth)

Total entities: ~15-20

## Conversion Priority
1. Critical: person, relationship, event (genealogy core)
2. High: task, project, team, notification (ERP core)
3. Medium: workflow, file, user (merge/review)
