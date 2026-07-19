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
 */

"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { areasOf } from "@/lib/china-regions";

interface AreaSelectProps {
  province: string;
  city: string;
  value: string;
  onValueChange: (v: string) => void;
}

export function AreaSelect({ province, city, value, onValueChange }: AreaSelectProps) {
  const areas = areasOf(province, city);
  const placeholder = city ? "选择区 / 县" : "请先选市";
  const disabled = !city || areas.length === 0;

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {areas.map((a) => (
          <SelectItem key={a} value={a} className="text-xs">
            {a}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
