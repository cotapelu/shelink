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

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveMyAvatar } from "@/server/users/actions";

const AVATAR_MAX_BYTES = 180 * 1024;

export function AvatarForm({ name, initialAvatar }: { name: string; initialAvatar: string | null }) {
  const router = useRouter();
  const [avatar, setAvatar] = useState<string | null>(initialAvatar);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const initial = name ? name.charAt(0) : "?";

  const onPick = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast.error("Hãy chọn tệp ảnh (PNG / JPG / WebP / SVG)");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error("Ảnh đại diện quá lớn, hãy giữ trong khoảng ~180KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatar(dataUrl);
      save(dataUrl);
    };
    reader.onerror = () => toast.error("Đọc ảnh thất bại");
    reader.readAsDataURL(file);
  };

  const save = (value: string | null) => {
    startTransition(async () => {
      try {
        await saveMyAvatar({ avatar: value });
        toast.success(value ? "Đã cập nhật ảnh đại diện" : "Đã xoá ảnh đại diện");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Lưu thất bại");
      }
    });
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-primary/10">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-2xl font-semibold text-primary">{initial}</span>
        )}
      </div>
      <div className="space-y-1.5">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[12px] hover:bg-muted/60 disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageUp className="h-3 w-3" />}
            Tải ảnh đại diện
          </button>
          {avatar && (
            <button
              type="button"
              onClick={() => {
                setAvatar(null);
                if (fileRef.current) fileRef.current.value = "";
                save(null);
              }}
              disabled={pending}
              className="inline-flex items-center gap-1 text-[12px] text-destructive hover:underline disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              Xoá
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Khi chưa tải lên thì hiện chữ đầu của họ tên「{initial}」. Khuyên dùng ảnh vuông, ≤ 180KB.
        </p>
      </div>
    </div>
  );
}
