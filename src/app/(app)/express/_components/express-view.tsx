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
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Briefcase,
  ArrowDownToLine,
  ArrowUpFromLine,
  ExternalLink,
  AlertTriangle
} from "lucide-react";
import type { Prisma, ExpressDirection } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { RadioChips } from "@/components/ui/radio-chips";
import { MatterCombobox } from "@/app/(app)/approvals/seals/_components/matter-combobox";
import { cn } from "@/lib/utils";
import { createExpress, refreshExpress, deleteExpress } from "@/server/express/actions";
import { SUPPORTED_COMPANIES, detectCompany } from "@/lib/express/companies";

type Row = Prisma.ExpressTrackingGetPayload<{
  include: {
    matter: { select: { id: true; internalCode: true; title: true } };
    createdBy: { select: { id: true; name: true } };
  };
}>;
type MatterOption = { id: string; internalCode: string; title: string };
type DirectionFilter = ExpressDirection | "ALL";

// LƯU Ý: key STATE_TONE là giá trị trạng thái THÔ từ API hãng xe (KuaidiNiao/Kuaidi100) —
// KHÔNG dịch, dịch sẽ mất khả năng khớp. chỉ map màu badge.
const STATE_TONE: Record<string, "danger" | "ok" | "warn" | "muted"> = {
  已签收: "ok",
  在途: "muted",
  在途中: "muted",
  已揽件: "muted",
  揽收: "muted",
  到达派件城市: "muted",
  派件中: "muted",
  疑难件: "danger",
  疑难: "danger",
  退签: "danger",
  退回: "danger",
  暂无信息: "warn",
  未知: "warn"
};

export function ExpressView({
  items,
  matters,
  configured,
  hideHeader
}: {
  items: Row[];
  matters: MatterOption[];
  configured: boolean;
  hideHeader?: boolean;
}) {
  const [direction, setDirection] = useState<DirectionFilter>("ALL");
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return items.filter((e) => {
      if (direction !== "ALL" && e.direction !== direction) return false;
      if (!kw) return true;
      return (
        e.trackingNo.toLowerCase().includes(kw) ||
        (e.purpose ?? "").toLowerCase().includes(kw) ||
        (e.recipient ?? "").toLowerCase().includes(kw) ||
        (e.matter?.title ?? "").toLowerCase().includes(kw) ||
        (e.matter?.internalCode ?? "").toLowerCase().includes(kw)
      );
    });
  }, [items, direction, search]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        {hideHeader ? (
          <div />
        ) : (
          <div>
            <h1 className="flex items-center gap-2 text-2xl">
              <Package className="h-5 w-5 text-primary" />
              Theo dõi chuyển phát
            </h1>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Đăng ký thống nhất văn bản toà án / tài liệu khách gửi đi & nhận về + tự cập nhật vận chuyển
            </p>
          </div>
        )}
        <Button onClick={() => setNewOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Tạo theo dõi
        </Button>
      </div>

      {!configured && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            Chưa cấu hình tích hợp chuyển phát nào. Vẫn tạo bản ghi được nhưng không lấy được trạng thái vận chuyển.
            <Link href="/settings/express" className="ml-1 font-medium underline">
              Đi cấu hình KuaidiNiao / Kuaidi100 →
            </Link>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 sm:min-w-64 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.8}
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã đơn / mục đích / người nhận / vụ án"
            className="h-9 border-border bg-card pl-9"
          />
        </div>
        <RadioChips
          size="sm"
          items={[
            { value: "ALL", label: "Tất cả" },
            { value: "OUTBOUND", label: "Gửi đi" },
            { value: "INBOUND", label: "Nhận về" }
          ]}
          value={direction}
          onChange={(v) => setDirection(v as DirectionFilter)}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {filtered.length === 0 ? (
          <div className="ll-surface rounded-lg border border-border p-12 text-center text-sm text-muted-foreground">
            <Package className="mx-auto mb-2 h-6 w-6 opacity-40" />
            {items.length === 0
              ? "Chưa có bản ghi theo dõi chuyển phát, bấm 「Tạo theo dõi」 ở trên để bắt đầu"
              : "Không có bản ghi nào khớp"}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((e) => (
              <Card key={e.id} e={e} />
            ))}
          </div>
        )}
      </motion.div>

      <NewExpressDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        matters={matters}
        configured={configured}
      />
    </div>
  );
}

function Card({ e }: { e: Row }) {
  const [pending, startTransition] = useTransition();
  const [tracesOpen, setTracesOpen] = useState(false);
  const traces = (e.tracesJson as { time?: string; desc?: string }[] | null) ?? [];
  const tone = e.lastState ? STATE_TONE[e.lastState] ?? "muted" : "muted";

  const onRefresh = () =>
    startTransition(async () => {
      try {
        const r = await refreshExpress({ id: e.id });
        toast.success(`Đã cập nhật: ${r.state} (${r.provider})`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Cập nhật thất bại");
      }
    });

  const onDelete = () => {
    if (!confirm(`Xác nhận xóa mã đơn ${e.trackingNo}?`)) return;
    startTransition(async () => {
      try {
        await deleteExpress({ id: e.id });
        toast.success("Đã xóa");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Thất bại");
      }
    });
  };

  return (
    <div className="ll-surface flex flex-col gap-2 rounded-lg border border-border p-4">
      {/* Dòng 1: Hướng + Hãng + Trạng thái */}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {e.direction === "OUTBOUND" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-sky-700">
            <ArrowUpFromLine className="h-3 w-3" />
            Gửi đi
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700">
            <ArrowDownToLine className="h-3 w-3" />
            Nhận về
          </span>
        )}
        {e.companyCode && (
          <span className="text-muted-foreground">{e.companyCode}</span>
        )}
        {e.lastState && (
          <Badge
            variant="outline"
            className={cn(
              "px-1.5 py-0 text-[10px] font-normal",
              tone === "danger" && "border-red-500/40 bg-red-500/10 text-red-700",
              tone === "ok" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
              tone === "warn" && "border-amber-500/40 bg-amber-500/10 text-amber-700",
              tone === "muted" && "border-border bg-muted/40 text-muted-foreground"
            )}
          >
            {e.lastState}
          </Badge>
        )}
      </div>

      {/* Dòng 2: Mã đơn + Mục đích */}
      <div>
        <div className="font-mono text-[13px] font-medium text-foreground">
          {e.trackingNo}
        </div>
        <p className="mt-1 line-clamp-2 text-[12px] text-foreground/85">{e.purpose}</p>
      </div>

      {/* Dòng 3: Người nhận + Vụ án */}
      <div className="space-y-1 text-[11px] text-muted-foreground">
        {(e.recipient || e.recipientPhone) && (
          <div>
            Người nhận：{e.recipient ?? "—"}
            {e.recipientPhone && (
              <span className="ml-1 font-mono text-[10px]">{e.recipientPhone}</span>
            )}
          </div>
        )}
        {e.matter && (
          <Link
            href={`/matters/${e.matter.id}`}
            className="inline-flex items-center gap-1 hover:text-primary"
          >
            <Briefcase className="h-3 w-3" />
            <span className="font-mono text-[10px]">{e.matter.internalCode}</span>
            <span className="truncate">{e.matter.title}</span>
          </Link>
        )}
        {e.lastUpdateAt && (
          <div className="font-mono text-[10px]">
            Cập nhật lần cuối: {new Date(e.lastUpdateAt).toLocaleString("vi-VN")}
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center justify-end gap-1 pt-2">
        {traces.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setTracesOpen(true)}
            className="h-7 gap-1 px-2 text-[11px]"
          >
            <ExternalLink className="h-3 w-3" />
            Lộ trình {traces.length}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={onRefresh}
          disabled={pending}
          className="h-7 gap-1 px-2 text-[11px] text-primary"
        >
          <RefreshCw className={cn("h-3 w-3", pending && "animate-spin")} />
          Cập nhật
        </Button>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="rounded p-1 text-muted-foreground hover:text-destructive"
          title="Xóa"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <Dialog open={tracesOpen} onOpenChange={setTracesOpen}>
        <DialogContent className="max-h-[80vh] w-[92vw] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <span className="font-mono">{e.trackingNo}</span> · Lộ trình vận chuyển
            </DialogTitle>
            <DialogDescription className="text-xs">
              {e.companyCode} · {traces.length} đơn
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-2 border-l border-border pl-4">
            {traces.map((t, i) => (
              <li key={i} className="relative">
                <span
                  className={cn(
                    "absolute -left-[19px] top-1 h-2 w-2 rounded-full",
                    i === 0 ? "bg-primary" : "bg-muted-foreground/40"
                  )}
                />
                <div className="text-[12px] text-foreground/85">{t.desc}</div>
                <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {t.time}
                </div>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function NewExpressDialog({
  open,
  onOpenChange,
  matters,
  configured
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matters: MatterOption[];
  configured: boolean;
}) {
  const [trackingNo, setTrackingNo] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [direction, setDirection] = useState<ExpressDirection>("OUTBOUND");
  const [matterId, setMatterId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [pending, startTransition] = useTransition();

  // Mã đơn thay đổi thì tự nhận diện hãng
  const onTrackingChange = (v: string) => {
    setTrackingNo(v);
    if (v && !companyCode) {
      const detected = detectCompany(v);
      if (detected) setCompanyCode(detected);
    }
  };

  const reset = () => {
    setTrackingNo("");
    setCompanyCode("");
    setDirection("OUTBOUND");
    setMatterId("");
    setPurpose("");
    setRecipient("");
    setRecipientPhone("");
  };

  const submit = () => {
    if (!trackingNo.trim()) {
      toast.error("Mã đơn chuyển phát bắt buộc");
      return;
    }
    if (!purpose.trim()) {
      toast.error("Mục đích bắt buộc");
      return;
    }
    startTransition(async () => {
      try {
        const res = await createExpress({
          trackingNo: trackingNo.trim(),
          companyCode,
          direction,
          matterId: matterId || null,
          purpose: purpose.trim(),
          recipient: recipient.trim(),
          recipientPhone: recipientPhone.trim()
        });
        if (res.firstState) {
          toast.success(`Đã tạo và tra cứu：${res.firstState}`);
        } else {
          toast.success(configured ? "Đã tạo (tra cứu đầu thất bại, cập nhật sau cũng được)" : "Đã tạo (chưa cấu hình API, tra trạng thái thủ công sau)");
        }
        reset();
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Thất bại");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !pending) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[88vh] w-[92vw] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo theo dõi chuyển phát</DialogTitle>
          <DialogDescription className="text-xs">
            Hỗ trợ tự nhận diện: ShunFeng / ZTO / YTO / Yunda / STO / EMS / JD / J&T... (tên thương hiệu giữ nguyên)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-[11px]">Hướng *</Label>
            <RadioChips
              size="sm"
              className="mt-2"
              items={[
                { value: "OUTBOUND", label: "Gửi đi" },
                { value: "INBOUND", label: "Nhận về" }
              ]}
              value={direction}
              onChange={(v) => setDirection(v as ExpressDirection)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="text-[11px]">Mã đơn chuyển phát *</Label>
              <Input
                value={trackingNo}
                onChange={(e) => onTrackingChange(e.target.value)}
                placeholder="如 SF1234567890123"
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-[11px]">Hãng chuyển phát</Label>
              <select
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Tự nhận diện / Không rõ</option>
                {SUPPORTED_COMPANIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label className="text-[11px]">Mục đích *</Label>
            <Input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder={
                direction === "OUTBOUND"
                  ? "vd: đơn khởi kiện gửi Toà án quận..."
                  : "vd: Toà án tống đạt bản án"
              }
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-[11px]">Vụ án liên quan (tuỳ chọn)</Label>
            <div className="mt-1">
              <MatterCombobox
                matters={matters}
                value={matterId}
                onChange={setMatterId}
                placeholder="Tìm mã / tên vụ án"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="text-[11px]">{direction === "OUTBOUND" ? "Người nhận" : "Người gửi"}</Label>
              <Input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Tên hoặc đơn vị"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px]">Điện thoại</Label>
              <Input
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Đang tạo..." : "Tạo và tra cứu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
