# server-nest API → LawLink Server Actions

## Persons

### GET /persons → getPersons()
**NestJS**: `PersonsController.findAll()`
**Server Action**: `src/server/genealogy/persons/actions.ts` → `getPersons(query)`
**Query params**: `page`, `limit`, `search`, `gender`, `generation`, `birthYear`, `isDeceased`
**Response**:
```typescript
{
  persons: Person[],
  pagination: { page, limit, total, totalPages }
}
```

### POST /persons → createPerson()
**NestJS**: `PersonsController.create()`
**Server Action**: `createPerson(data: CreatePersonInput)`
**Body**: See `CreatePersonSchema`
**Response**: `Person`

### GET /persons/:id → getPerson(id)
**Server Action**: `getPerson(id: string)`
**Response**: `Person` with relations

### PATCH /persons/:id → updatePerson(id, data)
**Server Action**: `updatePerson(id: string, data: UpdatePersonInput)`

### DELETE /persons/:id → deletePerson(id)
**Server Action**: `deletePerson(id: string)`

---

## Relationships

### GET /relationships → getRelationships()
**Query**: `type`, `personId`, `page`, `limit`
**Server Action**: `getRelationships(query)`

### POST /relationships → createRelationship()
**Server Action**: `createRelationship(data: CreateRelationshipInput)`

### DELETE /relationships/:id → deleteRelationship(id)
**Server Action**: `deleteRelationship(id: string)`

---

## Tasks (ERP)

### GET /tasks → getTasks()
**Query**: `page`, `limit`, `status`, `assigneeId`, `projectId`, `search`
**Server Action**: `getTasks(query)`

### POST /tasks → createTask()
**Server Action**: `createTask(data: CreateTaskInput)`

### GET /tasks/:id → getTask(id)
**Server Action**: `getTask(id: string)`

### PATCH /tasks/:id → updateTask(id, data)
**Server Action**: `updateTask(id: string, data: UpdateTaskInput)`

### DELETE /tasks/:id → deleteTask(id)
**Server Action**: `deleteTask(id: string)`

### POST /tasks/:id/assign → assignTask(taskId, userId)
**Server Action**: `assignTask(taskId: string, userId: string)`

### POST /tasks/:id/unassign → unassignTask(taskId, userId)
**Server Action**: `unassignTask(taskId: string, userId: string)`

### POST /tasks/:id/transition → transitionTask(taskId, status)
**Server Action**: `transitionTask(taskId: string, status: TaskStatus)`

---

## More endpoints to map...
[Will be populated]

