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

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import {
  Wallet,
  Briefcase,
  Archive,
  CheckCircle2,
  Download,
  BarChart3,
  CircleAlert,
  Send,
  Loader2,
  Printer
} from "lucide-react";
import { matterCategoryLabel, matterCategoryColor } from "@/lib/enums";
import type { ReportData } from "@/server/reports/queries";
import type {
  CycleStats,
  ReviewIssueAnalysis
} from "@/server/reports/analytics";
import { pushWeeklyReportToAll } from "@/server/reports/push-weekly";
import { triggerArchiveOverdueScanNow } from "@/server/cron/manual-triggers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PeriodKey = "month" | "quarter" | "year" | "lastYear" | "custom";

const PERIOD_LABEL: Record<Exclude<PeriodKey, "custom">, string> = {
  month: "Tháng này",
  quarter: "Quý này",
  year: "Năm này",
  lastYear: "Năm trước"
};

export function ReportsView({
  periodKey,
  periodLabel,
  customStart,
  customEnd,
  resolveError,
  data,
  cycle,
  reviewAnalysis,
  presetLabels
}: {
  periodKey: PeriodKey;
  periodLabel: string;
  customStart?: string;
  customEnd?: string;
  resolveError?: string;
  data: ReportData;
  cycle: CycleStats[];
  reviewAnalysis: ReviewIssueAnalysis;
  presetLabels: Record<Exclude<PeriodKey, "custom">, string>;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [customOpen, setCustomOpen] = useState(periodKey === "custom");
  const [start, setStart] = useState(customStart ?? "");
  const [end, setEnd] = useState(customEnd ?? "");
  const [pushing, startPushing] = useTransition();
  const [scanning, startScanning] = useTransition();

  function handleScanOverdue() {
    if (!confirm("Quét ngay các vụ đã kết thúc quá 30 ngày chưa lưu trữ, gửi cảnh báo cho luật sư chủ trì?")) return;
    startScanning(async () => {
      try {
        const r = await triggerArchiveOverdueScanNow();
        toast.success(
          `Quét quá hạn lưu trữ xong: ${r.scanned} ứng viên / ${r.notified} thông báo / ${r.suppressed} ẩn`
        );
      } catch (err) {
        toast.error("Quét thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  function handlePushWeekly() {
    if (!confirm("Đẩy ngay báo cáo tuần này cho mọi ADMIN / chủ nhiệm / luật sư? Mỗi người nhận 1 thông báo.")) return;
    startPushing(async () => {
      try {
        const res = await pushWeeklyReportToAll();
        if (res.failed.length === 0) {
          toast.success(`Đã đẩy báo cáo tuần (${res.weekLabel}), tổng ${res.succeeded} người`);
        } else {
          toast.warning(
            `Thành công một phần: ${res.succeeded} thành công, ${res.failed.length} thất bại`,
            { description: res.failed.map((f) => f.error).slice(0, 3).join("；") }
          );
        }
      } catch (err) {
        toast.error("Đẩy thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  function switchPreset(k: Exclude<PeriodKey, "custom">) {
    const next = new URLSearchParams(sp.toString());
    next.set("period", k);
    next.delete("start");
    next.delete("end");
    router.push(`/reports?${next.toString()}`);
    setCustomOpen(false);
  }

  function applyCustom() {
    if (!start || !end) return;
    const next = new URLSearchParams();
    next.set("period", "custom");
    next.set("start", start);
    next.set("end", end);
    router.push(`/reports?${next.toString()}`);
  }

  const maxCat = data.byCategory.reduce((m, c) => Math.max(m, c.count), 0);

  const exportHref = (() => {
    const q = new URLSearchParams();
    q.set("period", periodKey);
    if (periodKey === "custom" && customStart && customEnd) {
      q.set("start", customStart);
      q.set("end", customEnd);
    }
    return `/api/reports/export?${q.toString()}`;
  })();

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-5 w-5 text-primary" strokeWidth={1.8} />
            Báo cáo văn phòng
          </h1>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Kỳ thống kê: <span className="text-foreground">{periodLabel}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 ll-no-print">
          <div className="flex rounded-md border border-border bg-card p-0.5">
            {(["month", "quarter", "year", "lastYear"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => switchPreset(k)}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] transition-colors",
                  periodKey === k
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={presetLabels[k]}
              >
                {PERIOD_LABEL[k]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCustomOpen((v) => !v)}
              className={cn(
                "rounded px-2.5 py-1 text-[11px] transition-colors",
                periodKey === "custom"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Tuỳ chỉnh
            </button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleScanOverdue}
            disabled={scanning}
            className="gap-1.5"
            title="Quét vụ đã kết thúc quá 30 ngày chưa lưu trữ"
          >
            {scanning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Quét quá hạn lưu trữ
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handlePushWeekly}
            disabled={pushing}
            className="gap-1.5"
            title="Đẩy thông báo báo cáo tuần cho mọi luật sư"
          >
            {pushing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Đẩy báo cáo tuần
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="gap-1.5"
            title="Cmd/Ctrl+P cũng kích hoạt được, có thể 「Lưu thành PDF」"
          >
            <Printer className="h-3.5 w-3.5" />
            In / PDF
          </Button>
          <Link href={exportHref} prefetch={false}>
            <Button size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Xuất xlsx
            </Button>
          </Link>
        </div>
      </header>

      {customOpen && (
        <div className="ll-no-print flex flex-wrap items-end gap-2 rounded-md border border-border bg-card p-3 text-xs">
          <div>
            <label className="text-muted-foreground">Bắt đầu (gồm)</label>
            <Input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-0.5 h-8 w-36 text-[12px]"
            />
          </div>
          <span className="pb-2 text-muted-foreground">~</span>
          <div>
            <label className="text-muted-foreground">Kết thúc (gồm)</label>
            <Input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-0.5 h-8 w-36 text-[12px]"
            />
          </div>
          <Button size="sm" onClick={applyCustom} disabled={!start || !end}>
            Áp dụng
          </Button>
          <span className="ml-2 text-[10px] text-muted-foreground">Khoảng cách tối đa 5 năm</span>
        </div>
      )}

      {resolveError && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{resolveError}</span>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={Briefcase} label="Tiếp nhận mới kỳ này" value={data.kpis.newIntake} color="#5B8DEF" />
        <Kpi icon={Wallet} label="Đang xử lý" value={data.kpis.inProgress} color="#F5A742" />
        <Kpi icon={CheckCircle2} label="Đã kết thúc kỳ này" value={data.kpis.closed} color="#48BB78" />
        <Kpi
          icon={Archive}
          label="Đã lưu trữ kỳ này"
          value={data.kpis.archived}
          color="#9B7BF7"
          hint={data.kpis.closed > 0 ? `Tỷ lệ lưu trữ ${Math.round(data.kpis.archiveRate * 100)}%` : ""}
        />
      </div>

      {/* Phân bố loại */}
      <section className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-medium">Tiếp nhận mới kỳ này · Phân bố loại</h3>
        {data.byCategory.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Kỳ này chưa có tiếp nhận mới</p>
        ) : (
          <ul className="space-y-2">
            {data.byCategory.map((c) => {
              const pct = maxCat > 0 ? (c.count / maxCat) * 100 : 0;
              const color = matterCategoryColor[c.category];
              return (
                <li key={c.category} className="flex items-center gap-3 text-xs">
                  <span className="w-16 shrink-0 text-foreground/80">
                    {matterCategoryLabel[c.category]}
                  </span>
                  <div className="flex-1">
                    <div
                      className="h-4 rounded"
                      style={{
                        width: `${pct}%`,
                        minWidth: c.count > 0 ? 8 : 0,
                        backgroundColor: `${color}99`
                      }}
                    />
                  </div>
                  <span className="w-10 shrink-0 font-mono text-right text-foreground">
                    {c.count}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* Luật sư sản lượng */}
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium">Sản lượng luật sư · kỳ này</h3>
          {data.byLawyer.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Kỳ này chưa có dữ liệu sản lượng</p>
          ) : (
            <div className="overflow-hidden rounded border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-normal">Luật sư</th>
                    <th className="px-2 py-1.5 text-right font-normal">Tiếp nhận mới</th>
                    <th className="px-2 py-1.5 text-right font-normal">Đã kết thúc</th>
                    <th className="px-2 py-1.5 text-right font-normal">Thu tiền (đ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.byLawyer.map((r) => (
                    <tr key={r.userId}>
                      <td className="px-2 py-1.5">{r.name}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{r.ownedCount}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{r.closedCount}</td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {r.receivedAmount.toLocaleString("zh-CN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Khách hàngPhải thu */}
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium">Phải thu khách hàng · kỳ này</h3>
          {data.byClientReceivable.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Kỳ này chưa có dữ liệu phải thu</p>
          ) : (
            <div className="overflow-hidden rounded border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-normal">Khách hàng</th>
                    <th className="px-2 py-1.5 text-right font-normal">Phải thu</th>
                    <th className="px-2 py-1.5 text-right font-normal">Đã thu</th>
                    <th className="px-2 py-1.5 text-right font-normal">Còn lại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.byClientReceivable.map((r) => (
                    <tr key={r.clientId}>
                      <td className="px-2 py-1.5">{r.name}</td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {r.receivable.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-emerald-600">
                        {r.received.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                      </td>
                      <td
                        className={cn(
                          "px-2 py-1.5 text-right font-mono",
                          r.balance > 0 ? "text-rose-600" : "text-muted-foreground"
                        )}
                      >
                        {r.balance.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Phân tích chu kỳ xử lý */}
      <section className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-medium">Chu kỳ xử lý · vụ đã kết thúc kỳ này (tiếp nhận → kết thúc)</h3>
        {cycle.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Kỳ này chưa có vụ đã kết thúc</p>
        ) : (
          <div className="overflow-hidden rounded border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left font-normal">Loại</th>
                  <th className="px-2 py-1.5 text-right font-normal">Số mẫu</th>
                  <th className="px-2 py-1.5 text-right font-normal">Trung bình (ngày)</th>
                  <th className="px-2 py-1.5 text-right font-normal">Trung vị (ngày)</th>
                  <th className="px-2 py-1.5 text-right font-normal">Nhanh nhất (ngày)</th>
                  <th className="px-2 py-1.5 text-right font-normal">Chậm nhất (ngày)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cycle.map((r) => (
                  <tr key={r.category}>
                    <td className="px-2 py-1.5">{matterCategoryLabel[r.category]}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{r.count}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{r.avgDays}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{r.medianDays}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-emerald-600">{r.minDays}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-rose-600">{r.maxDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* AI kiểm tra top issues */}
      <section className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
          Kiểm tra AI · vấn đề tần cao kỳ này
          <span className="text-[10px] font-normal text-muted-foreground">
            （{reviewAnalysis.recordCount} lần kiểm tra / {reviewAnalysis.documentCount} văn bản /{" "}
            {reviewAnalysis.totalItems} vấn đề）
          </span>
        </h3>
        {reviewAnalysis.totalItems === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Kỳ này chưa có bản ghi kiểm tra AI</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <SevTotalChip sev="HIGH" n={reviewAnalysis.bySeverity.HIGH} />
              <SevTotalChip sev="MEDIUM" n={reviewAnalysis.bySeverity.MEDIUM} />
              <SevTotalChip sev="LOW" n={reviewAnalysis.bySeverity.LOW} />
            </div>
            <div className="overflow-hidden rounded border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-normal">Tiêu đề vấn đề</th>
                    <th className="px-2 py-1.5 text-left font-normal w-20">Loại</th>
                    <th className="px-2 py-1.5 text-right font-normal w-16">Số lần</th>
                    <th className="px-2 py-1.5 text-right font-normal w-32">Cao/TB/Thấp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reviewAnalysis.topIssues.map((iss) => (
                    <tr key={iss.title}>
                      <td className="px-2 py-1.5">{iss.title}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{TYPE_CN[iss.type]}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{iss.occurrences}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-[10px]">
                        <span className="text-rose-600">{iss.severityCounts.HIGH}</span>
                        <span className="mx-0.5 text-muted-foreground">/</span>
                        <span className="text-amber-600">{iss.severityCounts.MEDIUM}</span>
                        <span className="mx-0.5 text-muted-foreground">/</span>
                        <span className="text-slate-500">{iss.severityCounts.LOW}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

const TYPE_CN = {
  MISSING: "Thiếu",
  RISK: "Rủi ro",
  ISSUE: "Vấn đề",
  SUGGESTION: "Đề xuất"
} as const;

function SevTotalChip({ sev, n }: { sev: "HIGH" | "MEDIUM" | "LOW"; n: number }) {
  const meta = {
    HIGH: { label: "Nghiêm trọng cao", cls: "border-rose-200 bg-rose-50 text-rose-700" },
    MEDIUM: { label: "Nghiêm trọng TB", cls: "border-amber-200 bg-amber-50 text-amber-700" },
    LOW: { label: "Nghiêm trọng thấp", cls: "border-slate-200 bg-slate-50 text-slate-600" }
  }[sev];
  return (
    <div className={cn("rounded border px-3 py-2 text-xs", meta.cls)}>
      <div className="text-[10px] opacity-80">{meta.label}</div>
      <div className="mt-0.5 font-mono text-lg">{n}</div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  color,
  hint
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md"
          style={{ backgroundColor: `${color}1F`, color }}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
        </span>
      </div>
      <div className="mt-1 font-mono text-2xl tabular text-foreground">{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
