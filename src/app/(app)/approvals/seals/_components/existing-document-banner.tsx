"use client";

import { Link2 } from "lucide-react";

interface ExistingDocumentBannerProps {
  preset: { draftDocId?: string; matterId?: string; documentTitle?: string } | null;
}

export function ExistingDocumentBanner({ preset }: ExistingDocumentBannerProps) {
  return (
    <div className="ll-surface flex items-start gap-2 rounded p-2.5 text-[12px] md:col-span-2 bg-blue-500/8">
      <Link2 className="mt-0.5 h-3.5 w-3.5 text-primary" />
      <div>
        <p className="text-foreground">已关联卷宗文档作为待盖章稿</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {preset?.documentTitle}
        </p>
      </div>
    </div>
  );
}
