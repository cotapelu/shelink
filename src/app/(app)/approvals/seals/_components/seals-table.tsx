"use client";

import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { SealRow } from "./seal-row";
import { emptySealsText } from "./seals-helpers";
import type { SealRequestRow } from "./seal-types";

interface SealsTableProps {
  rows: SealRequestRow[];
  currentUser: { id: string; role: string };
  approvableIds: Set<string>;
  onAction: (action: any, row: SealRequestRow) => void;
  tab: "allMine" | "pending" | "processed" | "toApprove" | "firm";
  firmTabLabel: string;
}

export function SealsTable({
  rows,
  currentUser,
  approvableIds,
  onAction,
  tab,
  firmTabLabel
}: SealsTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {rows.length === 0 ? (
        <div className="ll-surface rounded-lg p-12 text-center text-sm text-muted-foreground">
          <FileText className="mx-auto mb-2 h-6 w-6 opacity-40" />
          {emptySealsText(tab, firmTabLabel)}
        </div>
      ) : (
        <div className="ll-surface overflow-hidden rounded-lg">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-normal">流水号</th>
                <th className="px-3 py-2 text-left font-normal">章种类</th>
                <th className="px-3 py-2 text-left font-normal">申请人</th>
                <th className="px-3 py-2 text-left font-normal">关联案件</th>
                <th className="px-3 py-2 text-left font-normal">用章事由</th>
                <th className="px-3 py-2 text-left font-normal">状态</th>
                <th className="px-3 py-2 text-left font-normal">提交时间</th>
                <th className="px-3 py-2 text-right font-normal">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <SealRow
                  key={r.id}
                  row={r}
                  currentUser={currentUser}
                  canApprove={approvableIds.has(r.id)}
                  onAction={(action) => onAction(action, r)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
