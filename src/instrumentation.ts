/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
/**
 * Next.js instrumentation hook: Đăng ký side-effect một lần khi khởi động tiến trình.
 * Kích hoạt: next.config.mjs experimental.instrumentationHook = true
 *
 * Trách nhiệm hiện tại: Đăng ký cron jobs (chỉ chạy trong production / nodejs runtime).
 * Bỏ qua trong dev mode, tránh gửi thông báo thật trong lúc phát triển.
 *
 * ⚠ Quan trọng: Next 14.x ngay cả khi dùng dynamic import trong register(), dev mode vẫn quét
 * dependency chain để biên dịch cho edge runtime (next-auth/bcryptjs phụ thuộc node:crypto sẽ gây lỗi 500).
 * Giải pháp: Trong dev mode, không chỉ bỏ qua thực thi, mà không được viết cả đường dẫn import – hoàn toàn noop.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.DISABLE_CRON === "1") return;

  // Register cron jobs
  const mod = await import(/* webpackIgnore: true */ "./server/cron/scheduler");
  (mod as { registerCronJobs: () => void }).registerCronJobs();
}
