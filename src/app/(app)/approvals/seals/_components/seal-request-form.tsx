"use client";

import { Loader2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioChips } from "@/components/ui/radio-chips";

import type { SealTypeConfigRow, MatterOption } from "./seal-types";
import { SEAL_TYPE_CN } from "./seal-types";
import { MatterCombobox } from "./matter-combobox";
import { PurposeSection } from "./purpose-section";
import { PageOptionsSection } from "./page-options-section";
import { FileUploadSection } from "./file-upload-section";
import { RequestNoteSection } from "./request-note-section";
import { useSealRequestForm } from "./use-seal-request-form";

export function SealRequestForm({
  configs,
  matters,
  preset,
  onOpenChange,
}: {
  configs: SealTypeConfigRow[];
  matters: MatterOption[];
  preset: { draftDocId?: string; matterId?: string; documentTitle?: string } | null;
  onOpenChange: (o: boolean) => void;
}) {
  const {
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
    submit,
  } = useSealRequestForm({ configs, matters, preset, onOpenChange });

  const enabledConfigs = configs.filter((c) => c.enabled);
  const hasExisting = !!preset?.draftDocId;

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
      {hasExisting && (
        <div className="ll-surface flex items-start gap-2 rounded p-2.5 text-[12px] md:col-span-2 bg-blue-500/8">
          <Link2 className="mt-0.5 h-3.5 w-3.5 text-primary" />
          <div>
            <p className="text-foreground">已关联卷宗文档作为待盖章稿</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {preset?.documentTitle}
            </p>
          </div>
        </div>
      )}

      <div className="md:col-span-2">
        <Label className="text-[11px]">章种类 *</Label>
        <RadioChips
          className="mt-2"
          items={enabledConfigs.map((c) => ({
            value: c.type as string,
            label: SEAL_TYPE_CN[c.type] ?? c.type,
            description: c.description ?? undefined
          }))}
          value={sealType}
          onChange={setSealType}
        />
        {sealType && (
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {enabledConfigs.find((c) => c.type === sealType)?.description}
          </p>
        )}
        {sealType && sealType !== "LEGAL_REP_SEAL" && (
          <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-background px-2.5 py-1.5 text-[12px]">
            <Checkbox
              checked={alsoLegalRep}
              onCheckedChange={(v) => setAlsoLegalRep(v === true)}
            />
            <span>同时加盖 <strong className="text-foreground">法定代表人章</strong></span>
            <span className="text-[10px] text-muted-foreground">
              会自动建一条配套的法人章审批，与本章并行
            </span>
          </label>
        )}
      </div>

      <div>
        <Label className="text-[11px]">关联案件 (可选)</Label>
        <div className="mt-1">
          {preset?.matterId ? (
            <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 text-[12px]">
              <span className="text-[10px] text-muted-foreground">已关联</span>
              <span className="truncate">
                {matters.find((m) => m.id === preset.matterId)?.title ?? "当前案件"}
              </span>
            </div>
          ) : (
            <MatterCombobox
              matters={matters}
              value={matterId}
              onChange={setMatterId}
              placeholder="不关联案件"
            />
          )}
        </div>
      </div>

      <div className="md:col-span-2">
        <PurposeSection
          purposePreset={purposePreset}
          setPurposePreset={setPurposePreset}
          purposeOther={purposeOther}
          setPurposeOther={setPurposeOther}
        />
      </div>

      <div className="md:col-span-2">
        <Label className="text-[11px]">文件标题 *</Label>
        <Input
          value={documentTitle}
          onChange={(e) => setDocumentTitle(e.target.value)}
          className="mt-1"
        />
      </div>

      <PageOptionsSection
        pageCount={pageCount}
        setPageCount={setPageCount}
        copies={copies}
        setCopies={setCopies}
        crossPage={crossPage}
        setCrossPage={setCrossPage}
        urgency={urgency}
        setUrgency={setUrgency}
      />

      <RequestNoteSection
        requestNote={requestNote}
        setRequestNote={setRequestNote}
      />

      <FileUploadSection
        file={file}
        onFileChange={setFile}
        hasExisting={hasExisting}
      />

      <div className="mt-6 md:col-span-2">
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            提交申请
          </Button>
        </DialogFooter>
      </div>
    </div>
  );
}
