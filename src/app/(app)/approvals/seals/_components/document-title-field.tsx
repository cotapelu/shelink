"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DocumentTitleFieldProps {
  documentTitle: string;
  setDocumentTitle: (v: string) => void;
}

export function DocumentTitleField({ documentTitle, setDocumentTitle }: DocumentTitleFieldProps) {
  return (
    <div className="md:col-span-2">
      <Label className="text-[11px]">文件标题 *</Label>
      <Input
        value={documentTitle}
        onChange={(e) => setDocumentTitle(e.target.value)}
        className="mt-1"
      />
    </div>
  );
}
