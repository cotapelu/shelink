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

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Layers, Pencil } from "lucide-react";
import type { ProcedureType, StageTemplate } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { upsertStageTemplate } from "@/server/settings/actions";
import { procedureTypeLabel } from "@/lib/enums";
import {
  StageList,
  StepsEditor,
  NameField,
  DialogActions,
  toEditableSteps,
  type Step
} from "./template-editor-parts";

const ALL_PROCEDURE_TYPES: ProcedureType[] = [
  "FIRST_INSTANCE", "SECOND_INSTANCE", "RETRIAL_REVIEW", "RETRIAL", "REMAND_FIRST", "REMAND_SECOND",
  "PROSECUTORIAL_SUPERVISION", "COMMERCIAL_ARBITRATION", "LABOR_ARBITRATION", "ARBITRATION_SET_ASIDE",
  "ARBITRATION_ENFORCEMENT_REVIEW", "ENFORCEMENT", "ENFORCEMENT_OBJECTION", "INVESTIGATION",
  "PROSECUTION_REVIEW", "DEATH_PENALTY_REVIEW", "CRIMINAL_ENFORCEMENT", "COMMUTATION_PAROLE_REVIEW",
  "ADMIN_RECONSIDERATION", "ADMIN_NON_LITIGATION_ENFORCEMENT", "NON_LITIGATION_PHASE", "CUSTOM"
];

function TemplateHeader({
  selected,
  onSelect
}: {
  selected: ProcedureType;
  onSelect: (v: ProcedureType) => void;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Layers className="h-4 w-4 text-primary" />
        Mẫu giai đoạn &amp; nhiệm vụ
      </h2>
      <Select value={selected} onValueChange={(v) => onSelect(v as ProcedureType)}>
        <SelectTrigger className="h-9 w-48 bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ALL_PROCEDURE_TYPES.map((t) => (
            <SelectItem key={t} value={t}>{procedureTypeLabel[t]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </header>
  );
}

export function TemplatesView({ templates }: { templates: StageTemplate[] }) {
  const [selected, setSelected] = useState<ProcedureType>(
    (templates[0]?.procedureType as ProcedureType) ?? "FIRST_INSTANCE"
  );
  const [editing, setEditing] = useState(false);
  const current = templates.find((t) => t.procedureType === selected);

  return (
    <div className="space-y-4">
      <TemplateHeader selected={selected} onSelect={setSelected} />
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">{procedureTypeLabel[selected]} — {current?.name ?? "Chưa cấu hình"}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Chương trình mới sẽ tự động áp giai đoạn &amp; nhiệm vụ mặc định của mẫu này.
            </p>
          </div>
          <Button size="sm" onClick={() => setEditing(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            {current ? "Sửa" : "Tạo mẫu"}
          </Button>
        </div>
        {current ? (
          <StageList steps={((current.steps ?? []) as unknown as Step[])} />
        ) : (
          <div className="rounded-md border border-dashed border-border bg-background py-8 text-center text-sm text-muted-foreground">
            Loại chương trình này chưa có mẫu mặc định
          </div>
        )}
      </section>
      {editing && (
        <EditTemplateDialog procedureType={selected} existing={current} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}

function EditTemplateDialog({
  procedureType,
  existing,
  onClose
}: {
  procedureType: ProcedureType;
  existing: StageTemplate | undefined;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const label = procedureTypeLabel[procedureType];
  const [name, setName] = useState(existing?.name ?? `${label} — mẫu`);
  const [steps, setSteps] = useState<Step[]>(() =>
    existing ? toEditableSteps(existing.steps) : [{ name: "", order: 1, defaultTasks: [] }]
  );

  function handleSave() {
    const cleaned = steps
      .filter((s) => s.name.trim())
      .map((s, i) => ({ name: s.name.trim(), order: i + 1, defaultTasks: s.defaultTasks ?? [] }));
    if (cleaned.length === 0) {
      toast.warning("Cần ít nhất một giai đoạn");
      return;
    }
    startTransition(async () => {
      try {
        await upsertStageTemplate({ procedureType, name, steps: cleaned });
        toast.success("Đã lưu mẫu");
        onClose();
      } catch (err) {
        toast.error("Lưu thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Sửa mẫu — {label}</DialogTitle>
          <DialogDescription>Chỉ ảnh hưởng chương trình mới tạo.</DialogDescription>
        </DialogHeader>
        <NameField value={name} onChange={setName} />
        <StepsEditor steps={steps} onChange={setSteps} />
        <DialogActions isPending={isPending} onCancel={onClose} onSave={handleSave} />
      </DialogContent>
    </Dialog>
  );
}
