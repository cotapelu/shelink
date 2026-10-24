# Hướng dẫn công khai LawLink lên GitHub

Hướng dẫn dành cho người lần đầu phát hành dự án mã nguồn mở lên GitHub. Chỉ bao phủ repo nguồn công khai, không bao gồm deploy production.

## Kết luận hiện tại

LawLink đã có đủ nền tảng cho repo công khai: README, giấy phép MIT, `.env.example`, Dockerfile, docker-compose, checklist và tài liệu thiết kế.

Trước khi công khai bắt buộc hoàn tất 3 việc:
1. Xác nhận toàn bộ thay đổi chưa commit đều là nội dung muốn công khai.
2. Chạy xong lệnh xác thực.
3. Tạo repo trên GitHub rồi chờ bạn xác nhận mới push.

## Thông tin repo đề xuất

- Tên repo: `LawLink`
- Mô tả: `Hệ thống quản lý dự án/công việc mã nguồn mở, tự triển khai, cho công ty nhỏ và văn phòng độc lập.`
- Visibility: `Public`
- License: `MIT`
- Topics: `legal-tech` `law-firm` `case-management` `self-hosted` `nextjs` `prisma` `postgresql` `typescript` `tailwindcss` `docker-compose`

## Kiểm tra trên máy trước khi công khai

Chạy ở gốc dự án:

```bash
git status --short --branch
git ls-files | rg '^(\.env$|\.env\.(local|production|development|test)|backups/|outputs/|\.next|node_modules/)'
git ls-files storage | rg -v '^storage/\.gitkeep$'
git status --ignored --short
rg -n -l 'API_KEY|SECRET|TOKEN|PASSWORD|sk-|Bearer ' . -g '!node_modules' -g '!.next*' -g '!storage/**' -g '!outputs/**'
npm run lint
npm run typecheck
npm run prisma:validate
npm run build
./scripts/create-public-archive.sh
```

Giải thích:
- `git status`: xem tệp nào sẽ được phát hành.
- `git ls-files`: đảm bảo không có `.env`/tệp đính kèm/backup/build trong version control. Hai lệnh trên phải không có output.
- `rg`: quét chuỗi giống khóa; bắt được chưa chắc đã lộ, cần xem lại từng cái.
- 4 lệnh `npm`: chắc chắn chất lượng code, kiểu, schema Prisma, build production.
- Script đóng gói: tạo bộ nguồn công khai để soát tay.

## Thao tác trên web GitHub

1. Đăng nhập GitHub.
2. Góc trên phải `+` → `New repository`.
3. Đặt tên `LawLink`.
4. Chọn `Public`.
5. **Không** tick tự tạo README/LICENSE/.gitignore vì local đã có sẵn.
6. Tạo repo.
7. GitHub sẽ hiện đoạn `git remote add origin ...` và `git push ...`. Chưa chạy ngay; trước push hãy kiểm tra lại cây làm việc và kết quả xác thực.

## Mẫu lệnh lần đầu push

Chỉ chạy khi đã xác nhận công khai:

```bash
git remote add origin git@github.com:<account>/LawLink.git
git branch -M main
git push -u origin main
```

Nếu chưa có SSH key:

```bash
git remote add origin https://github.com/<account>/LawLink.git
git branch -M main
git push -u origin main
```

Push là hành động phát hành công khai; theo quy tắc dự án, phải được bạn xác nhận rõ ràng.

## Gợi ý cài đặt repo sau khi công khai

- About: mô tả, website (nếu có), topics.
- Features: bật Issues; Wiki có thể tắt.
- Security: bật private vulnerability reporting.
- Branch protection: bảo vệ `main`, yêu cầu PR.
- Discussions: nếu sau này thu thập góp ý lộ trình thì bật.

Tuỳ chọn (cần xác nhận thêm):
- GitHub Actions: tự chạy lint/typecheck/prisma validate/build.
- Dependabot: nhắc nâng cấp phụ thuộc.

## Không upload

- `.env` hoặc bất kỳ tệp biến môi trường thật.
- Tệp đính kèm trong `storage/`, mẫu, gói lưu trữ.
- DB dump, backup, gói khôi phục.
- Dự án/khách hàng/liên hệ/đương sự/hóa đơn/yêu cầu dùng dấu/audit log/thiết lập AI thật.
- Secret AI/Yuandian/AWS/DB/NextAuth/khóa mã hoá.

## Lời giới thiệu dự án khi phát hành

Bản ngắn:

> LawLink là hệ thống quản lý dự án/công việc mã nguồn mở, tự triển khai, cho công ty nhỏ và văn phòng độc lập, phủ từ tiếp nhận, phân bổ, theo dõi tiến độ, ghi chép tài chính, duyệt lưu trữ tới xuất dữ liệu.

Bản dài:

> LawLink is an open-source, self-hosted project and case management system for small companies and independent offices, while still fitting solo practitioners and small teams that want to self-host their own workspace. It covers intake registration, conflict checks, project tracking, finance records, archive review, and data export. Stack: Next.js, TypeScript, Prisma, PostgreSQL, shadcn/ui, Docker Compose.
