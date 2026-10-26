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

import { useState } from "react";
import { Plus, Trash2, X, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";

export type Step = { name: string; order: number; defaultTasks?: string[] };

export function toEditableSteps(raw: unknown): Step[] {
  return ((raw ?? []) as unknown as Step[]).slice().sort((a, b) => a.order - b.order);
}

/** Xem trước giai đoạn của mẫu + nhiệm vụ mặc định sẽ tự sinh (đọc-quan). */
export function StageList({ steps }: { steps: Step[] }) {
  const sorted = steps.slice().sort((a, b) => a.order - b.order);
  return (
    <ol className="space-y-2">
      {sorted.map((s, idx) => (
        <li key={idx} className="rounded-md border border-border bg-background p-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground tabular">{s.order}</span>
            <span className="text-sm font-medium">{s.name}</span>
          </div>
          {s.defaultTasks && s.defaultTasks.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {s.defaultTasks.map((t, ti) => (
                <span key={ti} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{t}</span>
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/** Soạn nhiệm vụ mặc định cho một giai đoạn (thêm bằng Enter/phẩy, bấm chip để xoá). */
function StepTaskEditor({ tasks, onChange }: { tasks: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState("");
  function addTask() {
    const parts = draft.split(",").map((t) => t.trim()).filter(Boolean).map((t) => t.slice(0, 120));
    if (parts.length === 0) return;
    onChange([...tasks, ...parts].slice(0, 20));
    setDraft("");
  }
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {tasks.map((t, ti) => (
          <button
            key={`${t}-${ti}`}
            type="button"
            onClick={() => onChange(tasks.filter((_, i) => i !== ti))}
            className="group inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
            aria-label={`Xoá nhiệm vụ ${t}`}
          >
            {t}
            <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
          </button>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTask();
          }
        }}
        placeholder="Nhiệm vụ mặc định (Enter hoặc dấu phẩy)"
        className="h-7 text-xs"
      />
    </div>
  );
}

function StepEditor({
  index,
  step,
  onChange,
  onRemove
}: {
  index: number;
  step: Step;
  onChange: (patch: Partial<Step>) => void;
  onRemove: () => void;
}) {
  return (
    <li className="rounded-md border border-border bg-background p-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground tabular">{index + 1}</span>
        <Input
          value={step.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Tên giai đoạn"
          className="h-8 flex-1"
        />
        <Button variant="ghost" size="sm" onClick={onRemove} className="h-8 w-8 p-0 text-destructive" aria-label="Xoá giai đoạn">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <StepTaskEditor tasks={step.defaultTasks ?? []} onChange={(next) => onChange({ defaultTasks: next })} />
    </li>
  );
}

/** Danh sách giai đoạn có thể chỉnh (thêm/xoá/sửa tên + nhiệm vụ mặc định). */
export function StepsEditor({ steps, onChange }: { steps: Step[]; onChange: (next: Step[]) => void }) {
  function patchStep(i: number, patch: Partial<Step>) {
    onChange(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-xs">Giai đoạn</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange([...steps, { name: "", order: steps.length + 1, defaultTasks: [] }])}
          className="h-7 gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm giai đoạn
        </Button>
      </div>
      <ol className="max-h-96 space-y-2 overflow-y-auto pr-1">
        {steps.map((s, idx) => (
          <StepEditor
            key={idx}
            index={idx}
            step={s}
            onChange={(p) => patchStep(idx, p)}
            onRemove={() => onChange(steps.filter((_, i) => i !== idx).map((x, i) => ({ ...x, order: i + 1 })))}
          />
        ))}
      </ol>
    </div>
  );
}

export function NameField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Tên mẫu</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function DialogActions({
  isPending,
  onCancel,
  onSave
}: {
  isPending: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <DialogFooter>
      <Button variant="outline" onClick={onCancel} disabled={isPending}>Huỷ</Button>
      <Button onClick={onSave} disabled={isPending} className="gap-1.5">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Lưu mẫu
      </Button>
    </DialogFooter>
  );
}
