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

import { useState, useMemo, useTransition } from "react";
import { Inbox, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { parseSms, splitSmsBatch } from "@/lib/sms-parser";
import { parseAndSaveSms } from "@/server/sms/actions";
import { SMS_TYPE_CN, SMS_TYPE_ACCENT } from "./sms-types";

export function SmsPasteDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [batch, setBatch] = useState(false);
  const [useAi, setUseAi] = useState(false);
  const [pending, startTransition] = useTransition();

  // Xem trước thời gian thực
  const preview = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) return [];
    const messages = batch ? splitSmsBatch(trimmed) : [trimmed];
    return messages.slice(0, 5).map((m) => ({ raw: m, parsed: parseSms(m) }));
  }, [text, batch]);

  const submit = () => {
    if (!text.trim()) {
      toast.error("Hãy dán nội dung tin nhắn");
      return;
    }
    startTransition(async () => {
      try {
        const res = await parseAndSaveSms({ rawText: text, batch, useAi });
        const aiHint = useAi && res.aiEnrichedCount > 0 ? `, AI tăng cường ${res.aiEnrichedCount} bản ghi` : "";
        toast.success(`Đã phân tích ${res.count} bản ghi${aiHint}`);
        setText("");
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Lưu thất bại");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !pending) setText("");
        onOpenChange(o);
      }}
    >
      <DialogContent className="flex max-h-[88vh] w-[92vw] max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            Dán tin nhắn toà án
          </DialogTitle>
          <DialogDescription className="text-xs">
            Dán tin nhắn 12368 / toà án / tống đạt điện tử vào đây. Nhiều tin nhắn phân cách bằng dòng trống, tích&ldquo;hàng loạt&rdquo;để phân tích từng cái.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Dán bản gốc vào đây..."
            rows={8}
            className="text-[12px] leading-relaxed"
            autoFocus
          />

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Checkbox
                checked={batch}
                onCheckedChange={(v) => setBatch(v === true)}
              />
              <span>Nhiều tin nhắn (phân cách bằng dòng trống) —— gửi một lần, phân tích và khớp từng cái</span>
            </label>
            <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Checkbox
                checked={useAi}
                onCheckedChange={(v) => setUseAi(v === true)}
              />
              <span>
                Dùng AI tăng cường phân tích <Sparkles className="inline h-3 w-3 text-primary" /> ——
                Bù <span className="text-foreground/80">tóm tắt / hành động luật sư / mức khẩn</span>
                (cần vào Cài đặt → Tích hợp AI cấu hình trước)
              </span>
            </label>
          </div>

          {preview.length > 0 && (
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" />
                Xem trước phân tích ({preview.length} bản ghi đầu)
              </div>
              <ul className="space-y-2">
                {preview.map((p, i) => {
                  const accent = SMS_TYPE_ACCENT[p.parsed.smsType];
                  return (
                    <li
                      key={i}
                      className="rounded border border-border bg-background p-2 text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[10px]"
                          style={{ background: `${accent}1A`, color: accent }}
                        >
                          {SMS_TYPE_CN[p.parsed.smsType]}
                        </span>
                        {p.parsed.court && (
                          <span className="text-foreground/80">{p.parsed.court}</span>
                        )}
                        {p.parsed.caseNumbers.length > 0 && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {p.parsed.caseNumbers.join("、")}
                          </span>
                        )}
                      </div>
                      {p.parsed.summary && (
                        <p className="mt-1 line-clamp-2 text-muted-foreground">
                          {p.parsed.summary}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground/80">
                        {p.parsed.hearingDate && <span>Phiên tòa: {p.parsed.hearingDate}</span>}
                        {p.parsed.courtRoom && <span>{p.parsed.courtRoom}</span>}
                        {p.parsed.judge && <span>Thẩm phán: {p.parsed.judge}</span>}
                        {p.parsed.urls.length > 0 && (
                          <span>{p.parsed.urls.length} liên kết</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={pending || !text.trim()}>
            {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Phân tích và lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
