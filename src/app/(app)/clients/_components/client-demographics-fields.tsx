"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Field } from "./client-form-ui";
import { genderLabel, GENDER_OPTIONS } from "@/lib/enums";
import type { ClientCreateInput } from "@/server/clients/schemas";

export function ClientDemographicsFields() {
  const {
    register,
    setValue
  } = useFormContext<ClientCreateInput>();

  const watchedType = useWatch({ name: "type" });
  const watchedGender = useWatch({ name: "gender" });

  if (watchedType !== "INDIVIDUAL") {
    return null;
  }

  return (
    <>
      <Field label="Giới tính">
        <Select
          value={watchedGender || "UNSET"}
          onValueChange={(v) =>
            setValue(
              "gender",
              v === "UNSET" ? "" : (v as "MALE" | "FEMALE"),
              { shouldDirty: true }
            )
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Chưa điền" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UNSET">Chưa điền</SelectItem>
            {GENDER_OPTIONS.map((g) => (
              <SelectItem key={g} value={g}>
                {genderLabel[g]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Dân tộc">
        <Input placeholder="Ví dụ: Kinh" {...register("ethnicity")} />
      </Field>
    </>
  );
}
