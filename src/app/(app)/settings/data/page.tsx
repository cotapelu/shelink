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

import { BackupExportCard } from "./_components/backup-export-card";
import { BackupImportCard } from "./_components/backup-import-card";

export default function DataManagementPage() {
  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h2 className="text-3xl font-serif font-bold text-stone-800 tracking-tight">Sao lưu &amp; Phục hồi</h2>
            <p className="mt-2 max-w-2xl text-sm text-stone-500 sm:text-base">
              Quản lý dữ liệu an toàn. Bạn có thể tải bản sao lưu JSON để lưu trữ hoặc phục hồi lại dữ liệu. Tính năng này
              chỉ dành cho Quản trị viên.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <BackupExportCard />
          <BackupImportCard />
        </div>
      </div>
    </main>
  );
}
