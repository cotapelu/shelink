/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
"use client";

import { Paperclip, FileText } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface FileUploadSectionProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  hasExisting: boolean;
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function FileUploadSection({ file, onFileChange, hasExisting }: FileUploadSectionProps) {
  if (hasExisting) return null;

  return (
    <div className="md:col-span-2">
      <Label className="text-[11px]">待盖章稿 *</Label>
      <div className="mt-1">
        <label className="flex cursor-pointer items-center gap-2 rounded border border-dashed border-border px-3 py-3 text-[12px] text-muted-foreground hover:bg-muted/30">
          <Paperclip className="h-3.5 w-3.5" />
          {file ? (
            <span className="flex items-center gap-1 text-foreground">
              <FileText className="h-3 w-3" />
              {file.name}
            </span>
          ) : (
            "选择 PDF 文件"
          )}
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const picked = e.target.files?.[0] ?? null;
              if (picked && !isPdfFile(picked)) {
                toast.error("需上传 pdf 格式文件");
                e.target.value = "";
                onFileChange(null);
                return;
              }
              onFileChange(picked);
            }}
          />
        </label>
      </div>
    </div>
  );
}
