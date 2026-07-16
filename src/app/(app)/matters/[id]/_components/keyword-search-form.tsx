"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Scale, CircleAlert } from "lucide-react";

const PROVINCES = [
  "北京", "天津", "河北", "山西", "内蒙古", "辽宁", "吉林", "黑龙江",
  "上海", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南",
  "湖北", "湖南", "广东", "广西", "海南", "重庆", "四川", "贵州",
  "云南", "西藏", "陕西", "甘肃", "青海", "宁夏", "新疆", "最高"
];

const WSZL_OPTIONS = ["判决书", "裁定书", "调解书", "决定书"] as const;

interface KeywordSearchFormProps {
  causeInput: string;
  qw: string;
  provinces: string[];
  wszl: readonly ("判决书" | "裁定书" | "调解书" | "决定书")[]; // accept literal array
  jaStart: string;
  jaEnd: string;
  onCauseChange: (value: string) => void;
  onQwChange: (value: string) => void;
  onProvincesChange: (value: string[]) => void;
  onWszlChange: (value: ("判决书" | "裁定书" | "调解书" | "决定书")[]) => void;
  onJaStartChange: (value: string) => void;
  onJaEndChange: (value: string) => void;
  onSearch: () => void;
}

export function KeywordSearchForm({
  causeInput,
  qw,
  provinces,
  wszl,
  jaStart,
  jaEnd,
  onCauseChange,
  onQwChange,
  onProvincesChange,
  onWszlChange,
  onJaStartChange,
  onJaEndChange,
  onSearch
}: KeywordSearchFormProps) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>案由</Label>
          <Input value={causeInput} onChange={e => onCauseChange(e.target.value)} placeholder="如：房屋租赁合同纠纷" />
        </div>
        <div>
          <Label>全文关键词</Label>
          <Input value={qw} onChange={e => onQwChange(e.target.value)} placeholder="多个词空格分隔" />
        </div>
      </div>
      <div>
        <Label className="flex items-center gap-2"><Scale className="h-4 w-4" />省域范围</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {PROVINCES.map(p => (
            <Button key={p} size="sm" variant={provinces.includes(p) ? "secondary" : "outline"} onClick={() => onProvincesChange(provinces.includes(p) ? provinces.filter(x => x !== p) : [...provinces, p])}>{p}</Button>
          ))}
        </div>
      </div>
      <div>
        <Label className="flex items-center gap-2"><CircleAlert className="h-4 w-4" />文书类型</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {WSZL_OPTIONS.map(opt => (
            <Button key={opt} size="sm" variant={wszl.includes(opt as any) ? "secondary" : "outline"} onClick={() => onWszlChange(wszl.includes(opt as any) ? wszl.filter(x => x !== opt as any) : [...wszl, opt as any])}>{opt}</Button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>判决日期起</Label>
          <Input type="date" value={jaStart} onChange={e => onJaStartChange(e.target.value)} />
        </div>
        <div>
          <Label>判决日期止</Label>
          <Input type="date" value={jaEnd} onChange={e => onJaEndChange(e.target.value)} />
        </div>
      </div>
      <Button onClick={onSearch}>搜索</Button>
    </div>
  );
}
