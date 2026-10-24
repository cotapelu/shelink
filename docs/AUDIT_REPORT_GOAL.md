# Báo cáo Kiểm toán Hệ thống LawLink

**Ngày kiểm toán**: 2025-07-03
**Kiểm toán viên**: JF Autonomous Agent (khung GOAL.md v1.0)
**Mã nguồn**: LawLink v0.46 / Next.js 16 / TypeScript / Prisma 5
**Phạm vi**: Full-stack theo 10 chiều GOAL.

---

## Tóm tắt điều hành

**Rủi ro tổng thể: TRUNG BÌNH–CAO**

- **Lỗi nghiêm trọng**: 2
- **Lỗi cao**: 6
- **Lỗi trung bình**: 8
- **Lỗi thấp**: 3
- **Cần ~5–7 ngày**: 5–7 ngày để sửa.
- **Health Score**: 78/100 (phủ câu lệnh 85.81%, hàm 73.02% <80%, 61 vi phạm lint).

**Phát hiện then chốt**:
1. ✅ **Xác thực & Phân quyền** — hệ quyền tốt, assertion chi tiết.
2. ⚠️ **Ghi audit log** — có nhưng lỗi không chặn; chưa rà PII scrub.
3. ❌ **Giới hạn tốc độ** — không nhất quán (có endpoint miễn trừ), chưa tách IP/user.
4. ⚠️ **Khả năng quan sát** — có correlation id nhưng log thô, không OpenTelemetry.
5. ❌ **Chất lượng code** — 61 hàm vượt 30 dòng → khó duy trì/test.
6. ⚠️ **Phủ** — hàm 73.02% dưới 80%; một số module <40%.

---

## Chi tiết theo chiều

### 🔥 [CAO] 1. Rủi ro bỏ qua kiểm tra quyền trong một số luồng
- Vị trí: server action và API route thay đổi trạng thái có thể thiếu `assertCanModifyMatter` / `assertCanAccessMatter`.
- Tác hại: user không thuộc dự án vẫn sửa được nếu gọi trực tiếp API → rò rỉ dữ liệu.
- Cách sửa: rà toàn bộ `src/server/*/actions.ts`; bọc mọi endpoint ghi bằng `requireMatterAccess`; viết test nhiều vai trò gọi trái quyền → 403.
- Ưu tiên: P1.

### 🔥 [CAO] 2. JWT không dùng RS256 (STRIDE: giả mạo)
- Vị trí: `src/lib/auth/options.ts`; NextAuth mặc định HS256 với `NEXTAUTH_SECRET`.
- Rủi ro: secret lộ → giả được token. RS256 (bất đối xứng) an toàn hơn.
- Cách sửa: cặp khóa RSA; private ở env; tùy chỉnh `jwt.encode/decode`; giảm `maxAge` xuống 1–4h.
- Ưu tiên: P1.

### 🔥 [NGHIÊM TRỌNG] 3. Ngoại lệ giới hạn tốc độ tạo lỗ hổng DoS
- Vị trí: `src/proxy.ts` — các route `/api/approvals/seals`, `/api/archive` bị miễn trừ.
- Tác hại: tấn công tràn → cạn CPU/RAM/kết nối DB → sập dịch vụ.
- Cách sửa: bỏ miễn trừ; áp giới hạn cho mọi `/api/*`; endpoint nặng tăng `maxRequests`; thêm giới hạn theo user (không chỉ theo IP).
- Ưu tiên: P0.

### 🔥 [CAO] 4. Hàm vượt ngưỡng kích thước/phức tạp (khó duy trì)
- 61 hàm vượt 30 dòng (vd `SealRequestSheet` 327, `ClientSheet` 615, `PendingArchiveTable` 825).
- Cách sửa: trích sub-component/helper; tách dữ liệu/kiểm tra/ghi; mục tiêu ≤30 dòng (UI ≤50).
- Ưu tiên: P2.

### 🔥 [CAO] 5. Phủ hàm 73% <80%
- Module <70% hàm: `intake-sheet.tsx` (21.79%), `cause-section.tsx` (11.11%), `parties-section.tsx`, `client-sheet.tsx` (35.38%)….
- Cách sửa: ưu tiên component <50%; chia nhỏ để test; RTL+Vitest test hợp lệ/lỗi/trạng thái rỗng/kiểm quyền.
- Ưu tiên: P1.

### 🔥 [CAO] 6. Thiếu giới hạn tốc độ theo user (DoS)
- Hiện chỉ giới hạn theo `IP:endpoint`; chưa có `user:endpoint`.
- Rủi ro: dùng IP xoay vòng hoặc NAT công ty để né giới hạn.
- Cách sửa: giới hạn kép đỏ-IP/user (vd 100/phút IP + 200/phút user).
- Ưu tiên: P1.

### ⚠️ [TRUNG BÌNH] 7. Thiếu log JSON có cấu trúc (quan sát)
- Log bằng `console.*`; thiếu trường chuẩn (time, level, correlationId, userId, matterId).
- Cách sửa: pino/winston JSON; bọc `logger.info({...})`; phân cấp level.
- Ưu tiên: P2.

### ⚠️ [TRUNG BÌNH] 8. Thiếu ranh giới transaction cho thao tác nhiều bước
- vd `convertIntakeToMatter` tạo nhiều bảng nhưng chưa `$transaction` atomic.
- Cách sửa: audit thao tác >1 ghi; bọc `prisma.$transaction`.
- Ưu tiên: P2.

### ⚠️ [TRUNG BÌNH] 9. Thiếu timeout cho request (chịu lỗi)
- Gọi ngoài (DB, HTTP, S3) chưa đặt timeout.
- Cách sửa: Prisma thêm `connect_timeout=10`; HTTP client timeout 10s; S3 timeout.
- Ưu tiên: P2.

### ⚠️ [TRUNG BÌNH] 10. Chưa có circuit breaker cho backend
- Cần: ngưỡng 5 lỗi/phút → mở mạch 60s; half-open thử lại.
- Ưu tiên: P2.

### ⚠️ [TRUNG BÌNH] 11. Kiểm tra file upload có thể lách MIME/magic bytes
- Cần kiểm cả phần mở rộng và magic bytes; whitelist MIME; đổi tên UUID; quét virus nếu được.
- Ưu tiên: P2.

### ⚠️ [TRUNG BÌNH] 12. Thiếu chỉ mục trường truy vấn nóng (scalability)
- Cần: `Deadline(dueAt)`, `Hearing(startsAt)`, `AuditLog(userId, action, createdAt)`, `Matter(primaryClientId)`….
- Ưu tiên: P2.

### ⚠️ [THẤP] 13. Thiếu health check thành phần
- `/api/health` chỉ trả tĩnh. Cần `/health/ready` kiểm DB/cache/disk; trả 503 khi lệ thuộc sập.
- Ưu tiên: P3.

### ⚠️ [THẤP] 14. Duplication không tích hợp CI
- Script `duplication` (`jscpd`) có nhưng chưa chạy CI.
- Ưu tiên: P3.

### ⚠️ [THẤP] 15. Không retry lỗi DB thoáng qua
- Cần retry backoff (3–5 lần) cho truy vấn đọc; loại trừ ghi không idempotent.
- Ưu tiên: P3.

---

## Kiểm tra tuân thủ

### GDPR (bảo vệ dữ liệu)
- ⚠️ **Một phần**: giữ tối thiểu trường; không có UI quản lý consent.
- ✅ Xóa mềm (`deletedAt`).
- ❌ **Thiếu**: endpoint xuất dữ liệu cá nhân; DPIA.
- Khe: `/api/me/data-export` xuất JSON/CSV.

### PCI-DSS
- ❌ **Không áp dụng**: không lưu thẻ. Nếu sau này xử lý thanh toán thì bước vào phạm vi PCI.

### HIPAA
- ⚠️ **Một phần** nếu xử lý dữ liệu sức khỏe; có audit log nhưng chưa bắt buộc mã hoá-at-rest ở Postgres.
- ❌ **Thiếu**: BAA, kế hoạch ứng phó 24/7.

### SOX
- ⚠️ **Một phần**: audit log có, nhưng tính tiền/phân chia cần log bất biến + phân tách nhiệm vụ.
- ❌ **Thiếu**: nhật ký thay đổi (ai deploy gì lúc nào).

---

## Khe hổng Khả năng quan sát

- **Thiếu log**: request JSON, business event có ngữ cảnh, cảnh báo query chậm >100ms.
- **Thiếu metric**: Prometheus `/metrics`; `http_requests_active`, `db_connections_active`, `storage_usage_bytes`.
- **Thiếu cảnh báo**: lỗi >1%, p99 >1s, RAM >80%, đĩa <20%.

## Mô hình đe doạ STRIDE

| Mối đe doạ | Mức độ | Giảm nhẹ |
|---|---|---|
| Giả mạo danh tính | Cao | HS256 → RS256 |
| Giả mạo dữ liệu | Thấp | Zod + Prisma parameterized OK |
| Chối bỏ | Trung bình | AuditLog có nhưng không chặn; đảm bảo không xóa |
| Lộ thông tin | Trung bình | Cần scrub PII trong log |
| Từ chối dịch vụ | Cao | Miễn trừ rate-limit + thiếu per-user |
| Nâng quyền | Cao | Kiểm tra quyền không đồng nhất |

**DREAD**: JWT yếu 7→P0; bypass rate-limit 8→P0; bypass quyền 9→P0 nếu tồn tại.

## Hiệu năng & Scalability

- Điểm nóng phức tạp: N+1 (kiểm `include` của `listMatters`); O(n²) trong search (cần đo); không thấy I/O chặn.
- Tải DB: thiếu chỉ mục `Deadline(date)`, `Hearing(startsAt)` khiến query lịch chậm.

## Ma trận ưu tiên

| Ưu tiên | Số lượng | Vấn đề |
|---|---|---|
| P0 (ngay) | 1 | ngoại lệ giới hạn tốc độ |
| P1 (sprint này) | 6 | JWT RS256, kiểm tra quyền, phủ <80%, per-user rate-limit, hàm lớn, DB transaction |
| P2 (sprint tới) | 8 | log JSON, circuit breaker, kiểm tra file, chỉ mục, health check, retry, duplication CI |
| P3 (tuỳ chọn) | 2 | metrics endpoint, alerting |

**Trọng tâm sprint 1 (2 tuần)**: P1 → Health >85, phủ hàm >80, vá bảo mật then chốt.

## Ký duyệt cần

- [ ] **Bảo mật** — duyệt đổi thuật toán JWT, giới hạn tốc độ.
- [ ] **SRE** — xác thực health check, observability, metrics.
- [Tech Lead** — duyệt kế hoạch refactor hàm lớn.
- [ ] **Chủ sở hữu/Product** — xác nhận yêu cầu xuất dữ liệu (GDPR).

## Bước xác minh

1. Chạy `npm run lint` sau refactor → 0 vi phạm hàm lớn.
2. `npm test -- --coverage` → hàm ≥80%, nhánh ≥80%.
3. `npm run build` vẫn pass.
4. `npm audit` → không high.
5. Test quyền thủ công: gõ dự án người khác bằng vai trò LAWYER → 403.
6. Test rate-limit: 200 request tới `/api/archive/...` → 429 sau 100.
7. Health: `curl .../api/health/ready` → 200 chỉ khi DB sống.
8. Log: kiểm ra console dạng JSON.

---

**Hết Báo cáo Kiểm toán**
