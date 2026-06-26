# TypeORM → Prisma Entity Mapping

## server-nest Entity → Prisma Model

### Person
TypeORM: `server-nest/src/modules/persons/entities/person.entity.ts`
→ Prisma: Add to `LawLink/prisma/schema.prisma`

**Mapping**:
- `@PrimaryGeneratedColumn('uuid') id: string;` → `id String @id @default(cuid())`
- `@Column({ type: 'varchar', length: 100 }) full_name: string;` → `fullName String @db.VarChar(100)`
- `@Column({ type: 'enum', enum: Gender }) gender: Gender;` → `gender Gender @default(male)`
- `@CreateDateColumn() created_at: Date;` → `createdAt DateTime @default(now())`
- `@UpdateDateColumn() updated_at: Date;` → `updatedAt DateTime @updatedAt`
- `@ManyToOne(() => Person, { nullable: true }) father: Person;` → `father Person? @relation("ParentChild", fields: [fatherId], references: [id])`
- `@OneToMany(() => Person, person => person.father) children: Person[];` → `children Person[] @relation("ParentChild")`

**Complexity**: Low
**Conflicts**: None (new model)

---

### Relationship
TypeORM: `server-nest/src/modules/persons/entities/relationship.entity.ts`
→ Prisma: New model

**Mapping**:
- `@Column({ type: 'uuid' }) fromPersonId: string;`
- `@Column({ type: 'uuid' }) toPersonId: string;`
- `@Column({ type: 'enum', enum: RelationType }) type: RelationType;`
- `@ManyToOne(() => Person, { nullable: false }) @JoinColumn({ name: 'fromPersonId' }) fromPerson: Person;`
- `@ManyToOne(() => Person, { nullable: false }) @JoinColumn({ name: 'toPersonId' }) toPerson: Person;`

→ Prisma:
```prisma
model Relationship {
  id            String   @id @default(cuid())
  fromPersonId  String
  toPersonId    String
  type          RelationType
  startYear     Int?
  startMonth    Int?
  startDay      Int?
  endYear       Int?
  endMonth      Int?
  endDay        Int?
  note          String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  fromPerson    Person   @relation(fields: [fromPersonId], references: [id])
  toPerson      Person   @relation(fields: [toPersonId], references: [id])

  @@unique([fromPersonId, toPersonId, type])
  @@index([fromPersonId])
  @@index([toPersonId])
  @@index([type])
}
```

---

### Task
TypeORM: `server-nest/src/modules/task-management/entities/task.entity.ts`
→ Prisma: New model (or merge with LawLink Task if exists)

**Check LawLink**: Does `prisma/schema.prisma` have `Task` model? Likely legal-specific task.

**Decision**: If LawLink Task is for legal matters only, rename to `LegalTask` and create new `Task` for ERP. Or merge fields if compatible.

**Mapping (ERP Task)**:
```prisma
model Task {
  id              String   @id @default(cuid())
  title           String
  description     String?
  projectId       String?
  assigneeId      String?
  status          TaskStatus @default(TODO)
  priority        TaskPriority @default(MEDIUM)
  dueDate         DateTime?
  startDate       DateTime?
  completedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  project         Project? @relation(fields: [projectId], references: [id])
  assignee        User?    @relation(fields: [assigneeId], references: [id])
  assignments     TaskAssignment[]
  subtasks        SubTask[]
  history         TaskHistory[]
  comments        Comment[]

  @@index([projectId])
  @@index([assigneeId])
  @@index([status])
  @@index([dueDate])
}
```

---

### More entities to map...
[Will be populated during migration]

