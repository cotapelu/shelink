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

import { useEffect, useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Client, Contact } from "@prisma/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { clientCreateSchema, type ClientCreateInput } from "@/server/clients/schemas";
import { createClient, updateClient } from "@/server/clients/actions";
import { FormProvider } from "react-hook-form";

import { ClientBasicInfoSection } from "./client-basic-info-section";
import { ClientContactsSection } from "./client-contacts-section";

const emptyDefaults: ClientCreateInput = {
  name: "",
  type: "INDIVIDUAL",
  idNumber: "",
  address: "",
  legalRep: "",
  phone: "",
  email: "",
  source: "",
  cooperationStatus: "SIGNED",
  industry: "",
  gender: "",
  ethnicity: "",
  tags: [],
  notes: "",
  contacts: [{ name: "", title: "", phone: "", email: "", wechat: "", isPrimary: true, notes: "" }]
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingClient: (Client & { contacts?: Contact[] }) | null;
};

export function ClientSheet({ open, onOpenChange, editingClient }: Props) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!editingClient;

  const form = useForm<ClientCreateInput>({
    resolver: zodResolver(clientCreateSchema),
    defaultValues: emptyDefaults
  });

  const { reset, handleSubmit, control } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "contacts" });

  useEffect(() => {
    if (!open) return;
    if (editingClient) {
      reset({
        name: editingClient.name,
        type: editingClient.type,
        idNumber: editingClient.idNumber ?? "",
        address: editingClient.address ?? "",
        legalRep: (editingClient as any).legalRep ?? "",
        phone: editingClient.phone ?? "",
        email: editingClient.email ?? "",
        source: editingClient.source ?? "",
        cooperationStatus: (editingClient as any).cooperationStatus ?? "SIGNED",
        industry: (editingClient as any).industry ?? "",
        gender: (editingClient as any).gender ?? "",
        ethnicity: (editingClient as any).ethnicity ?? "",
        tags: editingClient.tags,
        notes: editingClient.notes ?? "",
        contacts:
          editingClient.contacts && editingClient.contacts.length > 0
            ? editingClient.contacts.map((c) => ({
                name: c.name,
                title: c.title ?? "",
                phone: c.phone ?? "",
                email: c.email ?? "",
                wechat: c.wechat ?? "",
                isPrimary: c.isPrimary,
                notes: c.notes ?? ""
              }))
            : emptyDefaults.contacts
      });
    } else {
      reset(emptyDefaults);
    }
  }, [editingClient, open, reset]);

  function onSubmit(values: ClientCreateInput) {
    startTransition(async () => {
      try {
        if (isEdit && editingClient) {
          await updateClient({ id: editingClient.id, ...values });
          toast.success("Khách hàng đã cập nhật");
        } else {
          await createClient(values);
          toast.success("Khách hàng đã tạo");
        }
        onOpenChange(false);
      } catch (err) {
        toast.error("Lưu thất bại", {
          description: err instanceof Error ? err.message : "Vui lòng thử lại sau"
        });
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-border bg-background px-6 py-4">
          <SheetTitle className="text-lg">
            {isEdit ? "Chỉnh sửa" : "Tạo mới"}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Thông tin chính khách hàng + Liên hệ, chi tiết liên hệ được quản lý riêng tại liên hệ
          </SheetDescription>
        </SheetHeader>

        <FormProvider {...form}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <ClientBasicInfoSection />
              <ClientContactsSection />
            </div>

            <SheetFooter className="flex flex-row justify-end gap-2 border-t border-border bg-background px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="gap-1.5 "
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? "Lưu" : "创建客户"}
              </Button>
            </SheetFooter>
          </form>
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
}
