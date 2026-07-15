"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "./client-form-ui";
import { cooperationStatusLabel, COOPERATION_STATUS_OPTIONS } from "@/lib/enums";
import type { ClientCreateInput } from "@/server/clients/schemas";

export function ClientLegalBusinessFields() {
  const {
    register,
    setValue,
    formState: { errors }
  } = useFormContext<ClientCreateInput>();

  const watchedType = useWatch({ name: "type" });

  return (
    <>
      {watchedType !== "INDIVIDUAL" && (
        <Field label="Người đại diện pháp luật">
          <Input placeholder="Người đại diện pháp luật姓名" {...register("legalRep")} />
        </Field>
      )}

      <Field label="Nguồn vụ án">
        <Input placeholder="Người giới thiệu / Nguồn công khai / Khách hàng cũ mua lại" {...register("source")} />
      </Field>

      <Field label="Trạng thái hợp tác">
        <Select
          value={useWatch({ name: "cooperationStatus" })}
          onValueChange={(v) =>
            setValue("cooperationStatus", v as ClientCreateInput["cooperationStatus"], {
              shouldDirty: true
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COOPERATION_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {cooperationStatusLabel[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Ngành nghề">
        <Input placeholder="Ví dụ: Sản xuất / Internet / Bất động sản" {...register("industry")} />
      </Field>
    </>
  );
}
