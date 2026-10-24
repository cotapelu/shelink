# LawLink — Thiết kế Mô hình Dữ liệu

> 版本: v0.48 (thêm Quote/Contract/Timesheet/Expense/CashAccount — GĐ1 thương mại)
> Cập nhật: 2026-10-24
> Trạng thái: Là căn cứ để cài đặt `prisma/schema.prisma`

---

## 一、Khái niệm cốt lõi (đọc trước khi xem model)

LawLink trừu tượng hóa "một việc cần làm" của tổ chức thành 3 tầng:

```
Dự án (Matter)
  └── Giai đoạn xử lý (MatterProcedure) : thủ tục / pha xử lý
         └── Bước làm việc (MatterStage)
                └── Nhiệm vụ / Hẹn / Hạn / Tài liệu
```

- **Dự án (Matter)** = một công việc/hợp đồng toàn vẹn: khách hàng, loại hình, giá trị, trạng thái, hợp đồng, tài chính, phân chia.
- **Giai đoạn xử lý (MatterProcedure)** = một pha của công việc. Mỗi giai đoạn có mã/định danh, đơn vị xử lý, ngày bắt đầu/kết thúc, kết quả riêng. **Một dự án có nhiều giai đoạn nối tiếp.**
- **Bước làm việc (MatterStage)** = bước trong một giai đoạn.

**Vì sao tách như vậy**: Khách hàng vẫn là một, hợp đồng thường một bản xuyên suốt, nhưng mỗi giai đoạn lại có định danh, lịch và hạn riêng — cần quản lý tách bạch.

---

## 二、Nguyên tắc thiết kế

1. **Đơn thể đơn cơ sở dữ liệu.** Mọi bảng dùng chung một PostgreSQL; không để sẵn `organizationId`.
2. **Xóa mềm.** `Matter` / `Client` / `Document` / `Note` dùng `deletedAt`.
3. **Trường kiểm toán.** Mọi thực thể có `createdAt` / `updatedAt`; thực thể chính có `createdById`.
4. **Số tiền `Decimal(14,2)`.** Không dùng `Float`.
5. **Ưu tiên enum.** Trạng thái, vai trò, phân loại dùng Prisma `enum`.
6. **Có thể đảo ngược.** Xóa hoặc mềm, hoặc sinh audit để truy vết.
7. **Nhiều–nhiều dùng bảng liên kết tường minh** (`MatterMember` / `MatterClient`) để treo thêm trường.
8. **Mã hóa trường nhạy cảm.** `Document` hỗ trợ mật mã, khóa từ biến môi trường.

---

## 三、Sơ đồ ER (khái quát)

```
User ──(member of)── Dự án (Matter) ──┬── CauseOfAction (thư viện loại án/việc)
  │                          │
  │                          ├── MatterClient ── Khách hàng (Client) ── Contact
  │                          ├── MatterMember (chủ trì/cộng tác/trợ lý)
  │                          ├── MatterProcedure ──┬── MatterStage ── Nhiệm vụ
  │                          │                     ├── Hearing (Hẹn)
  │                          │                     ├── Deadline (Hạn)
  │                          │                     └── Document (Tài liệu)
  │                          ├── Party (Bên liên quan)
  │                          ├── RelatedEntity (Liên quan)
  │                          ├── Note (Ghi chép giao tiếp)
  │                          ├── Task (Nhiệm vụ chung)
  │                          ├── Document
  │                          ├── Billing ── FeeEntry
  │                          ├── CommissionPlan (Phân chia doanh thu)
  │                          ├── TimelineEvent / ArchiveRecord
  │                          ├── InvoiceRequest
  │                          ├── DocumentFolder / DocumentTemplate
  │                          └── SealRequest
  │
  ├── Intake (Tiếp nhận) ── Party / ConflictCheck ── ConflictHit
  ├── AuditLog
  └── (khối mở rộng) SmsMessage / Preservation / ExpressTracking / Notification / ...
```

---

## 四、Thiết kế chi tiết các model

### 4.1 User (Người dùng)

- `id, name, email (unique), passwordHash, role (UserRole), phone?, avatar?, active, lastLoginAt`
- Quan hệ: `ownedMatters, memberships, commissionPlans, feeEntriesBeneficiary/Recorded, authoredNotes, uploadedDocuments, auditLogs, receivedSmsMessages, ownedPreservations, notifications, ...`
- `role` thuộc enum `UserRole`: `ADMIN / OWNER / MANAGER / LAWYER(STAFF) / ASSISTANT / FINANCE`.

### 4.2 Client + Contact (Khách hàng & Liên hệ)

- `Client`: `name, type (INDIVIDUAL/COMPANY/ORGANIZATION), idNumber?, address?, phone?, email?, source?, tags, notes?, legalRep?, internalCode?, cooperationStatus?, industry?, gender?, ...`
- `Contact`: `name, title?, phone?, email?, wechat?, isPrimary, notes?`
- **Quyết định**: Lấy dự án làm trung tâm; cùng khách hàng tư vấn nhiều lần tạo nhiều `Intake`, không gộp.

### 4.3 Intake (Tiếp nhận)

- Các trường: loại hình, loại việc (liên kết `CauseOfAction`), mô tả, trạng thái, ngày nhận, lý do từ chối.
- Khách hàng + liên hệ; chương trình/giai đoạn đầu tiên; cơ quan xử lý; địa phương; vị thế của ta; giá trị; mô tả.
- Trường riêng theo loại (báo lưu ý / tư vấn / dự án đặc biệt…); phí (5 chế độ); người chủ trì + cộng tác.
- Liên quan: `parties, conflictChecks, matter, documents`.

- `IntakeStatus`: `INTAKE / PENDING_CONFIRMATION / CONVERTED / DECLINED / NEEDS_REVISION`.

### 4.4 Dự án (Matter) + Thành viên + Đa khách hàng

- `internalCode` (mã nội bộ tự sinh), `firmCaseNo?`, `title`, `category` (MatterCategory), `status` (MatterStatus).
- Loại việc (`causeId` / `causeFreeText`), giá trị, vị thế của ta, các cờ phản tố/báo lưu ý.
- Trường riêng loại phi tố tụng (businessType/serviceScope/deliverables/counselType/serviceStart/serviceEnd).
- Bên khách hàng chính (`primaryClientId`), chủ sở hữu (`ownerId`), nguồn (`intakeId`).
- Mốc thời gian: `intakeDate / firstAcceptedAt / closedAt / archivedAt`.
- Quan hệ: procedures, parties, relatedEntities, notes, tasks, documents, timelineEvents, billings, feeEntries, commissionPlans, archiveRecords, invoiceRequests, folders, sealRequests, smsMessages, preservations, expressTrackings, reviewRecords, linksFrom/linksTo, customValues.

- `MatterCategory` (khái quát hóa): bao gồm khối tố tụng gốc (CIVIL_COMMERCIAL/CRIMINAL/ADMINISTRATIVE...) **và** hướng mở cho loại hình doanh nghiệp chung. Xem §4.19 về "loại hình động".

- `MatterStatus`: `PENDING_ACCEPTANCE / IN_PROGRESS / ON_HOLD / CLOSED / ARCHIVED`.

- `MatterMemberRole`: `LEAD / CO_LEAD / ASSISTANT`. Bảng nối `MatterMember(matterId, userId, role, joinedAt)`.

- `MatterClient(matterId, clientId, label?, isPrimary, addedAt)`.

### 4.5 Giai đoạn xử lý (MatterProcedure) ⭐ cốt lõi

- `type` (ProcedureType), `customLabel?`, `engagement` (ENGAGED/INFORMATIONAL), `order`.
- Định danh/cơ quan/bản/người xử lý; `jurisdiction?`, `presidingJudge(+contact)`, `judgeAssistant(+contact)`, `ourStanding?`.
- `leadLawyerId?` (v0.44: chủ trì từng giai đoạn), `isExternalLead`.
- `acceptedAt / concludedAt`, `status`, `outcome`, `outcomeNote`.
- Quan hệ: `stages, hearings, deadlines, documents, procedureParties, memos`.

- `ProcedureType` (tập đầy đủ): khối tố tụng (FIRST_INSTANCE, SECOND_INSTANCE, RETRIAL_REVIEW, RETRIAL, REMAND_*, PROSECUTORIAL_SUPERVISION), khối trọng tài (COMMERCIAL_ARBITRATION, LABOR_ARBITRATION, ARBITRATION_SET_ASIDE, ARBITRATION_ENFORCEMENT_REVIEW), khối thi hành (ENFORCEMENT, ENFORCEMENT_OBJECTION), khối hình sự (INVESTIGATION, PROSECUTION_REVIEW, DEATH_PENALTY_REVIEW, CRIMINAL_ENFORCEMENT, COMMUTATION_PAROLE_REVIEW), khối hành chính (ADMIN_RECONSIDERATION, ADMIN_NON_LITIGATION_ENFORCEMENT), phi tố tụng (NON_LITIGATION_PHASE), đuôi (CUSTOM).
- `ProcedureStatus`: `PENDING / IN_PROGRESS / CONCLUDED`.
- `ProcedureEngagement`: `ENGAGED` (vào lịch/hạn/nhiệm vụ) hoặc `INFORMATIONAL` (chỉ tham khảo).
- `ProcedureOutcome`: thắng/thắng một phần/thua/hòa giải/rút/bác đi/hoàn thành/chuyển tiếp/khác.

**ProcedureParty** (đương sự theo giai đoạn): bản thân đương sự ở `Party`, vị thế gắn với từng giai đoạn. `ProcedureParty(procedureId, partyId, standing, ordinal, note)`; unique `(procedureId, partyId, standing)`.

**Lưu ý khái quát hóa**: `ProcedureType`/`handlingAgency` mang sắc pháp lý. Ở chế độ "công ty chung", tầng UI có thể ánh xạ ProcedureType → "Giai đoạn/hạng mục dự án" (ví dụ: Thiết kế → Thi công → Nghiệm thu), `handlingAgency` → "Đơn vị thực hiện".

### 4.6 Party / RelatedEntity / MatterLink

- `Party`: `role (CLIENT_PARTY/OPPOSING_PARTY/THIRD_PARTY/CO_LITIGANT/AGENT/WITNESS/OTHER)`, `standing?`, `ordinal`, `name`, `partyType`, các trường định danh, `contactName?`, liên kết doanh nghiệp (yuandian).
- `RelatedEntity(matterId, name, relationship, notes?)`.
- `MatterLink(matterId, relatedMatterId)` — liên kết dự án ↔ dự án, hai chiều.

### 4.7 Đánh giá rủi ro đối tác

- `ConflictCheck(intakeId?, queryPayload Json, conclusion, decidedBy?, decidedAt?, note?)`
- `ConflictHit(checkId, hitType, targetType, targetId, matchedName/Field/Value, matchedRatio?, severity, reason)`
- `ConflictSeverity`: `LOW / MEDIUM / HIGH / BLOCKING`. `ConflictConclusion`: `PENDING / SAME_SUBJECT / DIFFERENT / NEED_INFO`.

### 4.8 MatterStage / Task / Hearing / Deadline

- `MatterStage(procedureId, name, order, startedAt?, completedAt?)`.
- `LegalTask` (đổi tên từ Task, tránh va ERP `WorkTask`): gắn Matter hoặc Stage; `title, assigneeId?, dueAt?, completed, priority, teamId?`.
- `Hearing(procedureId, title, room?, address?, judge?, contact?, startsAt, endsAt?, notes?)`.
- `Deadline(procedureId, title, category (DeadlineCategory), dueAt, basis?, remindDays, completed)`. `DeadlineCategory` gồm `LIMITATION/EVIDENCE/APPEAL/PERFORMANCE/RESPONSE/ENFORCEMENT/ARBITRATION_SET_ASIDE/PRESERVATION/CUSTOM`.
- `ProcedureMemo(procedureId, content, done)` — ghi chú bước xử lý (v0.42).

### 4.9 Note (Ghi chép giao tiếp)

- `Note(matterId, authorId, channel (NoteChannel), withWhom?, occurredAt, content, tags, attachments[])`; xóa mềm.

### 4.10 Document (Tài liệu, có mã hóa)

- `matterId? / intakeId? / procedureId?`; `name, category, version, isLatest, familyId`.
- `path, mimeType?, size?, sha256?`.
- Mã hóa: `encrypted, algorithm?, iv?, authTag?`.
- Trạng thái kiểm duyệt: `status (DocumentStatus), reviewedBy/approvedBy (+ thời gian)`.
- v0.5: liên kết hóa đơn; v0.8: `folderId, templateId, templateContextSnapshot`; v0.17: `archiveChecklistItemId`.

**Mã hóa**: khóa chính từ biến môi trường `STORAGE_ENCRYPTION_KEY` (base64 32 byte); AES-256-GCM, IV ngẫu nhiên 12 byte/file; giải mã qua `/api/documents/[id]/download` (kiểm tra quyền → đọc mật mã → giải mã → stream).

### 4.11 Tài chính: Billing / FeeEntry / CommissionPlan

- `Billing(matterId, title, contractAmount, schedule?, status (BillingStatus), signedAt?)`.
- `FeeEntry(matterId, billingId?, type (FeeEntryType: RECEIVABLE/RECEIVED/REFUND/COST/COMMISSION), amount, occurredAt, invoiceNo?, invoiceFile?, payerOrPayee?, method?, note?, parentFeeEntryId?, beneficiaryUserId?, recordedById)`.
- `CommissionPlan(matterId, userId, percent, label?, active)`.

**Tự động phân chia**: khi tạo `FeeEntry {type: RECEIVED}`, gọi `applyCommission`, sinh `FeeEntry {type: COMMISSION, amount=-X*percent/100, parentFeeEntryId, beneficiaryUserId}` cho từng plan đang active; thu hồi thu thì thu hồi luôn COMMISSION.

### 4.12 TimelineEvent / ArchiveRecord / AuditLog

- `TimelineEvent(matterId, eventType, title, content?, occurredAt, refType?, refId?)`.
- `ArchiveRecord(matterId, archiveNo, summary, judgmentSummary?, closedReason?, completedAt?, checklistJson, missingItems[], coverDocId?, catalogDocId?, archivedBy/archivedById, status (PENDING_REVIEW/APPROVED/REJECTED), reviewedById?, reviewNote?)`.
- `AuditLog(userId?, action, targetType?, targetId?, detail?, ip?, userAgent?)` — không xóa được bằng nghiệp vụ.

### 4.13 Cấu hình hệ thống

- `StageTemplate(procedureType, isDefault, name, steps Json)`.
- `SystemSetting(key @id, value Json)`.

### 4.14 CauseOfAction (Thư viện loại việc)

- `category, code?, name, shortName?, level, parentId (tự tham chiếu), active, pinyin?, keywords, matters, intakes, sourceNote?`.
- **Khái quát hóa**: thư viện này có thể nâng thành "danh mục dịch vụ/loại công việc" cho công ty chung. Cấu trúc phân cấp (level/parent) giữ nguyên.

### 4.15 DocumentFolder (Tủ hồ sơ dự án) — v0.8

- `matterId, name, orderIndex, isDefault`; tự sinh theo loại hình khi tạo dự án.

### 4.16 DocumentTemplate (Mẫu tài liệu) — v0.8

- `name, category (TemplateCategory), description?, applicableCategories[], docxBlobId (unique → Document), variables Json, isBuiltIn, enabled, createdById?`.

### 4.17 SealTypeConfig (Cấu hình loại con dấu) — v0.8

- `type @id, label, description?, approverRoles UserRole[], requiresLegalRep, enabled`.

### 4.18 SealRequest (Phê duyệt dùng dấu) — v0.8

- `code (SEAL-YYYY-NNNN), sealType, matterId?, purpose, documentTitle, pageCount, requireCrossPageSeal, copies, urgency, draftDocId (unique), stampedDocId? (unique), status (PENDING/APPROVED/STAMPED/REJECTED/CANCELLED), requestNote/approveNote, requestedBy, approvedBy?, stampedBy, parentSealRequestId?`.

### 4.19 SmsMessage (Hộp tin nhắn) — v0.9

- `rawText, receivedAt, receivedById, parsedJson, smsType (SmsType), matchedMatterId?, matchedBy (AUTO_CASE_NUMBER/MANUAL/UNMATCHED), generatedHearingId?, generatedDeadlineId?, processed, processedAt?`.

### 4.20 Bảo toàn tài sản — v0.9 + v0.44 (3 tầng)

- **Cũ (v0.9)**: `Preservation(matterId?, type, propertyType, amount?, respondent, guaranteeType?, appliedAt?, startDate, duration, expiryDate, court?, rulingNumber?, propertyDetail?, ownerId?, remindDays[], status)` + `PreservationRenewal`.
- **Mới (v0.44, 3 tầng)**: `PreservationCase(matterId?, type, status, court?, rulingNumber?, guaranteeType?, appliedAt?, ownerId?, remindDays[])` → `PreservationTarget(caseId, name)` → `PreservationProperty(targetId, propertyType, propertyDetail?, amount?, startDate, duration, expiryDate, status)` + `PreservationPropertyRenewal`.
- Thời hạn mặc định theo loại tài sản: tiền gửi 365 ngày; xe/khác 730; bất động sản/vốn/IP 1095.

### 4.21 ExpressTracking (Theo dõi chuyển phát) — v0.9.3

- `matterId?, trackingNo, companyCode?, direction (INBOUND/OUTBOUND), purpose, recipient?, recipientPhone?, lastState?, lastUpdateAt?, tracesJson?, createdById`.

### 4.22 Notification (Thông báo) — v0.10

- `userId, type (NotificationType), priority, title, content?, href?, refType?, refId?, read, readAt?`.

### 4.23 ReviewRecord (Lịch sử kiểm tra AI) — v0.21

- `matterId, documentId, reviewedById, reviewedAt, itemCount, itemsJson, textPreviewChars, truncated`.

### 4.24 FirmFile (Tư liệu công ty) — v0.22

- `name, description?, category (FirmFileCategory), tags, path, mimeType?, size, sha256?, uploadedById, supersededById?, archivedAt?`.

### 4.25 Announcement / ExternalContact (Trung tâm dịch vụ) — v0.27

- `Announcement(title, content, pinned, publishedAt, expiresAt?, authorId, archivedAt?)`.
- `ExternalContact(name, category (ExternalContactCategory), organization?, title?, phone?, email?, wechat?, address?, notes?, tags, createdById, status (PENDING_REVIEW/APPROVED/REJECTED), reviewedById?, reviewNote?, archivedAt?)`.

### 4.26 CustomFieldDef (Trường tùy chỉnh) — v0.28

- `entityType (MATTER/CLIENT), key, label, fieldType (TEXT/NUMBER/DATE/SELECT), options[], required, order, enabled`. Giá trị lưu trong `customValues Json` của thực thể.

### 4.27 Khối "Genealogy" + "ERP" (kế thừa từ migration)

- **Genealogy**: `Person` (tự tham chiếu cha/mẹ), `Relationship`, `Event`, `Lineage`.
- **ERP nội bộ**: `WorkTask` (riêng biệt `LegalTask`), `SubTask`, `TaskHistory`, `TaskAssignment`, `TaskChecklistItem`, `TaskTag`, `TaskWatcher`, `TaskComment`, `Project`, `ProjectMember`, `ProjectMilestone`, `Workflow`, `WorkflowStep`, `WorkflowTransition`, `WorkflowAudit`, `Team`, `TeamMember`, `Comment`.
- Các bảng này mang tính nội bộ (tư vấn/gia phả/ERP) — có thể tách hoặc tắt ở bản dành cho công ty chung nếu không cần.

---

### 4.28 Báo giá (Quote) + Dòng báo giá (QuoteItem) — mới GĐ1

- `Quote`: `code (QT-{NĂM}-{NNNN})`, `title`, `clientId`, `contactId?`, `matterId?`, `intakeId?`, `contractId?` (gắn sau khi chuyển đổi), `status (QuoteStatus)`, `currency (mặc định VND)`, `issuedAt?`, `expiresAt?`, `validDays (mặc định 30)`, `subtotal`, `discountPercent`, `taxPercent`, `total`, `note?`, `ownerUserId?` (người phụ trách), `createdById?`, `deletedAt?`.
  - `QuoteStatus`: `DRAFT / SENT / ACCEPTED / REJECTED / EXPIRED / CONVERTED / CANCELLED`.
  - **Tính tiền tập trung** ở `src/server/quotes/pricing.ts` (pure function): `subtotal = Σ quantity × unitPrice`; `total = subtotal × (1 − discountPercent/100) × (1 + taxPercent/100)`. Mọi nơi (server action, tạo lại từ contract) đều gọi hàm này — không rải rác trong UI.
  - Chuyển đổi: `convertQuoteToContract` tạo `Contract` copy dữ liệu + set `Quote.status = CONVERTED`, `Quote.contractId`; `convertQuoteToMatter` tạo Matter từ quote (giữ `intakeId`/`quoteId` truy vết qua `RelatedEntity`/`MatterLink`).
- `QuoteItem`: `quoteId`, `name`, `description?`, `unit?`, `quantity Decimal(12,2)`, `unitPrice Decimal(14,2)`, `amount Decimal(14,2)` (lưu để tránh lệch số sau sửa đơn giá cũ), `orderIndex`. Xoá–ghi lại toàn bộ dòng khi cập nhật báo giá (draft mới khi đã gửi).

### 4.29 Hợp đồng (Contract) — mới GĐ1

- `Contract`: `code (CT-{NĂM}-{NNNN})`, `title`, `clientId`, `quoteId?`, `matterId?`, `status (ContractStatus)`, `amount Decimal(14,2)`, `currency`, `scope?` (phạm vi công việc), `paymentTerms?` (điều kiện thanh toán), `termNote?`, `signedAt?`, `effectiveAt?`, `expiresAt?`, `renewRemindDays (mặc định 30)`, `documentId?` (bản scan hợp đồng), `ownerUserId?`, `createdById?`, `deletedAt?`.
  - `ContractStatus`: `DRAFT / REVIEW / SIGNED / ACTIVE / EXPIRED / TERMINATED / RENEWED`.
  - Gia hạn: `renewContract` tạo bản ghi lịch sử `ContractEvent(kind=RENEWED)` và cập nhật `expiresAt` (không xoá dữ liệu cũ — nguyên tắc đảo ngược §二.6).
  - Sắp hết hạn: `listContractsDueForRenewal` phục vụ nhắc (email/Zalo GĐ2).
- `ContractEvent(id, contractId, kind (ContractEventKind: CREATED/SENT/SIGNED/ACTIVATED/RENEWED/TERMINATED/EXPIRED/NOTE), occurredAt, actorUserId?, detail?)` — chuỗi sự kiện bất biến cho audit nghiệp vụ.

### 4.30 Ghi giờ (TimesheetEntry) — mới GĐ1

- `userId`, `matterId?`, `legalTaskId?`, `workTaskId?`, `projectId?`, `date`, `hours Decimal(5,2)` (0.25 bước nhảy), `billable (mặc định true)`, `activityType (TimesheetActivityType)`, `description?`, `status (TimesheetStatus)`, `approvedById?`, `approvedAt?`, `rejectNote?`.
  - `TimesheetStatus`: `DRAFT / SUBMITTED / APPROVED / REJECTED`.
  - `TimesheetActivityType`: `CLIENT_WORK / INTERNAL / MEETING / TRAVEL / ADMIN / OTHER` (khái quát, không ràng buộc ngành).
  - **Bill rate**: tổng chi phí nhân công = Σ hours × billRate; billRate lấy theo cấu hình user (chưa có bảng rate ở GĐ1 → tính theo `SystemSetting.timesheet.defaultBillRate` hoặc để trống, không tạo bảng rate).
  - Chống ghi trùng: unique `(userId, date, matterId, legalTaskId, workTaskId)` (với NULL xử lý bằng partial index ở bước sau nếu cần).

### 4.31 Chi phí (ExpenseClaim) + Quỹ (CashAccount) — mới GĐ1

- `ExpenseClaim`: `code (EXP-{NĂM}-{NNNN})`, `title`, `matterId?`, `claimantUserId`, `category (ExpenseCategory)`, `amount Decimal(14,2)`, `occurredAt`, `vendor?`, `status (ExpenseStatus)`, `submittedById?`, `approvedById?`, `approvedAt?`, `paidAt?`, `receiptDocId?`, `note?`, `deletedAt?`.
  - `ExpenseStatus`: `DRAFT / SUBMITTED / APPROVED / REJECTED / PAID / CANCELLED`.
  - `ExpenseCategory`: `TRAVEL / HOSPITALITY / OFFICE / OUTSOURCING / EQUIPMENT / TAX_FEE / OTHER`.
  - Duyệt: ADMIN/OWNER/MANAGER (FINANCE duyệt phần PAID gắn quỹ). Khi `PAID` → sinh `FeeEntry {type: COST}` gắn `matterId` (nếu có) để luồng tiền dự án đầy đủ — đảm bảo cùng `$transaction`.
- `CashAccount`: `name`, `type (CashAccountType: CASH / BANK / EWALLET)`, `currency (mặc định VND)`, `openingBalance Decimal(14,2)`, `bankName?`, `accountNoMasked?` (chỉ lưu 4 số cuối — §七 che nhạy cảm), `active`, `note?`.
  - `FeeEntry` thêm `accountId?` → ghi nhận thu/chi theo quỹ; cân quỹ = `openingBalance + Σ thu − Σ chi` (tính tại chỗ, không tạo bảng số dư).
  - **Công nợ**: không tạo model mới — tuổi nợ tính từ `FeeEntry {type: RECEIVABLE}` trừ `{type: RECEIVED}` phân bổ theo `parentFeeEntryId` (có sẵn §4.11); nhắc nợ là task GĐ2 (email/Zalo).

### 4.32 Cấu hình thuật ngữ & email (không thêm model) — mới GĐ1

- **Thuật ngữ**: lưu `SystemSetting(key="terminology", value Json)` — map `matter|client|party|cause|procedure|quote|contract|timesheet|expense → label hiển thị`. Đọc qua `src/lib/terminology.ts` (defaults tiếng Việt) + hook client `useTerminology`. Schema/model giữ nguyên tên gốc (PRD quyết định #22).
- **Email**: không có model riêng. Cấu hình qua biến môi trường (`SMTP_HOST/PORT/USER/PASS/FROM`); gửi qua `src/server/email/mailer.ts` (nodemailer, lazy transport); mẫu mail ở `src/server/email/templates.ts` (message key i18n-ready theo GOAL §4.5).

## 五、Quy tắc sinh mã nội bộ

Định dạng: `LL-{NĂM}-{MÃ}-{4 số}`

| MÃ | Loại hình |
|---|---|
| `CC/CR/AD/NL/GC/SP` | (khối gốc: dân sự–thương mại / hình sự / hành chính / phi tố tụng / tư vấn thường xuyên / dự án đặc biệt) |
| Khi khái quát hóa | Mã loại hình động theo danh mục do admin định nghĩa |

Ví dụ: `LL-2026-CC-0001`. Bộ đếm theo `{NĂM+MÃ}` dùng `SystemSetting` (key=`code-counter-...`) tăng nguyên tử.

---

## 六、Chỉ mục quan trọng

| Chỉ mục | Mục đích |
|---|---|
| `Matter(status, updatedAt)` | Danh sách mặc định |
| `Matter(category, status)` | Lọc theo loại + trạng thái |
| `Matter(causeId)` | Thống kê theo loại việc |
| `MatterProcedure(matterId, order)` | Thứ tự giai đoạn trong dự án |
| `Deadline(dueAt, completed)` | Hạn toàn tổ chức |
| `Hearing(startsAt)` | Lịch hẹn |
| `Party(name/idNumber)`, `Client(name/idNumber)` | Đường nóng đánh giá rủi ro |
| `FeeEntry(matterId, type, occurredAt)` | Luồng tiền dự án |
| `FeeEntry(beneficiaryUserId, occurredAt)` | Thống kê doanh thu cá nhân |
| `Quote(status, createdAt)`, `Quote(clientId)` | Pipeline báo giá |
| `Contract(status, expiresAt)`, `Contract(clientId)` | Hợp đồng sắp hết hạn |
| `TimesheetEntry(userId, date)`, `TimesheetEntry(matterId, date)` | Lưới ghi giờ |
| `ExpenseClaim(status, createdAt)`, `ExpenseClaim(claimantUserId, occurredAt)` | Duyệt chi phí |
| `AuditLog(userId, createdAt)` | Truy vết thao tác |

---

## 七、Xử lý trường nhạy cảm

| Trường | Cách xử lý |
|---|---|
| `User.passwordHash` | bcrypt cost=12 |
| `Client.idNumber` / `Party.idNumber` | Nhập rõ; hiển thị che theo quyền (chỉ ADMIN/owner/chủ-trì-cộng-tác xem rõ) |
| `Document.path` | Không lộ ra frontend; đi qua `/api/documents/[id]/download` có kiểm tra |
| `Document` mật mã | Tùy chọn AES-256-GCM; khóa ở biến môi trường |
| `AuditLog` | Không bị xóa bởi nghiệp vụ; chỉ lưu trữ bằng script bảo trì |

---

## 八、Quyết định đã khóa (tương ứng schema)

1. Mã nội bộ tự sinh (`LL-{YEAR}-{...}`).
2. Lấy dự án làm trung tâm; không gộp khách hàng.
3. `MatterMember`: `LEAD/CO_LEAD/ASSISTANT`.
4. Phân chia doanh thu tích hợp.
5. Đa khách hàng (`MatterClient`), đa đương sự (`Party`).
6. Đa giai đoạn; tự do chọn giai đoạn bắt đầu; giai đoạn tham khảo `INFORMATIONAL`.
7. Mã hóa tài liệu tùy chọn.
8. Không làm công cụ di trarch dữ liệu ở V1.
9. Phân loại theo lĩnh vực (+ hướng loại hình động).
10. Giai đoạn chọn được theo loại hình (liên kết theo bảng `proceduresByCategory`).
11. `handlingAgency` = đơn vị xử lý (map sang mọi ngành).
12. Vị thế đương sự mô hình hóa riêng (`LitigationStanding`).
13. Loại việc từ thư viện; tránh nhập tay tuỳ tiện.
14. `intakeDate` và `firstAcceptedAt` tách riêng.
15. Báo giá (Quote) và Hợp đồng (Contract) là bước trung gian khuyến khích; dự án vẫn tạo trực tiếp được từ tiếp nhận.
16. Tính tiền báo giá (subtotal/chiết khấu/thuế/total) chỉ được cài đặt một lần, ở hàm thuần dùng chung.
17. Timesheet: `billable` mặc định `true`; duyệt theo tuần (SUBMITTED→APPROVED).
18. Chi phí khi `PAID` sinh `FeeEntry{type: COST}` trong cùng transaction; thu/chi gắn `CashAccount` (tuỳ chọn).

---

## 九、Mở rộng theo hướng công ty chung (khuyến nghị)

Khi dời sang quy trình "mọi công ty nhỏ":

1. **Danh mục loại hình động**: bảng `CategoryDefinition(entity, code, label, ...)` thay cho hard-code `MatterCategory`.
2. **Loại việc/Dịch vụ**: đổi tên trưng bày `CauseOfAction` → "Danh mục dịch vụ" nhưng giữ cấu trúc cây.
3. **Giai đoạn**: ánh xạ `ProcedureType` → "Giai đoạn dự án" (thiết kế/thi công/nghiệm thu…), lưu trong `StageTemplate` theo loại hình.
4. **Vị thế/Đối tượng**: `Party.role/standing` đổi thành vai trò thương mại (chủ đầu tư / nhà thầu / nhà cung cấp…).
5. **Cảnh báo rủi ro**: `ConflictCheck` dùng lại cho "đánh giá đối tác/nhà cung cấp" (đối chiếu lịch sử hợp tác, nợ xấu, mã số thuế).

> Những thay đổi này **sửa tài liệu này trước**, rồi mới đổi `prisma/schema.prisma` (theo đỏ-vạch trong AGENTS.md §5.6).

---

*Tài liệu này viết lại bằng tiếng Việt, bám sát nội dung DATA-MODEL gốc và các quyết định đã khóa. Mọi thay đổi schema phải khớp với file này.*
