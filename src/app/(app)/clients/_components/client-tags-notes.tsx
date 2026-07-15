"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "./client-form-ui";
import { TagInput } from "./tag-input";
import type { ClientCreateInput } from "@/server/clients/schemas";

export function ClientTagsNotes() {
  const {
    register,
    setValue,
    formState: { errors }
  } = useFormContext<ClientCreateInput>();

  const watchedTags = useWatch({ name: "tags" });

  function addTag(tag: string) {
    const t = tag.trim();
    if (!t) return;
    const current = watchedTags || [];
    if (current.includes(t)) return;
    setValue("tags", [...current, t], { shouldDirty: true });
  }

  function removeTag(tag: string) {
    setValue("tags", (watchedTags || []).filter((t: string) => t !== tag), { shouldDirty: true });
  }

  return (
    <>
      <Field label="Nhãn">
        <TagInput
          tags={watchedTags || []}
          onAdd={addTag}
          onRemove={removeTag}
        />
      </Field>

      <Field label="Ghi chú" full>
        <Textarea rows={3} placeholder="可选" {...register("notes")} />
      </Field>
    </>
  );
}
