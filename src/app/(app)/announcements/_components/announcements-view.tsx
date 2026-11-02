"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Pin, Plus, Pencil, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { AnnouncementDialog } from "./announcement-dialog";
import { archiveAnnouncement } from "@/server/announcements/actions";
import { toast } from "sonner";

type AnnouncementItem = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  publishedAt: Date;
  expiresAt: Date | null;
  archivedAt: Date | null;
  author: { id: string; name: string };
};

function AnnouncementsHeader({ isManager, onCreate, activeCount }: { isManager: boolean; onCreate: () => void; activeCount: number }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-xl">
          <Megaphone className="h-5 w-5 text-primary" strokeWidth={1.8} />
          Hướng dẫn thông báo
        </h1>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Tổng {activeCount} thông báo · Thông báo ghim sẽ hiện ở banner đầu toàn site
        </p>
      </div>
      {isManager && (
        <Button size="sm" onClick={onCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />Đăng thông báo
        </Button>
      )}
    </header>
  );
}

function AnnouncementItem({ a, canEdit, onEdit, onArchive }: { a: AnnouncementItem; canEdit: boolean; onEdit: () => void; onArchive: () => void }) {
  const expired = a.expiresAt && new Date(a.expiresAt) < new Date();
  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <header className="mb-1.5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {a.pinned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
              <Pin className="h-2.5 w-2.5" />Ghim
            </span>
          )}
          <h3 className="text-sm font-medium">{a.title}</h3>
          {expired && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Đã hết hạn</span>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={onEdit} className="h-7 px-2 text-[11px] text-muted-foreground hover:text-primary">
              <Pencil className="h-3 w-3" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onArchive} className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive">
              <Archive className="h-3 w-3" />
            </Button>
          </div>
        )}
      </header>
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/80">{a.content}</p>
      <div className="mt-2 text-[10px] text-muted-foreground">
        {a.author.name} · Đăng ngày {formatDate(a.publishedAt)}
        {a.expiresAt && ` · Hết hạn ${formatDate(a.expiresAt)}`}
      </div>
    </li>
  );
}

export function AnnouncementsView({
  items,
  isManager,
  currentUserId
}: {
  items: AnnouncementItem[];
  isManager: boolean;
  currentUserId: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementItem | null>(null);
  const router = useRouter();

  async function handleArchive(a: AnnouncementItem) {
    if (!confirm(`Lưu trữ thông báo "${a.title}"? Sau khi lưu trữ không hiện nữa nhưng vẫn giữ lịch sử.`)) return;
    try {
      await archiveAnnouncement(a.id);
      toast.success("Đã lưu trữ");
      router.refresh();
    } catch (err) {
      toast.error("Lưu trữ thất bại", { description: err instanceof Error ? err.message : "" });
    }
  }

  const active = items.filter(a => !a.archivedAt);

  return (
    <div className="space-y-4">
      <AnnouncementsHeader isManager={isManager} onCreate={() => { setEditing(null); setDialogOpen(true); }} activeCount={active.length} />
      {active.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-background py-8 text-center text-xs text-muted-foreground">Chưa có thông báo</p>
      ) : (
        <ul className="space-y-2">{active.map(a => { const canEdit = isManager || a.author.id === currentUserId; return <AnnouncementItem key={a.id} a={a} canEdit={canEdit} onEdit={() => { setEditing(a); setDialogOpen(true); }} onArchive={() => handleArchive(a)} />; })}</ul>
      )}
      <AnnouncementDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  );
}
