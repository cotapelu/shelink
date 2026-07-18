"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PartyInfo {
  name: string;
  address: string;
  email: string;
  phone?: string;
}

interface PartyInfoFormProps {
  from: PartyInfo;
  to: PartyInfo;
  onFromChange: (v: PartyInfo) => void;
  onToChange: (v: PartyInfo) => void;
}

type PartyField = keyof PartyInfo;

const fields: { key: PartyField; label: string; placeholder: { from: string; to: string }; type?: 'text' | 'email' | 'tel' }[] = [
  { key: 'name', label: 'Tên', placeholder: { from: 'Tên công ty', to: 'Tên khách hàng' } },
  { key: 'address', label: 'Địa chỉ', placeholder: { from: 'Địa chỉ', to: 'Địa chỉ' } },
  { key: 'email', label: 'Email', placeholder: { from: 'Email', to: 'Email' }, type: 'email' },
  { key: 'phone', label: 'Điện thoại', placeholder: { from: 'Số điện thoại', to: 'Số điện thoại' }, type: 'tel' },
];

export function PartyInfoForm({ from, to, onFromChange, onToChange }: PartyInfoFormProps) {
  const update = (type: 'from' | 'to', field: PartyField, value: string) => {
    if (type === 'from') onFromChange({ ...from, [field]: value });
    else onToChange({ ...to, [field]: value });
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {(['from', 'to'] as const).map(type => (
        <div key={type}>
          <h3 className="font-medium mb-3">{type === 'from' ? 'Từ (Công ty bạn)' : 'Cho (Khách hàng)'}</h3>
          <div className="space-y-3">
            {fields.map(f => (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <Input
                  type={f.type}
                  value={type === 'from' ? (from[f.key] ?? '') : (to[f.key] ?? '')}
                  onChange={e => update(type, f.key, e.target.value)}
                  placeholder={f.placeholder[type]}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
