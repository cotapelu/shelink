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
import { Package, CheckCircle2, Loader2, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveExpressSettingsAction } from "@/server/express/actions";

type Initial = {
  kdniao: { ebusinessId: string; configured: boolean; appKeyMasked: string };
  kuaidi100: { customer: string; configured: boolean; keyMasked: string };
};

export function ExpressSettingsForm({ initial }: { initial: Initial }) {
  const [kdEbId, setKdEbId] = useState(initial.kdniao.ebusinessId);
  const [kdAppKey, setKdAppKey] = useState("");
  const [k100Customer, setK100Customer] = useState(initial.kuaidi100.customer);
  const [k100Key, setK100Key] = useState("");
  const [pending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      try {
        await saveExpressSettingsAction({
          kdniaoEbusinessId: kdEbId,
          kdniaoAppKey: kdAppKey,
          kuaidi100Customer: k100Customer,
          kuaidi100Key: k100Key
        });
        toast.success("Đã lưu cấu hình");
        setKdAppKey("");
        setK100Key("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Thất bại");
      }
    });
  };

  const clearKdniao = () => {
    if (!confirm("Xoá khoá 快递鸟?")) return;
    startTransition(async () => {
      try {
        await saveExpressSettingsAction({ kdniaoClearKey: true });
        toast.success("Đã xoá");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Thất bại");
      }
    });
  };

  const clearKd100 = () => {
    if (!confirm("Xoá khoá 快递100?")) return;
    startTransition(async () => {
      try {
        await saveExpressSettingsAction({ kuaidi100ClearKey: true });
        toast.success("Đã xoá");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Thất bại");
      }
    });
  };

  return (
    <div className="space-y-5">
      <section className="ll-surface rounded-lg border border-border p-5">
        <header className="mb-3 flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <h2 className="text-lg">Tích hợp chuyển phát</h2>
        </header>
        <p className="mb-4 text-[12px] text-muted-foreground">
          Hai provider: ưu tiên <span className="text-foreground/85">快递鸟</span> (miễn phí 500 lượt/ngày),
          khi lỗi thì hạ xuống <span className="text-foreground/85">快递100</span>.
          Cấu hình một trong hai là dùng được.
        </p>

        {/* 快递鸟 */}
        <div className="mb-5 rounded-md border border-border bg-muted/20 p-4">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-[13px] font-medium">快递鸟 (chính, khuyên dùng)</h3>
            {initial.kdniao.configured && (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Đã cấu hình
              </span>
            )}
            <a
              href="https://www.kdniao.com/"
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              Đăng ký
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="text-[11px]">EBusinessID (ID người dùng)</Label>
              <Input
                value={kdEbId}
                onChange={(e) => setKdEbId(e.target.value)}
                placeholder="ID bằng số"
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-[11px]">
                AppKey
                {initial.kdniao.configured && (
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                    Hiện tại {initial.kdniao.appKeyMasked} (để trống thì giữ)
                  </span>
                )}
              </Label>
              <Input
                type="password"
                value={kdAppKey}
                onChange={(e) => setKdAppKey(e.target.value)}
                placeholder={initial.kdniao.configured ? "Cần đổi thì dán AppKey mới" : "AppKey"}
                className="mt-1 font-mono"
                autoComplete="off"
              />
            </div>
          </div>
          {initial.kdniao.configured && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={clearKdniao}
                className="inline-flex items-center gap-1 text-[10px] text-destructive hover:underline"
              >
                <Trash2 className="h-3 w-3" />
                Xoá AppKey
              </button>
            </div>
          )}
        </div>

        {/* 快递100 */}
        <div className="rounded-md border border-border bg-muted/20 p-4">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-[13px] font-medium">快递100 (dự phòng)</h3>
            {initial.kuaidi100.configured && (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Đã cấu hình
              </span>
            )}
            <a
              href="https://api.kuaidi100.com/"
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              Đăng ký
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="text-[11px]">Customer (mã ủy quyền)</Label>
              <Input
                value={k100Customer}
                onChange={(e) => setK100Customer(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-[11px]">
                Key
                {initial.kuaidi100.configured && (
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                    Hiện tại {initial.kuaidi100.keyMasked} (để trống thì giữ)
                  </span>
                )}
              </Label>
              <Input
                type="password"
                value={k100Key}
                onChange={(e) => setK100Key(e.target.value)}
                placeholder={initial.kuaidi100.configured ? "Cần đổi thì dán key mới" : "key"}
                className="mt-1 font-mono"
                autoComplete="off"
              />
            </div>
          </div>
          {initial.kuaidi100.configured && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={clearKd100}
                className="inline-flex items-center gap-1 text-[10px] text-destructive hover:underline"
              >
                <Trash2 className="h-3 w-3" />
                Xoá Key
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={save} disabled={pending} className="gap-1.5">
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Lưu cấu hình
          </Button>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          Khoá mã hoá AES-256-GCM lưu vào SystemSetting, dùng chung một khoá với mã hoá tài liệu (
          <span className="font-mono">STORAGE_ENCRYPTION_KEY</span>). Frontend không bao giờ hiện plaintext.
        </p>
      </section>
    </div>
  );
}
