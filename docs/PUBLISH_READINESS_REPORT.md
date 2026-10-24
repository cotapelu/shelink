# Báo cáo "Sức khoẻ" trước khi công khai lên GitHub

## Kết luận

LawLink đã có đủ vật liệu mặt tiền cho một repo công khai; audit an toàn phụ thuộc production đã sạch lỗi bảo mật. Có thể chuẩn bị công khai theo "snapshot tệp hiện tại"; phần còn lại cần xác nhận tay là phạm vi thay đổi chưa commit và có muốn dọn lịch sử Git hay không.

Đánh giá hiện tại:

1. `npm audit --omit=dev`: 0 lỗ hổng.
2. Chuỗi xác thực đã qua.
3. Cây làm việc vẫn còn nhiều thay đổi chưa commit → cần xác nhận những gì thuộc bản công khai này.
4. Lịch sử Git từng có `outputs/cause_taxonomy`; không phải secret/tệp vụ án, nhưng nếu muốn lịch sử đầu sạch tối đa thì cần dọn riêng.

## Nội dung đã sẵn

### Nền repo
- `README.md`: giới thiệu, phát triển local, lệnh xác thực, deploy Docker, tuyên bố.
- `LICENSE`: MIT.
- `package.json`: tên dự án, phiên bản, MIT, script.
- `.env.example`: mẫu biến môi trường, không có key thật.
- `.gitignore`: ignore `.env`, `storage/`, backup, outputs, cache build, node_modules.
- `.dockerignore`: tránh đưa dữ liệu local và secret vào build context.
- `Dockerfile` / `docker-compose.yml`: DB local + deploy Docker full-stack.

### Tài liệu dự án
- `AGENTS.md`, `docs/PRD.md`, `docs/DATA-MODEL.md`, `docs/UI-DESIGN.md`, `docs/PUBLIC_RELEASE_CHECKLIST.md`, `docs/GITHUB_PUBLISHING_GUIDE.md`, báo cáo này.

### Vật liệu cộng tác GitHub
- `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, template PR/Issue, `.github/AGENTS.md`.

### Hỗ trợ xuất bản
- `scripts/create-public-archive.sh`: tạo gói nguồn công khai để soát tay trước khi push.
- `dist/lawlink-public-source-*.tar.gz`: gói đã kiểm tra, nằm trong `dist/` bị ignore, không vào Git.

## Kết quả quét lần này

### Tệp nhạy cảm
Không thấy: `.env` thật; tệp trong `storage/` (trừ `storage/.gitkeep`); thư mục backup, DB dump, cache build, `node_modules`.

Quét chuỗi nhạy cảm chỉ bắt đúng tên biến/giá trị giữ chỗ như `NEXTAUTH_SECRET`, `DATABASE_URL`, `passwordHash`, `Bearer ${opts.apiKey}` — không thấy dạng key thật.

### Lịch sử Git
Lịch sử có: `outputs/cause_taxonomy/build_cause_taxonomy.py`, `outputs/cause_taxonomy/__pycache__/...pyc`, `storage/.gitkeep`. Trong đó `storage/.gitkeep` là tệp giữ chỗ hợp lệ; `outputs/cause_taxonomy` không phải dữ liệu vụ án/secret, nhưng nếu muốn lịch sử công khai sạch thì phải dọn lịch sử riêng (việc này cần xác nhận trước vì ghi lại lịch sử Git).

### Seed data
`prisma/seed.ts` hiện chỉ ghi: tài khoản admin; mẫu loại việc; mẫu giai đoạn; cài đặt hệ thống; mẫu tài liệu; cấu hình con dấu. Đã bỏ seed vụ án demo để repo công khai không kèm dữ liệu giả thực tế.

## Kết quả xác thực

Đã qua:
- `npm run lint` — pass (còn vài cảnh báo biến không dùng, React Compiler với `watch()`).
- `npm run typecheck` — pass.
- `npm run prisma:validate` — pass.
- `npm run build` — pass.
- `npm run test:run` — 17 tệp test, 135 test pass.
- `npm audit --omit=dev` — 0 lỗ hổng.
- Đăng nhập local: `http://127.0.0.1:3000/login` trả 200.

## Chặn xuất bản

### Đã giải quyết: lỗ hổng phụ thuộc production
Trước đây `npm audit --omit=dev` từng báo: `next@14.2.18` critical; `postcss` moderate; chuỗi `uuid` (qua `exceljs`/`next-auth`) moderate. Đã nâng Next 16 / React 19 / ESLint 9, và ép `postcss`, `uuid` về bản an toàn bằng `overrides`.

Trạng thái: `next 16.2.7`, `react 19.2.7`, `eslint 9.39.4`, `postcss 8.5.15`, `uuid 11.1.1`, `npm audit --omit=dev`: 0 lỗ hổng.

### P0: xác nhận thay đổi chưa commit
Công việc đang có cả code, test, vật liệu xuất bản, điều chỉnh Docker/README. Trước khi công khai cần rà từng mục: cái nào thuộc bản chính thức, cái nào là thử/dev không đưa vào. Không được `git add .` khi chưa xác nhận.

### P1: lịch sử đầu có dọn không
Chỉ xem snapshot tệp thì công khai được; nếu muốn lịch sử đầu sạch tuyệt đối (bỏ `outputs/` cũ) thì phải dọn lịch sử — làm riêng và xác nhận.

## Bước tiếp trước khi công khai

1. Rà cây làm việc; tách nội dung công khai khỏi thử local.
2. Quyết có nhận lịch sử Git hiện tại không; nếu muốn sạch thì dọn riêng.
3. Chạy lại chuỗi xác thực cuối.
4. Tạo repo trống trên GitHub, **không** tick tự sinh README/LICENSE/.gitignore.
5. Chờ duyệt rồi mới add remote / commit / push.

## Tăng cường tuỳ chọn
- GitHub Actions (lint, typecheck, prisma validate, build, test).
- Dependabot.
- Branch protection cho `main`.
- Bật private vulnerability reporting.
