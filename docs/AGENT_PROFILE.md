# Hồ sơ Điểm yếu Agent

**Mục đích**: Theo dõi module dễ vỡ, stack dễ sai, vùng sửa tốn chi phí cao.
**Cập nhật**: Sau mỗi chu kỳ, dựa trên lỗi và hồi quy.
**Dùng cho**: Agent tự chủ tránh lặp lại lỗi cũ.

---

## Module dễ vỡ

| Module | Nguyên nhân | Tỉ lệ lỗi | Sự cố gần nhất | Cách khắc phục |
|---|---|---|---|---|
| `intakes/_components/claim-section.tsx` | Dùng `@ts-nocheck` tạm; props chưa đủ kiểu | N/A | 2025-07-03 | Thay `@ts-nocheck` bằng interface kiểu chặt |
| `.../lawyer-section.tsx` | tương tự | N/A | 2025-07-03 | Tương tự |
| `.../procedure-core-section.tsx` | tương tự | N/A | 2025-07-03 | Tương tự |
| `server/matters/actions.ts` | Hàm >200 dòng, kiểm tra quyền chưa đồng nhất | TBD | 2025-07-03 | Rà mọi action, bọc assert, tách hàm lớn |
| `server/intakes/actions.ts` | Hàm ~300 dòng, convert thiếu transaction | TBD | 2025-07-03 | Bọc `$transaction`, thêm assert |
| `server/archive/actions.ts` / `pending-archive-table.tsx` | Tệp 825 dòng, check quyền mờ | TBD | 2025-07-03 | Refactor, xác nhận gate quyền, thêm test |
| `clients/_components/client-sheet.tsx` | 615 dòng, render điều kiện nhiều | TBD | 2025-07-03 | Trích section, tăng phủ |
| `matters/[id]/_components/procedure-content.tsx` | 1357 dòng (God Object) | TBD | 2025-07-03 | Tách nhỏ |
| `lib/auth/options.ts` | JWT HS256 (nên RS256) | Cao | 2025-07-03 | RS256, giảm maxAge |
| `proxy.ts` | Miễn trừ rate-limit tạo vector DoS | Nghiêm trọng | 2025-07-03 | Bỏ miễn trừ, giới hạn mọi `/api/*` |
| `api/documents/[id]/download` | Token tải file? | TBD | 2025-07-03 | Token ký ngắn hạn |
| `lib/storage/file-validator.ts` | Rủi ro lách MIME | Trung bình | 2025-07-03 | Kiểm magic bytes, whitelist, quét virus |

**Hành động khắc phục** (từ audit 2025-07-03):
- [x] Rà kiểm tra quyền (mẫu 10 module) — nhất quán.
- [x] Giới hạn theo-user đã cài.
- [~] RS256 (code xong, chờ deploy).
- [x] Sửa miễn trừ rate-limit (P0).
- [ ] Refactor hàm >200 dòng (P1).
- [ ] Ranh giới transaction cho thao tác nhiều bước (P1).
- [ ] Bỏ qua/hoàn thiện `approveInvoiceRequest` transaction.
- [ ] Log JSON có cấu trúc (P2), circuit breaker (P2), chỉ mục DB (P2), timeout (P2), health check đầy đủ (P3), retry (P3).

## Dead Code (2026-08, AUTO-37)
- `transformAMap/transformBMap/suffix` trong `utils/kinship/bloodGraph.ts`: không import → cảnh báo lint. **Chưa xoá** vì AGENTS.md §5.7 cấm xoá code khi chưa duyệt.
- `emptyToNull/normalizeLitigationStanding/buildClientLinks/buildParties/buildProcedure/NewProcedurePartyInput` import không dùng trong `server/matters/actions.ts` — chưa xoá, dọn ở chu kỳ riêng.

## Cải thiện gần đây
- Refactor ContactsView/EventCard khỏi gate dòng-hàm.
- `gedcom/parser`: phức tạp `parsePersonRecord` 38→13.
- `dateHelpers.getZodiacSign`: 51→1.
- Đẩy phủ nhánh ~64.7%→~68%+.
- Giảm lint ~2070→~1300+.
- **AUTO-38 (2026-10-24)**: sửa lỗi `rules-of-hooks` — hook `useWatch` bị gọi trong helper thường `watchField` (root cause: tên helper không bắt đầu `use`, tránh bằng cách đặt tên custom hook `use…`); trích `useIntakeFormStates` thành 2 sub-hook (+2.37% phủ hàm); `DocCard`/`NewFolderDialog` xuống ngưỡng 50 dòng; giảm 16 `no-unused-vars`.

## Lỗi dễ lặp (ghi nhận từ AUTO-38)
- **Tên helper chứa hook**: hàm gọi `useXxx` phải bắt đầu bằng `use` — rename thay vì `eslint-disable`.
- **`argsIgnorePattern` chưa cấu hình**: tham số không dùng trong callback phải bỏ hẳn (TS cho phép ít tham số hơn), không đặt tên `_g` (vẫn warning).
- **refreshPrep trong useCallback**: bọc callback theo `[matterId]` rồi thêm vào deps — ổn định ref, không gây vòng lặp effect.

## Stack dễ lỗi

| Stack | Lỗi thường gặp | Cách giảm |
|---|---|---|
| NextAuth | Mặc định HS256, session quá dài | RS256, maxAge 1–4h, quay secret |
| Prisma | Thiếu transaction, N+1 | `$transaction`, `include` rõ ràng, thêm chỉ mục |
| RSC | Component quá lớn, rò rỗ server/client | Trích component, tôn trọng `'use client'`, tách logic |
| Rate limiting | In-memory chỉ dùng 1 instance, endpoint miễn trừ | Redis khi cluster, bỏ miễn trừ, tách IP/user |
| File storage | Chỉ dựa phần mở rộng | magic bytes, whitelist, ClamAV |
| API route | Không timeout DB/HTTP | Đặt timeout, circuit breaker |

## Anti-patterns theo dõi (GOAL.md v1.0 — 12 mẫu)

| # | Mẫu | Mô tả | Cách sửa |
|---|---|---|---|
| 1 | God Object | Class >300 dòng hoặc >10 hàm | Tách trách nhiệm |
| 2 | Arrow Code | Lồng >3 tầng | Guard clause, return sớm |
| 3 | Magic Constant | Số/chuỗi không tên | Hằng số tên, enum |
| 4 | Shotgun Surgery | >2 chỗ lặp logic | Trích hàm, DRY |
| 5 | Circular Dependency | Vòng phụ thuộc module | Inversion of control |
| 6 | Deep Inheritance | >2 tầng kế thừa | Composition over inheritance |
| 7 | Feature Envy | Lấy dữ liệu object khác >3 lần | Chuyển hàm sang object đó |
| 8 | N+1 Queries | Vòng lặp gọi DB | Batch/join |
| 9 | Blocking I/O trong async | I/O đồng bộ trong ngữ cảnh async | API async, worker |
| 10 | Thuật toán O(n²) | Lặp lồng cùng dữ liệu | HashMap, index |
| 11 | Unbounded Cache | Không TTL/eviction | TTL/LRU/giới hạn size |
| 12 | Sync Rate Limiting | Giới hạn chặn luồng | Token/leaky bucket bất đồng bộ |

**Ngưỡng**: hàm ≤20 dòng (nghiệp vụ) / ≤50 (UI); cyclomatic ≤10; lồng ≤3; không clone >5 dòng.

## Vùng sửa tốn chi phí cao

| Vùng | Nguyên nhân | Giờ TB | Thời gian rollback | Khuyến nghị |
|---|---|---|---|---|
| Server action lớn | Hàm >200 dòng | 4–8h | 1h | Tách trước |
| Cấu hình Auth | Đổi JWT bắt buộc đăng nhập lại | 2–4h | 1h | Làm ngoài giờ cao điểm |
| Migration DB | Add index trên bảng lớn khoá bảng | 2–6h | Nhanh (rollback SQL) | `CONCURRENTLY`, hẹn khung bảo trì |
| Di chuyển rate-limit memory→Redis | — | 4h | 30 phút | Feature flag, test staging |

## Nợ còn lặp lại

| Loại nợ | Số lượng (2026-07-19) | Xu hướng | Mục tiêu giảm |
|---|---|---|---|
| Vi phạm cỡ hàm (UI >50, server >20) | ~57 hàm | ↘️ | -5/tuần |
| Phủ hàm test | 79.52% (<80%) | ↗️ | chạm 80% chu kỳ tới |
| Phủ nhánh | 71.62% (<80%) | ↗️ | +3%/tuần |
| Lint | 944 problems (792 lỗi, 152 warning) | ↘️ (từ 2070) | Giữ 0 |
| TODO/FIXME | ~20 | ↔️ | -2/tuần |
| Chỉ mục thiếu | 5–8 trường then chốt | ↔️ | -2/tuần |
| Lỗ kiểm tra quyền | Đã rà (nhất quán) | ✅ | Cảnh giác |
| Component >500 dòng | 5 module | ↘️ | -1/tuần |
| Bypass kiểu trong test (`@ts-nocheck`) | 3 tệp | → | -3/tuần |
| Bypass cỡ hàm (`eslint-disable`) | 6 hàm | → | -2/tuần |

**Kế hoạch giảm nợ**:
- Tuần P0–P1: sửa vi phạm then chốt (rate-limit, JWT, kiểm tra quyền, phủ).
- Tuần P2: log JSON, circuit breaker, chỉ mục, health check.
- Tuần P3: tuân thủ (export GDPR, audit trail SOX).

## Sự cố / Phát hiện gần đây

| Ngày | Vùng | Vấn đề | Mức | Trạng thái |
|---|---|---|---|---|
| 2025-07-07 | Bảo mật | JWT HS256→RS256 | Cao | ✅ Code xong, chờ deploy |
| 2025-07-03 | Chịu lỗi | Miễn trừ rate-limit (DoS) | Nghiêm trọng | ✅ Đã sửa (P0) |
| 2025-07-07 | Toàn vẹn dữ liệu | `approveInvoiceRequest` thiếu `$transaction` | Cao | Đã ghi, hoàn thiện P1 |
| 2025-07-07 | Phân quyền | Kiểm tra quyền chưa nhất quán | Cao | ✅ Đã rà mẫu 10 module |
| 2025-07-07 | Test | Phủ hàm ~65% <80% | Cao | Đang đẩy (nhiều module) |
| 2025-07-03 | Duyy trì | 61 hàm >30 dòng | Cao | Chờ refactor |

## Bài học (từ audit GOAL)

1. Audit 10 chiều lộ ra lỗ hổng không thấy từ test local (per-user rate-limit, circuit breaker, health check).
2. **Bảo mật trước**: JWT và rate-limit là nền; trì hoãn tạo rủi ro hệ thống.
3. **Mô hình quyền**: nhiều hàm assert là tốt, nhưng phải dùng nhất quán → cần static analysis hoặc middleware bọc.
4. **Quan sát không thể "về sau"**: log JSON nên có từ đầu qua logger dùng chung.
5. **Ranh giới transaction**: thao tác nhiều bước phải nguyên tử; `$transaction` dễ viết mà dễ quên.
6. **Giới hạn cỡ hàm**: 30 dòng dài nhưng khả thi khi trích hàm; hàm lớn tương quan phủ thấp + lỗi nhiều.
7. **Tuân thủ xuyên suốt**: GDPR export, SOX audit trail, mã hoá nên thiết kế sớm.
8. **Nhận biết đỏ-vạch**: sửa auth, schema, sản xuất phải xin duyệt; agent tự chủ phải tôn trọng.

**Hành động cụ thể**:
- Chạy audit GOAL **2 tuần/lần**.
- Ưu tiên **P0** ngay.
- Refactor kiểu **trích component/hàm**.
- Giữ **Health Score** là KPI; +0.5%/tuần tối thiểu.
- Theo dõi **vi phạm cỡ hàm**, -5/tuần tới ≤10.

---

**Cập nhật lần cuối**: 2025-07-07 (JWT code xong)
**Lần rà kế**: 2025-07-10
**Trạng thái**: ✅ P0 xong; P1 đang làm (JWT chờ deploy, kiểm tra quyền, phủ, transaction)
