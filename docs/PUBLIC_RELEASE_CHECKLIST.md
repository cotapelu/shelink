# Checklist công khai LawLink

Checklist để xuất bản LawLink dưới dạng mã nguồn mở sạch.

## Những gì KHÔNG được công khai

- `.env`, `.env.local`, `.env.production`, hoặc mọi tệp biến môi trường thật.
- API key của AI, Yuandian, AWS, CSDL, NextAuth, khóa mã hoá tài liệu, hoặc bất kỳ khóa nào.
- Dữ liệu PostgreSQL local, database dump, thư mục backup, gói khôi phục.
- Tệp đính kèm local trong `storage/`, tài liệu vụ việc, mẫu do user tải lên, gói lưu trữ.
- Dự án/tiếp nhận/khách hàng/liên hệ/đương sự/ghi chép phí/yêu cầu hóa đơn/yêu cầu dùng dấu/audit log/thông báo/cấu hình AI của một phiên bản đang chạy.

## Chính sách hiện tại của repo

- `.env*` bị ignore trừ `.env.example`.
- `storage/`, `backups/`, `outputs/`, đầu ra build Next, log, cache local đều bị ignore.
- `.dockerignore` loại dữ liệu local và secret khỏi build context Docker.
- `prisma/seed.ts` chỉ tạo dữ liệu nền hệ thống: tài khoản admin, mẫu loại việc, mẫu giai đoạn, cài đặt hệ thống, mẫu tài liệu, cấu hình dấu.
- Dữ liệu vụ việc demo đã tắt cho bản công khai.
- API key AI và Yuandian không hard-code. Key runtime lưu trong CSDL dạng `SystemSetting` đã mã hoá; cấm commit.

## Trước lần đầu công khai lên GitHub

1. Xác nhận `git status --short` chỉ chứa thay đổi nguồn có chủ đích.
2. Xác nhận tệp được theo dõi không chứa dữ liệu local:
   ```bash
   git ls-files | rg '^(\.env$|\.env\.(local|production|development|test)|backups/|outputs/|\.next|node_modules/)'
   git ls-files storage | rg -v '^storage/\.gitkeep$'
   ```
   Cả hai lệnh không được có output.
3. Xác nhận tệp ignore vẫn ignore:
   ```bash
   git status --ignored --short
   ```
4. Quét chuỗi giống secret theo tên tệp trước:
   ```bash
   rg -n -l 'API_KEY|SECRET|TOKEN|PASSWORD|sk-|Bearer ' . -g '!node_modules' -g '!.next*' -g '!storage/**' -g '!outputs/**'
   ```
5. Chạy chuỗi xác thực:
   ```bash
   npm run lint
   npm run typecheck
   npm run prisma:validate
   npm run build
   ```
6. Tạo gói nguồn sạch:
   ```bash
   ./scripts/create-public-archive.sh
   ```

## Reset dữ liệu local là việc riêng

Push lên GitHub không đẩy CSDL local hay tệp đính kèm local, miễn là không force-add tệp bị ignore. Nếu muốn xoá sạch CSDL dev, chỉ làm sau khi đã backup riêng và xác nhận rõ hành động này.
