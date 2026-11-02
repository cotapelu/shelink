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
  Phone,
  MessageCircle,
  Mail,
  Users,
  Gavel,
  Loader2,
  Trash2,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  SheetFooter
} from "@/components/ui/sheet";
import { createNote, deleteNote } from "@/server/notes/actions";
import type { NotePayload } from "./matter-detail-tabs";
import { cn } from "@/lib/utils";

const channelMeta = {
  PHONE: { icon: Phone, label: "Điện thoại", color: "#4ADE80" },
  WECHAT: { icon: MessageCircle, label: "Zalo/chat", color: "#4FD1C5" },
  EMAIL: { icon: Mail, label: "Email", color: "#5B8DEF" },
  MEETING: { icon: Users, label: "Gặp trực tiếp", color: "#9B7BF7" },
  COURT: { icon: Gavel, label: "Toà án", color: "#FBBF24" },
  OTHER: { icon: MessageSquare, label: "Khác", color: "#9BA8C7" }
} as const;

const formSchema = z.object({
  matterId: z.string().cuid(),
  channel: z.enum(["PHONE", "WECHAT", "EMAIL", "MEETING", "COURT", "OTHER"]),
  withWhom: z.string().max(80).optional().or(z.literal("")),
  occurredAt: z.coerce.date(),
  content: z.string().min(1, "Nội dung không được rỗng").max(5000)
});

type FormValues = z.infer<typeof formSchema>;

export function NotesPanel({
  matterId,
  notes
}: {
  matterId: string;
  notes: NotePayload[];
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("Xoá bản ghi giao tiếp này?")) return;
    startTransition(async () => {
      try {
        await deleteNote(id);
        toast.success("Đã xoá");
      } catch (err) {
        toast.error("Xoá thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Hiển thị theo thời gian giảm dần. Mỗi bản ghi sẽ vào log audit.
        </p>
        <Button
          onClick={() => setSheetOpen(true)}
          size="sm"
          className="gap-1.5 "
        >
          <Plus className="h-4 w-4" />
          Ghi nhận giao tiếp
        </Button>
      </header>

      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Chưa có bản ghi giao tiếp. Bấm <span className="text-foreground">Ghi nhận giao tiếp</span> để bắt đầu
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => {
            const meta = channelMeta[n.channel];
            const Icon = meta.icon;
            return (
              <li
                key={n.id}
                className="group rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border"
                    style={{ borderColor: `${meta.color}40`, color: meta.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        style={{ borderColor: `${meta.color}40`, color: meta.color }}
                      >
                        {meta.label}
                      </Badge>
                      {n.withWhom && (
                        <span className="text-xs text-muted-foreground">
                          Với <span className="text-foreground">{n.withWhom}</span>
                        </span>
                      )}
                      <span className="font-mono text-xs text-muted-foreground tabular">
                        {new Date(n.occurredAt).toLocaleString("zh-CN", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{n.author.name}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
                      {n.content}
                    </p>
                    {n.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {n.tags.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">
                            #{t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(n.id)}
                    disabled={isPending}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Xoá"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <NoteSheet matterId={matterId} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}

function NoteSheet({
  matterId,
  open,
  onOpenChange
}: {
  matterId: string;
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
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      matterId,
      channel: "PHONE",
      withWhom: "",
      occurredAt: new Date(),
      content: ""
    }
  });

  const channel = useWatch({ name: "channel", control });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        await createNote({ ...values, tags: [] });
        toast.success("Đã lưu bản ghi giao tiếp");
        reset({
          matterId,
          channel: "PHONE",
          withWhom: "",
          occurredAt: new Date(),
          content: ""
        });
        onOpenChange(false);
      } catch (err) {
        toast.error("Lưu thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border bg-background px-6 py-4">
          <SheetTitle>Ghi nhận giao tiếp</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            <div className="space-y-2">
              <Label className="text-xs">Kênh giao tiếp</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["PHONE", "WECHAT", "EMAIL", "MEETING", "COURT", "OTHER"] as const).map(
                  (c) => {
                    const meta = channelMeta[c];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setValue("channel", c)}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors",
                          channel === c
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border bg-background text-muted-foreground hover:border-input"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {meta.label}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Đối tượng giao tiếp</Label>
              <Input placeholder="vd Nguyễn Văn A / thẩm phán chủ tọa" {...register("withWhom")} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Thời gian</Label>
              <Input
                type="datetime-local"
                {...register("occurredAt", { valueAsDate: true })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                Nội dung <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={8}
                placeholder="Ghi tóm tắt nội dung giao tiếp, ý kiến bên đối phương, các việc đã thoả thuận..."
                {...register("content")}
              />
              {errors.content && (
                <p className="text-xs text-destructive">{errors.content.message}</p>
              )}
            </div>
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
              Lưu
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// Component select dự phòng (không dùng nhưng được tham chiếu qua interface)
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
