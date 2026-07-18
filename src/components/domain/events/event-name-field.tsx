"use client";

const inputClasses = "w-full rounded-xl border border-stone-200/80 bg-white/80 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent transition-shadow";

interface EventNameFieldProps {
  name: string;
  onChange: (v: string) => void;
}

export function EventNameField({ name, onChange }: EventNameFieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-stone-700 mb-1.5">
        Tên sự kiện <span className="text-red-500">*</span>
      </label>
      <input
        required
        type="text"
        className={inputClasses}
        placeholder="VD: Lễ Tảo Mộ Kỷ Tỵ"
        value={name}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
