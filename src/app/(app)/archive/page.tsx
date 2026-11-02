import { MatterCategory, ArchiveClosedReason } from "@prisma/client";
import Link from "next/link";
import { Lock, FileText, Calendar, User, Download } from "lucide-react";
import {
  listArchivedMatters,
  listPendingArchiveRecords
} from "@/server/archive/actions";
import { CLOSED_REASON_CN } from "@/server/archive/schemas";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/auth/session";
import { PendingArchiveTable } from "./_components/pending-archive-table";
import { ArchiveTabs } from "./_components/archive-tabs";

interface ArchiveRecord {
  id: string;
  matter: {
    id: string;
    firmCaseNo: string | null;
    title: string;
    category: MatterCategory;
    primaryClient?: { name: string } | null;
  };
  closedReason: ArchiveClosedReason | null;
  completedAt: Date | null;
  archivedAt: Date;
  archivedBy: string;
  missingItems: string[];
}

const CATEGORY_CN: Record<MatterCategory, string> = {
  CIVIL_COMMERCIAL: "Dân sự",
  LABOR_ARBITRATION: "Lao động",
  COMMERCIAL_ARBITRATION: "Trọng tài",
  CRIMINAL: "Hình sự",
  ADMINISTRATIVE: "Hành chính",
  NON_LITIGATION: "Phi tố tụng",
  LEGAL_COUNSEL: "Tư vấn",
  SPECIAL_PROJECT: "Đặc biệt"
};

function ArchiveHeader({ isAdmin, activeTab, itemsCount, pendingCount }: { isAdmin: boolean; activeTab: string; itemsCount: number; pendingCount: number }) {
  return (
    <header className="flex items-end justify-between">
      <div>
        <h1 className="text-xl font-medium flex items-center gap-2">
          <Lock className="h-5 w-5 text-[#9B7BF7]" />Quản lý lưu trữ
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {isAdmin ? "Góc nhìn quản trị viên: duyệt yêu cầu lưu trữ chờ xử lý + xem vụ án đã lưu trữ." : "Vụ án đã lưu trữ sắp theo ngày lưu trữ giảm dần. Bấm vào chi tiết vụ án để xem bìa hồ sơ và mục lục, hoặc xuất gói lưu trữ."}
        </p>
      </div>
      <span className="text-xs text-muted-foreground">
        {activeTab === "pending" ? `Chờ duyệt ${pendingCount} mục` : `Đã lưu trữ ${itemsCount} mục`}
      </span>
    </header>
  );
}

function ArchiveTableRow({ rec }: { rec: ArchiveRecord }) {
  return (
    <tr key={rec.id} className="hover:bg-muted/20 transition-colors">
      <td className="px-3 py-2.5 font-mono text-xs text-[#9B7BF7]">{rec.matter.firmCaseNo ?? "—"}</td>
      <td className="px-3 py-2.5">
        <Link href={`/matters/${rec.matter.id}`} className="hover:text-[#5B8DEF] transition-colors line-clamp-1">
          <FileText className="h-3 w-3 inline mr-1 text-muted-foreground" />{rec.matter.title}
        </Link>
      </td>
      <td className="px-3 py-2.5 text-xs">{CATEGORY_CN[rec.matter.category as MatterCategory] ?? rec.matter.category}</td>
      <td className="px-3 py-2.5 text-xs"><User className="h-3 w-3 inline mr-1 text-muted-foreground" />{rec.matter.primaryClient?.name ?? "—"}</td>
      <td className="px-3 py-2.5 text-xs">{rec.closedReason ? CLOSED_REASON_CN[rec.closedReason] : "—"}</td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground"><Calendar className="h-3 w-3 inline mr-1" />{rec.completedAt ? rec.completedAt.toISOString().slice(0, 10) : "—"}</td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground">{rec.archivedAt.toISOString().slice(0, 10)}</td>
      <td className="px-3 py-2.5 text-xs">{rec.archivedBy}</td>
      <td className="px-3 py-2.5">
        {rec.missingItems.length > 0 ? (
          <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px]">{rec.missingItems.length} mục</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Đủ</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <a href={`/api/archive/${rec.matter.id}/export`} className="inline-flex items-center gap-1 text-xs text-[#5B8DEF] hover:text-[#5B8DEF]/80" title="Xuất ZIP lưu trữ">
          <Download className="h-3 w-3" />ZIP
        </a>
      </td>
    </tr>
  );
}

function ArchiveTable({ items }: { items: ArchiveRecord[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 py-16 text-center text-sm text-muted-foreground">
        Chưa có vụ án đã lưu trữ. Sau khi hoàn tất luồng lưu trữ ở&ldquo;Trạng thái → Lưu trữ&rdquo;đầu trang chi tiết vụ án, sẽ xuất hiện ở đây.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-normal w-32">Mã nội bộ</th>
            <th className="px-3 py-2 text-left font-normal">Vụ án</th>
            <th className="px-3 py-2 text-left font-normal w-20">Loại</th>
            <th className="px-3 py-2 text-left font-normal w-24">Bên ủy quyền</th>
            <th className="px-3 py-2 text-left font-normal w-20">Hình thức kết thúc</th>
            <th className="px-3 py-2 text-left font-normal w-28">Ngày kết thúc</th>
            <th className="px-3 py-2 text-left font-normal w-28">Ngày lưu trữ</th>
            <th className="px-3 py-2 text-left font-normal w-20">Người lưu trữ</th>
            <th className="px-3 py-2 text-left font-normal w-16">Thiếu</th>
            <th className="px-3 py-2 text-left font-normal w-16">Xuất</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {items.map(rec => <ArchiveTableRow key={rec.id} rec={rec} />)}
        </tbody>
      </table>
    </div>
  );
}

export default async function ArchivePage({
  searchParams
}: {
  searchParams?: { tab?: string };
}) {
  const session = await requireSession();
  const isAdmin = session.user.role === "ADMIN";
  const activeTab = isAdmin && searchParams?.tab === "pending" ? "pending" : "approved";
  const [items, pending] = await Promise.all([listArchivedMatters(), isAdmin ? listPendingArchiveRecords() : Promise.resolve([])]);
  return (
    <div className="px-6 py-6 space-y-5">
      <ArchiveHeader isAdmin={isAdmin} activeTab={activeTab} itemsCount={items.length} pendingCount={pending.length} />
      {isAdmin && <ArchiveTabs active={activeTab} pendingCount={pending.length} />}
      {activeTab === "pending" && isAdmin ? (
        <PendingArchiveTable records={pending} />
      ) : (
        <ArchiveTable items={items} />
      )}
    </div>
  );
}
