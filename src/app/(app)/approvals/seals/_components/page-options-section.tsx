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

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioChips } from "@/components/ui/radio-chips";
import { Checkbox } from "@/components/ui/checkbox";

interface PageOptionsSectionProps {
  pageCount: number;
  setPageCount: (v: number) => void;
  copies: number;
  setCopies: (v: number) => void;
  crossPage: boolean;
  setCrossPage: (v: boolean) => void;
  urgency: "NORMAL" | "URGENT";
  setUrgency: (v: "NORMAL" | "URGENT") => void;
}

export function PageOptionsSection({
  pageCount,
  setPageCount,
  copies,
  setCopies,
  crossPage,
  setCrossPage,
  urgency,
  setUrgency,
}: PageOptionsSectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-[11px]">页数</Label>
          <Input
            type="number"
            min={1}
            value={pageCount}
            onChange={(e) => setPageCount(Math.max(1, parseInt(e.target.value) || 1))}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-[11px]">份数</Label>
          <Input
            type="number"
            min={1}
            value={copies}
            onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex items-center justify-between md:col-span-2">
        <label className="flex items-center gap-2 text-[12px]">
          <Checkbox
            checked={crossPage}
            onCheckedChange={(v) => setCrossPage(v === true)}
          />
          需要骑缝章
        </label>
        <RadioChips
          size="sm"
          items={[
            { value: "NORMAL", label: "普通" },
            { value: "URGENT", label: "紧急", accent: "#DC2626" }
          ]}
          value={urgency}
          onChange={(v) => setUrgency(v as "NORMAL" | "URGENT")}
        />
      </div>
    </>
  );
}
