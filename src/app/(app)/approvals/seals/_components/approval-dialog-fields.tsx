"use client";

import { AlertOctagon } from "lucide-react";
import { type SealRequestRow, SEAL_TYPE_CN } from "./seal-types";
import { Field } from "./field";
import { DocumentLink } from "./document-link";

interface ApprovalDialogFieldsProps {
  row: SealRequestRow;
}

export function ApprovalDialogFields({ row }: ApprovalDialogFieldsProps) {
  const draftDocName = row.draftDoc ? row.draftDoc.name : "";

  return (
    <div className="min-w-0 space-y-2 rounded border border-border bg-muted/20 p-3 text-[12px]">
      <Field k="Số thứ tự" v={row.code} mono />
      <Field k="Loại dấu" v={SEAL_TYPE_CN[row.sealType] ?? row.sealType} />
      <Field k="Người yêu cầu" v={row.requestedBy.name} />
      {row.matter && (
        <Field k="Vụ án liên kết" v={`${row.matter.internalCode} ${row.matter.title}`} />
      )}
      <Field k="Tiêu đề văn bản" v={row.documentTitle} />
      <Field k="Lý do" v={row.purpose} />
      <Field k="Số trang / Số bản" v={`${row.pageCount} trang × ${row.copies} bản`} />
      {row.requireCrossPageSeal && <Field k="Dấu kẽ trang" v="Có" />}
      {row.urgency === "URGENT" && (
        <p className="flex items-center gap-1 text-destructive">
          <AlertOctagon className="h-3 w-3" />
          Khẩn cấp
        </p>
      )}
      {row.draftDoc && (
        <DocumentLink
          label="Bản chờ đóng dấu"
          docId={row.draftDoc.id}
          name={draftDocName}
        />
      )}
    </div>
  );
}
