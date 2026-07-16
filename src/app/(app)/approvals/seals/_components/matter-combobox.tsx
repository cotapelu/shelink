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

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MatterComboboxTrigger } from "./matter-combobox-trigger";
import { MatterComboboxList } from "./matter-combobox-list";

export type MatterOption = {
  id: string;
  internalCode: string;
  title: string;
};

export function MatterCombobox({
  matters,
  value,
  onChange,
  placeholder = "搜索案件编号 / 名称"
}: {
  matters: MatterOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? (matters.find((m) => m.id === value) ?? null) : null;
  const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => { e.preventDefault(); e.stopPropagation(); onChange(""); };
  const handleKeyClear = (e: React.KeyboardEvent<HTMLButtonElement>) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onChange(""); } };
  const handleSelect = (id: string) => { onChange(id); setOpen(false); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <MatterComboboxTrigger selected={selected} placeholder={placeholder} onClear={handleClear} onKeyClear={handleKeyClear} />
      </PopoverTrigger>
      <PopoverContent align="start" portalled={false} className="w-[--radix-popover-trigger-width] p-0">
        <MatterComboboxList matters={matters} value={value} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  );
}
