"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Field } from "./client-form-ui";
import type { ClientCreateInput } from "@/server/clients/schemas";

export function ClientContactFields() {
  const {
    register,
    formState: { errors }
  } = useFormContext<ClientCreateInput>();

  return (
    <>
      <Field label="Số điện thoại chính">
        <Input className="font-mono" placeholder="11 số điện thoại" {...register("phone")} />
      </Field>

      <Field label="Email" error={errors.email?.message}>
        <Input type="email" placeholder="contact@example.com" {...register("email")} />
      </Field>

      <Field label="Địa chỉ">
        <Input placeholder="详细Địa chỉ" {...register("address")} />
      </Field>
    </>
  );
}
