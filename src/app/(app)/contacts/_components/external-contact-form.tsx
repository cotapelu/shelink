"use client";

import { ExternalContactCategory } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  DialogFooter
} from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";

const CATEGORY_OPTIONS: { value: ExternalContactCategory; label: string }[] = [
  { value: "COURT", label: "法院" },
  { value: "PROSECUTOR", label: "检察院" },
  { value: "POLICE", label: "公安" },
  { value: "NOTARY", label: "公证处" },
  { value: "ARBITRATION", label: "仲裁" },
  { value: "OTHER_FIRM", label: "他所律师" },
  { value: "EXPERT", label: "鉴定专家" },
  { value: "OTHER", label: "其他" }
];

export interface FormState {
  name: string;
  category: ExternalContactCategory;
  organization: string;
  title: string;
  phone: string;
  email: string;
  wechat: string;
  address: string;
  notes: string;
  tags: string[];
}

type FieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select';

interface FieldDescriptor {
  key: keyof FormState;
  label: string;
  type: FieldType;
  placeholder?: string;
}

interface ExternalContactFormProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  isPending: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const fields: FieldDescriptor[] = [
  { key: "name", label: "Tên", type: "text", placeholder: "Nhập tên" },
  { key: "category", label: "Loại", type: "select" },
  { key: "organization", label: "Cơ quan/Tổ chức", type: "text", placeholder: "Nhập cơ quan" },
  { key: "title", label: "Chức danh", type: "text", placeholder: "Nhập chức danh" },
  { key: "phone", label: "Điện thoại", type: "tel", placeholder: "Nhập số điện thoại" },
  { key: "email", label: "Email", type: "email", placeholder: "Nhập email" },
  { key: "wechat", label: "WeChat", type: "text", placeholder: "Nhập WeChat" },
  { key: "address", label: "Địa chỉ", type: "text", placeholder: "Nhập địa chỉ" },
  { key: "notes", label: "Ghi chú", type: "textarea", placeholder: "Nhập ghi chú" },
];

export function ExternalContactForm({ form, setForm, isPending, error, onSubmit, onCancel }: ExternalContactFormProps) {
  const handleChange = (key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  return (
    <form onSubmit={onSubmit}>
      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm mb-4">
          <AlertCircle className="size-4" />
          {error}
        </div>
      )}
      <div className="grid gap-4">
        {fields.map(f => (
          <div key={f.key} className="grid gap-2">
            <Label>{f.label}</Label>
            {f.type === "select" ? (
              <Select value={form[f.key] as string} onValueChange={v => handleChange(f.key, v as ExternalContactCategory)}>
                <SelectTrigger><SelectValue placeholder="Chọn loại" /></SelectTrigger>
                <SelectContent>{CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            ) : f.type === "textarea" ? (
              <Textarea value={form[f.key]} onChange={e => handleChange(f.key, e.target.value)} placeholder={f.placeholder} />
            ) : (
              <Input type={f.type} value={form[f.key]} onChange={e => handleChange(f.key, e.target.value)} placeholder={f.placeholder} />
            )}
          </div>
        ))}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Hủy</Button>
        <Button type="submit" disabled={isPending}>Lưu</Button>
      </DialogFooter>
    </form>
  );
}
