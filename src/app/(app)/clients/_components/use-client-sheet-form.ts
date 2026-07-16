"use client";

import { useEffect, useTransition, useCallback } from "react";
import { useForm, useFieldArray, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Client, Contact } from "@prisma/client";
import { clientCreateSchema, type ClientCreateInput } from "@/server/clients/schemas";
import { createClient, updateClient } from "@/server/clients/actions";

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

interface UseClientSheetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingClient: (Client & { contacts?: Contact[] }) | null;
}

export function useClientSheetForm({ open, onOpenChange, editingClient }: UseClientSheetFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!editingClient;

  const form = useForm<ClientCreateInput>({
    resolver: zodResolver(clientCreateSchema),
    defaultValues: emptyDefaults
  });

  const { reset, handleSubmit, control } = form;
  const { append, remove } = useFieldArray({ control, name: "contacts" });

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

  const onSubmit = useCallback<SubmitHandler<ClientCreateInput>>(
    (values) => {
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
    },
    [isEdit, editingClient, onOpenChange]
  );

  return {
    form,
    isPending,
    isEdit,
    onSubmit,
    control,
    append,
    remove
  };
}
