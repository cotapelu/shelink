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

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSealRequest } from "@/server/seals/actions";
import type { SealTypeConfigRow, MatterOption } from "./seal-types";

const PURPOSE_PRESETS = ["委托合同", "法律意见书", "所函", "证明", "其他"] as const;
type PurposePreset = typeof PURPOSE_PRESETS[number];

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export interface UseSealRequestFormReturn {
  sealType: string;
  setSealType: (v: string) => void;
  matterId: string;
  setMatterId: (v: string) => void;
  purposePreset: PurposePreset | "";
  setPurposePreset: (v: PurposePreset | "") => void;
  purposeOther: string;
  setPurposeOther: (v: string) => void;
  documentTitle: string;
  setDocumentTitle: (v: string) => void;
  pageCount: number;
  setPageCount: (v: number) => void;
  crossPage: boolean;
  setCrossPage: (v: boolean) => void;
  copies: number;
  setCopies: (v: number) => void;
  urgency: "NORMAL" | "URGENT";
  setUrgency: (v: "NORMAL" | "URGENT") => void;
  requestNote: string;
  setRequestNote: (v: string) => void;
  file: File | null;
  setFile: (v: File | null) => void;
  alsoLegalRep: boolean;
  setAlsoLegalRep: (v: boolean) => void;
  pending: boolean;
  startTransition: (cb: () => void) => void;
  reset: () => void;
  resolvedPurpose: string;
  submit: () => Promise<void>;
}

export function useSealRequestForm({
  configs,
  matters,
  preset,
  onOpenChange,
}: {
  configs: SealTypeConfigRow[];
  matters: MatterOption[];
  preset: { draftDocId?: string; matterId?: string; documentTitle?: string } | null;
  onOpenChange: (o: boolean) => void;
}): UseSealRequestFormReturn {
  const [sealType, setSealType] = useState<string>("");
  const [matterId, setMatterId] = useState<string>("");
  const [purposePreset, setPurposePreset] = useState<PurposePreset | "">("");
  const [purposeOther, setPurposeOther] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [pageCount, setPageCount] = useState(1);
  const [crossPage, setCrossPage] = useState(false);
  const [copies, setCopies] = useState(1);
  const [urgency, setUrgency] = useState<"NORMAL" | "URGENT">("NORMAL");
  const [requestNote, setRequestNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [alsoLegalRep, setAlsoLegalRep] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // 卷宗联动预填
  useEffect(() => {
    if (preset?.matterId) setMatterId(preset.matterId);
    if (preset?.documentTitle) setDocumentTitle(preset.documentTitle);
  }, [preset]);

  const reset = useCallback(() => {
    setSealType("");
    setMatterId("");
    setPurposePreset("");
    setPurposeOther("");
    setDocumentTitle("");
    setPageCount(1);
    setCrossPage(false);
    setCopies(1);
    setUrgency("NORMAL");
    setRequestNote("");
    setFile(null);
    setAlsoLegalRep(false);
  }, []);

  // 拼出实际入库的 purpose 字符串
  const resolvedPurpose =
    purposePreset === "其他"
      ? purposeOther.trim()
        ? `其他：${purposeOther.trim()}`
        : ""
      : purposePreset;

  const enabledConfigs = configs.filter((c) => c.enabled);
  const hasExisting = !!preset?.draftDocId;

  const submit = useCallback(async () => {
    if (!sealType) {
      toast.error("请选择章种类");
      return;
    }
    if (!purposePreset) {
      toast.error("请选择用印事由");
      return;
    }
    if (purposePreset === "其他" && !purposeOther.trim()) {
      toast.error("请填写「其他」用印事由的具体说明");
      return;
    }
    if (!documentTitle.trim()) {
      toast.error("请填写文件标题");
      return;
    }
    if (!hasExisting && !file) {
      toast.error("请上传待盖章稿");
      return;
    }
    if (!hasExisting && file && !isPdfFile(file)) {
      toast.error("需上传 pdf 格式文件");
      return;
    }

    const fd = new FormData();
    fd.set("sealType", sealType);
    if (matterId) fd.set("matterId", matterId);
    fd.set("purpose", resolvedPurpose);
    fd.set("documentTitle", documentTitle.trim());
    fd.set("pageCount", String(pageCount));
    fd.set("requireCrossPageSeal", String(crossPage));
    fd.set("copies", String(copies));
    fd.set("urgency", urgency);
    fd.set("requestNote", requestNote.trim());
    if (alsoLegalRep && sealType !== "LEGAL_REP_SEAL") {
      fd.set("alsoLegalRep", "true");
    }
    if (hasExisting && preset?.draftDocId) {
      fd.set("existingDraftDocId", preset.draftDocId);
    } else if (file) {
      fd.set("draftDoc", file);
    }

    startTransition(async () => {
      try {
        const res = await createSealRequest(fd);
        toast.success(`已提交 ${res.code}${alsoLegalRep && sealType !== "LEGAL_REP_SEAL" ? "（含法人章配套申请）" : ""}`);
        reset();
        onOpenChange(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "提交失败");
      }
    });
  }, [
    sealType,
    purposePreset,
    purposeOther,
    documentTitle,
    hasExisting,
    file,
    pageCount,
    crossPage,
    copies,
    urgency,
    requestNote,
    alsoLegalRep,
    matterId,
    resolvedPurpose,
    preset,
    reset,
    onOpenChange,
  ]);

  return {
    sealType,
    setSealType,
    matterId,
    setMatterId,
    purposePreset,
    setPurposePreset,
    purposeOther,
    setPurposeOther,
    documentTitle,
    setDocumentTitle,
    pageCount,
    setPageCount,
    crossPage,
    setCrossPage,
    copies,
    setCopies,
    urgency,
    setUrgency,
    requestNote,
    setRequestNote,
    file,
    setFile,
    alsoLegalRep,
    setAlsoLegalRep,
    pending,
    startTransition,
    reset,
    resolvedPurpose,
    submit,
  };
}
