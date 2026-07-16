"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import type { QueryRole, QueryRow } from "./conflict-query-types";

interface QueryRowFieldsProps {
  query: { role: QueryRole; name: string; idNumber: string };
  index: number;
  onUpdate: (index: number, patch: Partial<{ role: QueryRole; name: string; idNumber: string }>) => void;
}

const queryRoleOptions: { value: QueryRole; label: string }[] = [
  { value: "CLIENT_PARTY", label: "拟委托方" },
  { value: "OPPOSING_PARTY", label: "相对方" },
  { value: "THIRD_PARTY", label: "第三人" }
];

export function QueryRowFields({ query, index, onUpdate }: QueryRowFieldsProps) {
  return (
    <>
      <div className="col-span-3">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">主体身份</Label>
        <Select value={query.role} onValueChange={(value) => onUpdate(index, { role: value as QueryRole })}>
          <SelectTrigger className="mt-1 h-9 bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            {queryRoleOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-4">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">姓名 / 名称</Label>
        <Input value={query.name} onChange={e => onUpdate(index, { name: e.target.value })} placeholder="如：华东置业集团有限公司" className="mt-1 h-9 bg-background" />
      </div>
      <div className="col-span-4">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">身份证 / 统一社会信用代码</Label>
        <Input value={query.idNumber} onChange={e => onUpdate(index, { idNumber: e.target.value })} placeholder="与姓名至少填一项" className="mt-1 h-9 bg-background font-mono" />
      </div>
    </>
  );
}
