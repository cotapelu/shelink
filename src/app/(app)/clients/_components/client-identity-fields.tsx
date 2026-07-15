"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Field } from "./client-form-ui";
import type { ClientCreateInput } from "@/server/clients/schemas";

export function ClientIdentityFields() {
  const {
    register,
    setValue,
    formState: { errors }
  } = useFormContext<ClientCreateInput>();

  const watchedType = useWatch({ name: "type" });

  return (
    <>
      <Field label="Tên khách hàng" required error={errors.name?.message}>
        <Input
          placeholder={
            watchedType === "INDIVIDUAL" ? "张三" : "上海某某有限Công ty"
          }
          {...register("name")}
        />
      </Field>

      <Field label="Loại" required>
        <Select
          value={watchedType}
          onValueChange={(v) =>
            setValue("type", v as ClientCreateInput["type"], { shouldDirty: true })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INDIVIDUAL">Cá nhân</SelectItem>
            <SelectItem value="COMPANY">Công ty</SelectItem>
            <SelectItem value="ORGANIZATION">Tổ chức khác</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </>
  );
}
