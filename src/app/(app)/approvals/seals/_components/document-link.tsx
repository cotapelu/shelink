"use client";

import { FileText } from "lucide-react";

interface DocumentLinkProps {
  label: string;
  docId: string;
  name: string;
}

export function DocumentLink({ label, docId, name }: DocumentLinkProps) {
  const href = `/api/documents/${docId}/download`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex min-w-0 items-start gap-1 text-primary hover:underline"
      title={name}
    >
      <FileText className="mt-0.5 h-3 w-3 shrink-0" />
      <span className="min-w-0">
        <span>{label}</span>
        <span className="block truncate text-[11px]">({name})</span>
      </span>
    </a>
  );
}
