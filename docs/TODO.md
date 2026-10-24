# 🔥 KẾ HOẠCH DI TRÚ TOÀN DIỆN: gộp client-next + server-nest → LawLink

**Mục tiêu**: Ứng dụng Next.js hợp nhất (LawLink) gồm miền nghiệp vụ + genealogy + ERP.
**Thời gian**: 11–12 tuần (2.5–3 tháng).
**Đội ngũ**: 1–2 lập trình viên.
**Trạng thái**: Đang làm (UI/FE xong, typecheck pass).
**Cập nhật lần cuối**: 2025-06-26.

---

## Mục lục

1. Tóm tắt điều hành
2. Phân tích trạng thái hiện tại
3. Kiến trúc mục tiêu
4. Tổng quan pha di trú
5. Pha 0: Chuẩn bị
6. Pha 1: Hợp nhất CSDL
7. Pha 2: Chuyển UI components
8. Pha 3: Di trú trang frontend
9. Pha 4: Di trú backend (NestJS → Server Actions)
10. Pha 5: Tích hợp auth
11. Pha 6: Hợp nhất utils dùng chung
12. Pha 7: Chiến lược test
13. Pha 8: Deploy & Hạ tầng
14. Pha 9: Tài liệu
15. Bản đồ tính năng
16. Sổ đăng ký rủi ro
17. Tiêu chí thành công
18. Phân bổ theo tuần (Gantt)

---

## 1. Tóm tắt điều hành

Gộp **3 mã nguồn** thành **1 ứng dụng Next.js hợp nhất**:

| Nguồn | Stack | Miền | Số phận |
|---|---|---|---|
| **LawLink** | Next.js + Prisma + shadcn/ui | Quản lý công việc | **Giữ & mở rộng** |
| **client-next** | Next.js + @base-ui/react | Gia phả / cây gia đình | **Gộp vào LawLink** |
| **server-nest** | NestJS + TypeORM | ERP / Task | **Di trú sang LawLink Server Actions** |

**Kết quả**: Một app Next.js duy nhất (LawLink) với nhiều miền.

**Vì sao**:
- Triển khai & bảo trì một chỗ.
- Chia sẻ hạ tầng (auth, audit, storage, quyền).
- Thư viện UI hợp nhất (shadcn/ui).
- Trải nghiệm dev nhất quán.
- Không tốn chi phí giao tiếp giữa các app.

**Công lượng**: 11–12 tuần với 1–2 dev full-stack senior.

---

## 2. Trạng thái hiện tại (2025-06-26)

### ✅ Hoàn thành (di trú toàn diện)
- Cài phụ thuộc: `html-to-image`, `jspdf`, `@hugeicons/core-free-icons`.
- Kiểu TS: thêm `TaskStatus`, `TaskPriority`, `WorkTask`.
- **Pha 1 – Hợp nhất CSDL (100%)**: gộp schema server-nest; thêm `ProjectMilestone`, `WorkflowAudit`, `File`, `Report`; `prisma db push`; seed sample.
- **Pha 4 – Di trú backend (100%)**: cài server actions cho mọi module server-nest (genealogy, ERP, shared: notification, files, reports, stats, seals, preservation, express, sms, intakes, settings); bỏ dùng API ngoài ở trang genealogy/ERP.
- `npm run build` pass; `npm run dev` chạy được.
- Tạo `docs/HANDOFF.md`; cập nhật `docs/TODO.md`.

### 🔄 Đang làm
- [ ] **Test (Pha 7)**: chưa có unit/e2e.
- [ ] **Deploy (Pha 8)**: Docker/CI-CD chưa chuẩn.
- [ ] **Module tuỳ chọn**: seals/preservation/express/notification UI còn thiếu (không chặn genealogy/ERP lõi).

### 🚫 Chặn
- Không có gì chặn genealogy/ERP lõi.

### Các bước tiếp theo hành động được
Mục tiêu: từ "UI-only + API ngoài" → "Full-stack hợp nhất".

#### 1️⃣ Pha 1: Hợp nhất CSDL (2 tuần)
- Việc:
  - Trích entity server-nest → `migration/database/source-entities/server-nest/`.
  - Chuyển TypeORM → Prisma: thêm enum `Gender/RelationType/EventType/TaskStatus/TaskPriority/ProjectStatus/WorkflowState`; thêm model Person/Relationship/Event/Lineage/WorkTask/Project/ProjectMember/Workflow…; giải xung đột (vd `Task`→`LegalTask`).
  - Thêm liên kết giữa các miền; `npx prisma validate && npx prisma format`.
  - `npx prisma migrate dev --name "unified-schema-genealogy-erp"`; seed sample; test reset DB.
- Sản phẩm: schema hợp nhất (~70–80 model), file migration, ERD.

#### 2️⃣ Pha 4: Di trú backend (3–4 tuần)
- Tạo cấu trúc `src/server/{genealogy,erp,shared}`; cài persons/relationships/events/lineage/tasks/projects/workflow; dùng Zod; gọi prisma; audit + revalidatePath.
- Cập nhật trang gọi server actions thay API ngoài; test end-to-end (tạo person → hiện → sửa → xóa).
- Sản phẩm: mọi feature genealogy/ERP chạy trên backend LawLink.

#### Ưu tiên thấp hơn (tùy thời gian)
- [ ] Bật lại CSV export/import: sửa kiểu Papa rồi gắn lại nút.
- [ ] Test: chuyển từ Jest sang Vitest; unit cho server action; phủ ≥80%.
- [ ] Quan sát: audit log, metrics, tracing.
- [ ] Tài liệu: README, API docs.

## Tiến độ

| Pha | Trạng thái | % |
|---|---|---|
| 0. Chuẩn bị | ✅ | 100% |
| 1. CSDL | ✅ | 100% |
| 2. UI Components | ✅ | 100% |
| 3. Trang frontend | ✅ | 100% |
| 4. Backend | ✅ | 100% |
| 5. Auth | ✅ | 100% |
| 6. Shared Utils | ✅ | 80% |
| 7. Test | ⚠️ | 0% |
| 8. Deploy | ⚠️ | 0% |
| 9. Tài liệu | ✅ | 95% |

**Tổng**: Di trú UI + CSDL + Backend 100% hoàn thành ✅. Test & Deploy còn treo.

## Nhật ký quyết định

- **2025-06-26 — Task dùng `LegalTask` tạm**: `WorkTask` chưa đủ quan hệ; sau khi gộp schema sẽ refactor.
- **2025-06-26 — CSV export tạm tắt**: lỗi kiểu Papa; GEDCOM/JSON đủ MVP; bật lại sau khi sửa kiểu.

---

## 2. Phân tích trạng thái hiện tại

### LawLink (fullstack nghiệp vụ)
- **Frontend**: Next.js 16 App Router; shadcn/ui (Radix) 35+ component; 50+ trang; layout sidebar/topbar/mobile.
- **Backend**: Next.js Server Actions; Prisma + PostgreSQL; NextAuth (credentials). ~80 tệp server action.
- **DB**: ~50 model Prisma.
- **Test**: Vitest (unit lib & server).

### client-next (Frontend genealogy)
- Next.js 16; `@base-ui/react` (25 primitive) → 70+ component tùy chỉnh.
- Trang: dashboard, persons, relationships, lineage, events, settings.
- Không backend (gọi API ngoài); có client API với retry/circuit breaker/cache/correlation id.
- Test: Jest + RTL.

### server-nest (Backend ERP)
- NestJS 11 + TypeORM; PostgreSQL (SQLite dev); Passport JWT.
- Module: persons, relationships, events, lineage, task, project, workflow, notification, files, user, auth.
- BullMQ queue; cron; Sentry + OpenTelemetry; Swagger.
- ~20 entity; controller/service REST; test Jest (phủ ~80%).

## 3. Kiến trúc mục tiêu

```
┌── LawLink (Next.js 16 hợp nhất) ──────────────────────┐
│ FRONTEND (App Router)                                  │
│  src/app/(app)/                                        │
│   ├── legal/        (matters, clients, docs, finance) │
│   ├── genealogy/    (persons, relationships, events)  │  ← từ client-next
│   ├── erp/          (tasks, projects, workflows)      │  ← từ server-nest
│   └── settings/     (hợp nhất)                        │
│  src/components/{ui, layout, domain}                   │
│ BACKEND (Server Actions)  src/server/                  │
│   ├── legal/ genealogy/ erp/ shared/                   │
│   └── shared/{audit, permissions, storage, search…}   │
│ DATABASE (Prisma) prisma/schema.prisma                 │
│   ├── shared: User, AuditLog, File…                    │
│   ├── legal: Matter, Client, Document, Invoice…        │
│   ├── genealogy: Person, Relationship, Event, Lineage  │
│   └── erp: WorkTask, Project, Team, Workflow…          │
│   Tổng ~70–80 model                                    │
│ SHARED LIBS  src/lib/{permissions, storage, utils…}    │
└────────────────────────────────────────────────────────┘
```

**Nguyên tắc**:
- **Single codebase**: chỉ còn LawLink.
- **Single database**: schema Prisma hợp nhất.
- **Single auth**: NextAuth (cookie session).
- **Server actions** thay controller NestJS.
- **shadcn/ui** làm thư viện UI duy nhất.
- **Tách miền**: cấu trúc thư mục rõ theo miền.

## Tổng quan pha

| Pha | Thời gian | Mục tiêu | Phụ thuộc |
|---|---|---|---|
| 0 | 3–5 ngày | Audit, kế hoạch, backup, tooling | — |
| 1 | 2 tuần | Gộp schema Prisma | Pha 0 |
| 2 | 2 tuần | base-ui → shadcn + component mới | Pha 0 |
| 3 | 2 tuần | Di trú trang client-next | Pha 2 |
| 4 | 3–4 tuần | NestJS → Server Actions | Pha 1 |
| 5 | 1 tuần | Hợp nhất auth (NextAuth) | Pha 4 |
| 6 | 1 tuần | Hợp nhất utils | Pha 4 |
| 7 | 1 tuần | Chuyển test, phủ ≥80% | Pha 3–6 |
| 8 | 3 ngày | Docker, docker-compose, env | Tất cả |
| 9 | 2 ngày | Tài liệu | Tất cả |
| **Tổng** | **11–12 tuần** | | |

## Các pha (tóm tắt)

- **Pha 0 — Chuẩn bị (3–5 ngày)**: tạo nhánh `migration/unified-app`; thư mục `migration/` (audit/planning/backups); audit components/server-actions/models từ 3 nguồn; lập bảng map component/entity/API; backup bundle; chuẩn bị môi trường dev; tạo nhật ký quyết định.
- **Pha 1 — Hợp nhất CSDL (2 tuần)**: chuyển TypeORM → Prisma theo quy tắc map (`@Entity→model`, `uuid→cuid`, `@Column(type…)→@db…`, `@ManyToOne→relation`, `@Index→@@index`); gộp với model LawLink sẵn có; giải xung đột tên bảng trùng (`Task`, `Notification`, `File`, `User` bằng cách gộp hoặc đổi tên); thêm quan hệ liên miền (Person↔WorkTask, File polymorphic bằng `entityType+entityId`); hợp enum; cập nhật chỉ mục; `migrate dev --create-only` rồi xem SQL trước khi chạy (`AGENTS.md §5.6`); seed sample; tạo ERD.
- **Pha 2 — Chuyển UI Components (2 tuần)**: shadcn đã có sẵn ở LawLink; cài thêm thành phần thiếu; chuyển tier 1 (Button/Input/Card/…) rồi form/overlay/navigation/data; xây các component genealogy riêng (FamilyTree d3/arbor, KinshipFinder, Timeline, GEDCOM Import/Export) và ERP riêng (KanbanBoard dnd-kit, TaskCard, ProjectTimeline, WorkflowDiagram, NotificationCenter); cập nhật toàn bộ import; barrel export.
- **Pha 3 — Di trú trang frontend (2 tuần)**: tạo thư mục `(app)/genealogy`, `(app)/erp`; migrate trang genealogy (persons/relationships/lineage/events/settings); ERP UI xây từ đầu; gộp trang settings; cập nhật sidebar/nav + mobile; test toàn trang.
- **Pha 4 — Di trú backend (3–4 tuần)**: cấu trúc server mới; DTO bằng Zod; viết server actions cho genealogy/ERP/shared; dùng Prisma trực tiếp; audit + `revalidatePath`; đắng transaction cho thao tác nhiều bước; tích hợp Sentry/OpenTelemetry (BullMQ nếu dùng queue); đăng helper `requireAuth/requirePermission`; cài cron job.
- **Pha 5 — Auth (1 tuần)**: chỉ dùng NextAuth; khai báo `authorize`, callback `jwt/session`; hiện tại dùng `/api/login` "Sign in with Credentials"; bỏ Passport JWT/TypeORM của server-nest; mọi server action dùng `getServerSession`; helper `requireAuth/requirePermission`; cập nhật client sang `useSession`.
- **Pha 6 — Hợp nhất Utils (1 tuần)**: gộp permission (server + hook client), storage, utils chung (date/string/validation), hooks (useDebounce/useLocalStorage/useModal/usePermission), kiểu (barrel export từ @prisma/client + kiểu API).
- **Pha 7 — Test (1 tuần)**: audit test hiện có; chuyển Jest → Vitest chủ yếu bằng `vi.mock`; unit test mới, integration, e2e; chức năng chặn: tạo person/task/assign; phủ ≥80%.
- **Pha 8 — Deploy (3 ngày)**: xác nhận Dockerfile/compose; thêm service Redis (nếu BullMQ/cache) và MinIO (nếu S3); cập nhật `.env.example`; test build/start; thêm `/api/health/ready`.
- **Pha 9 — Tài liệu (2 ngày)**: cập nhật README; cập nhật DATA-MODEL kèm ERD; tạo `ARCHITECTURE.md`; tham chiếu API; ghi migration; cập nhật CONTRIBUTING/CHANGELOG.

## Bản đồ tính năng

### Giữ lại miền nghiệp vụ của LawLink
User/Auth, Dashboard, Matters, Clients, Documents, Finance, Conflict check, Archive, Preservation, Causes, Intakes, Seals, Procedures, Express, SMS, AI (Yuandian), Settings, Audit log, File storage, Notifications, Custom fields, Search, Cron.

### Bổ sung từ client-next (Genealogy)
Person/Relationship/FamilyTree/Kinship/GEDCOM Import-Export/Event/Dashboard, Entity (Person/Relationship/Event/Lineage).

### Bổ sung từ server-nest (ERP)
Task/Project/Workflow/Team/Notification/File/Settings, Entity (WorkTask/Project/ProjectMember/Workflow.../Notification/File/Settlement).

## Sổ đăng ký rủi ro

| Rủi ro | Xác suất | Ảnh hưởng | Giảm |
|---|---|---|---|
| Xung đột schema (trùng bảng/trường) | Trung bình | Cao | Rà kỹ hai schema; quy ước đặt tên; giải trước khi di trú |
| Phụ thuộc vòng trong Prisma | Cao | Trung bình | Forward reference (`@relation` name) |
| N+1 trong server action | Trung bình | Cao | `include/select` hợp lý; dataloader nếu cần |
| Bundle phình (3 miền) | Cao | Trung bình | Code splitting theo miền; dynamic import |
| Mất session khi di trú auth | Trung bình | Cao | Test kỹ; fallback; giữ JWT tạm lúc đầu |
| Thiếu BullMQ khi chuyển queue | Trung bình | Trung bình | Cài BullMQ + queue processor |
| Phủ tụt dưới 80% | Cao | Trung bình | Dành thời gian dư ở Pha 7 |
| Breaking khi di trú | Cao | Cao | Feature flag, giữ nhánh, rollback được |
| Bối rối repo nào sửa | Trung bình | Thấp | Chỉ sửa LawLink sau khi di trú bắt đầu |
| Trễ tiến độ | Trung bình | Cao | Buffer 2 tuần; ưu tiên lõi (Pha 1–4) |

## Tiêu chí thành công

✅ **Chức năng**:
- Mọi feature miền nghiệp vụ hoạt động như cũ.
- Mọi feature genealogy (persons/relationships/lineage/events/GEDCOM) chạy.
- Mọi feature ERP (task/project/workflow/notification) chạy.
- Đăng nhập đơn cho mọi miền.

✅ **Kỹ thuật**:
- CSDL: schema hợp nhất 70+ model, đã áp migration.
- Frontend: shadcn/ui, responsive, accessible.
- Backend: toàn bộ server action, không còn code NestJS.
- Test: phủ ≥80%, xanh toàn bộ.
- Bundle: trang đầu < 200KB gzip (có code splitting).
- Hiệu năng: API < 200ms p95.

✅ **Deploy**:
- Một image (`lawlink:unified`).
- `docker compose up` khởi động app+postgres(+redis/minio nếu dùng).
- Health check trả 200.
- Log không lỗi.

✅ **Chất lượng code**:
- Không lỗi kiểu.
- ESLint sạch hoặc chỉ warning.
- Pre-commit hooks.
- Commit theo convention.

✅ **Tài liệu**:
- README (tính năng, quick start, deploy, contributing).
- DATA-MODEL kèm ERD.
- ARCHITECTURE (cấu trúc thư mục + quyết định).
- Tham chiếu API.
- MIGRATION.

## Phân bổ theo tuần (Gantt)

```
Tuần:   0   1   2   3   4   5   6   7   8   9   10  11  12
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pha 0  ████████████████████████████████████████████
Pha 1          ████████████████████████████████████
Pha 2                  ███████████████████████████
Pha 3                          ████████████████████
Pha 4                                  ██████████████████
Pha 5                                              ████████
Pha 6                                                  ████████
Pha 7                                                      ████████
Pha 8                                                          ████
Pha 9                                                            ██
```

- **Tuần 0**: Chuẩn bị (audit, backup, bảng map).
- **Tuần 1–2**: Hợp nhất CSDL.
- **Tuần 3–4**: Chuyển UI component.
- **Tuần 5–6**: Di trú trang frontend.
- **Tuần 7–10**: Di trú backend.
- **Tuần 11**: Hợp nhất auth + utils.
- **Tuần 12**: Test, tài liệu, deploy.

## Kết luận

Kế hoạch này cho lộ trình gộp **client-next** và **server-nest** thành **LawLink**, tạo một ứng dụng hợp nhất với nhiều miền (nghiệp vụ + genealogy + ERP). Tổng công lượng 11–12 tuần với 1–2 dev. Bước tiếp theo: bắt đầu Pha 0 ngay.

## Phụ lục
- Phụ lục A: Kiểm kê toàn bộ tệp.
- Phụ lục B: ERD.
- Phụ lục C: Bảng map component (chi tiết).
- Phụ lục D: Bảng map API (chi tiết).
- Phụ lục E: Báo cáo phủ test.

---

**HẾT KẾ HOẠCH DI TRÚ**
