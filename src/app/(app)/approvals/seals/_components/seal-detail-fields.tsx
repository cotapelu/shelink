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
      <Field k="Số thứ tự" v={row.code} mono />
      <Field k="Trạng thái" v={SEAL_STATUS_CN[row.status] ?? row.status} />
      <Field k="Loại dấu" v={SEAL_TYPE_CN[row.sealType] ?? row.sealType} />
      <Field k="Người yêu cầu" v={row.requestedBy.name} />
      {row.matter && <Field k="Vụ án liên kết" v={`${row.matter.internalCode} ${row.matter.title}`} />}
      <Field k="Tiêu đề văn bản" v={row.documentTitle} />
      <Field k="Lý do" v={row.purpose} />
      <Field k="Số trang / Số bản" v={`${row.pageCount} trang × ${row.copies} bản`} />
      <Field k="Dấu kẽ trang" v={row.requireCrossPageSeal ? "Có" : "Không"} />
      <Field k="Mức khẩn" v={row.urgency === "URGENT" ? "Khẩn cấp" : "Thường"} />
      <Field k="Thời gian gửi" v={new Date(row.requestedAt).toLocaleString("vi-VN")} />
    </>
  );
}

function ApprovalInfoFields({ row }: { row: SealRequestRow }) {
  return (
    <>
      {row.approvedBy && <Field k="Người duyệt" v={row.approvedBy.name} />}
      {row.approvedAt && <Field k="Thời gian duyệt" v={new Date(row.approvedAt).toLocaleString("vi-VN")} />}
      {row.stampedByUser && <Field k="Người đóng dấu" v={row.stampedByUser.name} />}
      {row.stampedAt && <Field k="Thời gian đóng dấu" v={new Date(row.stampedAt).toLocaleString("vi-VN")} />}
      {row.requestNote && <Field k="Ghi chú yêu cầu" v={row.requestNote} />}
      {row.approveNote && (
        <Field k={row.status === "REJECTED" ? "Lý do từ chối" : "Ý kiến duyệt"} v={row.approveNote} />
      )}
    </>
  );
}

function DocumentLinks({ row }: { row: SealRequestRow }) {
  const draftDocName = row.draftDoc ? row.draftDoc.name : "";
  const stampedDocName = row.stampedDoc ? row.stampedDoc.name : "";
  return (
    <>
      {row.draftDoc && <DocumentLink label="Bản chờ đóng dấu" docId={row.draftDoc.id} name={draftDocName} />}
      {row.stampedDoc && <DocumentLink label="Văn bản sau đóng dấu" docId={row.stampedDoc.id} name={stampedDocName} />}
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
