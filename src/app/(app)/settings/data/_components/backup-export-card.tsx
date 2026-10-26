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

import { Button } from "@/components/ui/button";

const EXPORT_SCOPES = [
  { scope: "genealogy", label: "Xuất Gia phả", variant: undefined },
  { scope: "erp", label: "Xuất ERP", variant: "outline" as const },
  { scope: "all", label: "Xuất Toàn bộ", variant: "secondary" as const }
];

/** Thẻ xuất sao lưu — tải bản sao lưu JSON qua route /api/data-backup/export (TD-G6). */
export function BackupExportCard() {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-semibold">Xuất dữ liệu</h3>
      <p className="mb-4 text-sm text-stone-500">Tải bản sao lưu toàn bộ dữ liệu dạng JSON (chỉ quản trị viên).</p>
      <div className="flex flex-col gap-2">
        {EXPORT_SCOPES.map((s) => (
          <Button key={s.scope} asChild variant={s.variant}>
            <a href={`/api/data-backup/export?scope=${s.scope}`} download>
              {s.label}
            </a>
          </Button>
        ))}
      </div>
    </div>
  );
}
