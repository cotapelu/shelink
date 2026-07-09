"use client";

import {
  SEAL_TYPE_CN,
  SEAL_STATUS_CN,
  SEAL_STATUS_COLOR
} from "./seal-types";
import type { SealRequestRow } from "./seal-types";

export function SealRow({
  row,
  currentUser,
  canApprove,
  onAction
}: {
  row: SealRequestRow;
  currentUser: { id: string; role: string };
  canApprove: boolean;
  onAction: (action: "detail" | "approve" | "reject" | "stamp" | "cancel") => void;
}) {
  const colors = SEAL_STATUS_COLOR[row.status];
  const isOwner = row.requestedById === currentUser.id;
  const isAdmin = currentUser.role === "ADMIN" || currentUser.role === "PRINCIPAL_LAWYER";
  const canStamp =
    isOwner ||
    currentUser.role === "ADMIN" ||
    currentUser.role === "PRINCIPAL_LAWYER" ||
    (currentUser.role === "FINANCE" && row.sealType === "FINANCE_SEAL");

  return (
    <tr className="ll-row border-t border-border">
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={() => onAction("detail")}
          className="font-mono text-[11px] text-primary hover:underline"
          title="查看用章申请详情"
        >
          {row.code}
        </button>
      </td>
      <td className="px-3 py-2">{SEAL_TYPE_CN[row.sealType] ?? row.sealType}</td>
      <td className="px-3 py-2 text-foreground">{row.requestedBy.name}</td>
      <td className="px-3 py-2 text-muted-foreground">
        {row.matter ? (
          <a
            href={`/matters/${row.matter.id}`}
            className="inline-block max-w-[180px] truncate text-[11px] hover:text-primary"
            title={row.matter.title}
          >
            {row.matter.title}
          </a>
        ) : (
          <span className="text-[10px]">—</span>
        )}
      </td>
      <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground" title={row.purpose}>
        {row.purpose}
      </td>
      <td className="px-3 py-2">
        <span
          className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]"
          style={{
            background: colors.bg,
            color: colors.text,
            borderColor: colors.border
          }}
        >
          {SEAL_STATUS_CN[row.status]}
        </span>
      </td>
      <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
        {new Date(row.requestedAt).toLocaleDateString("zh-CN")}
      </td>
      <td className="px-3 py-2 text-right">
        {row.status === "PENDING" && (
          <div className="flex justify-end gap-1.5">
            {canApprove && (
              <button
                type="button"
                onClick={() => onAction("approve")}
                className="text-[11px] text-primary hover:underline"
              >
                审批
              </button>
            )}
            {isOwner && (
              <>
                {canApprove && <span className="text-muted-foreground">|</span>}
                <button
                  type="button"
                  onClick={() => onAction("cancel")}
                  className="text-[11px] text-muted-foreground hover:text-destructive"
                >
                  撤销
                </button>
              </>
            )}
          </div>
        )}
        {row.status === "APPROVED" && canStamp && (
          <button
            type="button"
            onClick={() => onAction("stamp")}
            className="text-[11px] text-primary hover:underline"
          >
            回填盖章件
          </button>
        )}
        {row.status === "STAMPED" && row.stampedDoc && (
          <a
            href={`/api/documents/${row.stampedDoc.id}/download`}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            下载
          </a>
        )}
        {row.status === "REJECTED" && isAdmin && (
          <span className="text-[10px] text-muted-foreground">已驳回</span>
        )}
      </td>
    </tr>
  );
}
