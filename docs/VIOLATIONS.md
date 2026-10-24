# Vi phạm & Kế hoạch cải thiện

**Tạo lúc**: 2025-06-30
**Chu kỳ phát hiện**: Căn cứ
**Khung**: AUTO-CONTINUE.md v2.2

---

## Tổng hợp

| Loại | Số lượng | Phân bố mức độ |
|---|---|---|
| Chất lượng (CODE_SMELL) | 32 | Medium: 32 |
| Lỗ hổng phủ test | 2 | High: 2 |
| Cấu hình | 1 | Low: 1 |
| **Tổng** | **35** | Critical: 0, High: 2, Medium: 32, Low: 1 |

---

## Vi phạm theo mức độ

### 🟡 MEDIUM (32) — cảnh báo biến không dùng

Ảnh hưởng: code phình, dễ nhầm, tăng chi phí duy trì.
Tổng ~40 cảnh báo rải ở 23 tệp (vd: `client-sheet.tsx`, `intake-sheet.tsx`, `matter-detail-tabs.tsx`, `procedure-forms.tsx`, `preservations-view.tsx`, `Avatar.tsx` dùng `<img>` thay `next/image`, ...).
Cách sửa: bỏ import/biến không dùng; thay `<img>` bằng `next/image`.
Công lượng ước tính: 8–12 giờ. Ưu tiên P2.

### 🟢 LOW (1) — cấu hình Next.js cũ

- `next.config.mjs`: `experimental.instrumentationHook` không còn cần.
- Cách sửa: xoá tag này. Ưu tiên P3.

---

## Kế hoạch cải thiện (2 tuần)

### Sprint 1: Sửa ưu tiên cao (ngày 1–5)
Mục tiêu: dọn vi phạm HIGH, đẩy phủ module trọng yếu.

1. **[T] server/preservations/actions.ts**: test đầy đủ (branch ≥80%).
2. **[T] lib/telemetry/metrics.ts**: test đầy đủ (branch ≥90%).
3. **[R]** giảm độ phức tạp server/preservations (tách hàm >50 dòng; cyclomatic ≤10).
4. **[S]** rà soát quyền trên mọi endpoint ghi trạng thái; đảm bảo kiểm session; ghi tài liệu.

Tổng ~32 giờ. Thành công: sạch vi phạm HIGH; phủ câu lệnh ≥92%, nhánh ≥87%.

### Sprint 2: Dọn nợ kỹ thuật (ngày 6–10)
1. Dọn import/biến không dùng (2 lô).
2. Refactor component sang `next/image`.
3. JSDoc cho API public (lib, server action).
4. Cập nhật phụ thuộc non-major (`npm outdated`).
5. Log có cấu trúc (JSON) kèm correlation id.

Tổng ~24 giờ.

### Sprint 3: Khả năng quan sát & hiệu năng (ngày 11–15)
1. Endpoint health: `/health/live`, `/health/ready` (kiểm DB/cache).
2. Prometheus metrics: `http_requests_total`, `http_request_duration_seconds`, `errors_total`.
3. OpenTelemetry tracing.
4. Tối ưu DB: dò N+1 (Prisma include/select), thêm chỉ mục còn thiếu.

Tổng ~18 giờ.

## Bảng tham chiếu loại tác vụ

| Mã | Loại | Hành động |
|---|---|---|
| R | Refactor | tách class/hàm lớn, trích interface, SOLID |
| P | Hiệu năng | cache, tối ưu truy vấn, lazy load, memo |
| S | Bảo mật | RBAC, WAF, mã hóa, luân chuyển secret, audit |
| T | Test | branch >85%, fuzzing, integration, property-based |
| D | Tài liệu | JSDoc, ADR, README, sơ đồ kiến trúc |
| O | Quan sát | OpenTelemetry, Prometheus, log JSON |
| C | Tuân thủ | GDPR/PCI/HIPAA |
| U | Nâng cấp | cập nhật phiên bản |
| M | Hiện đại | async/await, strict TS, CI/CD, container |

## Chỉ số thành công

- **Phủ test**: ≥92% câu lệnh, ≥87% nhánh.
- **Điểm chất lượng**: ≥95/100.
- **Không có vi phạm HIGH / Critical**.
- **Health Score**: ≥75.

**Bước tiếp**: Bắt đầu Sprint 1 việc 1 ngay — viết test trước rồi sửa cho `server/preservations/actions.ts`.
