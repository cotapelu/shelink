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
'use server';

// Xuất sao lưu JSON đã chuyển sang route thật: GET /api/data-backup/export?scope=all|genealogy|erp

// Phục hồi/nhập dữ liệu từ bản sao lưu (TD-G7) — dự kiến triển khai sau.
export async function importData(formData: FormData) {
  const count = formData ? 'with data' : 'empty';
  return { ok: false, message: `Nhập dữ liệu chưa hỗ trợ (${count})` };
}
