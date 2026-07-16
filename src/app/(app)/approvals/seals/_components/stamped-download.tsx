"use client";

import type { SealRequestRow } from "./seal-types";

interface StampedDownloadProps {
  stampedDoc: { id: string };
}

export function StampedDownload({ stampedDoc }: StampedDownloadProps) {
  return (
    <a
      href={`/api/documents/${stampedDoc.id}/download`}
      className="text-[11px] text-muted-foreground hover:text-foreground"
    >
      下载
    </a>
  );
}
