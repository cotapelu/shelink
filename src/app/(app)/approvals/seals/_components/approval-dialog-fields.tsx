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
      <Field k="流水号" v={row.code} mono />
      <Field k="章种类" v={SEAL_TYPE_CN[row.sealType] ?? row.sealType} />
      <Field k="申请人" v={row.requestedBy.name} />
      {row.matter && (
        <Field k="关联案件" v={`${row.matter.internalCode} ${row.matter.title}`} />
      )}
      <Field k="文件标题" v={row.documentTitle} />
      <Field k="事由" v={row.purpose} />
      <Field k="页数 / 份数" v={`${row.pageCount} 页 × ${row.copies} 份`} />
      {row.requireCrossPageSeal && <Field k="骑缝章" v="是" />}
      {row.urgency === "URGENT" && (
        <p className="flex items-center gap-1 text-destructive">
          <AlertOctagon className="h-3 w-3" />
          紧急
        </p>
      )}
      {row.draftDoc && (
        <DocumentLink
          label="待盖章稿"
          docId={row.draftDoc.id}
          name={draftDocName}
        />
      )}
    </div>
  );
}
