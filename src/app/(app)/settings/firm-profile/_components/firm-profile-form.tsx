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
import { Building2, Hash, ImageUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { renderCaseNoTemplate } from "@/lib/matters/firm-caseno";
import { saveFirmProfileAction } from "@/server/settings/firm-profile-actions";

type Category = { key: string; label: string; abbr: string; word: string };

type Initial = {
  firmName: string;
  firmSubtitle: string;
  logoDataUrl: string | null;
  matterCodePrefix: string;
  firmShortName: string;
  caseNoTemplate: string;
  categories: Category[];
};

const LOGO_MAX_BYTES = 180 * 1024;

export function FirmProfileForm({ initial }: { initial: Initial }) {
  const [firmName, setFirmName] = useState(initial.firmName);
  const [firmSubtitle, setFirmSubtitle] = useState(initial.firmSubtitle);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(initial.logoDataUrl);
  const [prefix, setPrefix] = useState(initial.matterCodePrefix);
  const [shortName, setShortName] = useState(initial.firmShortName);
  const [template, setTemplate] = useState(initial.caseNoTemplate);
  const [words, setWords] = useState<Record<string, string>>(
    Object.fromEntries(initial.categories.map((c) => [c.key, c.word]))
  );
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const year = new Date().getFullYear();
  const sample = initial.categories[0]; // Lấy loại đầu tiên (tố tụng dân sự-thương mại) làm ví dụ
  const caseNoPreview = sample
    ? renderCaseNoTemplate(template, {
        year,
        firmShortName: shortName,
        categoryAbbr: sample.abbr,
        categoryWord: words[sample.key] || sample.word,
        seq: 1
      })
    : "";

  const onPickLogo = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast.error("Hãy chọn tệp ảnh (PNG / JPG / WebP / SVG)");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      toast.error("Logo quá lớn, hãy giữ trong khoảng ~180KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result as string);
    reader.onerror = () => toast.error("Đọc ảnh thất bại");
    reader.readAsDataURL(file);
  };

  const save = () => {
    startTransition(async () => {
      try {
        await saveFirmProfileAction({
          firmName: firmName.trim() || "LawLink",
          firmSubtitle,
          matterCodePrefix: prefix,
          firmShortName: shortName,
          caseNoTemplate: template,
          logoDataUrl,
          categoryWords: words
        });
        toast.success("Đã lưu thông tin văn phòng");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Lưu thất bại");
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* —— Thương hiệu văn phòng —— */}
      <section className="ll-surface rounded-lg border border-border p-5">
        <header className="mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="text-lg">Thương hiệu văn phòng</h2>
        </header>
        <p className="mb-4 text-[12px] text-muted-foreground">
          Tên, phụ đề và Logo hiện ở đầu sidebar. Để trống tên sẽ quay về mặc định「LawLink」.
        </p>

        <div className="flex items-start gap-5">
          {/* Xem trước Logo + tải lên */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30">
              {logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoDataUrl} alt="Xem trước Logo" className="h-full w-full object-contain" />
              ) : (
                <span className="text-[10px] text-muted-foreground">Không có Logo</span>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => onPickLogo(e.target.files?.[0])}
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <ImageUp className="h-3 w-3" />
                Tải lên
              </button>
              {logoDataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoDataUrl(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-destructive hover:underline"
                >
                  <Trash2 className="h-3 w-3" />
                  Xoá
                </button>
              )}
            </div>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="text-[11px]">Tên văn phòng</Label>
              <Input
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="vd: Văn phòng luật Tinh Lan"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px]">Phụ đề</Label>
              <Input
                value={firmSubtitle}
                onChange={(e) => setFirmSubtitle(e.target.value)}
                placeholder="vd: Bàn làm việc luật sư"
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </section>

      {/* —— Tiền tố mã nội bộ —— */}
      <section className="ll-surface rounded-lg border border-border p-5">
        <header className="mb-3 flex items-center gap-2">
          <Hash className="h-4 w-4 text-primary" />
          <h2 className="text-lg">Mã nội bộ hệ thống</h2>
        </header>
        <p className="mb-4 text-[12px] text-muted-foreground">
          Tiền tố của mã hệ thống tự sinh cho mỗi vụ án. Định dạng cố định là
          <span className="mx-1 font-mono">tiền tố-năm-loại-số thứ tự</span>, chỉ tiền tố sửa được.
        </p>
        <div className="flex items-end gap-4">
          <div className="w-40">
            <Label className="text-[11px]">Tiền tố mã</Label>
            <Input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="LL"
              className="mt-1 font-mono"
            />
          </div>
          <div className="pb-2 text-[12px] text-muted-foreground">
            Ví dụ:
            <span className="ml-1 font-mono text-foreground/85">
              {(prefix.trim() || "LL")}-{year}-CC-0001
            </span>
          </div>
        </div>
      </section>

      {/* —— Mã nội bộ văn phòng —— */}
      <section className="ll-surface rounded-lg border border-border p-5">
        <header className="mb-3 flex items-center gap-2">
          <Hash className="h-4 w-4 text-primary" />
          <h2 className="text-lg">Mã nội bộ văn phòng (mẫu tuỳ chỉnh)</h2>
        </header>
        <p className="mb-4 text-[12px] text-muted-foreground">
          Mã số theo thói quen văn phòng, tự sinh theo mẫu khi chuyển hoá tiếp nhận. Các placeholder dùng được:
          <code className="mx-0.5">{"{年}"}</code>
          <code className="mx-0.5">{"{年2}"}</code>
          <code className="mx-0.5">{"{所}"}</code>
          <code className="mx-0.5">{"{类}"}</code>
          <code className="mx-0.5">{"{类词}"}</code>
          <code className="mx-0.5">{"{序3}"}</code>
          <code className="mx-0.5">{"{序4}"}</code>
          (số thứ tự đếm độc lập theo「năm + loại」).
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label className="text-[11px]">Viết tắt văn phòng ({"{所}"})</Label>
            <Input
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="vd: VP"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-[11px]">Mẫu mã số</Label>
            <Input
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="{年}-{所}{类词}-{序3}"
              className="mt-1 font-mono"
            />
          </div>
        </div>

        <div className="mt-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-[12px]">
          Ví dụ ({sample?.label ?? "Tố tụng dân sự-thương mại"}):
          <span className="ml-1 font-mono text-foreground/90">{caseNoPreview || "—"}</span>
        </div>

        <div className="mt-4">
          <Label className="text-[11px] text-muted-foreground">Map từ loại ({"{类词}"})</Label>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
            {initial.categories.map((c) => (
              <div key={c.key} className="rounded-md border border-border bg-card p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{c.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground/70">{c.abbr}</span>
                </div>
                <Input
                  value={words[c.key] ?? ""}
                  onChange={(e) => setWords((w) => ({ ...w, [c.key]: e.target.value }))}
                  placeholder={c.word}
                  className="h-8 text-[12px]"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          Sửa tiền tố / mẫu không ảnh hưởng mã lịch sử đã sinh; chỉ có hiệu lực với vụ án tạo mới sau này.
        </p>
        <Button onClick={save} disabled={pending} className="gap-1.5">
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Lưu
        </Button>
      </div>
    </div>
  );
}
