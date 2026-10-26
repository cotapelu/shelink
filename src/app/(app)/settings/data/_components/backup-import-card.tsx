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

"use client";

import { useTransition } from "react";
import { importData } from "@/app/actions/data";
import { toast } from "sonner";

/** Thẻ nhập/phục hồi dữ liệu — hiện báo "chưa hỗ trợ" (TD-G7 dự kiến sau). */
export function BackupImportCard() {
  const [isImporting, startImport] = useTransition();

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    startImport(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await importData(formData);
        if (res?.ok) {
          toast.success("Nhập dữ liệu thành công");
        } else {
          toast.error(res?.message ?? "Nhập dữ liệu thất bại");
        }
      } catch (err) {
        toast.error("Lỗi khi nhập dữ liệu: " + (err as Error).message);
      }
    });
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-semibold">Nhập dữ liệu</h3>
      <p className="mb-4 text-sm text-stone-500">Phục hồi dữ liệu từ file JSON đã sao lưu.</p>
      <div className="flex flex-col gap-2">
        <label className="cursor-pointer">
          <span className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            {isImporting ? "Đang xử lý..." : "Chọn file"}
          </span>
          <input type="file" accept=".json" className="hidden" onChange={handleImport} disabled={isImporting} />
        </label>
      </div>
    </div>
  );
}
