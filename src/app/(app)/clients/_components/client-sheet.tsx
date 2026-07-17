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

import { FormProvider } from "react-hook-form";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ClientBasicInfoSection } from "./client-basic-info-section";
import { ClientContactsSection } from "./client-contacts-section";
import { ClientSheetFooter } from "./client-sheet-footer";
import { useClientSheetForm } from "./use-client-sheet-form";
import type { Client, Contact } from "@prisma/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingClient: (Client & { contacts?: Contact[] }) | null;
}

export function ClientSheet({ open, onOpenChange, editingClient }: Props) {
  const { form, isPending, isEdit, onSubmit } = useClientSheetForm({ open, onOpenChange, editingClient });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-border bg-background px-6 py-4">
          <SheetTitle className="text-lg">
            {isPending ? "Đang xử lý..." : (isEdit ? "Chỉnh sửa" : "Tạo mới")}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Thông tin chính khách hàng + Liên hệ, chi tiết liên hệ được quản lý riêng tại liên hệ
          </SheetDescription>
        </SheetHeader>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <ClientBasicInfoSection />
              <ClientContactsSection />
            </div>
            <ClientSheetFooter isEdit={isEdit} isPending={isPending} onCancel={() => onOpenChange(false)} />
          </form>
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
}
