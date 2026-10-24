# Tóm tắt Di trú Module

**Ngày**: 2025-06-26
**Trạng thái**: ✅ Backend xong, UI lõi xong

## Model cơ sở dữ liệu (tổng ~70)

### Gốc LawLink (miền nghiệp vụ cốt lõi)
- User, AuditLog, CustomField(Def), Matter, Client, Document, DocumentFolder, DocumentTemplate, Invoice, Fee, FeeEntry, CauseOfAction, ConflictCheck, ArchiveRecord, Intake, SealRequest, MatterProcedure, ExpressTracking, ExternalContact, FirmFile, Note, Notification, Report, SystemSetting, SmsMessage, ...

### Di trú từ server-nest (genealogy + ERP)
- **Person**: Person, Relationship, Event, Lineage
- **ERP lõi**: WorkTask, Project, ProjectMember, ProjectMilestone, Team, TeamMember
- **Workflow**: Workflow, WorkflowStep, WorkflowTransition, WorkflowAudit
- **Dùng chung**: File, Report (gộp cái trùng)

## Server Actions đã cài

### Genealogy (`src/server/genealogy/`)
| Tệp | Hàm |
|---|---|
| actions.ts | Person/Relationship/Event: list/get/create/update/delete |
| lineage.actions.ts | Lineage CRUD |
| users/actions.ts | Liệt kê user (admin) |

### ERP (`src/server/erp/`)
| Tệp | Hàm |
|---|---|
| actions.ts | Task/Project CRUD |
| workflow.actions.ts | Workflow/Step/Transition/Audit |

### Intake (`src/server/intake/`)
| Tệp | Hàm |
|---|---|
| actions.ts | listIntakes, getIntake, createIntake, updateIntake, assignIntake, convertIntakeToMatter, deleteIntake |

### Dịch vụ dùng chung (`src/server/shared/`)
| Tệp | Hàm |
|---|---|
| notification.actions.ts | list, count-unread, mark-read, mark-all, create |
| files.actions.ts | upload/get/delete/list |
| reports.actions.ts | list/get/generate/delete |
| stats.actions.ts | dashboard/genealogy/erp thống kê |
| seals.actions.ts | request/list/get/approve/reject/stamp |
| preservation.actions.ts | create/list/get/renew/close |
| express.actions.ts | create/list/updateStatus |
| sms.actions.ts | send/list |
| settings.actions.ts | get/update |

## Trang frontend đã di trú

| Route | Miền | Backend | Trạng thái |
|---|---|---|---|
| `/genealogy/persons` | Gia phả | getPersons | ✅ |
| `/genealogy/events` | Gia phả | getEvents+getPersons | ✅ |
| `/genealogy/kinship` | Gia phả | tính quan hệ | ✅ |
| `/genealogy/lineage` | Gia phả | lineage | ✅ |
| `/genealogy/stats` | Gia phả | stats | ✅ |
| `/genealogy/users` | Gia phả | getUsers | ✅ |
| `/erp/tasks` | ERP | listTasks | ✅ |
| `/erp/tasks/board` | ERP | listTasks (kanban) | ✅ |
| `/erp/projects` | ERP | listProjects | ✅ |

**Component UI**: Thành phần shadcn/ui đã tích hợp; component riêng genealogy/ERP nằm ở `src/components/domain/`.

## Còn treo (tuỳ chọn)

- Trang UI cho module mới: Files, Reports, Seals, Preservation, Express, SMS, Intake, Settings.
- Test: unit, e2e.
- Deploy: Docker, CI/CD.
- RBAC chi tiết trong server actions (hiện chỉ kiểm session).
- Xử lý lỗi thrown chuẩn hoá.
- Ghi audit đầy đủ cho mọi hành động.
