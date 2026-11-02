"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileText, User, Calendar, Check, X } from "lucide-react";
import Link from "next/link";
import { CLOSED_REASON_CN } from "@/server/archive/schemas";
import type { PendingRecord } from "./batch-reject-dialog";

const CATEGORY_CN: Record<string, string> = {
  CIVIL_COMMERCIAL: "Dân sự",
  CRIMINAL: "Hình sự",
  ADMINISTRATIVE: "Hành chính",
  NON_LITIGATION: "Phi tố tụng",
  LEGAL_COUNSEL: "Tư vấn",
  SPECIAL_PROJECT: "Đặc biệt"
};

interface ArchiveRowProps {
  rec: PendingRecord;
  selected: boolean;
  onToggle: () => void;
  onDetail: () => void;
  onApprove: () => void;
  onReject: () => void;
}

function ArchiveRow({ rec, selected, onToggle, onDetail, onApprove, onReject }: ArchiveRowProps) {
  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-3 py-2.5"><Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`Chọn ${rec.archiveNo}`} /></td>
      <td className="px-3 py-2.5 font-mono text-xs text-[#9B7BF7]">{rec.matter.firmCaseNo ?? "—"}</td>
      <td className="px-3 py-2.5"><Link href={`/matters/${rec.matter.id}`} className="hover:text-[#5B8DEF] transition-colors line-clamp-1"><FileText className="h-3 w-3 inline mr-1 text-muted-foreground" />{rec.matter.title}</Link></td>
      <td className="px-3 py-2.5 text-xs">{CATEGORY_CN[rec.matter.category] ?? rec.matter.category}</td>
      <td className="px-3 py-2.5 text-xs"><User className="h-3 w-3 inline mr-1 text-muted-foreground" />{rec.matter.primaryClient?.name ?? "—"}</td>
      <td className="px-3 py-2.5 text-xs">{rec.closedReason ? CLOSED_REASON_CN[rec.closedReason as keyof typeof CLOSED_REASON_CN] : "—"}</td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground"><Calendar className="h-3 w-3 inline mr-1" />{rec.archivedAt.toISOString().slice(0, 10)}</td>
      <td className="px-3 py-2.5 text-xs">{rec.archivedBy}</td>
      <td className="px-3 py-2.5">{rec.missingItems.length > 0 ? <Badge variant="outline" className="border-amber-500/40 text-amber-500 text-[10px]">{rec.missingItems.length} mục</Badge> : <span className="text-xs text-muted-foreground">Đủ</span>}</td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button type="button" onClick={onDetail} className="text-xs text-muted-foreground hover:text-foreground">Xem</button>
          <span className="text-muted-foreground/40">·</span>
          <button type="button" onClick={onApprove} className="inline-flex items-center gap-0.5 text-xs text-emerald-600 hover:text-emerald-500"><Check className="h-3 w-3" />Duyệt</button>
          <span className="text-muted-foreground/40">·</span>
          <button type="button" onClick={onReject} className="inline-flex items-center gap-0.5 text-xs text-destructive hover:text-destructive/80"><X className="h-3 w-3" />Từ chối</button>
        </div>
      </td>
    </tr>
  );
}

interface ArchiveTableProps {
  records: PendingRecord[];
  selected: Set<string>;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onRowDetail: (rec: PendingRecord) => void;
  onRowApprove: (rec: PendingRecord) => void;
  onRowReject: (rec: PendingRecord) => void;
}

export function ArchiveTable({ records, selected, onToggleAll, onToggleOne, onRowDetail, onRowApprove, onRowReject }: ArchiveTableProps) {
  const allChecked = records.length > 0 && selected.size === records.length;
  const indeterminate = selected.size > 0 && !allChecked;
  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 w-8"><Checkbox checked={allChecked ? true : indeterminate ? "indeterminate" : false} onCheckedChange={onToggleAll} aria-label="Chọn tất cả" /></th>
            <th className="px-3 py-2 text-left font-normal w-32">Mã nội bộ</th>
            <th className="px-3 py-2 text-left font-normal">Vụ án</th>
            <th className="px-3 py-2 text-left font-normal w-20">Loại</th>
            <th className="px-3 py-2 text-left font-normal w-24">Bên ủy quyền</th>
            <th className="px-3 py-2 text-left font-normal w-20">Hình thức kết thúc</th>
            <th className="px-3 py-2 text-left font-normal w-28">Thời gian gửi</th>
            <th className="px-3 py-2 text-left font-normal w-20">Người yêu cầu</th>
            <th className="px-3 py-2 text-left font-normal w-16">Thiếu</th>
            <th className="px-3 py-2 text-right font-normal w-44">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {records.map((rec) => <ArchiveRow key={rec.id} rec={rec} selected={selected.has(rec.id)} onToggle={() => onToggleOne(rec.id)} onDetail={() => onRowDetail(rec)} onApprove={() => onRowApprove(rec)} onReject={() => onRowReject(rec)} />)}
        </tbody>
      </table>
    </div>
  );
}
