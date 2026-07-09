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

import { Label } from "@/components/ui/label";
import { RadioChips } from "@/components/ui/radio-chips";
import { Textarea } from "@/components/ui/textarea";

const PURPOSE_PRESETS = ["委托合同", "法律意见书", "所函", "证明", "其他"] as const;
export type PurposePreset = typeof PURPOSE_PRESETS[number];

interface PurposeOtherInputProps {
  purposeOther: string;
  setPurposeOther: (v: string) => void;
}

function PurposeOtherInput({ purposeOther, setPurposeOther }: PurposeOtherInputProps) {
  return (
    <div className="space-y-1">
      <Label>其他事由具体说明 <span className="text-destructive">*</span></Label>
      <Textarea
        value={purposeOther}
        onChange={(e) => setPurposeOther(e.target.value)}
        placeholder="请说明具体用印事由"
        rows={2}
        className="mt-2 text-[12px]"
      />
      <p className="text-[11px] text-muted-foreground">当选择「其他」时必须填写</p>
    </div>
  );
}

interface PurposeSectionProps {
  purposePreset: PurposePreset | "";
  setPurposePreset: (v: PurposePreset | "") => void;
  purposeOther: string;
  setPurposeOther: (v: string) => void;
}

export function PurposeSection({ purposePreset, setPurposePreset, purposeOther, setPurposeOther }: PurposeSectionProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>用印事由 <span className="text-destructive">*</span></Label>
        <RadioChips
          items={PURPOSE_PRESETS.map((p) => ({ value: p, label: p }))}
          value={purposePreset || null}
          onChange={(v) => setPurposePreset(v as PurposePreset)}
          className="mt-2"
        />
      </div>
      {purposePreset === "其他" && <PurposeOtherInput purposeOther={purposeOther} setPurposeOther={setPurposeOther} />}
    </div>
  );
}
