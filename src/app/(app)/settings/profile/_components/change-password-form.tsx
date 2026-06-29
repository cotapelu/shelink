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

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeMyPassword } from "@/server/users/actions";

const schema = z
  .object({
    currentPassword: z.string().min(1, "请输入当前密码"),
    newPassword: z.string().min(8, "新密码至少 8 位").max(128),
    confirmPassword: z.string()
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "两次输入的新密码不一致",
    path: ["confirmPassword"]
  });

type FormValues = z.infer<typeof schema>;

export function ChangePasswordForm() {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" }
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        await changeMyPassword({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword
        });
        toast.success("密码已修改");
        reset();
      } catch (err) {
        toast.error("修改失败", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4">
      <Field label="当前密码" error={errors.currentPassword?.message}>
        <Input type="password" autoComplete="current-password" {...register("currentPassword")} />
      </Field>
      <Field label="新密码（至少 8 位）" error={errors.newPassword?.message}>
        <Input type="password" autoComplete="new-password" {...register("newPassword")} />
      </Field>
      <Field label="确认新密码" error={errors.confirmPassword?.message}>
        <Input type="password" autoComplete="new-password" {...register("confirmPassword")} />
      </Field>
      <Button type="submit" disabled={isPending} className="gap-1.5">
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        修改密码
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  children
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
