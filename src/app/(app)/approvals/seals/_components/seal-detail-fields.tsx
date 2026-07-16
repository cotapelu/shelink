"use client";

import { type SealRequestRow, SEAL_STATUS_CN, SEAL_TYPE_CN } from "./seal-types";
import { Field } from "./field";
import { DocumentLink } from "./document-link";

interface SealDetailFieldsProps {
  row: SealRequestRow;
}

function BasicInfoFields({ row }: { row: SealRequestRow }) {
  return (
    <>
      <Field k="流水号" v={row.code} mono />
      <Field k="状态" v={SEAL_STATUS_CN[row.status] ?? row.status} />
      <Field k="章种类" v={SEAL_TYPE_CN[row.sealType] ?? row.sealType} />
      <Field k="申请人" v={row.requestedBy.name} />
      {row.matter && <Field k="关联案件" v={`${row.matter.internalCode} ${row.matter.title}`} />}
      <Field k="文件标题" v={row.documentTitle} />
      <Field k="事由" v={row.purpose} />
      <Field k="页数 / 份数" v={`${row.pageCount} 页 × ${row.copies} 份`} />
      <Field k="骑缝章" v={row.requireCrossPageSeal ? "是" : "否"} />
      <Field k="紧急程度" v={row.urgency === "URGENT" ? "紧急" : "普通"} />
      <Field k="提交时间" v={new Date(row.requestedAt).toLocaleString("zh-CN")} />
    </>
  );
}

function ApprovalInfoFields({ row }: { row: SealRequestRow }) {
  return (
    <>
      {row.approvedBy && <Field k="审批人" v={row.approvedBy.name} />}
      {row.approvedAt && <Field k="审批时间" v={new Date(row.approvedAt).toLocaleString("zh-CN")} />}
      {row.stampedByUser && <Field k="盖章人" v={row.stampedByUser.name} />}
      {row.stampedAt && <Field k="盖章时间" v={new Date(row.stampedAt).toLocaleString("zh-CN")} />}
      {row.requestNote && <Field k="申请备注" v={row.requestNote} />}
      {row.approveNote && (
        <Field k={row.status === "REJECTED" ? "驳回原因" : "审批意见"} v={row.approveNote} />
      )}
    </>
  );
}

function DocumentLinks({ row }: { row: SealRequestRow }) {
  const draftDocName = row.draftDoc ? row.draftDoc.name : "";
  const stampedDocName = row.stampedDoc ? row.stampedDoc.name : "";
  return (
    <>
      {row.draftDoc && <DocumentLink label="待盖章稿" docId={row.draftDoc.id} name={draftDocName} />}
      {row.stampedDoc && <DocumentLink label="盖章后文件" docId={row.stampedDoc.id} name={stampedDocName} />}
    </>
  );
}

export function SealDetailFields({ row }: SealDetailFieldsProps) {
  return (
    <div className="min-w-0 space-y-2 rounded border border-border bg-muted/20 p-3 text-[12px]">
      <BasicInfoFields row={row} />
      <ApprovalInfoFields row={row} />
      <DocumentLinks row={row} />
    </div>
  );
}
