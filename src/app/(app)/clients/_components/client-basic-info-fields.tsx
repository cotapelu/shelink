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
import { cooperationStatusLabel, COOPERATION_STATUS_OPTIONS, genderLabel, GENDER_OPTIONS } from "@/lib/enums";
import type { ClientCreateInput } from "@/server/clients/schemas";

function NameAndTypeFields() {
  const { register, setValue, formState: { errors } } = useFormContext<ClientCreateInput>();
  const watchedType = useWatch({ name: "type" });
  const nameError = errors.name?.message as string | undefined;
  return (
    <>
      <Field label="Tên khách hàng" required error={nameError}>
        <Input placeholder={watchedType === "INDIVIDUAL" ? "张三" : "上海某某有限Công ty"} {...register("name")} />
      </Field>
      <Field label="Loại" required>
        <Select value={watchedType} onValueChange={(v) => setValue("type", v as ClientCreateInput["type"], { shouldDirty: true })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
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

function IdNumberField() {
  const { register } = useFormContext<ClientCreateInput>();
  const watchedType = useWatch({ name: "type" });
  return (
    <Field label={watchedType === "INDIVIDUAL" ? "Số CMND/CCCD" : "Mã số doanh nghiệp"}>
      <Input className="font-mono" placeholder={watchedType === "INDIVIDUAL" ? "18 位Số CMND/CCCD" : "18 số mã doanh nghiệp"} {...register("idNumber")} />
    </Field>
  );
}

function ContactFields() {
  const { register, formState: { errors } } = useFormContext<ClientCreateInput>();
  const emailError = errors.email?.message as string | undefined;
  return (
    <>
      <Field label="Số điện thoại chính">
        <Input className="font-mono" placeholder="11 số điện thoại" {...register("phone")} />
      </Field>
      <Field label="Email" error={emailError}>
        <Input type="email" placeholder="contact@example.com" {...register("email")} />
      </Field>
      <Field label="Địa chỉ">
        <Input placeholder="详细Địa chỉ" {...register("address")} />
      </Field>
    </>
  );
}

function BusinessFields() {
  const { register, setValue } = useFormContext<ClientCreateInput>();
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
        <Select value={useWatch({ name: "cooperationStatus" })} onValueChange={(v) => setValue("cooperationStatus", v as ClientCreateInput["cooperationStatus"], { shouldDirty: true })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {COOPERATION_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{cooperationStatusLabel[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Ngành nghề">
        <Input placeholder="Ví dụ: Sản xuất / Internet / Bất động sản" {...register("industry")} />
      </Field>
    </>
  );
}

function IndividualFields() {
  const { register, setValue } = useFormContext<ClientCreateInput>();
  const watchedGender = useWatch({ name: "gender" });
  return (
    <>
      <Field label="Giới tính">
        <Select value={watchedGender || "UNSET"} onValueChange={(v) => setValue("gender", v === "UNSET" ? "" : (v as "MALE" | "FEMALE"), { shouldDirty: true })}>
          <SelectTrigger><SelectValue placeholder="Chưa điền" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="UNSET">Chưa điền</SelectItem>
            {GENDER_OPTIONS.map(g => <SelectItem key={g} value={g}>{genderLabel[g]}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Dân tộc">
        <Input placeholder="Ví dụ: Kinh" {...register("ethnicity")} />
      </Field>
    </>
  );
}

export function ClientBasicInfoFields() {
  const watchedType = useWatch({ name: "type" });
  return (
    <>
      <NameAndTypeFields />
      <IdNumberField />
      <ContactFields />
      <BusinessFields />
      {watchedType === "INDIVIDUAL" && <IndividualFields />}
    </>
  );
}
