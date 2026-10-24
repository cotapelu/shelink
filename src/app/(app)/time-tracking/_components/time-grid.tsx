"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { approveTimeEntries, rejectTimeEntries, submitTimeEntries } from "@/server/time-entries/actions";
import { TimeTable } from "./time-table";

export interface TimeRow {
  id: string;
  date: Date;
  hours: number;
  billable: boolean;
  status: string;
  activityType: string;
  description: string | null;
  userName: string | null;
  matterLabel: string | null;
}

/** Lưới ghi giờ + thao tác gửi duyệt/duyệt (UI-DESIGN §7.9). */
export function TimeGrid({ rows, canApprove }: { rows: TimeRow[]; canApprove: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<unknown>, success: string) =>
    startTransition(async () => {
      try {
        await fn();
        toast.success(success);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Thao tác thất bại");
      }
    });

  const drafts = rows.filter((r) => r.status === "DRAFT");
  const submitted = rows.filter((r) => r.status === "SUBMITTED");

  return (
    <div className="space-y-3">
      <TimeApprovalBar drafts={drafts} submitted={submitted} canApprove={canApprove} pending={pending} run={run} />

      <TimeTable rows={rows} />
    </div>
  );
}

function TimeApprovalBar({
  drafts, submitted, canApprove, pending, run
}: {
  drafts: TimeRow[];
  submitted: TimeRow[];
  canApprove: boolean;
  pending: boolean;
  run: (fn: () => Promise<unknown>, success: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {drafts.length > 0 && (
        <Button size="sm" disabled={pending} onClick={() => run(() => submitTimeEntries({ ids: drafts.map((r) => r.id) }), "Đã gửi duyệt")}>
          Gửi duyệt ({drafts.length} nháp)
        </Button>
      )}
      {canApprove && submitted.length > 0 && (
        <>
          <Button size="sm" disabled={pending} onClick={() => run(() => approveTimeEntries({ ids: submitted.map((r) => r.id) }), "Đã duyệt")}>
            Duyệt ({submitted.length})
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => rejectTimeEntries({ ids: submitted.map((r) => r.id), rejectNote: "Không hợp lệ" }), "Đã từ chối")}>
            Từ chối
          </Button>
        </>
      )}
    </div>
  );
}
