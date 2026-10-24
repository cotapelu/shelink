# So sánh AUTO-CONTINUE.md vs AGENTS.md

**Ngày**: 2025-06-30
**Phiên bản**: AUTO-CONTINUE v2.2 vs AGENTS.md v2.1
**Mục đích**: Phân tích xung đột và đề xuất triển khai an toàn.

---

## 1. Tổng quan

| Khía cạnh | AGENTS.md (hiện tại) | AUTO-CONTINUE.md (đề xuất) | Đánh giá |
|---|---|---|---|
| Dòng công việc | Thủ công, theo yêu cầu | Tự chủ, vòng lặp liên tục | ⚠️ Có thể thêm nhưng cần duyệt |
| Mức tự chủ | Human-in-the-loop | Tự chủ đầy đủ (sửa, commit, push) | ❌ XUNG ĐỘT |
| Thao tác Git | Chỉ thủ công, cần duyệt | Tự commit, tự revert | ❌ XUNG ĐỘT |
| Sửa code | Chỉ thủ công | Tự sửa vi phạm | ❌ XUNG ĐỘT |
| Chu kỳ phát hiện | Không có | Mỗi 2 giờ (tự động) | ✅ Có thể thêm (chỉ đọc) |
| Theo dõi chỉ số | Không có | AGENT_METRICS, AGENT_PROFILE, EVOLUTION | ✅ Có thể thêm |
| Cổng chất lượng | Có (từng phần) | ≥90 điểm | ✅ Tương thích |
| Kiểm toán | Có (10 chiều) | Có (bắt buộc trước verify) | ✅ Tương thích |

## 2. Xung đột nghiêm trọng (cần sửa AGENTS.md)

### 2.1 Đường đỏ (AGENTS.md §7)

AGENTS.md nói: "Liên quan đường đỏ (xóa file, sửa `.env`/CI, `git push/reset/rebase`, triển khai sản xuất, migration schema) **phải** xin chủ sở hữu."

AUTO-CONTINUE.md yêu cầu: tự sửa code (không review), tự commit, tự revert, có thể tự push.

**Kết luận**: ❌ Xung đột trọng tâm.

**Giải pháp**:
1. Sửa AGENTS.md §7 để thêm ngoại lệ rõ ràng: "Agent tự chủ (được duyệt) có thể tự commit/revert nếu: (a) chỉ ở chế độ discovery-only, hoặc (b) chỉ sửa tài liệu/test, hoặc (c) full-auto kèm phê duyệt bằng văn bản + biện pháp an toàn."
2. Hoặc giới hạn AUTO-CONTINUE ở chế độ **chỉ phát hiện** (không sửa code, không commit).

### 2.2 Thao tác Git

| Thao tác | AGENTS.md | AUTO-CONTINUE.md | Xung đột |
|---|---|---|---|
| `git commit` | Chỉ thủ công | Tự commit mỗi chu kỳ | ❌ |
| `git revert` | Chỉ chủ sở hữu | Tự động khi khẩn cấp | ❌ |
| `git push` | Cần duyệt | Có thể tự động | ❌ |
| `git reset/rebase` | Cần duyệt | Không đề cập (nhưng có thể) | ⚠️ |

Rủi ro: tự commit có thể đẩy code chưa review lên nhánh chính.

### 2.3 Quyền sửa code

AGENTS.md: sửa code phải qua sửa tài liệu trước → chạy lệnh xác thực → xác nhận cục bộ → giao thủ công.

AUTO-CONTINUE: "tự sửa vi phạm", không có human review.

Rủi ro: lỗi từ tự sửa có thể ảnh hưởng sản xuất.

## 3. Xung đột nhẹ

- **Vòng lặp liên tục vs thủ công**: có thể để AGENTS.md cho chọn chế độ.
- **Tệp chỉ số**: là bổ sung, không xung đột; có thể khai báo tuỳ chọn.
- **Ngưỡng cổng chất lượng**: là cải thiện; tích hợp được.

## 4. Việc cần sửa AGENTS.md

### 4.1 §7 — thêm ngoại lệ (mẫu)
```
**Đường đỏ (cần duyệt)**:
- Xóa file
- Sửa `.env`/CI
- `git push`/`reset`/`rebase`
- Triển khai sản xuất
- Migration schema
- **Thao tác của agent tự chủ** (auto-commit, auto-revert, auto-push) — CHỈ được phép khi:
  - [ ] Chế độ chỉ phát hiện (chỉ đọc, không sửa code)
  - [ ] Chế độ sửa hạn chế (chỉ tài liệu/test)
  - [ ] Chế độ full-auto (có phê duyệt văn bản + guardrails)
```

### 4.2 Thêm mục "Khung Agent Tự chủ"
```
**Mức tự chủ**:
1. **Chỉ phát hiện**: quét chỉ đọc, sinh báo cáo; KHÔNG sửa code, KHÔNG Git.
2. **Sửa hạn chế**: có sửa code nhưng cần PR; KHÔNG tự commit.
3. **Full-auto**: sửa, commit, revert (cần phê duyệt văn bản + kế hoạch rollback).

**Tệp cần có**:
- `docs/AGENT_METRICS.md` — theo dõi chỉ số
- `docs/AGENT_PROFILE.md` — hồ sơ điểm yếu
- `docs/EVOLUTION.md` — lộ trình
- `docs/AUTO-CONTINUE.md` — định nghĩa quy trình

**Guardrails bắt buộc (mọi chế độ)**:
- [ ] Ngưỡng bộ nhớ (vd 90%)
- [ ] Ngưỡng tỉ lệ lỗi (vd 5%)
- [ ] Giới hạn lệnh mỗi chu kỳ (≤3)
- [ ] Điểm kiểm tra review (mỗi 10 nhiệm vụ)
- [ ] Nút dừng khẩn cấp
- [ ] Khôi phục được (git revert)

**Quy trình duyệt**:
1. Nộp đề xuất AUTO-CONTINUE.md
2. Review với chủ sở hữu
3. Chốt phạm vi + guardrails
4. Chạy thí điểm 2 tuần (chỉ phát hiện)
5. Xem chỉ số → quyết giai đoạn tiếp
```

## 5. Rủi ro nếu làm ẩu

| Rủi ro | Mức độ | Ảnh hưởng | Giải pháp |
|---|---|---|---|
| Tự commit code lỗi | Cao | Sập sản xuất | Chỉ phát hiện trước |
| Tự revert mất dữ liệu | Trung bình | Mất code | Review theo lô |
| Tài nguyên tiến trình liên tục | Thấp | CPU/RAM | Giới hạn lô |
| Xung đột với chỉnh sửa của người | Trung bình | Mã trùng | Tạm dừng khi xung đột |
| Tự sửa lỗi bảo mật | Cao | Rò dữ liệu | Kiểm toán trước verify |

## 6. Bế tắc giữa AGENTS.md và AUTO-CONTINUE.md

Hiện AUTO-CONTINUE.md yêu cầu "commit bắt buộc", "tự sửa code", "vòng lặp liên tục" — vi phạm đường đỏ AGENTS.md. Giải: sửa AGENTS.md trước, hoặc chỉ chạy AUTO-CONTINUE ở chế độ only-discovery.

## 7. Khuyến nghị

- **Phương án 1 (an toàn, không cần sửa AGENTS.md)**: chỉ chạy discovery-only; không sửa, không commit.
- **Phương án 2 (triển khai đầy đủ, cần sửa AGENTS.md)**: sửa §7 + thêm mục Agent Tự chủ + guardrails + phê duyệt văn bản.
- **Phương án 3 (lai)**: GĐ1 chỉ phát hiện → GĐ2 sửa hạn chế (PR review) → GĐ3 full-auto (sau khi tín nhiệm đủ).

**Kết luận**: AUTO-CONTINUE mạnh nhưng xung đột AGENTS.md. Không nên chạy full-auto ngay.
