"use client";

interface EventNameFieldProps {
  name: string;
  onChange: (v: string) => void;
}

export function EventNameField({ name, onChange }: EventNameFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">Tên sự kiện</label>
      <input
        type="text"
        value={name}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2"
        placeholder="Nhập tên sự kiện"
        required
      />
    </div>
  );
}
