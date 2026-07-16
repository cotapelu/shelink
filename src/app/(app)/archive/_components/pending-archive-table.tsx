"use client";

import { useState } from "react";
import { ArchiveDialogs } from "./archive-dialogs";
import { ArchiveToolbar } from "./archive-toolbar";
import { ArchiveTable } from "./archive-table";
import type { PendingRecord } from "./batch-reject-dialog";

function useSelection(records: PendingRecord[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allChecked = records.length > 0 && selected.size === records.length;
  const indeterminate = selected.size > 0 && !allChecked;
  const selectedRecords = records.filter((r) => selected.has(r.id));
  function toggleAll() { if (allChecked) setSelected(new Set()); else setSelected(new Set(records.map((r) => r.id))); }
  function toggleOne(id: string) { setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function clear() { setSelected(new Set()); }
  return { selected, allChecked, indeterminate, selectedRecords, toggleAll, toggleOne, clear };
}

interface PendingArchiveTableProps {
  records: PendingRecord[];
}

export function PendingArchiveTable({ records }: PendingArchiveTableProps) {
  const [dialog, setDialog] = useState<{ type: "approve" | "reject" | "detail"; record: PendingRecord } | null>(null);
  const [batchAction, setBatchAction] = useState<"approve" | "reject" | null>(null);
  const { selected, selectedRecords, toggleAll, toggleOne, clear } = useSelection(records);

  if (records.length === 0) {
    return <div className="rounded-lg border border-dashed border-border/60 py-16 text-center text-sm text-muted-foreground">当前没有待审批归档申请。律师提交归档后会出现在这里。</div>;
  }

  return (
    <>
      {selected.size > 0 && <ArchiveToolbar selectedSize={selected.size} total={records.length} onClear={clear} onApprove={() => setBatchAction("approve")} onReject={() => setBatchAction("reject")} />}
      <ArchiveTable records={records} selected={selected} onToggleAll={toggleAll} onToggleOne={toggleOne} onRowDetail={(rec) => setDialog({ type: "detail", record: rec })} onRowApprove={(rec) => setDialog({ type: "approve", record: rec })} onRowReject={(rec) => setDialog({ type: "reject", record: rec })} />
      <ArchiveDialogs dialog={dialog} batchAction={batchAction} selectedRecords={selectedRecords} onCloseDialog={() => setDialog(null)} onCloseBatch={(refreshed) => { setBatchAction(null); if (refreshed) clear(); }} />
    </>
  );
}
