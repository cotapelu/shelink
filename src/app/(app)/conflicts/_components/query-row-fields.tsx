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
  { value: "CLIENT_PARTY", label: "Bên dự kiến ủy quyền" },
  { value: "OPPOSING_PARTY", label: "Bên đối phương" },
  { value: "THIRD_PARTY", label: "Người thứ ba" }
];

export function QueryRowFields({ query, index, onUpdate }: QueryRowFieldsProps) {
  return (
    <>
      <div className="col-span-3">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Thân phận chủ thể</Label>
        <Select value={query.role} onValueChange={(value) => onUpdate(index, { role: value as QueryRole })}>
          <SelectTrigger className="mt-1 h-9 bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            {queryRoleOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-4">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Họ tên / Tên</Label>
        <Input value={query.name} onChange={e => onUpdate(index, { name: e.target.value })} placeholder="vd: Công ty TNHH Hoa Đông Trí Nghiệp" className="mt-1 h-9 bg-background" />
      </div>
      <div className="col-span-4">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Số giấy tờ / Mã số doanh nghiệp</Label>
        <Input value={query.idNumber} onChange={e => onUpdate(index, { idNumber: e.target.value })} placeholder="Với họ tên thì điền ít nhất một mục" className="mt-1 h-9 bg-background font-mono" />
      </div>
    </>
  );
}
