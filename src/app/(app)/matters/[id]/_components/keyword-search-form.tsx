"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Scale, CircleAlert } from "lucide-react";

// Tỉnh/vùng của hệ thống tra cứu án lệ Trung Quốc — GIỮ NGUYÊN giá trị (contract API lọc);
// nếu triển khai cho VN cần thay bằng Tỉnh/Quận-Huyện VN (cùng cụm china-regions đang chờ duyệt — xem glossary).
const PROVINCES = [
  "北京", "天津", "河北", "山西", "内蒙古", "辽宁", "吉林", "黑龙江",
  "上海", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南",
  "湖北", "湖南", "广东", "广西", "海南", "重庆", "四川", "贵州",
  "云南", "西藏", "陕西", "甘肃", "青海", "宁夏", "新疆", "最高"
];

// Loại văn bản — GIỮ NGUYÊN giá trị: đây là contract của API tra cứu án lệ (裁判文书网), đổi = mất khả năng khớp
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
          <Label>Nguyên nhân</Label>
          <Input value={causeInput} onChange={e => onCauseChange(e.target.value)} placeholder="vd: tranh chấp hợp đồng thuê nhà" />
        </div>
        <div>
          <Label>Từ khoá toàn văn</Label>
          <Input value={qw} onChange={e => onQwChange(e.target.value)} placeholder="Nhiều từ phân cách bằng dấu cách" />
        </div>
      </div>
      <div>
        <Label className="flex items-center gap-2"><Scale className="h-4 w-4" />Phạm vi</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {PROVINCES.map(p => (
            <Button key={p} size="sm" variant={provinces.includes(p) ? "secondary" : "outline"} onClick={() => onProvincesChange(provinces.includes(p) ? provinces.filter(x => x !== p) : [...provinces, p])}>{p}</Button>
          ))}
        </div>
      </div>
      <div>
        <Label className="flex items-center gap-2"><CircleAlert className="h-4 w-4" />Loại văn bản</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {WSZL_OPTIONS.map(opt => (
            <Button key={opt} size="sm" variant={wszl.includes(opt as any) ? "secondary" : "outline"} onClick={() => onWszlChange(wszl.includes(opt as any) ? wszl.filter(x => x !== opt as any) : [...wszl, opt as any])}>{opt}</Button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Ngày quyết định từ</Label>
          <Input type="date" value={jaStart} onChange={e => onJaStartChange(e.target.value)} />
        </div>
        <div>
          <Label>Ngày quyết định đến</Label>
          <Input type="date" value={jaEnd} onChange={e => onJaEndChange(e.target.value)} />
        </div>
      </div>
      <Button onClick={onSearch}>Tra cứu</Button>
    </div>
  );
}
