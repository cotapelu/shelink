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

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ExternalContactCategory } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { ExternalContactForm, type FormState } from "./external-contact-form";
import { createExternalContact, updateExternalContact } from "@/server/external-contacts/actions";

type Editing = {
  id: string;
  name: string;
  category: ExternalContactCategory;
  organization: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
  wechat: string | null;
  address: string | null;
  notes: string | null;
  tags: string[];
} | null;

function initializeForm(editing: Editing): FormState {
  if (!editing) {
    return { name: "", category: "COURT", organization: "", title: "", phone: "", email: "", wechat: "", address: "", notes: "", tags: [] };
  }
  return {
    name: editing.name,
    category: editing.category,
    organization: editing.organization ?? "",
    title: editing.title ?? "",
    phone: editing.phone ?? "",
    email: editing.email ?? "",
    wechat: editing.wechat ?? "",
    address: editing.address ?? "",
    notes: editing.notes ?? "",
    tags: editing.tags ?? []
  };
}

export function ExternalContactDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (o: boolean) => void; editing: Editing }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initializeForm(null));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!open) return; setForm(initializeForm(editing)); setError(null); }, [open, editing]);
  const performTransition = async () => {
    try {
      if (editing) await updateExternalContact({ ...form, id: editing.id }); else await createExternalContact(form);
      onOpenChange(false); router.refresh(); toast.success("Đã lưu");
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    }
  };
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setError(null); startTransition(performTransition); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit External Contact" : "Add External Contact"}</DialogTitle>
        </DialogHeader>
        <ExternalContactForm form={form} setForm={setForm} isPending={isPending} error={error} onSubmit={handleSubmit} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
