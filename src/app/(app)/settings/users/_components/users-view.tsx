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

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  KeyRound,
  CircleOff,
  CircleDot,
  Loader2,
  Users as UsersIcon
} from "lucide-react";
import type { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  createUser,
  updateUserRole,
  toggleUserActive,
  resetUserPassword
} from "@/server/users/actions";
import { userRoleLabel } from "@/lib/enums";

const ROLES: UserRole[] = ["ADMIN", "PRINCIPAL_LAWYER", "LAWYER", "ASSISTANT", "FINANCE"];

const createSchema = z.object({
  name: z.string().min(1).max(40),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(["ADMIN", "PRINCIPAL_LAWYER", "LAWYER", "ASSISTANT", "FINANCE"]),
  phone: z.string().max(30).optional()
});
type CreateValues = z.infer<typeof createSchema>;

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  _count: { ownedMatters: number; memberships: number };
};

export function UsersView({
  users,
  currentUserId
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <UsersIcon className="h-4 w-4 text-primary" />
          Quản lý người dùng <span className="text-muted-foreground">({users.length})</span>
        </h2>
        <Button onClick={() => setSheetOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Thêm người dùng
        </Button>
      </header>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-popover">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-medium">Họ tên / Email</th>
              <th className="px-5 py-3 font-medium">Vai trò</th>
              <th className="px-5 py-3 font-medium">Vụ án</th>
              <th className="px-5 py-3 font-medium">Đăng nhập gần nhất</th>
              <th className="px-5 py-3 font-medium">Trạng thái</th>
              <th className="px-5 py-3 font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                isSelf={u.id === currentUserId}
                onResetPassword={() => setResetUser(u)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <CreateUserSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      <ResetPasswordDialog
        user={resetUser}
        onClose={() => setResetUser(null)}
      />
    </div>
  );
}

function UserRow({
  user,
  isSelf,
  onResetPassword
}: {
  user: UserRow;
  isSelf: boolean;
  onResetPassword: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleRoleChange(role: UserRole) {
    if (role === user.role) return;
    startTransition(async () => {
      try {
        await updateUserRole({ id: user.id, role });
        toast.success("Đã cập nhật vai trò");
      } catch (err) {
        toast.error("Cập nhật thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  function handleToggleActive() {
    if (
      !confirm(user.active ? `Vô hiệu hoá ${user.name}? Sau khi vô hiệu hoá, người dùng này không đăng nhập được.` : `Kích hoạt lại ${user.name}?`)
    )
      return;
    startTransition(async () => {
      try {
        const res = await toggleUserActive(user.id);
        toast.success(res.active ? "Đã kích hoạt" : "Đã vô hiệu hoá");
      } catch (err) {
        toast.error("Thao tác thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <tr className={user.active ? "" : "opacity-60"}>
      <td className="px-5 py-3">
        <div className="font-medium">{user.name}</div>
        <div className="font-mono text-xs text-muted-foreground">{user.email}</div>
      </td>
      <td className="px-5 py-3">
        {isSelf ? (
          <Badge variant="secondary" className="text-[10px]">
            {userRoleLabel[user.role]} (mình)
          </Badge>
        ) : (
          <Select
            value={user.role}
            onValueChange={(v) => handleRoleChange(v as UserRole)}
            disabled={isPending}
          >
            <SelectTrigger className="h-8 w-32 bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {userRoleLabel[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </td>
      <td className="px-5 py-3 font-mono text-xs tabular text-muted-foreground">
        Chủ trì {user._count.ownedMatters} · Tham gia {user._count.memberships}
      </td>
      <td className="px-5 py-3 font-mono text-xs text-muted-foreground tabular">
        {user.lastLoginAt
          ? new Date(user.lastLoginAt).toLocaleDateString("zh-CN")
          : "Chưa từng đăng nhập"}
      </td>
      <td className="px-5 py-3">
        <Badge
          variant={user.active ? "secondary" : "outline"}
          className="text-[10px]"
        >
          {user.active ? "Đã kích hoạt" : "Đã vô hiệu hoá"}
        </Badge>
      </td>
      <td className="px-5 py-3">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetPassword}
            disabled={isPending}
            className="h-7 gap-1 text-xs"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Đổi mật khẩu
          </Button>
          {!isSelf && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleActive}
              disabled={isPending}
              className={`h-7 gap-1 text-xs ${user.active ? "text-destructive" : "text-[#4ADE80]"}`}
            >
              {user.active ? (
                <>
                  <CircleOff className="h-3.5 w-3.5" />
                  Vô hiệu hoá
                </>
              ) : (
                <>
                  <CircleDot className="h-3.5 w-3.5" />
                  Kích hoạt
                </>
              )}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

function CreateUserSheet({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors }
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "LAWYER",
      phone: ""
    }
  });

  const watchedRole = useWatch({ name: "role", control });

  function onSubmit(values: CreateValues) {
    startTransition(async () => {
      try {
        await createUser(values);
        toast.success("Đã tạo người dùng");
        reset();
        onOpenChange(false);
      } catch (err) {
        toast.error("Tạo thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border bg-background px-6 py-4">
          <SheetTitle>Thêm người dùng</SheetTitle>
          <SheetDescription className="text-xs">
            Mật khẩu ban đầu để người dùng tự đổi sau khi đăng nhập
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            <SheetField label="Họ tên" required error={errors.name?.message}>
              <Input {...register("name")} />
            </SheetField>
            <SheetField label="Email" required error={errors.email?.message}>
              <Input type="email" className="font-mono" {...register("email")} />
            </SheetField>
            <SheetField label="Mật khẩu ban đầu (tối thiểu 8 ký tự)" required error={errors.password?.message}>
              <Input type="text" className="font-mono" {...register("password")} />
            </SheetField>
            <SheetField label="Vai trò" required>
              <Select
                value={watchedRole}
                onValueChange={(v) =>
                  setValue("role", v as CreateValues["role"], { shouldDirty: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {userRoleLabel[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SheetField>
            <SheetField label="Điện thoại">
              <Input className="font-mono" {...register("phone")} />
            </SheetField>
          </div>

          <SheetFooter className="border-t border-border bg-background px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={isPending} className="gap-1.5">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Tạo
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function ResetPasswordDialog({
  user,
  onClose
}: {
  user: UserRow | null;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [pwd, setPwd] = useState("");

  function handleReset() {
    if (!user) return;
    if (pwd.length < 8) {
      toast.warning("Mật khẩu tối thiểu 8 ký tự");
      return;
    }
    startTransition(async () => {
      try {
        await resetUserPassword({ id: user.id, newPassword: pwd });
        toast.success(`Đã đặt lại mật khẩu của ${user.name}`);
        setPwd("");
        onClose();
      } catch (err) {
        toast.error("Thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đặt lại mật khẩu của {user?.name}</DialogTitle>
          <DialogDescription>
            Sau khi quản trị viên đặt lại, người dùng dùng mật khẩu mới đăng nhập. Khuyên nên báo trực tiếp cho người dùng.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs">Mật khẩu mới (tối thiểu 8 ký tự)</Label>
          <Input
            type="text"
            className="font-mono"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Huỷ
          </Button>
          <Button onClick={handleReset} disabled={isPending}>
            {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Đặt lại
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SheetField({
  label,
  required,
  error,
  children
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1 text-xs">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
