"use client";

/**
 * Pipeline tiếp nhận dạng Kanban (TD-A1/A2, UI-DESIGN §7.6).
 * Kéo-thả đổi giai đoạn giữa các cột đang xử lý (INTAKE ↔ PENDING_CONFIRMATION);
 * cột đóng (Cần bổ sung/Đã chuyển/Từ chối) chỉ xem. SLA > 24h cảnh báo.
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Clock3, LayoutGrid, List } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
  type DragEndEvent
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { moveIntakeStage } from "@/server/intakes/actions";
import {
  INTAKE_STAGES,
  canMove,
  formatPending,
  isOverSla,
  pendingHours,
  type IntakeStage,
  type PipelineItem,
  type StageColumn
} from "./pipeline-lib";
import { formatCurrency } from "@/lib/utils";

const WORKING: IntakeStage[] = ["INTAKE", "PENDING_CONFIRMATION"];

export function IntakePipeline({ items, onMoved }: { items: PipelineItem[]; onMoved: () => void }) {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [pending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(e: DragEndEvent) {
    const to = e.over?.id as IntakeStage | undefined;
    const item = items.find((i) => i.id === e.active.id);
    if (!to || !item || !canMove(item.status, to)) return;
    startTransition(async () => {
      try {
        await moveIntakeStage({ id: item.id, toStatus: to as "INTAKE" | "PENDING_CONFIRMATION" });
        onMoved();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Đổi giai đoạn thất bại");
      }
    });
  }

  return (
    <div className="space-y-3">
      <ViewToggle view={view} onChange={setView} />
      {view === "kanban" ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {INTAKE_STAGES.map((col) => (
              <PipelineColumn
                key={col.key}
                column={col}
                items={items.filter((i) => i.status === col.key)}
                pending={pending}
              />
            ))}
          </div>
        </DndContext>
      ) : (
        <IntakeList items={items} />
      )}
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: "kanban" | "list"; onChange: (v: "kanban" | "list") => void }) {
  const btns = [
    { key: "kanban", icon: <LayoutGrid className="h-3.5 w-3.5" />, label: "Kanban" },
    { key: "list", icon: <List className="h-3.5 w-3.5" />, label: "Danh sách" }
  ] as const;
  return (
    <div className="inline-flex gap-1 rounded-lg border border-border bg-card p-0.5">
      {btns.map((b) => (
        <button
          key={b.key}
          onClick={() => onChange(b.key)}
          className={
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors " +
            (view === b.key ? "bg-popover text-foreground" : "text-muted-foreground hover:text-foreground")
          }
        >
          {b.icon}
          {b.label}
        </button>
      ))}
    </div>
  );
}

function PipelineColumn({
  column,
  items,
  pending
}: {
  column: StageColumn;
  items: PipelineItem[];
  pending: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key, disabled: !column.droppable });
  const highlight = column.droppable && isOver;
  return (
    <section
      ref={setNodeRef}
      className={
        "flex min-h-[120px] flex-col rounded-xl border bg-card/40 p-2.5 transition-colors " +
        (highlight ? "border-primary" : "border-border")
      }
    >
      <header className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-medium text-foreground">{column.label}</span>
        <span className="text-[11px] text-muted-foreground">{items.length}</span>
      </header>
      <div className="flex flex-1 flex-col gap-2">
        {items.map((item) => (
          <PipelineCard key={item.id} item={item} disabled={!column.droppable || pending} />
        ))}
        {items.length === 0 && <p className="py-6 text-center text-[11px] text-muted-foreground">Trống</p>}
      </div>
    </section>
  );
}

function PipelineCard({ item, disabled }: { item: PipelineItem; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id, disabled });
  const hours = pendingHours(item.receivedAt);
  const showSla = WORKING.includes(item.status);
  const over = showSla && isOverSla(hours);

  return (
    <article
      ref={setNodeRef}
      style={transform ? { transform: CSS.Transform.toString(transform) } : undefined}
      {...(disabled ? {} : listeners)}
      {...attributes}
      className={
        "rounded-lg border border-border bg-card p-3 " +
        (disabled ? "opacity-70" : "cursor-grab active:cursor-grabbing ") +
        (isDragging ? "opacity-50" : "")
      }
    >
      <Link href={`/intakes/${item.id}`} className="block">
        <p className="line-clamp-2 text-[13px] font-medium text-foreground hover:text-primary">{item.title}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {item.clientName ?? item.contactName ?? "—"}
        </p>
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <OwnerBadge name={item.ownerName} />
        {showSla && <SlaBadge hours={hours} over={over} />}
      </div>
    </article>
  );
}

function OwnerBadge({ name }: { name: string | null }) {
  const initial = (name?.trim()[0] ?? "?").toUpperCase();
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-popover text-[10px] font-medium text-foreground">
        {initial}
      </span>
      {name ?? "Chưa gán"}
    </span>
  );
}

function SlaBadge({ hours, over }: { hours: number | null; over: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium"
      style={{
        borderColor: over ? "#FBBF2450" : "#2A3656",
        color: over ? "#FBBF24" : "#9BA8C7"
      }}
    >
      <Clock3 className="h-3 w-3" />
      {formatPending(hours)}
    </span>
  );
}

function IntakeList({ items }: { items: PipelineItem[] }) {
  if (items.length === 0) {
    return <p className="rounded-xl border border-border bg-card py-12 text-center text-xs text-muted-foreground">Không có tiếp nhận.</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Tiêu đề</th>
            <th className="px-3 py-2.5 font-medium">Khách</th>
            <th className="px-3 py-2.5 font-medium">Giai đoạn</th>
            <th className="px-3 py-2.5 text-right font-medium">Giá trị</th>
            <th className="px-4 py-2.5 text-right font-medium">Chờ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => {
            const hours = pendingHours(item.receivedAt);
            return (
              <tr key={item.id} className="transition-colors hover:bg-popover">
                <td className="px-4 py-3">
                  <Link href={`/intakes/${item.id}`} className="text-[13px] text-foreground hover:text-primary">{item.title}</Link>
                </td>
                <td className="px-3 py-3 text-muted-foreground">{item.clientName ?? item.contactName ?? "—"}</td>
                <td className="px-3 py-3 text-[12px] text-muted-foreground">
                  {INTAKE_STAGES.find((s) => s.key === item.status)?.label}
                </td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-muted-foreground">
                  {item.claimAmount ? formatCurrency(item.claimAmount) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ borderColor: isOverSla(hours) ? "#FBBF2450" : "#2A3656", color: isOverSla(hours) ? "#FBBF24" : "#9BA8C7" }}
                  >
                    {formatPending(hours)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
