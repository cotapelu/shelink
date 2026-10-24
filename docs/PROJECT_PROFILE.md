# Hồ sơ Dự án

**Tạo lúc**: 2026-08-12T09:00:21.864Z
**Nguồn**: Tự động phát hiện khi khởi động

## Quy mô
- Phân loại: **LỚN**
- Căn cứ:
  - Dòng mã: 64.512
  - Tệp: 411
  - Test: 182
  - Phụ thuộc: 83

## Rủi ro
- Phân loại: **THẤP**
- Căn cứ:
  - Từ khóa rủi ro cao: 0
  - Từ khóa rủi ro trung bình: 0
  - Từ khóa rủi ro thấp: 134

## Triển khai
- Phân loại: **ĐÁM MÂY**
- Nhà cung cấp: aws
- Tối ưu chi phí: Cần thiết

## Đội ngũ
- Phân loại: **NHỎ**
- Căn cứ:
  - Tác giả (30 ngày): 1
  - Commit (30 ngày): 130
  - PR ước tính: 0
  - CODEOWNERS: Không
- Quy trình: yêu cầu 1 lượt review

## Ngưỡng áp dụng

| Chỉ tiêu | Chuẩn | Điều chỉnh | Lý do |
|---|---|---|---|
| Số dòng/hàm tối đa | 20 | 15 | quy mô lớn |
| Độ phủ tối thiểu | 80% | 85% | quy mô lớn |
| Giới hạn phức tạp | 10 | 10 | Mặc định |
| Quét bảo mật | CAO | CAO | rủi ro thấp |
| Cổng hiệu năng | Bắt buộc | Có | rủi ro thấp |
| Ma trận tuân thủ | Đầy đủ | Không | rủi ro thấp |
| Review PR | 1 | 1 | đội nhỏ |
| SLA review đầu | <24h | <24h | đội nhỏ |

## Ghi đè thủ công

Muốn ghi đè hồ sơ, tạo `docs/PROJECT_PROFILE_OVERRIDE.md`:

```yaml
size: large
risk: high
deployment: cloud
team: large-org
```

Agent sẽ dùng giá trị ghi đè ở lần khởi động kế tiếp.

## Ghi chú
- Hồ sơ tự cập nhật khi agent khởi động (nếu căn cứ thay đổi đáng kể).
- Điều chỉnh áp dụng cho cổng chất lượng, luồng kiểm thử, quét tuân thủ.
- Thắc mắc xem `GOAL.md §20.2` và `docs/PROJECT_PROFILE.md`.
