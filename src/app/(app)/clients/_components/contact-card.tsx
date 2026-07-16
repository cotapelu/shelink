"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "./client-form-ui";
import { Star, Trash2 } from "lucide-react";
import type { ClientCreateInput } from "@/server/clients/schemas";

interface ContactCardProps {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
}

function ContactHeader({ index, onRemove, canRemove }: ContactCardProps) {
  const { setValue } = useFormContext<ClientCreateInput>();
  const watchedContacts = useWatch({ name: "contacts" });
  const checked = watchedContacts?.[index]?.isPrimary;
  const onCheckedChange = (c: boolean) => {
    if (c) setValue(`contacts.${index}.isPrimary`, true, { shouldDirty: true });
    else setValue(`contacts.${index}.isPrimary`, false, { shouldDirty: true });
  };
  return (
    <div className="mb-2 flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground">联系人 {index + 1}</span>
      <div className="flex items-center gap-2">
        <label className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground">
          <Checkbox checked={!!checked} onCheckedChange={onCheckedChange} />
          <Star className="h-3 w-3" /> 主要联系人
        </label>
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="h-7 w-7 p-0 text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function ContactForm({ index }: { index: number }) {
  const { register, formState: { errors } } = useFormContext<ClientCreateInput>();
  const nameError = errors.contacts?.[index]?.name?.message as string | undefined;
  const emailError = errors.contacts?.[index]?.email?.message as string | undefined;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="姓名" required error={nameError}><Input placeholder="姓名" {...register(`contacts.${index}.name`)} /></Field>
      <Field label="Chức vụ"><Input placeholder="Ví dụ: Phòng KT" {...register(`contacts.${index}.title`)} /></Field>
      <Field label="SĐT"><Input className="font-mono" placeholder="11 số điện thoại" {...register(`contacts.${index}.phone`)} /></Field>
      <Field label="Email" error={emailError}><Input type="email" placeholder="contact@example.com" {...register(`contacts.${index}.email`)} /></Field>
      <Field label="WeChat"><Input placeholder="WeChat ID" {...register(`contacts.${index}.wechat`)} /></Field>
      <Field label="Ghi chú"><Input placeholder="Ghi chú" {...register(`contacts.${index}.notes`)} /></Field>
    </div>
  );
}

export function ContactCard({ index, onRemove, canRemove }: ContactCardProps) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <ContactHeader index={index} onRemove={onRemove} canRemove={canRemove} />
      <ContactForm index={index} />
    </div>
  );
}
