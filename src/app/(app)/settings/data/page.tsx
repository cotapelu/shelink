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
'use client';

import { useTransition } from 'react';
import { exportData, importData } from '@/app/actions/data';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function DataManagementPage() {
  const [isExporting, startExport] = useTransition();
  const [isImporting, startImport] = useTransition();

  const handleExport = async (type: 'genealogy' | 'erp' | 'all') => {
    startExport(async () => {
      try {
        const res = await exportData(type);
        if (res?.ok) {
          toast.success('Đã xuất dữ liệu (stub)');
        } else {
          toast.error('Xuất thất bại');
        }
      } catch (e: any) {
        toast.error('Lỗi khi xuất dữ liệu: ' + e.message);
      }
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    startImport(async () => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await importData(formData);
        if (res?.ok) {
          toast.success('Đã phục hồi dữ liệu (stub)');
        } else {
          toast.error('Nhập thất bại');
        }
      } catch (e: any) {
        toast.error('Lỗi khi nhập dữ liệu: ' + e.message);
      }
    });
  };

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h2 className="text-3xl font-serif font-bold text-stone-800 tracking-tight">
              Sao lưu & Phục hồi
            </h2>
            <p className="text-stone-500 mt-2 text-sm sm:text-base max-w-2xl">
              Quản lý dữ liệu an toàn. Bạn có thể tải xuống bản sao lưu để lưu trữ hoặc phục hồi lại dữ liệu từ file đã lưu. Tính năng này chỉ dành cho Quản trị viên.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="font-semibold mb-4">Xuất dữ liệu</h3>
            <p className="text-sm text-stone-500 mb-4">Tải xuống bản sao lưu dạng JSON.</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => handleExport('genealogy')} disabled={isExporting}>
                {isExporting ? 'Đang xuất...' : 'Xuất Gia phả'}
              </Button>
              <Button onClick={() => handleExport('erp')} disabled={isExporting} variant="outline">
                {isExporting ? 'Đang xuất...' : 'Xuất ERP'}
              </Button>
              <Button onClick={() => handleExport('all')} disabled={isExporting} variant="secondary">
                {isExporting ? 'Đang xuất...' : 'Xuất Toàn bộ'}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="font-semibold mb-4">Nhập dữ liệu</h3>
            <p className="text-sm text-stone-500 mb-4">Phục hồi dữ liệu từ file JSON đã sao lưu.</p>
            <div className="flex flex-col gap-2">
              <label className="cursor-pointer">
                <span className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                  {isImporting ? 'Đang xử lý...' : 'Chọn file'}
                </span>
                <input type="file" accept=".json" className="hidden" onChange={handleImport} disabled={isImporting} />
              </label>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
