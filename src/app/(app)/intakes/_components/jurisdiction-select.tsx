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

import { MapPin, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { joinJurisdiction, parseJurisdiction } from "@/lib/china-regions";
import { ProvinceSelect } from "./province-select";
import { CitySelect } from "./city-select";
import { AreaSelect } from "./area-select";

/**
 * Cấp dẫn 3 cấp địa giới (vùng / tỉnh / quận huyện). value là chuỗi đường dẫn「vùng/tỉnh/quận huyện」.
 * Quận huyện có thể không chọn (chỉ đến tỉnh). Chọn là ghi lại value.
 */
export function JurisdictionSelect({
  value,
  onChange
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { province, city, area } = parseJurisdiction(value);
  const display = value ? value.replace(/\//g, " / ") : "";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-10 w-full justify-between rounded-sm font-normal">
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 opacity-50" />
            {display ? <span className="truncate">{display}</span> : <span className="text-muted-foreground">Chọn địa giới</span>}
          </span>
          <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" portalled={false} className="w-64 space-y-2 p-2">
        <div className="space-y-1"><div className="text-[10px] text-muted-foreground">Vùng / TP trực thuộc</div><ProvinceSelect value={province} onValueChange={(v) => onChange(joinJurisdiction(v))} /></div>
        <div className="space-y-1"><div className="text-[10px] text-muted-foreground">Tỉnh</div><CitySelect province={province} value={city} onValueChange={(v) => onChange(joinJurisdiction(province, v))} /></div>
        <div className="space-y-1"><div className="text-[10px] text-muted-foreground">Quận / huyện (tuỳ chọn)</div><AreaSelect province={province} city={city} value={area} onValueChange={(v) => onChange(joinJurisdiction(province, city, v))} /></div>
        {value && (
          <button type="button" onClick={() => onChange("")} className="w-full rounded-sm border border-border py-1 text-[11px] text-muted-foreground hover:bg-muted">
            Xoá
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
